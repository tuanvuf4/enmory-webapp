import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { ECategory, EType } from '@/models/item.model'
import { IHttpResponse } from '@/models/http.model'
import { sanitizePronunciation } from '@/core/utils'
import { DEFAULT_AUTOFILL_MODEL, GEMINI_MODELS, TGeminiModel } from './geminiModels'
import { resolveOpenAiApiKey } from '../openai/tts.service'
import { generateContentWithTracking } from './geminiTracker.service'

export interface IDictionaryAutofillData {
  catId: ECategory
  level: number
  forms: string[]
  word_family: string[]
  relation: string[]
  meanings: {
    typeId: EType
    definition: string
    translation: string
    note: string
    grammar: string
    collocations: string
    synonyms: string[]
    antonyms: string[]
    pronunciation: {
      us: string
      uk: string
      common: string
    }
    examples: {
      origin: string
      translation: string
    }[]
  }[]
}

export type IOxfordAutofillData = IDictionaryAutofillData

export const resolveGeminiApiKey = (): string => {
  return (
    localStorage.getItem('gemini_api_key') ||
    localStorage.getItem('geminiApiKey') ||
    localStorage.getItem('enmory_gemini_api_key') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim()
}

export const formatHtmlList = (
  content: string | undefined,
  allowCommaSplit: boolean = true,
): string => {
  if (!content) return ''
  const trimmed = content.trim()
  if (!trimmed) return ''

  // If already contains HTML list tags or container tags, return as is
  if (/<\/?(ul|ol|li|p|div)\b/i.test(trimmed)) {
    return trimmed
  }

  // Check if multiple lines (e.g. separated by newlines, bullets, or numbers)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter(Boolean)

  if (lines.length > 1) {
    return `<ul>${lines.map((item) => `<li>${item}</li>`).join('')}</ul>`
  }

  // If contains semicolons with multiple items
  if (trimmed.includes(';')) {
    const parts = trimmed
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length > 1) {
      return `<ul>${parts.map((item) => `<li>${item}</li>`).join('')}</ul>`
    }
  }

  // If comma separated with 2 or more phrases (e.g. "pure serendipity, stroke of serendipity")
  if (allowCommaSplit && trimmed.includes(',')) {
    const parts = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length >= 2 && parts.some((p) => p.includes(' '))) {
      return `<ul>${parts.map((item) => `<li>${item}</li>`).join('')}</ul>`
    }
  }

  return trimmed
}

export const getSourceContext = (source: string = 'Oxford'): string => {
  switch (source.toLowerCase()) {
    case 'cambridge':
      return "Cambridge Advanced Learner's Dictionary (dictionary.cambridge.org)"
    case 'merriam':
      return 'Merriam-Webster Dictionary (merriam-webster.com)'
    case 'longman':
      return 'Longman Dictionary of Contemporary English (ldoceonline.com)'
    case 'vocabulary':
      return 'Vocabulary.com dictionary'
    case 'thesaurus':
      return 'Thesaurus.com / dictionary'
    case 'tracau':
      return 'Tracau English-Vietnamese dictionary (tracau.vn)'
    case 'translate':
      return 'Google Translate / English-Vietnamese learner dictionary'
    case 'google':
      return 'Google Dictionary (powered by Oxford Languages) and Google Translate (English to Vietnamese)'
    case 'oxford':
    default:
      return "Oxford Advanced Learner's Dictionary (OALD) (oxfordlearnersdictionaries.com)"
  }
}

export const filterWordsExcludingOrigin = (
  words: string[] = [],
  originWord: string = '',
): string[] => {
  const normalizedOrigin = String(originWord || '')
    .trim()
    .toLowerCase()
  const map = new Map<string, string>()

  const flatWords = (words || []).flatMap((item) =>
    typeof item === 'string' && item.includes(',') ? item.split(',') : [item],
  )

  flatWords
    .map((word) => String(word || '').trim())
    .filter(Boolean)
    .forEach((word) => {
      const key = word.toLowerCase()
      if (key !== normalizedOrigin && !map.has(key)) {
        map.set(key, word)
      }
    })

  return Array.from(map.values())
}

