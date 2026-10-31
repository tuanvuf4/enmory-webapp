import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { IHttpResponse } from '@/models/http.model'
import {
  IClassifiedVocabItem,
  ITranscriptClassificationData,
  TCEFRLevel,
  TVocabCategory,
  CEFR_LEVELS,
} from '@/models/vocabClassification.model'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { resolveOpenAiApiKey } from '../openai/tts.service'
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, TGeminiModel } from './geminiModels'
import { generateContentWithTracking } from './geminiTracker.service'

const STORAGE_PREFIX = 'enmory_transcript_vocab_'

/**
 * Clean transcript text by removing timestamps (e.g. "0:00", "1:23") and HTML tags
 */
export const cleanTranscriptForAI = (rawTranscript: string): string => {
  if (!rawTranscript) return ''

  // Strip HTML tags
  let text = rawTranscript.replace(/<[^>]+>/g, ' ')

  // Strip timestamp lines e.g. 0:00, 12:34, 1:23:45
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => !/^(\d+):(\d{2})(?::(\d{2}))?$/.test(l))

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Generate a simple hash of the transcript string to detect content changes
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
  getCached: (key: string): ITranscriptClassificationData | null => {
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
  setCached: (key: string, data: ITranscriptClassificationData): void => {
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
   * Main method to classify transcript into vocabulary, phrases, collocations
   * across CEFR levels A1 -> C2 using Gemini AI (with OpenAI fallback).
   */
  classifyTranscript: async (
    transcript: string,
    trackId?: string | number,
    preferredModel: TGeminiModel = DEFAULT_GEMINI_MODEL,
  ): Promise<IHttpResponse<ITranscriptClassificationData>> => {
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

      const cleanText = cleanTranscriptForAI(transcript)
      if (!cleanText || cleanText.length < 20) {
        return {
          isSuccess: false,
          content: null as any,
          message: 'Nội dung transcript quá ngắn hoặc không có dữ liệu để phân loại.',
          statusCode: 400,
        }
      }

      const prompt = `Analyze this English audio transcript and extract the most valuable, representative vocabulary, phrases, and collocations across CEFR difficulty levels (A1, A2, B1, B2, C1, C2).

TRANSCRIPT TEXT:
"""
${cleanText.slice(0, 8000)}
"""

REQUIREMENTS:
1. Extract words, phrases, and collocations that are genuinely useful for learners studying this transcript.
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
   - "context": The exact sentence or dialogue snippet from the transcript where this term appears
   - "notes": Optional brief usage note, preposition, or register note (in Vietnamese or English)

Provide a rich set of items (aim for 15-35 distinct items covering all levels A1 to C2).

Return ONLY valid JSON matching this structure:
{
  "summary": "Brief 1-2 sentence overview in Vietnamese about the vocabulary level and key topics of this transcript",
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
      "notes": "Common in Agile/Scrum software development"
    }
  ]
}`

      let lastError: any = null
      let parsedResponse: any = null

      // 1. Try Gemini
      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey })
          const targetModel = preferredModel || DEFAULT_GEMINI_MODEL
          const modelCandidates = [targetModel, ...GEMINI_MODELS.filter((m) => m !== targetModel)]

          for (const model of modelCandidates) {
            try {
              const response = await generateContentWithTracking(ai, 'Vocabulary Classifier', {
                model,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                },
              })

              const responseText = response.text || ''
              if (responseText) {
                const raw = safeParseJson(responseText)
                if (raw && (Array.isArray(raw.items) || Array.isArray(raw))) {
                  parsedResponse = raw
                  break
                }
              }
            } catch (modelErr: any) {
              lastError = modelErr
              console.warn(
                `[VocabClassifier] Gemini model ${model} failed, trying fallback:`,
                modelErr?.message || modelErr,
              )
            }
          }
        } catch (err) {
          lastError = err
          console.warn('[VocabClassifier] Gemini client initialization or request failed:', err)
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
                  'You are an expert English lexicographer and CEFR language evaluator. Analyze transcripts and extract vocabulary/phrases/collocations classified by CEFR level A1-C2 with Vietnamese translations. Return only valid JSON.',
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

      const items: IClassifiedVocabItem[] = rawItems
        .filter((it) => it && (it.text || it.word))
        .map((it, idx) => {
          const text = (it.text || it.word || '').trim()
          const level = normalizeCefrLevel(it.level)
          const category = normalizeCategory(it.category || it.type)
          return {
            id: it.id || `item_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text,
            category,
            level,
            type: it.type || category,
            phonetic: it.phonetic || '',
            meaning: (it.meaning || it.definition || '').trim(),
            vietnamese: (it.vietnamese || it.translation || '').trim(),
            context: (it.context || it.example || '').trim(),
            notes: (it.notes || it.note || '').trim(),
          }
        })

      const result: ITranscriptClassificationData = {
        trackId,
        transcriptSnippet: cleanText.slice(0, 100),
        summary:
          parsedResponse.summary ||
          `Đã phân loại ${items.length} từ vựng, cụm từ và collocation theo chuẩn CEFR A1 - C2.`,
        items,
        updatedAt: Date.now(),
      }

      // Cache the result
      const cacheKey = trackId ? String(trackId) : getTranscriptHash(cleanText)
      geminiVocabClassifierService.setCached(cacheKey, result)

      return {
        isSuccess: true,
        content: result,
        message: 'Phân loại từ vựng transcript thành công!',
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('geminiVocabClassifierService error:', error)
      return {
        isSuccess: false,
        content: null as any,
        message: error?.message || 'Lỗi khi phân loại từ vựng transcript.',
        statusCode: 500,
      }
    }
  },
}
