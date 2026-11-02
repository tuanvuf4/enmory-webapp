import { GoogleGenAI } from '@google/genai'
import { TGeminiModel, buildFallbackModelChain } from './geminiModels'
import { generateContentWithTracking } from './geminiTracker.service'

const keyCooldownMap = new Map<string, number>()

/**
 * Đánh dấu một API key đang bị Rate Limit để tạm thời bỏ qua trong các request tiếp theo
 */
export const markGeminiKeyRateLimited = (apiKey: string, durationMs: number = 30000): void => {
  if (!apiKey) return
  keyCooldownMap.set(apiKey, Date.now() + durationMs)
}

/**
 * Lấy tất cả các Gemini API Keys từ mọi nguồn cấu hình (.env, localStorage, etc.)
 */
export const resolveGeminiApiKeys = (): string[] => {
  const rawSources = [
    typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_keys') || '' : '',
    typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '',
    typeof localStorage !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '',
    typeof localStorage !== 'undefined' ? localStorage.getItem('enmory_gemini_api_key') || '' : '',
    (import.meta as any).env?.VITE_GEMINI_API_KEYS || '',
    (import.meta as any).env?.VITE_GEMINI_API_KEY || '',
  ]

  const keys: string[] = []
  for (const raw of rawSources) {
    if (!raw) continue
    const parts = (raw as string)
      .split(/[\n,;]+/)
      .map((k: string) => k.trim())
      .filter(Boolean)
    for (const part of parts) {
      if (part && !keys.includes(part)) {
        keys.push(part)
      }
    }
  }

  return keys
}

/**
 * Lấy danh sách API Keys sẵn sàng sử dụng (ưu tiên các key chưa bị cooldown rate limit)
 */
export const getAvailableGeminiKeys = (): string[] => {
  const now = Date.now()
  const allKeys = resolveGeminiApiKeys()
  if (allKeys.length <= 1) return allKeys

  const activeKeys = allKeys.filter((k) => {
    const expire = keyCooldownMap.get(k)
    return !expire || expire <= now
  })
  return activeKeys.length > 0 ? activeKeys : allKeys
}

/**
 * Lấy một API key khả dụng
 */
export const resolveGeminiApiKey = (): string => {
  const available = getAvailableGeminiKeys()
  if (available.length > 0) return available[0]
  const all = resolveGeminiApiKeys()
  return all[0] || ''
}

/**
 * Trích xuất an toàn text từ response của Google GenAI SDK
 */
export const extractTextFromGenAIResponse = (response: any): string => {
  if (!response) return ''
  if (typeof response.text === 'string') return response.text
  if (typeof response.text === 'function') {
    try {
      const val = response.text()
      if (typeof val === 'string') return val
    } catch {}
  }
  const candidate = response.candidates?.[0]
  const parts = candidate?.content?.parts
  if (Array.isArray(parts)) {
    return parts.map((p: any) => p.text || '').join('')
  }
  return ''
}

/**
 * Kiểm tra xem lỗi có phải do chạm hạn mức / Rate Limit (HTTP 429, RESOURCE_EXHAUSTED, Quota) hay không
 */
export const isRateLimitError = (err: any): boolean => {
  if (!err) return false
  const status = err.status || err.statusCode || err.response?.status
  if (status === 429) return true
  const msg = String(err.message || err.error?.message || err).toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('too many requests')
  )
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface IGenerateContentWithFallbackOptions {
  serviceName: string
  preferredModel?: TGeminiModel
  candidateModels?: TGeminiModel[]
  category?: 'general' | 'speech' | 'tts'
  requestParams: {
    contents: any
    config?: any
    [key: string]: any
  }
  apiKey?: string
  /**
   * Hàm kiểm tra tính hợp lệ của chuỗi trả về. Nếu trả về false, hệ thống sẽ tiếp tục fallback sang model kế tiếp.
   */
  validateResponse?: (text: string, response: any) => boolean
}

