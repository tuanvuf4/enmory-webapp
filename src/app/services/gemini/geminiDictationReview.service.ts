import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { IHttpResponse } from '@/models/http.model'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { resolveOpenAiApiKey } from '../openai/tts.service'
import { GEMINI_MODELS } from './geminiModels'
import { generateContentWithTracking } from './geminiTracker.service'

export interface IDictationAiReviewRequest {
  originalText: string
  userText: string
  translation?: string
}

export interface IDictationAiReviewResponse {
  score: number // 0-100
  isPerfect: boolean
  feedback: string // Đánh giá ngắn gọn bằng tiếng Việt
  misheardAnalysis?: string // Giải thích lý do nghe nhầm (nối âm, nuốt âm, đồng âm, giảm âm...)
  grammarOrSpellingNote?: string // Ghi chú về ngữ pháp hoặc chính tả nếu có
  listeningTip?: string // Mẹo nghe cho âm/cụm từ này
}

const safeParseJson = (text: string): IDictationAiReviewResponse | null => {
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
      console.warn('[DictationReview] safeParseJson extraction failed:', e)
    }
  }
  return null
}

export const geminiDictationReviewService = {
  reviewDictation: async (
    params: IDictationAiReviewRequest,
  ): Promise<IHttpResponse<IDictationAiReviewResponse>> => {
    try {
      const geminiApiKey = resolveGeminiApiKey()
      const openAiApiKey = resolveOpenAiApiKey()

      if (!geminiApiKey && !openAiApiKey) {
        return {
          isSuccess: false,
          content: null,
          message:
            'Chưa cấu hình API Key. Vui lòng thêm VITE_GEMINI_API_KEY trong file .env hoặc lưu vào localStorage ("gemini_api_key").',
          statusCode: 400,
        }
      }

      const cleanUser = (params.userText || '').trim()
      const cleanOriginal = (params.originalText || '').trim()
      const cleanTranslation = (params.translation || '').trim()

      if (!cleanUser) {
        return {
          isSuccess: false,
          content: null,
          message: 'Vui lòng nhập câu trả lời của bạn trước khi yêu cầu AI review.',
          statusCode: 400,
        }
      }

      const prompt = `You are an expert bilingual English-Vietnamese language tutor specializing in English listening comprehension, phonetics, connected speech, and dictation practice.

Task: Review and evaluate a student's listening dictation attempt.
- Original Sentence (Audio): "${cleanOriginal}"
${cleanTranslation ? `- Vietnamese Meaning: "${cleanTranslation}"\n` : ''}- Student's Written Answer: "${cleanUser}"

Evaluation criteria:
1. Accuracy: Did the student transcribe what they heard correctly?
2. Phonetic & Listening Analysis: If there are differences or mistakes, explain WHY the student might have misheard them in spoken English. For example:
   - Connected speech (linking, intrusion, assimilation)
   - Weak forms / reductions (e.g., 'have' -> /əv/, 'to' -> /tə/, 'of' -> /əv/)
   - Homophones or near-homophones (e.g., their/there, weather/whether)
   - Elision or dropped sounds (e.g., dropped 't' or 'd' at ends of words)
   - Contractions vs full forms
3. Grammar / Spelling: Any grammatical or spelling discrepancies.
4. Actionable Listening Tip: 1 concise tip in Vietnamese on how to catch this sound/pattern better next time.

Rating scale:
- score: 0 to 100
- isPerfect: boolean (true if 100% matched in meaning and words, ignoring minor punctuation/capitalization)
- feedback: A concise summary in Vietnamese (1-2 sentences) evaluating the attempt warmly.
- misheardAnalysis: Detailed explanation in Vietnamese of misheard parts and why they sound alike in spoken English (or null if isPerfect is true).
- grammarOrSpellingNote: Concise note in Vietnamese about spelling or grammar differences (or null if none).
- listeningTip: A practical listening tip in Vietnamese for the learner.

Return ONLY valid JSON matching this schema:
{
  "score": 85,
  "isPerfect": false,
  "feedback": "...",
  "misheardAnalysis": "...",
  "grammarOrSpellingNote": "...",
  "listeningTip": "..."
}`

      let lastError: any = null
      let parsed: IDictationAiReviewResponse | null = null

      // 1. Try Gemini
      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey })
          for (const model of GEMINI_MODELS) {
            try {
              const response = await generateContentWithTracking(ai, 'Dictation Review', {
                model,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                },
              })

              const text = response.text || ''
              if (text) {
                const res = safeParseJson(text)
                if (res) {
                  parsed = res
                  break
                }
              }
            } catch (err: any) {
              lastError = err
              console.warn(`[DictationReview] Gemini model ${model} failed, trying next...`, err)
            }
          }
        } catch (geminiInitErr: any) {
          lastError = geminiInitErr
          console.warn('[DictationReview] Gemini init failed:', geminiInitErr)
        }
      }

      // 2. Fallback to OpenAI
      if (!parsed && openAiApiKey) {
        try {
          const openai = new OpenAI({ apiKey: openAiApiKey, dangerouslyAllowBrowser: true })
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert bilingual English-Vietnamese language tutor evaluating English listening dictation practice.',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          })

          const openAiText = completion.choices[0]?.message?.content || ''
          if (openAiText) {
            parsed = safeParseJson(openAiText)
          }
        } catch (openAiErr: any) {
          lastError = openAiErr
          console.warn('[DictationReview] OpenAI fallback failed:', openAiErr)
        }
      }

      if (!parsed) {
        throw lastError || new Error('Không thể nhận phản hồi từ AI.')
      }

      return {
        isSuccess: true,
        content: parsed,
        message: 'Đánh giá câu trả lời thành công',
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('[DictationReview] Error:', error)
      return {
        isSuccess: false,
        content: null,
        message: error?.message || 'Không thể đánh giá câu trả lời lúc này.',
        statusCode: 500,
      }
    }
  },
}
