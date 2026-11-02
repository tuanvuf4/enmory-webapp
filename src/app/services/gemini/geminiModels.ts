export const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
] as const

export type TGeminiModel = (typeof GEMINI_MODELS)[number]

/**
 * Model mặc định được ưu tiên sử dụng
 */
export const DEFAULT_GEMINI_MODEL: TGeminiModel = 'gemini-3.8-flash'

/**
 * Model mặc định chuyên biệt và phù hợp nhất cho chức năng Auto Fill từ điển
 */
export const DEFAULT_AUTOFILL_MODEL: TGeminiModel = 'gemini-3.8-flash'

/**
 * Model mặc định cho User Settings toàn hệ thống
 */
export const DEFAULT_USER_AI_MODEL: TGeminiModel = 'gemini-3.8-flash'

/**
 * Tên event phát ra khi người dùng đổi model AI mặc định
 */
export const AI_MODEL_CHANGE_EVENT = 'enmory_default_ai_model_changed'

/**
 * Key lưu model AI mặc định trong localStorage
 */
export const AI_MODEL_STORAGE_KEY = 'enmory_default_ai_model'

/**
 * Danh sách model khuyên dùng cho chức năng Auto Fill
 */
export const GEMINI_AUTOFILL_MODELS = GEMINI_MODELS

/**
 * Alias danh sách models ứng viên để tương thích ngược với các code gọi cũ
 */
export const CANDIDATE_GEMINI_MODELS = GEMINI_MODELS
export const GEMINI_CANDIDATE_MODELS = GEMINI_MODELS

/**
 * Cấu hình hiển thị lựa chọn model trên giao diện người dùng
 */
export interface IGeminiModelOption {
  value: TGeminiModel
  label: string
  desc?: string
}

export const GEMINI_MODEL_OPTIONS: IGeminiModelOption[] = [
  {
    value: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash', // (High - Khuyên dùng)
    desc: 'Năng lực suy luận cao, tối ưu tra cứu từ điển chuyên sâu, chuẩn IPA và nghĩa chính xác',
  },
  {
    value: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash', // (Tiêu chuẩn)
    desc: 'Cân bằng giữa tốc độ phản hồi và độ chính xác',
  },
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash', // (Tiết kiệm token)
    desc: 'Phản hồi siêu nhanh, tiêu thụ ít token & quota nhất',
  },
  {
    value: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite', // (Tiết kiệm token)
    desc: 'Phản hồi siêu nhanh, tiêu thụ ít token & quota nhất',
  },
  {
    value: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite', // (Tiêu chuẩn)
    desc: 'Gọn nhẹ, tiết kiệm tài nguyên',
  },
  {
    value: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview', // (Bản thử nghiệm)
    desc: 'Phiên bản thử nghiệm tối ưu tốc độ',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    desc: 'Phiên bản gọn nhẹ, phản hồi âm thanh siêu tốc',
  },
]

/**
 * Alias tương thích ngược cho GenerateTranscriptModal
 */
export const GEMINI_TRANSCRIPT_MODELS = GEMINI_MODEL_OPTIONS

/**
 * Danh sách Gemini Models chuyên biệt khuyên dùng cho thu âm & đánh giá phát âm (Speech Assessment):
 * Hỗ trợ nhận diện âm thanh đa phương thức (multimodal audio), phân tích nối âm, trọng âm, ngữ điệu và shadowing.
 */
export const GEMINI_SPEECH_EVAL_MODELS: IGeminiModelOption[] = [
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Phản hồi cực nhanh - Khuyên dùng cho Audio)',
    desc: 'Xử lý âm thanh đa phương thức siêu nhanh, giảm độ trễ tối đa và ổn định',
  },
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash (Cân bằng)',
    desc: 'Tốc độ phản hồi tốt, tiết kiệm token',
  },
  {
    value: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash (Chuyên sâu)',
    desc: 'Suy luận âm thanh đa phương thức sâu sắc, nhận diện nối âm, trọng âm, ngữ điệu chi tiết',
  },
  {
    value: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash (Tiêu chuẩn)',
    desc: 'Cân bằng giữa tốc độ phân tích và độ chính xác ngữ âm',
  },
]

export const DEFAULT_SPEECH_EVAL_MODEL: TGeminiModel = 'gemini-2.5-flash'

/**
 * Lấy model AI mặc định từ User Setting / localStorage
 */
export const getUserDefaultAiModel = (
  fallback: TGeminiModel = DEFAULT_USER_AI_MODEL,
): TGeminiModel => {
  if (typeof window === 'undefined') return fallback
  try {
    const saved =
      localStorage.getItem(AI_MODEL_STORAGE_KEY) || localStorage.getItem('gemini_model') || ''
    if (saved && (GEMINI_MODELS as readonly string[]).includes(saved)) {
      return saved as TGeminiModel
    }
  } catch {}
  return fallback
}

/**
 * Lưu model AI mặc định vào User Setting (localStorage & dispatch event)
 */
export const setUserDefaultAiModel = (model: TGeminiModel): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AI_MODEL_STORAGE_KEY, model)
    window.dispatchEvent(new CustomEvent(AI_MODEL_CHANGE_EVENT, { detail: model }))
  } catch (e) {
    console.warn('Failed to save default AI model:', e)
  }
}

/**
 * Xây dựng chuỗi fallback models: Model người dùng chọn đứng ĐẦU TIÊN,
 * nếu model đó lỗi (hết hạn mức Free Tier, 429...) thì tuần tự gọi ngầm các model tiếp theo.
 */
export const buildFallbackModelChain = (
  preferredModel?: TGeminiModel,
  category: 'general' | 'speech' | 'tts' = 'general',
): TGeminiModel[] => {
  const defaultFallback = category === 'speech' ? DEFAULT_SPEECH_EVAL_MODEL : DEFAULT_USER_AI_MODEL
  const initial = preferredModel || getUserDefaultAiModel(defaultFallback)

  let candidates: TGeminiModel[] = []
  if (category === 'speech') {
    candidates = [
      initial,
      'gemini-2.5-flash',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
    ]
  } else {
    candidates = [
      initial,
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
    ]
  }

  // Loại bỏ trùng lặp và giữ nguyên thứ tự ưu tiên
  return Array.from(new Set(candidates))
}

/**
 * Danh sách Gemini TTS Models chuẩn hóa chuyên biệt cho tạo âm thanh (speech/audio):
 */
export const GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
] as const

export type TGeminiTtsModel = (typeof GEMINI_TTS_MODELS)[number]