const normalizeDictionaryData = (
  data: IOxfordAutofillData,
  originWord: string = '',
): IOxfordAutofillData => {
  if (data.meanings && Array.isArray(data.meanings)) {
    data.meanings = data.meanings.map((m) => {
      const uk = (m.pronunciation?.uk || '').trim()
      const us = (m.pronunciation?.us || '').trim()
      const common = (m.pronunciation?.common || '').trim()

      const cleanIpa = (val: string) =>
        val
          .replace(/^\/+|\/+$/g, '')
          .trim()
          .toLowerCase()
      const isSame = uk && us && cleanIpa(uk) === cleanIpa(us)

      const finalUs = sanitizePronunciation(us || uk)
      const finalUk = isSame ? '' : sanitizePronunciation(uk)
      const finalCommon = sanitizePronunciation(common || finalUs)

      return {
        ...m,
        note: formatHtmlList(m.note || '', false),
        grammar: formatHtmlList(m.grammar || '', true),
        collocations: formatHtmlList(m.collocations),
        synonyms: filterWordsExcludingOrigin(m.synonyms || [], originWord),
        antonyms: [],
        pronunciation: {
          uk: finalUk,
          us: finalUs,
          common: finalCommon,
        },
      }
    })
  }
  data.forms = filterWordsExcludingOrigin(data.forms || [], originWord)
  data.word_family = filterWordsExcludingOrigin(data.word_family || [], originWord)
  data.relation = filterWordsExcludingOrigin(data.relation || [], originWord)
  return data
}

const safeParseJson = (text: string): IOxfordAutofillData | null => {
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
      console.warn('[Dictionary] safeParseJson extraction failed:', e)
    }
  }
  return null
}

