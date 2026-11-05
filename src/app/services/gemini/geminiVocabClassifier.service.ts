import OpenAI from 'openai'
import { IHttpResponse } from '@/models/http.model'
import {
  IClassifiedVocabItem,
  IContentClassificationData,
  ITranscriptClassificationData,
  TCEFRLevel,
  TVocabCategory,
  CEFR_LEVELS,
} from '@/models/vocabClassification.model'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { resolveOpenAiApiKey } from '../openai/tts.service'
import { DEFAULT_GEMINI_MODEL, TGeminiModel } from './geminiModels'
import { generateContentWithFallback } from './geminiCore.service'
import { parseTranscript } from '@/views/features/player/transcriptUtils'

const STORAGE_PREFIX = 'enmory_transcript_vocab_'

export interface ISegmentContextMatch {
  text: string
  translation?: string
}

export interface IClassifyContentOptions {
  id?: string | number
  contentType?: 'transcript' | 'blog' | 'article' | 'text'
  preferredModel?: TGeminiModel
  translation?: string
  title?: string
}

/**
 * Generic helper to match an item or context snippet against a list of segments/sentences.
 * Heuristics:
 * 1. Matches by context snippet (direct or 25-char head/tail prefix)
 * 2. Matches whole word boundary via regex
 * 3. Fallback to substring match
 * 4. Fallback to first two words of multi-word phrase
 */
export function findMatchingSegment<T extends { text: string }>(
  itemText: string,
  contextSnippet: string,
  segments: T[],
): T | undefined {
  if (!segments || segments.length === 0) return undefined

  const cleanContext = (contextSnippet || '').trim().toLowerCase()
  const cleanItem = (itemText || '').trim().toLowerCase()

  // 1. Try finding by contextSnippet first (since Gemini's context snippet usually points directly to the sentence)
  if (cleanContext) {
    const matched = segments.find((seg) => {
      const segLower = seg.text.toLowerCase()
      if (segLower.includes(cleanContext)) return true
      if (cleanContext.length > 25) {
        const head = cleanContext.slice(0, 25)
        const tail = cleanContext.slice(-25)
        if (segLower.includes(head) || segLower.includes(tail)) return true
      }
      return false
    })
    if (matched) return matched
  }

  // 2. If no match via contextSnippet, try matching itemText as a whole word
  if (cleanItem) {
    try {
      const escaped = cleanItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wordRegex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i')
      const matched = segments.find((seg) => wordRegex.test(seg.text))
      if (matched) return matched
    } catch {
      // Continue to next heuristic if regex construction failed
    }

    // 3. Fallback: Substring match of cleanItem in segment
    const matched = segments.find((seg) => seg.text.toLowerCase().includes(cleanItem))
    if (matched) return matched

    // 4. If item is a phrase or multi-word, check if the first 2 words appear in a segment
    const words = cleanItem.split(/\s+/).filter(Boolean)
    if (words.length > 1) {
      const firstTwo = `${words[0]} ${words[1]}`
      const matchedPhrase = segments.find((seg) => seg.text.toLowerCase().includes(firstTwo))
      if (matchedPhrase) {
        return matchedPhrase
      }
    }
  }

  return undefined
}

/**
 * Matches an item or context snippet against the list of full segments to retrieve the entire segment text and its translation.
 */
export const findFullSegmentForVocab = (
  itemText: string,
  contextSnippet: string,
  segments: (string | { text: string; translation?: string })[],
): ISegmentContextMatch => {
  if (!segments || segments.length === 0) return { text: contextSnippet || '' }

  const normalizedSegs: { text: string; translation?: string }[] = segments.map((s) =>
    typeof s === 'string' ? { text: s } : s,
  )

  const matched = findMatchingSegment(itemText, contextSnippet, normalizedSegs)
  if (matched) {
    return { text: matched.text.trim(), translation: matched.translation?.trim() }
  }

  return { text: contextSnippet || '' }
}

/**
 * Clean text or HTML content by removing HTML markup, decoding entities, and stripping timestamp lines
 */
export const cleanContentForAI = (rawContent: string): string => {
  if (!rawContent) return ''

  // 1. If content contains HTML tags, convert block-level closing tags to newlines before stripping
  let text = rawContent
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  // 2. Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  // 3. Strip timestamp lines e.g. 0:00, 12:34, 1:23:45
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => !/^(\d+):(\d{2})(?::(\d{2}))?$/.test(l))

  return lines
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Backward compatible alias for cleanContentForAI
 */
