/**
 * Centralized Gemini model configuration for Enmory Web App.
 *
 * Sắp xếp theo thứ tự ưu tiên từ model thấp / nhẹ / tiết kiệm token đến model cao hơn:
 * 1. gemini-3.5-flash-lite : Nhẹ nhất, tiêu thụ ít token & quota nhất, phản hồi nhanh.
 * 2. gemini-3.5-flash      : Cân bằng, chuẩn flash thế hệ mới.
 * 3. gemini-2.5-flash      : Gọn nhẹ (fallback).
 * 4. gemini-3.8-flash      : Năng lực cao (High tier).
 * 5. gemini-flash-latest   : Fallback tới phiên bản flash ổn định mới nhất.
 */

export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
] as const

export type TGeminiModel = (typeof GEMINI_MODELS)[number]

/**
 * Backward-compatibility alias cho TGeminiTranscriptModel
 */
export type TGeminiTranscriptModel = TGeminiModel

/**
 * Model mặc định được ưu tiên sử dụng (model thấp/nhẹ nhất để tiết kiệm token)
 */
export const DEFAULT_GEMINI_MODEL: TGeminiModel = GEMINI_MODELS[0]

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
    value: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash (Khuyên dùng)',
    desc: 'Tốc độ phản hồi cực nhanh, tối ưu chi phí token',
  },
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash (Tiêu chuẩn)',
    desc: 'Độ ổn định cao cho tra cứu và xử lý ngôn ngữ',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    desc: 'Phiên bản gọn nhẹ cân bằng tốc độ và chất lượng',
  },
  {
    value: 'gemini-flash-latest',
    label: 'Gemini Flash Latest',
    desc: 'Tự động sử dụng bản flash mới nhất',
  },
]

/**
 * Alias tương thích ngược cho GenerateTranscriptModal
 */
export const GEMINI_TRANSCRIPT_MODELS = GEMINI_MODEL_OPTIONS

/**
 * Danh sách Gemini TTS Models chuẩn hóa chuyên biệt cho tạo âm thanh (speech/audio):
 * 1. gemini-3.8-flash-lite-tts : Nhẹ nhất, tốc độ cao nhất, hạn mức request cao, tối ưu tránh 429
 * 2. gemini-3.8-flash-tts      : Chất lượng tiêu chuẩn cao
 * 3. gemini-3.1-flash-tts-preview : Phiên bản preview fallback
 * 4. gemini-2.5-flash-preview-tts : Phiên bản flash TTS fallback
 *
 * Lưu ý: Đã loại bỏ các model non-TTS (như 3.5-flash, 3.8-flash) và model pro (2.5-pro-preview-tts
 * có giới hạn quota = 0 trên free tier gây lỗi 429 RESOURCE_EXHAUSTED).
 */
export const GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
] as const

export type TGeminiTtsModel = (typeof GEMINI_TTS_MODELS)[number]
