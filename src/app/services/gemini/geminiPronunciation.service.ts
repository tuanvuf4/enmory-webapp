import { GoogleGenAI } from '@google/genai'
import { IHttpResponse } from '@/models/http.model'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { CANDIDATE_GEMINI_MODELS, DEFAULT_SPEECH_EVAL_MODEL, TGeminiModel } from './geminiModels'

export interface IWordEvaluation {
  word: string
  status: 'correct' | 'imprecise' | 'incorrect'
  ipa?: string
  note?: string
}

export interface ITechniqueEvaluation {
  score: number // 0-100
  feedback: string // Đánh giá nhận xét tiếng Việt
  details?: string // Chi tiết ví dụ cụ thể
}

export interface IPronunciationEvaluationResult {
  overallScore: number // 0-100
  transcribedText: string // AI nghe được câu gì từ audio
  overallFeedback: string // Lời nhận xét tổng quan ấm áp, khích lệ
  techniques: {
    linking: ITechniqueEvaluation // Nối âm (consonant-vowel, vowel-vowel, elision)
    stress: ITechniqueEvaluation // Trọng âm từ & trọng âm câu (nhấn content words, lướt function words)
    intonation: ITechniqueEvaluation // Ngữ điệu (lên/xuống giọng, cảm xúc)
    shadowing: ITechniqueEvaluation // Nhịp điệu, ngắt nghỉ theo cụm, tốc độ và độ mượt mà
  }
  wordsReview?: IWordEvaluation[] // Đánh giá từng từ cụ thể
  actionableTips: string[] // Mẹo cải thiện ngay lập tức
  modelUsed?: string // Model đã phản hồi thành công
}

export interface IEvaluatePronunciationParams {
  audioBlob: Blob
  originalText: string
  translation?: string
  preferredModel?: TGeminiModel
}

/**
 * Chuyển đổi Blob audio sang chuỗi Base64
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const commaIndex = result.indexOf(',')
      resolve(commaIndex !== -1 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(blob)
  })
}

/**
 * Chuẩn hóa MIME type cho Gemini inlineData
 */
const normalizeMimeType = (mimeType?: string): string => {
  if (!mimeType) return 'audio/webm'
  const clean = mimeType.split(';')[0].trim().toLowerCase()
  if (clean.includes('webm')) return 'audio/webm'
  if (clean.includes('mp4')) return 'audio/mp4'
  if (clean.includes('ogg')) return 'audio/ogg'
  if (clean.includes('wav')) return 'audio/wav'
  if (clean.includes('mp3') || clean.includes('mpeg')) return 'audio/mp3'
  if (clean.includes('aac')) return 'audio/aac'
  return clean || 'audio/webm'
}

/**
 * Parse an toàn kết quả JSON từ Gemini
 */
const safeParseJson = (text: string): IPronunciationEvaluationResult | null => {
  if (!text) return null
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    // Trích xuất từ markdown block nếu có
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
      console.warn('[PronunciationEvaluation] safeParseJson extraction failed:', e)
    }
  }
  return null
}

