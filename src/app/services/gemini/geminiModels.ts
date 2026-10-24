/**
 * Centralized Gemini model configuration for Enmory Web App.
 *
 * Sắp xếp theo thứ tự ưu tiên cho xử lý ngôn ngữ & tra cứu từ điển:
 * 1. gemini-3.8-flash      : Năng lực xử lý cao (High tier), chính xác nhất cho tra cứu từ vựng, ngữ pháp, IPA & dịch nghĩa chuẩn xác (Khuyên dùng cho Auto Fill).
 * 2. gemini-3.5-flash      : Cân bằng giữa tốc độ và độ chính xác (Tiêu chuẩn).
 * 3. gemini-3.5-flash-lite : Nhẹ nhất, tiêu thụ ít token & quota nhất, phản hồi nhanh.
 * 4. gemini-flash-latest   : Luôn trỏ tới phiên bản flash ổn định mới nhất của Google.
 * 5. gemini-2.5-flash      : Gọn nhẹ (fallback).
 */

export const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
] as const

export type TGeminiModel = (typeof GEMINI_MODELS)[number]

/**
 * Backward-compatibility alias cho TGeminiTranscriptModel
 */
export type TGeminiTranscriptModel = TGeminiModel

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
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash', // (Tiêu chuẩn)
    desc: 'Cân bằng giữa tốc độ phản hồi và độ chính xác',
  },
  {
    value: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite', // (Tiết kiệm token)
    desc: 'Phản hồi siêu nhanh, tiêu thụ ít token & quota nhất',
  },
  {
    value: 'gemini-flash-latest',
    label: 'Gemini Flash Latest',
    desc: 'Tự động sử dụng bản flash mới nhất',
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