export const cleanTranscriptForAI = (rawTranscript: string): string => {
  return cleanContentForAI(rawTranscript)
}

/**
 * Extract sentences or segments from content for context matching.
 * Handles both timestamped transcripts and plain text/HTML articles.
 */
export const extractSegmentsFromContent = (
  content: string,
  translation?: string,
): { text: string; translation?: string }[] => {
  if (!content) return []

  // Check if content has timestamp format (e.g. 0:00, 12:34)
  const transcriptSegs = parseTranscript(content, translation)
  if (transcriptSegs.length > 0) {
    return transcriptSegs
  }

  // For plain text or HTML (blog, article): clean and split into sentences
  const cleaned = cleanContentForAI(content)
  const sentences = cleaned
    .split(/(?<=[.?!])\s+(?=[A-Z0-9"“'‘])|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  return sentences.map((s) => ({ text: s }))
}

/**
 * Generate a simple hash of the string to detect content changes
 */
export const getTranscriptHash = (text: string): string => {
  let hash = 0
  const clean = text.trim()
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i)
    hash |= 0
  }
  return `h_${Math.abs(hash)}_${clean.length}`
}

export const getContentHash = getTranscriptHash

/**
 * Normalize level string into standard CEFR level
 */
export const normalizeCefrLevel = (rawLevel: any): TCEFRLevel => {
  if (!rawLevel) return 'B1'
  const str = String(rawLevel).trim().toUpperCase()
  if (CEFR_LEVELS.includes(str as TCEFRLevel)) {
    return str as TCEFRLevel
  }
  const match = str.match(/\b([ABC][12])\b/)
  if (match && CEFR_LEVELS.includes(match[1] as TCEFRLevel)) {
    return match[1] as TCEFRLevel
  }
  return 'B1'
}

/**
 * Normalize category string
 */
export const normalizeCategory = (rawCat: any): TVocabCategory => {
  if (!rawCat) return 'word'
  const str = String(rawCat).toLowerCase().trim()
  if (str.includes('collocat')) return 'collocation'
  if (str.includes('idiom')) return 'idiom'
  if (str.includes('phrasal') || str.includes('phr v')) return 'phrasal_verb'
  if (str.includes('phrase') || str.includes('expression')) return 'phrase'
  if (str.includes('word') || str.includes('vocab')) return 'word'
  return 'word'
}

/**
 * Safe parse JSON helper
 */
const safeParseJson = (text: string): any => {
  if (!text) return null
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    try {
      const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
      if (match && match[1]) {
        return JSON.parse(match[1].trim())
      }
      const first = trimmed.indexOf('{')
      const last = trimmed.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) {
        return JSON.parse(trimmed.slice(first, last + 1))
      }
    } catch (e) {
      console.warn('[VocabClassifier] safeParseJson extraction failed:', e)
    }
  }
  return null
}