export const geminiPronunciationService = {
  /**
   * Đánh giá và nhận xét thu âm phát âm tiếng Anh toàn diện qua Gemini AI
   */
  evaluateAudio: async (
    params: IEvaluatePronunciationParams,
  ): Promise<IHttpResponse<IPronunciationEvaluationResult>> => {
    try {
      const apiKey = resolveGeminiApiKey()
      if (!apiKey) {
        return {
          isSuccess: false,
          content: null,
          message:
            'Chưa cấu hình Gemini API Key. Vui lòng thêm VITE_GEMINI_API_KEY trong file .env hoặc lưu vào cài đặt.',
          statusCode: 400,
        }
      }

      const cleanOriginal = (params.originalText || '').trim()
      const cleanTranslation = (params.translation || '').trim()

      if (!cleanOriginal) {
        return {
          isSuccess: false,
          content: null,
          message: 'Không tìm thấy câu mẫu để đối chiếu phát âm.',
          statusCode: 400,
        }
      }

      if (!params.audioBlob || params.audioBlob.size === 0) {
        return {
          isSuccess: false,
          content: null,
          message: 'Không có dữ liệu âm thanh thu âm. Vui lòng thu âm lại.',
          statusCode: 400,
        }
      }

      // Convert audio to Base64
      const base64Data = await blobToBase64(params.audioBlob)
      const mimeType = normalizeMimeType(params.audioBlob.type)

      const prompt = `You are an elite bilingual English-Vietnamese pronunciation specialist, phonetician, and speech coach.

A Vietnamese student was tasked with reading aloud the following English sentence:
Target Sentence: "${cleanOriginal}"
${cleanTranslation ? `Vietnamese Translation: "${cleanTranslation}"\n` : ''}

Your mission:
Listen carefully to the student's attached audio recording and provide a comprehensive evaluation combining all 4 core spoken English techniques:
1. **Nối âm (Connected Speech / Linking)**:
   - Check consonant-to-vowel links, vowel-to-vowel linking glides (/w/, /j/), soft elisions, or contractions.
   - Did the user connect words naturally, or did they pause robotically after each word?
2. **Trọng âm (Word & Sentence Stress)**:
   - Did the student emphasize content words (nouns, main verbs, adjectives) and reduce function words (prepositions, articles, auxiliaries)?
   - Did they place tonic/nuclear stress appropriately?
3. **Ngữ điệu (Intonation)**:
   - Pitch movement: Did their voice rise (↗) appropriately for questions/lists, or fall (↘) naturally for statements/WH-questions?
   - Was their intonation expressive and lively, or flat/monotone?
4. **Shadowing / Nhịp điệu & Lưu loát (Rhythm, Pausing & Fluency)**:
   - Pausing at meaningful thought groups (chunking).
   - Speed, cadence, absence of awkward hesitation, mimicking native flow.

Also transcribe accurately what you heard the student say in the audio.

Return ONLY a valid JSON object matching this schema exactly (no outside markdown text):
{
  "overallScore": 85,
  "transcribedText": "transcribed speech of the student",
  "overallFeedback": "Tóm tắt đánh giá tổng quan bằng tiếng Việt (1-2 câu ấm áp, khích lệ)",
  "techniques": {
    "linking": {
      "score": 80,
      "feedback": "Nhận xét tiếng Việt về kỹ thuật nối âm của người học",
      "details": "Chỉ rõ từ nào đã nối tốt và cặp từ nào bị đứt quãng hoặc cần cải thiện"
    },
    "stress": {
      "score": 85,
      "feedback": "Nhận xét tiếng Việt về trọng âm câu và từ",
      "details": "Chỉ rõ từ nội dung nào đã nhấn tốt, từ nào chưa giảm âm đúng"
    },
    "intonation": {
      "score": 80,
      "feedback": "Nhận xét tiếng Việt về độ lên/xuống giọng và cảm xúc",
      "details": "Độ chuẩn của âm điệu cuối câu (lên giọng hay xuống giọng)"
    },
    "shadowing": {
      "score": 90,
      "feedback": "Nhận xét tiếng Việt về độ trôi chảy, nhịp điệu và ngắt nghỉ theo cụm",
      "details": "Tốc độ nói, sự ngắt nghỉ tự nhiên theo cụm nghĩa"
    }
  },
  "wordsReview": [
    {
      "word": "wordName",
      "status": "correct" | "imprecise" | "incorrect",
      "ipa": "/.../",
      "note": "Ghi chú ngắn bằng tiếng Việt về cách phát âm từ này (âm cuối, nguyên âm...)"
    }
  ],
  "actionableTips": [
    "Mẹo 1 bằng tiếng Việt ngắn gọn, dễ thực hiện",
    "Mẹo 2 bằng tiếng Việt"
  ]
}`

      const preferred = params.preferredModel || DEFAULT_SPEECH_EVAL_MODEL
      const modelCandidates = [preferred, ...CANDIDATE_GEMINI_MODELS.filter((m) => m !== preferred)]

      const ai = new GoogleGenAI({ apiKey })
      let lastError: any = null
      let parsedResult: IPronunciationEvaluationResult | null = null
      let successModel: string = preferred

      for (const model of modelCandidates) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          })

          const text = response.text || ''
          if (text) {
            const parsed = safeParseJson(text)
            if (parsed && typeof parsed.overallScore === 'number') {
              parsedResult = {
                ...parsed,
                modelUsed: model,
              }
              successModel = model
              break
            }
          }
        } catch (err: any) {
          lastError = err
          console.warn(
            `[PronunciationEvaluation] Model ${model} failed, attempting next fallback...`,
            err,
          )
        }
      }

      if (!parsedResult) {
        throw lastError || new Error('Không thể phân tích dữ liệu âm thanh từ các mô hình Gemini.')
      }

      return {
        isSuccess: true,
        content: parsedResult,
        message: `Đánh giá phát âm thành công qua ${successModel}`,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('[PronunciationEvaluation] Error:', error)
      return {
        isSuccess: false,
        content: null,
        message:
          error?.message ||
          'Không thể hoàn thành đánh giá thu âm phát âm vào lúc này. Vui lòng thử lại.',
        statusCode: 500,
      }
    }
  },
}
