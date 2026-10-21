import { GoogleGenAI } from '@google/genai'
import { ECategory, EType } from '@/models/item.model'
import { IHttpResponse } from '@/models/http.model'

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

export const formatHtmlList = (content: string | undefined): string => {
  if (!content) return ''
  const trimmed = content.trim()
  if (!trimmed) return ''

  // If already contains HTML list tags, return as is
  if (/<\/?(ul|ol|li)\b/i.test(trimmed)) {
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
  if (trimmed.includes(',')) {
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

export const geminiDictionaryService = {
  fetchFromReference: async (
    wordOrPhrase: string,
    sourceName: string = 'Google',
  ): Promise<IHttpResponse<IOxfordAutofillData>> => {
    try {
      const apiKey = resolveGeminiApiKey()
      if (!apiKey) {
        return {
          isSuccess: false,
          content: null,
          message:
            'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY in your .env or save it in localStorage ("gemini_api_key").',
          statusCode: 400,
        }
      }

      const trimmed = wordOrPhrase.trim()
      if (!trimmed) {
        return {
          isSuccess: false,
          content: null,
          message: 'Please provide a valid word or phrase to look up.',
          statusCode: 400,
        }
      }

      const ai = new GoogleGenAI({ apiKey })
      const sourceContext = getSourceContext(sourceName)

      const prompt = `You are a professional lexicographer with deep knowledge of ${sourceContext}.

Given the English word or phrase: "${trimmed}"

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

3. Word Family: Derived or related words sharing the morphological base (noun, verb, adj, adv).

4. Meanings:
   - Provide up to 3 most important/common Oxford dictionary senses.
   - For each meaning:
     - typeId: Part of speech (1=NOUN, 2=VERB, 3=ADJECTIVE, 4=ADVERB, 5=PREPOSITION, 6=CONJUNCTION, 7=PRONOUN, 8=ARTICLE, 9=DETERMINER, 10=INTERJECTION).
     - pronunciation:
       - uk: British English (BrE) IPA from Oxford (e.g. "/ˌser.ənˈdɪp.ə.ti/")
       - us: North American English (NAmE) IPA from Oxford
       - common: Standard IPA
       - NOTE: If the UK and US pronunciations are the same, prefer US (fill "us" and leave "uk" as empty string "").
     - definition: Clear, learner-friendly English definition in Oxford style.
     - translation: Accurate and natural Vietnamese translation of this specific meaning.
     - collocations: Frequent Oxford collocations for this meaning. Since this field is rendered in a rich text editor, if there are multiple words or phrases, format them as an HTML unordered list with <ul> and <li> tags (e.g. "<ul><li>collocation 1</li><li>collocation 2</li></ul>").
     - synonyms: Array of up to 5 synonyms.
     - antonyms: Array of up to 5 antonyms (if any).
     - examples: 1-2 practical Oxford example sentences with:
       - origin: English sentence
       - translation: Natural Vietnamese translation

Return ONLY valid JSON matching this schema:
{
  "catId": 1,
  "level": 3,
  "forms": [],
  "word_family": ["..."],
  "relation": [],
  "meanings": [
    {
      "typeId": 1,
      "definition": "...",
      "translation": "...",
      "grammar": "",
      "collocations": "<ul><li>first collocation</li><li>second collocation</li></ul>",
      "synonyms": ["..."],
      "antonyms": ["..."],
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

      const CANDIDATE_MODELS = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
      ]

      let lastError: any = null
      let parsed: IOxfordAutofillData | null = null

      for (const model of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          })

          const text = response.text || ''
          if (text) {
            const data: IOxfordAutofillData = JSON.parse(text)
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

                const finalUs = us || uk || ''
                const finalUk = isSame ? '' : uk
                const finalCommon = common || finalUs

                return {
                  ...m,
                  grammar: '',
                  collocations: formatHtmlList(m.collocations),
                  pronunciation: {
                    uk: finalUk,
                    us: finalUs,
                    common: finalCommon,
                  },
                }
              })
            }
            data.forms = []
            data.relation = []
            parsed = data
            break
          }
        } catch (err: any) {
          lastError = err
          console.warn(
            `Model ${model} failed or is busy, attempting next model:`,
            err?.message || err,
          )
        }
      }

      if (!parsed) {
        throw lastError || new Error(`Failed to generate dictionary data from ${sourceName}.`)
      }

      return {
        isSuccess: true,
        content: parsed,
        message: `Successfully fetched ${sourceName} data.`,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error(`Gemini ${sourceName} dictionary service error:`, error)
      return {
        isSuccess: false,
        content: null,
        message: error?.message || 'Failed to auto-fill data using Gemini.',
        statusCode: 500,
      }
    }
  },
  fetchFromGoogle: (wordOrPhrase: string) =>
    geminiDictionaryService.fetchFromReference(wordOrPhrase, 'Google'),
  fetchFromOxford: (wordOrPhrase: string) =>
    geminiDictionaryService.fetchFromReference(wordOrPhrase, 'Oxford'),
}

export const geminiOxfordService = geminiDictionaryService
