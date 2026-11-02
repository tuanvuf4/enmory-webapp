import { IHttpResponse } from '@/models/http.model'
import { TGeminiModel } from './geminiModels'
import { generateContentWithFallback, isRateLimitError } from './geminiCore.service'

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
 * Vá chuỗi JSON bị ngắt ngang do giới hạn output tokens
 */
const repairTruncatedJson = (jsonStr: string): string => {
  let str = jsonStr.trim()
  // Loại bỏ các trailing comma
  str = str.replace(/,\s*([}\]])/g, '$1')

  const openBraces = (str.match(/\{/g) || []).length
  const closeBraces = (str.match(/\}/g) || []).length
  const openBrackets = (str.match(/\[/g) || []).length
  const closeBrackets = (str.match(/\]/g) || []).length

  if (openBraces > closeBraces || openBrackets > closeBrackets) {
    // Đóng dấu ngoặc kép nếu đang mở dở
    const quotes = (str.match(/"/g) || []).length
    if (quotes % 2 !== 0) {
      str += '"'
    }
    // Xóa dấu phẩy lửng ở cuối
    str = str.replace(/,\s*$/, '')

    // Đóng các ngoặc vuông và ngoặc nhọn còn thiếu
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      str += ']'
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      str += '}'
    }
  }

  return str
}

/**
 * Chuẩn hóa dữ liệu đánh giá từ object thô của Gemini
 */
const normalizeEvaluationResult = (raw: any): IPronunciationEvaluationResult | null => {
  if (!raw || typeof raw !== 'object') return null

  // Chấp nhận overallScore dù là số hay chuỗi, hoặc các alias
  const rawScore = raw.overallScore ?? raw.overall_score ?? raw.score ?? raw.totalScore
  const overallScore = Number(rawScore)
  if (isNaN(overallScore)) return null

  const getTechnique = (tech: any, fallbackName: string): ITechniqueEvaluation => {
    if (tech && typeof tech === 'object') {
      return {
        score: Math.min(100, Math.max(0, Math.round(Number(tech.score) || 75))),
        feedback: String(tech.feedback || tech.comment || `Kỹ thuật ${fallbackName} đạt yêu cầu`),
        details: tech.details ? String(tech.details) : undefined,
      }
    }
    return {
      score: 75,
      feedback: `Kỹ thuật ${fallbackName} tương đối tốt`,
    }
  }

  const rawTech = raw.techniques || {}

  return {
    overallScore: Math.min(100, Math.max(0, Math.round(overallScore))),
    transcribedText: String(raw.transcribedText || raw.transcribed_text || raw.transcript || ''),
    overallFeedback: String(
      raw.overallFeedback ||
        raw.overall_feedback ||
        raw.feedback ||
        'Bạn đã hoàn thành tốt phần phát âm câu luyện tập!',
    ),
    techniques: {
      linking: getTechnique(rawTech.linking || rawTech.connected_speech, 'nối âm'),
      stress: getTechnique(rawTech.stress || rawTech.word_stress, 'trọng âm'),
      intonation: getTechnique(rawTech.intonation, 'ngữ điệu'),
      shadowing: getTechnique(rawTech.shadowing || rawTech.fluency, 'shadowing'),
    },
    wordsReview: Array.isArray(raw.wordsReview || raw.words_review)
      ? (raw.wordsReview || raw.words_review).map((w: any) => ({
          word: String(w.word || ''),
          status: w.status === 'imprecise' || w.status === 'incorrect' ? w.status : 'imprecise',
          ipa: w.ipa ? String(w.ipa) : undefined,
          note: w.note ? String(w.note) : undefined,
        }))
      : [],
    actionableTips: Array.isArray(raw.actionableTips || raw.actionable_tips || raw.tips)
      ? (raw.actionableTips || raw.actionable_tips || raw.tips).map(String)
      : ['Luyện tập phát âm đều đặn để cải thiện độ tự nhiên.'],
  }
}

/**
 * Parse an toàn kết quả JSON từ Gemini với cơ chế tự phục hồi
 */