export interface IGenerateContentWithFallbackResult {
  response: any
  text: string
  modelUsed: TGeminiModel
  fallbackCount: number
}

/**
 * Gọi Gemini AI với cơ chế Resilient Multi-Model Fallback:
 * - Bắt đầu bằng model người dùng chọn trong User Settings (hoặc preferredModel nếu có).
 * - Nếu model đó thất bại (do 429 Rate Limit, Quota Exceeded trên gói Free Tier, 503 Quá tải, hoặc trả về format không hợp lệ):
 *   Tự động và tuần tự gọi ngầm (silent fallback) các model khác trong chuỗi ứng viên cho đến khi thành công.
 * - Hỗ trợ tự động xoay API Key (Key Rotation) nếu có nhiều key được cấu hình.
 */
export async function generateContentWithFallback(
  options: IGenerateContentWithFallbackOptions,
): Promise<IGenerateContentWithFallbackResult> {
  const {
    serviceName,
    preferredModel,
    candidateModels,
    category = 'general',
    requestParams,
    validateResponse,
  } = options

  // 1. Xác định chuỗi fallback models: Model mặc định đứng đầu
  const modelChain =
    candidateModels && candidateModels.length > 0
      ? candidateModels
      : buildFallbackModelChain(preferredModel, category)

  // 2. Lấy danh sách API keys
  let keys = options.apiKey ? [options.apiKey] : getAvailableGeminiKeys()
  if (keys.length === 0) {
    const singleKey = resolveGeminiApiKey()
    if (singleKey) keys = [singleKey]
  }

  if (keys.length === 0) {
    throw new Error(
      'Chưa cấu hình Gemini API Key. Vui lòng thêm VITE_GEMINI_API_KEY trong file .env hoặc lưu vào cài đặt.',
    )
  }

  let lastError: any = null
  let fallbackCount = 0

  // 3. Thử lần lượt qua chuỗi models
  for (const model of modelChain) {
    // Duyệt qua các keys sẵn sàng (ưu tiên key chưa bị rate limit)
    for (let k = 0; k < keys.length; k++) {
      const apiKey = keys[k]
      try {
        const ai = new GoogleGenAI({ apiKey })

        const response = await generateContentWithTracking(ai, serviceName, {
          ...requestParams,
          model,
        })

        const text = extractTextFromGenAIResponse(response)

        // Nếu caller có cung cấp hàm kiểm tra tính hợp lệ của response
        if (validateResponse && !validateResponse(text, response)) {
          throw new Error(
            `Phản hồi từ model ${model} không hợp lệ (không đúng format/JSON mong đợi).`,
          )
        }

        // Thành công!
        return {
          response,
          text,
          modelUsed: model,
          fallbackCount,
        }
      } catch (err: any) {
        lastError = err
        const is429 = isRateLimitError(err)

        if (is429) {
          markGeminiKeyRateLimited(apiKey)
        }

        console.warn(
          `[GeminiFallback] "${serviceName}" với model "${model}" thất bại (${err?.message || err}). Đang gọi ngầm model dự phòng tiếp theo...`,
        )

        // Nếu còn key khác cho cùng model này và lỗi là 429, thử key tiếp theo trước khi đổi model
        if (is429 && k < keys.length - 1) {
          continue
        }

        // Nếu là lỗi 429, chờ nhẹ 800ms để tránh bão request dồn dập
        if (is429) {
          await sleep(800)
        }

        break // Chuyển sang model tiếp theo trong chuỗi fallback
      }
    }

    fallbackCount++
  }

  // Nếu tất cả các model đều thất bại
  if (isRateLimitError(lastError)) {
    throw new Error(
      'Tất cả các mô hình AI đang chạm giới hạn hạn mức (Rate Limit / Quota Exceeded trên gói Free Tier). Vui lòng đợi khoảng 15-20 giây rồi thử lại, hoặc thêm API Key dự phòng trong cài đặt.',
    )
  }

  throw lastError || new Error(`Không thể hoàn thành yêu cầu AI "${serviceName}".`)
}
