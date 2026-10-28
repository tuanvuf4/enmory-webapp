/**
 * Chuẩn hóa phiên âm IPA:
 * - Chuyển chữ thường
 * - Loại bỏ dấu gạch chéo (/), số (0-9), và các ký tự rác ngoài IPA (`_+=\[]{}\)
 * - Cắt khoảng trắng thừa
 */
export const sanitizePronunciation = (val?: string): string => {
  if (!val) return ''
  return val
    .toLowerCase()
    .replace(/[/`_+=\[\]{}\\\d]/g, '')
    .trim()
}