export const geminiVocabClassifierService = {
  /**
   * Get cached classification from localStorage
   */
  getCached: (key: string): IContentClassificationData | null => {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
      if (item) {
        return JSON.parse(item)
      }
    } catch (e) {
      console.warn('[VocabClassifier] Failed to read from localStorage:', e)
    }
    return null
  },

  /**
   * Save classification to localStorage
   */
  setCached: (key: string, data: IContentClassificationData): void => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data))
    } catch (e) {
      console.warn('[VocabClassifier] Failed to write to localStorage:', e)
    }
  },

  /**
   * Remove cached classification
   */
  clearCached: (key: string): void => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    } catch (e) {
      console.warn('[VocabClassifier] Failed to remove from localStorage:', e)
    }
  },

  /**
   * Generalized method to classify text / blog post / article / transcript
   * into vocabulary, phrases, collocations across CEFR levels A1 -> C2 using Gemini AI (with OpenAI fallback).
   */
  classifyContent: async (
    content: string,
    options?: IClassifyContentOptions,
  ): Promise<IHttpResponse<IContentClassificationData>> => {
    try {
      const geminiApiKey = resolveGeminiApiKey()
      const openAiApiKey = resolveOpenAiApiKey()

      if (!geminiApiKey && !openAiApiKey) {
        return {
          isSuccess: false,
          content: null as any,
          message:
            'Chưa cấu hình API Key. Vui lòng thêm VITE_GEMINI_API_KEY trong file .env hoặc lưu vào localStorage ("gemini_api_key").',
          statusCode: 400,
        }
      }

      const cleanText = cleanContentForAI(content)
      if (!cleanText || cleanText.length < 20) {
        return {
          isSuccess: false,
          content: null as any,
          message: 'Nội dung quá ngắn hoặc không có dữ liệu để phân loại.',
          statusCode: 400,
        }
      }

      const contentType = options?.contentType || 'transcript'
      const preferredModel = options?.preferredModel || DEFAULT_GEMINI_MODEL
      const contentId = options?.id
      const isAudio = contentType === 'transcript'
      const contentLabel = isAudio ? 'audio transcript' : 'article/blog post'
      const contextReq = isAudio
        ? 'The ENTIRE, complete text of the audio segment from the transcript where this term appears. You MUST take the full segment text containing the term (do NOT shorten, truncate, or extract only a few words).'
        : 'The ENTIRE, complete sentence from the text where this term appears. You MUST take the full sentence containing the term (do NOT shorten, truncate, or extract only a few words).'

      const titleHeader = options?.title ? `TITLE: "${options.title}"\n` : ''

      const prompt = `Analyze this English ${contentLabel} and extract the most valuable, representative vocabulary, phrases, and collocations across CEFR difficulty levels (A1, A2, B1, B2, C1, C2).

${titleHeader}CONTENT TEXT:
"""
${cleanText.slice(0, 8000)}
"""

REQUIREMENTS:
1. Extract words, phrases, and collocations that are genuinely useful for learners studying this ${contentLabel}.
2. Ensure broad coverage across all 6 CEFR difficulty levels:
   - A1: Very basic everyday words or essential phrases
   - A2: Elementary words and simple everyday expressions
   - B1: Intermediate vocabulary, workplace interactions, common collocations
   - B2: Upper-intermediate professional idioms, phrasal verbs, technical collocations
   - C1: Advanced vocabulary, formal expressions, sophisticated collocations
   - C2: Mastery level idioms, nuances, or high-register collocations
3. Categorize each item strictly into one of:
   - "word": Single target vocabulary words
   - "phrase": Multi-word phrases, conversational gambits, phrasal verbs
   - "collocation": Natural word pairings (e.g. verb+noun, adj+noun, adv+adj)
   - "idiom": Figurative or idiomatic expressions
4. For each item provide:
   - "text": The dictionary base/lemma form (e.g. "reach out" not "reached out", "bottleneck" not "bottlenecks")
   - "category": "word" | "phrase" | "collocation" | "idiom"
   - "level": strictly "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
   - "type": Part of speech (e.g. "noun", "verb", "adj", "adv", "phr v", "collocation", "idiom")
   - "phonetic": Accurate IPA pronunciation (e.g. "/ˈbɑːtl.nek/")
   - "meaning": Clear, concise English definition
   - "vietnamese": Natural, accurate Vietnamese translation of this meaning
   - "context": ${contextReq}
   - "context_translation": Natural Vietnamese translation of this complete context sentence/segment
   - "notes": Optional brief usage note, preposition, or register note (in Vietnamese or English)

Provide a rich set of items (aim for 15-35 distinct items covering all levels A1 to C2).

Return ONLY valid JSON matching this structure:
{
  "summary": "Brief 1-2 sentence overview in Vietnamese about the vocabulary level and key topics of this content",
  "items": [
    {
      "text": "standup meeting",
      "category": "collocation",
      "level": "B1",
      "type": "noun phrase",
      "phonetic": "/ˈstænd.ʌp ˈmiː.tɪŋ/",
      "meaning": "A short daily team meeting to review progress and blockers",
      "vietnamese": "cuộc họp nhanh hàng ngày để cập nhật tiến độ",
      "context": "Alex: Good morning team, let's start the standup.",
      "context_translation": "Alex: Chào buổi sáng cả đội, chúng ta bắt đầu cuộc họp nhanh nhé.",
      "notes": "Common in Agile/Scrum software development"
    }
  ]
}`

      let lastError: any = null
      let parsedResponse: any = null

      // 1. Try Gemini with resilient fallback
      if (geminiApiKey) {
        try {
          const { text } = await generateContentWithFallback({
            serviceName: 'Vocabulary Classifier',
            preferredModel,
            category: 'general',
            requestParams: {
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            },
          })

          if (text) {
            const raw = safeParseJson(text)
            if (raw && (Array.isArray(raw.items) || Array.isArray(raw))) {
              parsedResponse = raw
            }
          }
        } catch (geminiErr: any) {
          lastError = geminiErr
          console.warn('[VocabClassifier] Gemini fallback chain failed:', geminiErr)
        }
      }

      // 2. OpenAI fallback
      if (!parsedResponse && openAiApiKey) {
        try {
          const openai = new OpenAI({
            apiKey: openAiApiKey,
            dangerouslyAllowBrowser: true,
          })

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert English lexicographer and CEFR language evaluator. Analyze content and extract vocabulary/phrases/collocations classified by CEFR level A1-C2 with Vietnamese translations. Return only valid JSON.',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          })

          const openAiText = completion.choices[0]?.message?.content || ''
          if (openAiText) {
            parsedResponse = safeParseJson(openAiText)
          }
        } catch (openAiErr: any) {
          console.warn(
            '[VocabClassifier] OpenAI fallback also failed:',
            openAiErr?.message || openAiErr,
          )
          lastError = openAiErr
        }
      }

      if (!parsedResponse) {
        throw lastError || new Error('Không thể phân loại từ vựng bằng Gemini. Vui lòng thử lại.')
      }

      // Normalize items
      const rawItems: any[] = Array.isArray(parsedResponse.items)
        ? parsedResponse.items
        : Array.isArray(parsedResponse)
          ? parsedResponse
          : []

      // Extract full segment texts and translations from content
      const segments = extractSegmentsFromContent(content, options?.translation)

      const items: IClassifiedVocabItem[] = rawItems
        .filter((it) => it && (it.text || it.word))
        .map((it, idx) => {
          const text = (it.text || it.word || '').trim()
          const level = normalizeCefrLevel(it.level)
          const category = normalizeCategory(it.category || it.type)
          const rawContext = (it.context || it.example || '').trim()
          const aiContextTrans = (it.context_translation || it.contextTranslation || '').trim()

          const match = findFullSegmentForVocab(text, rawContext, segments)
          const fullContext = match.text || rawContext
          const fullContextTrans = match.translation || aiContextTrans || ''

          return {
            id: it.id || `item_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text,
            category,
            level,
            type: it.type || category,
            phonetic: it.phonetic || '',
            meaning: (it.meaning || it.definition || '').trim(),
            vietnamese: (it.vietnamese || it.translation || '').trim(),
            context: fullContext,
            contextTranslation: fullContextTrans,
            notes: (it.notes || it.note || '').trim(),
          }
        })

      const defaultSummary = isAudio
        ? `Đã phân loại ${items.length} từ vựng, cụm từ và collocation theo chuẩn CEFR A1 - C2.`
        : `Đã phân loại ${items.length} từ vựng, cụm từ và collocation trong bài viết theo chuẩn CEFR A1 - C2.`

      const result: IContentClassificationData = {
        id: contentId,
        trackId: contentId,
        snippet: cleanText.slice(0, 100),
        transcriptSnippet: cleanText.slice(0, 100),
        summary: parsedResponse.summary || defaultSummary,
        items,
        updatedAt: Date.now(),
      }

      // Cache the result
      const cacheKey = contentId ? String(contentId) : getTranscriptHash(cleanText)
      geminiVocabClassifierService.setCached(cacheKey, result)

      return {
        isSuccess: true,
        content: result,
        message: 'Phân loại từ vựng thành công!',
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('geminiVocabClassifierService error:', error)
      return {
        isSuccess: false,
        content: null as any,
        message: error?.message || 'Lỗi khi phân loại từ vựng.',
        statusCode: 500,
      }
    }
  },

  /**
   * Main method to classify transcript into vocabulary, phrases, collocations
   * across CEFR levels A1 -> C2 using Gemini AI (with OpenAI fallback).
   */
  classifyTranscript: async (
    transcript: string,
    trackId?: string | number,
    preferredModel: TGeminiModel = DEFAULT_GEMINI_MODEL,
    translation?: string,
  ): Promise<IHttpResponse<ITranscriptClassificationData>> => {
    return geminiVocabClassifierService.classifyContent(transcript, {
      id: trackId,
      contentType: 'transcript',
      preferredModel,
      translation,
    })
  },
}