export const geminiDictionaryService = {
  fetchFromReference: async (
    wordOrPhrase: string,
    sourceName: string = 'Google',
    sentenceContext?: string,
    preferredModel: TGeminiModel = 'gemini-3.8-flash',
  ): Promise<IHttpResponse<IOxfordAutofillData>> => {
    try {
      const geminiApiKey = resolveGeminiApiKey()
      const openAiApiKey = resolveOpenAiApiKey()

      if (!geminiApiKey && !openAiApiKey) {
        return {
          isSuccess: false,
          content: null,
          message:
            'Chưa cấu hình API key cho Gemini hoặc OpenAI. Vui lòng thêm VITE_GEMINI_API_KEY hoặc VITE_OPENAI_API_KEY trong file .env hoặc lưu vào localStorage ("gemini_api_key").',
          statusCode: 400,
        }
      }

      const trimmed = wordOrPhrase.trim()
      if (!trimmed) {
        return {
          isSuccess: false,
          content: null,
          message: 'Vui lòng cung cấp từ hoặc cụm từ hợp lệ.',
          statusCode: 400,
        }
      }

      const sourceContext = getSourceContext(sourceName)

      const contextHint = sentenceContext
        ? `\nSentence context where this word appears: "${sentenceContext}"\n(CRITICAL: Prioritize the exact meaning, part of speech, and Vietnamese translation that fits this specific sentence context, while still returning standard dictionary details).`
        : ''

      const prompt = `You are a professional lexicographer with deep knowledge of ${sourceContext}.

Given the English word or phrase: "${trimmed}"${contextHint}
(If the word is an inflected form like past tense, plural, or participle, identify its base lemma and provide clear meanings).

Extract and format accurate dictionary data following ${sourceContext} conventions:
1. Category (catId):
   - 1 = WORD (single word)
   - 2 = PHRASE (multi-word phrase)
   - 3 = IDIOM (idiom / figurative expression)
   - 4 = SLANG (slang / informal)
   - 5 = COLLOCATION (collocation)
   - 6 = SENTENCE (full sentence / proverb)

2. Difficulty Level (level):
   - Based on Oxford 3000 / Oxford 5000 CEFR scale:
     1 = A1, 2 = A2, 3 = B1, 4 = B2, 5 = C1/C2.

3. Forms: Other morphological or inflected forms of the word (e.g. plurals, verb conjugations - past tense, past participle, -ing, 3rd person singular, comparative/superlative forms).
   - CRITICAL RULE: DO NOT include the origin word "${trimmed}" itself in forms.

4. Word Family: Derived or related words sharing the morphological base (noun, verb, adj, adv).
   - CRITICAL RULE: DO NOT include the origin word "${trimmed}" itself in word_family.

5. Relation: Related words, closely associated terms, or compounds.
   - CRITICAL RULE: DO NOT include the origin word "${trimmed}" itself in relation.

6. Meanings:
   - Provide up to 3 most important/common dictionary senses (with the context-fitting meaning as the first meaning).
   - For each meaning:
     - typeId: Part of speech (1=NOUN, 2=VERB, 3=ADJECTIVE, 4=ADVERB, 5=PREPOSITION, 6=CONJUNCTION, 7=PRONOUN, 8=ARTICLE, 9=DETERMINER, 10=INTERJECTION).
     - pronunciation:
       - uk: British English (BrE) IPA
       - us: North American English (NAmE) IPA
       - common: Standard IPA
     - definition: Clear, learner-friendly English definition.
     - translation: Accurate and natural Vietnamese translation of this specific meaning.
     - note: Important usage notes, register labels (formal, informal, spoken/written, literary, British/American differences), common pitfalls, or helpful learner tips in clear Vietnamese or English. Format as an HTML unordered list with <ul> and <li> tags if multiple notes (e.g. "<ul><li>Thường dùng trong ngữ cảnh trang trọng</li></ul>") or clean HTML string, or empty string if none.
     - grammar: Grammatical patterns, structures, syntactic behavior, or complementation patterns for this sense (e.g., [C, U] for nouns; [transitive, intransitive], [verb + object + to-infinitive], [verb + preposition], [adjective + that-clause], etc.). Format as an HTML unordered list with <ul> and <li> tags if multiple patterns (e.g. "<ul><li>[transitive, intransitive]</li><li>verb + noun</li></ul>") or clean HTML string, or empty string if not applicable.
     - collocations: Frequent collocations formatted as an HTML unordered list with <ul> and <li> tags.
     - synonyms: Array of up to 5 synonyms. CRITICAL RULE: DO NOT include the origin word "${trimmed}" itself in synonyms.
     - antonyms: ALWAYS return an empty array [] (do not extract antonyms).
     - examples: 1-2 practical example sentences with:
       - origin: English sentence
       - translation: Natural Vietnamese translation

Return ONLY valid JSON matching this schema:
{
  "catId": 1,
  "level": 3,
  "forms": ["..."],
  "word_family": ["..."],
  "relation": ["..."],
  "meanings": [
    {
      "typeId": 1,
      "definition": "...",
      "translation": "...",
      "note": "<ul><li>...</li></ul>",
      "grammar": "<ul><li>...</li></ul>",
      "collocations": "<ul><li>first collocation</li></ul>",
      "synonyms": ["..."],
      "antonyms": [],
      "pronunciation": {
        "uk": "...",
        "us": "...",
        "common": "..."
      },
      "examples": [
        {
          "origin": "...",
          "translation": "..."
        }
      ]
    }
  ]
}`

      let lastError: any = null
      let parsed: IOxfordAutofillData | null = null

      // 1. Try Gemini models first if key available
      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey })
          const targetModel = preferredModel || DEFAULT_AUTOFILL_MODEL
          const modelCandidates = [targetModel, ...GEMINI_MODELS.filter((m) => m !== targetModel)]

          for (const model of modelCandidates) {
            try {
              const response = await generateContentWithTracking(ai, 'Dictionary Autofill', {
                model,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                },
              })

              const text = response.text || ''
              if (text) {
                const raw = safeParseJson(text)
                if (raw) {
                  parsed = normalizeDictionaryData(raw, trimmed)
                  break
                }
              }
            } catch (err: any) {
              lastError = err
              console.warn(
                `[Dictionary] Gemini model ${model} failed, trying next candidate...`,
                err?.message || err,
              )
            }
          }
        } catch (geminiInitErr: any) {
          lastError = geminiInitErr
          console.warn('[Dictionary] Gemini initialization failed:', geminiInitErr?.message)
        }
      }

      // 2. Fallback to OpenAI if Gemini failed and OpenAI key exists
      if (!parsed && openAiApiKey) {
        try {
          console.info('[Dictionary] Gemini unavailable, falling back to OpenAI gpt-4o-mini...')
          const openai = new OpenAI({ apiKey: openAiApiKey, dangerouslyAllowBrowser: true })
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a professional lexicographer with deep knowledge of ${sourceContext}.`,
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          })

          const openAiText = completion.choices[0]?.message?.content || ''
          if (openAiText) {
            const raw = safeParseJson(openAiText)
            if (raw) {
              parsed = normalizeDictionaryData(raw, trimmed)
            }
          }
        } catch (openAiErr: any) {
          console.warn(
            '[Dictionary] OpenAI dictionary lookup fallback also failed:',
            openAiErr?.message || openAiErr,
          )
          lastError = openAiErr
        }
      }

      if (!parsed) {
        throw lastError || new Error(`Không thể tra nghĩa từ điển cho "${trimmed}".`)
      }

      return {
        isSuccess: true,
        content: parsed,
        message: `Successfully fetched ${sourceName} data.`,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error(`Gemini/OpenAI ${sourceName} dictionary service error:`, error)
      return {
        isSuccess: false,
        content: null,
        message: error?.message || 'Failed to auto-fill data using AI dictionary.',
        statusCode: 500,
      }
    }
  },
  fetchFromGoogle: (
    wordOrPhrase: string,
    sentenceContext?: string,
    preferredModel?: TGeminiModel,
  ) =>
    geminiDictionaryService.fetchFromReference(
      wordOrPhrase,
      'Google',
      sentenceContext,
      preferredModel,
    ),
  fetchFromOxford: (
    wordOrPhrase: string,
    sentenceContext?: string,
    preferredModel?: TGeminiModel,
  ) =>
    geminiDictionaryService.fetchFromReference(
      wordOrPhrase,
      'Oxford',
      sentenceContext,
      preferredModel,
    ),
}

export const geminiOxfordService = geminiDictionaryService
