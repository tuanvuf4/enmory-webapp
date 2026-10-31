import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { IHttpResponse } from '@/models/http.model'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { resolveOpenAiApiKey } from '../openai/tts.service'
import { GEMINI_MODELS } from './geminiModels'
import { generateContentWithTracking } from './geminiTracker.service'

export interface ITranslationReviewRequest {
  sourceText: string
  referenceText: string
  userTranslation: string
  direction?: 'vi-en' | 'en-vi'
}

export interface ITranslationReviewResponse {
  score: number // 0-100
  verdict: 'excellent' | 'good' | 'acceptable' | 'needs_improvement'
  isAccurate: boolean
  feedback: string // Detailed evaluation in Vietnamese
  grammarFeedback?: string
  betterAlternatives: string[]
}

const safeParseJson = (text: string): ITranslationReviewResponse | null => {
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
      console.warn('[TranslationReview] safeParseJson extraction failed:', e)
    }
  }
  return null
}

export const geminiTranslationReviewService = {
  reviewTranslation: async (
    params: ITranslationReviewRequest,
  ): Promise<IHttpResponse<ITranslationReviewResponse>> => {
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

      const cleanUser = (params.userTranslation || '').trim()
      const cleanSource = (params.sourceText || '').trim()
      const cleanReference = (params.referenceText || '').trim()

      if (!cleanUser) {
        return {
          isSuccess: false,
          content: null,
          message: 'Vui lòng nhập bản dịch của bạn trước khi yêu cầu AI chấm điểm.',
          statusCode: 400,
        }
      }

      const prompt = `You are a warm, expert bilingual English-Vietnamese language tutor and translation evaluator.

Task: Evaluate a student's translation practice.
- Source Sentence (Vietnamese): "${cleanSource}"
- Reference Sentence (English): "${cleanReference}"
- Student's Translation (English): "${cleanUser}"

Evaluation criteria:
1. Semantic Accuracy: Does the student's translation accurately convey the source meaning? Note that students don't need to match the reference sentence word-for-word if their translation is accurate and natural.
2. Grammar & Spelling: Check verb tenses, subject-verb agreement, prepositions, articles (a/an/the), and spelling.
3. Naturalness & Tone: Does it sound like natural, idiomatic English?
4. Alternatives: Provide 1 to 3 natural ways to translate this sentence in English.

Rating scale:
- score: 0 to 100
- verdict: "excellent" (90-100), "good" (75-89), "acceptable" (60-74), "needs_improvement" (<60)
- isAccurate: true if meaning is essentially correct (score >= 70)
- feedback: A concise, constructive explanation in Vietnamese (2-3 sentences), encouraging the student and highlighting why their translation is good or what small correction is needed.
- grammarFeedback: Specific grammar or word choice note if there is an error, or empty string if error-free.
- betterAlternatives: Array of 1-3 natural English phrases or sentences.

Return ONLY valid JSON matching this schema:
{
  "score": 92,
  "verdict": "excellent",
  "isAccurate": true,
  "feedback": "Bản dịch của bạn rất chính xác và tự nhiên...",
  "grammarFeedback": "",
  "betterAlternatives": ["...", "..."]
}`

      let lastError: any = null
      let parsed: ITranslationReviewResponse | null = null

      // 1. Try Gemini
      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey })
          for (const model of GEMINI_MODELS) {
            try {
              const response = await generateContentWithTracking(ai, 'Translation Review', {
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
              console.warn(`[TranslationReview] Gemini model ${model} failed, trying next...`, err)
            }
          }
        } catch (geminiInitErr: any) {
          lastError = geminiInitErr
          console.warn('[TranslationReview] Gemini init failed:', geminiInitErr)
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
                  'You are an expert bilingual English-Vietnamese language tutor evaluating translation practice.',
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
          console.warn('[TranslationReview] OpenAI fallback failed:', openAiErr)
        }
      }

      if (!parsed) {
        throw lastError || new Error('Không thể nhận phản hồi từ AI.')
      }

      return {
        isSuccess: true,
        content: parsed,
        message: 'Đánh giá bản dịch thành công',
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('[TranslationReview] Error:', error)
      return {
        isSuccess: false,
        content: null,
        message: error?.message || 'Không thể đánh giá bản dịch lúc này.',
        statusCode: 500,
      }
    }
  },
}
