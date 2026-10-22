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
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
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
    value: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite (Tiết kiệm token)',
    desc: 'Tối ưu chi phí và token, phản hồi siêu nhanh cho tra cứu từ vựng và review câu',
  },
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash (Tiêu chuẩn)',
    desc: 'Cân bằng giữa tốc độ và độ chính xác',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    desc: 'Phiên bản gọn nhẹ fallback',
  },
  {
    value: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash (High)',
    desc: 'Năng lực xử lý cao cho các tác vụ phức tạp',
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
 * Danh sách TTS Models ưu tiên model thấp/flash trước pro
 */
export const GEMINI_TTS_MODELS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash-preview-tts',
  'gemini-3.8-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro-preview-tts',
] as const

export type TGeminiTtsModel = (typeof GEMINI_TTS_MODELS)[number]
