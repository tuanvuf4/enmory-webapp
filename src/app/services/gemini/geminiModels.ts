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
    label: 'Gemini 3.5 Flash', // (Tiêu chuẩn)
    desc: 'Cân bằng giữa tốc độ phản hồi và độ chính xác',
  },
  {
    value: 'gemini-3-flash-preview',
    label: 'Gemini 3.5 Flash Lite', // (Tiết kiệm token)
    desc: 'Phản hồi siêu nhanh, tiêu thụ ít token & quota nhất',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    desc: 'Phiên bản gọn nhẹ fallback',
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
    value: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash (Tối ưu nhất)',
    desc: 'Suy luận âm thanh đa phương thức vượt trội, nhận diện nối âm, trọng âm, ngữ điệu chính xác nhất',
  },
  {
    value: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash (Tiêu chuẩn)',
    desc: 'Cân bằng giữa tốc độ phân tích và độ chính xác ngữ âm',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Ổn định)',
    desc: 'Đa phương thức thế hệ 2.5, ổn định và xử lý audio mượt mà',
  },
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash (Tiết kiệm)',
    desc: 'Tốc độ phản hồi cực nhanh, tiết kiệm token',
  },
]

export const DEFAULT_SPEECH_EVAL_MODEL: TGeminiModel = 'gemini-3.8-flash'

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