export const safeParseJson = (text: string): IPronunciationEvaluationResult | null => {
  if (!text) return null
  const trimmed = text.trim()

  // 1. Thử parse trực tiếp
  try {
    const raw = JSON.parse(trimmed)
    const norm = normalizeEvaluationResult(raw)
    if (norm) return norm
  } catch {}

  // 2. Trích xuất từ markdown codeblock (```json ... ```)
  try {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (match && match[1]) {
      const raw = JSON.parse(match[1].trim())
      const norm = normalizeEvaluationResult(raw)
      if (norm) return norm
    }
  } catch {}

  // 3. Trích xuất giữa ngoặc { đầu tiên và } cuối cùng
  try {
    const first = trimmed.indexOf('{')
    const last = trimmed.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) {
      const extracted = trimmed.slice(first, last + 1)
      const raw = JSON.parse(extracted)
      const norm = normalizeEvaluationResult(raw)
      if (norm) return norm
    }
  } catch {}

  // 4. Thử tự phục hồi chuỗi JSON bị ngắt ngang (Truncated JSON repair)
  try {
    const first = trimmed.indexOf('{')
    if (first !== -1) {
      const candidate = trimmed.slice(first)
      const repaired = repairTruncatedJson(candidate)
      const raw = JSON.parse(repaired)
      const norm = normalizeEvaluationResult(raw)
      if (norm) return norm
    }
  } catch (e) {
    console.warn('[PronunciationEvaluation] safeParseJson repair extraction failed:', e)
  }

  return null
}

export const geminiPronunciationService = {
  /**
   * Đánh giá và nhận xét thu âm phát âm tiếng Anh toàn diện qua Gemini AI
   * Hỗ trợ tự động chuyển model ngầm (silent fallback) khi chạm hạn mức Free tier (429) hoặc khi model sinh format lỗi
   */
  evaluateAudio: async (
    params: IEvaluatePronunciationParams,
  ): Promise<IHttpResponse<IPronunciationEvaluationResult>> => {
    try {
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

CRITICAL RULES FOR PERFORMANCE & SPEED:
- Keep all feedback concise (1-2 sentences per field).
- For "wordsReview", ONLY return words that need improvement (status is "imprecise" or "incorrect"). Do NOT include words that were pronounced well to prevent unnecessary token generation latency. If all words were pronounced well, return "wordsReview": [].
- Provide at most 2 short actionable tips.
- Scores must be numbers between 0 and 100.

Return ONLY a valid JSON object matching this schema exactly (no outside markdown text):
{
  "overallScore": 85,
  "transcribedText": "transcribed speech of the student",
  "overallFeedback": "Tóm tắt đánh giá tổng quan bằng tiếng Việt (1-2 câu ấm áp, khích lệ)",
  "techniques": {
    "linking": {
      "score": 80,
      "feedback": "Nhận xét ngắn về kỹ thuật nối âm",
      "details": "Chỉ rõ cặp từ nối tốt hoặc bị đứt quãng"
    },
    "stress": {
      "score": 85,
      "feedback": "Nhận xét ngắn về trọng âm câu và từ",
      "details": "Từ nội dung đã nhấn tốt hoặc chưa giảm âm"
    },
    "intonation": {
      "score": 80,
      "feedback": "Nhận xét ngắn về ngữ điệu",
      "details": "Độ chuẩn âm điệu cuối câu"
    },
    "shadowing": {
      "score": 90,
      "feedback": "Nhận xét ngắn về độ trôi chảy & ngắt nghỉ",
      "details": "Tốc độ nói, ngắt nghỉ theo cụm nghĩa"
    }
  },
  "wordsReview": [
    {
      "word": "impreciseOrIncorrectWord",
      "status": "imprecise" | "incorrect",
      "ipa": "/.../",
      "note": "Ghi chú ngắn về cách sửa từ này"
    }
  ],
  "actionableTips": [
    "Mẹo 1 ngắn gọn",
    "Mẹo 2 ngắn gọn"
  ]
}`

      const { text, modelUsed } = await generateContentWithFallback({
        serviceName: 'Pronunciation Evaluation',
        preferredModel: params.preferredModel,
        category: 'speech',
        validateResponse: (candidateText: string) => {
          // Xác thực nếu response parse được thành kết quả hợp lệ, nếu không sẽ gọi ngầm model tiếp theo
          return safeParseJson(candidateText) !== null
        },
        requestParams: {
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
            temperature: 0.1,
            maxOutputTokens: 2048, // Tăng token tránh bị cắt ngang dở dang
          },
        },
      })

      const parsed = safeParseJson(text)
      if (!parsed) {
        throw new Error('Dữ liệu phân tích ngữ âm từ Gemini trả về không đúng định dạng JSON.')
      }

      return {
        isSuccess: true,
        content: {
          ...parsed,
          modelUsed,
        },
        message: `Đánh giá phát âm thành công qua ${modelUsed}`,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('[PronunciationEvaluation] Error:', error)
      const is429 = isRateLimitError(error)
      return {
        isSuccess: false,
        content: null,
        message:
          error?.message ||
          'Không thể hoàn thành đánh giá thu âm phát âm vào lúc này. Vui lòng thử lại.',
        statusCode: is429 ? 429 : 500,
      }
    }
  },
}
