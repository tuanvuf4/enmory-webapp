import { formatSegmentTime, parseTranscript } from '@/views/features/player/transcriptUtils'

export interface IBrowserTranslatorOptions {
  sourceLanguage?: string
  targetLanguage?: string
  onProgress?: (completed: number, total: number) => void
}

export interface IBrowserTranslatorAvailability {
  isSupported: boolean
  status: 'readily' | 'after-download' | 'no' | 'unsupported'
  message?: string
}

/**
 * Service to interact with the Chrome Built-in AI Translation API (Translator API).
 * Supports standard `self.Translator`, `self.translation`, and legacy `self.ai.translator`.
 */
export const browserTranslatorService = {
  /**
   * Check if the browser supports the Translator API for the given language pair.
   */
  checkSupport: async (
    sourceLanguage = 'en',
    targetLanguage = 'vi',
  ): Promise<IBrowserTranslatorAvailability> => {
    const globalObj = typeof window !== 'undefined' ? (window as any) : (self as any)

    // Option 1: Standard Translator interface
    if (typeof globalObj.Translator !== 'undefined') {
      try {
        if (typeof globalObj.Translator.availability === 'function') {
          const status = await globalObj.Translator.availability({ sourceLanguage, targetLanguage })
          if (status === 'unavailable' || status === 'no') {
            return {
              isSupported: false,
              status: 'no',
              message: `Cặp ngôn ngữ ${sourceLanguage} → ${targetLanguage} hiện không khả dụng trên trình duyệt.`,
            }
          }
          return {
            isSupported: true,
            status: status === 'available' || status === 'readily' ? 'readily' : 'after-download',
          }
        }
        return { isSupported: true, status: 'readily' }
      } catch (err: any) {
        console.warn('[BrowserTranslator] Translator.availability error:', err)
      }
    }

    // Option 2: self.translation
    if (typeof globalObj.translation !== 'undefined') {
      try {
        if (typeof globalObj.translation.canTranslate === 'function') {
          const status = await globalObj.translation.canTranslate({
            sourceLanguage,
            targetLanguage,
          })
          if (status === 'no') {
            return {
              isSupported: false,
              status: 'no',
              message: `Trình duyệt chưa hỗ trợ dịch từ ${sourceLanguage} sang ${targetLanguage}.`,
            }
          }
          return { isSupported: true, status }
        }
        return { isSupported: true, status: 'readily' }
      } catch (err: any) {
        console.warn('[BrowserTranslator] translation.canTranslate error:', err)
      }
    }

    // Option 3: self.ai.translator
    if (typeof globalObj.ai?.translator !== 'undefined') {
      try {
        if (typeof globalObj.ai.translator.capabilities === 'function') {
          const caps = await globalObj.ai.translator.capabilities()
          const status = caps.available
          if (status === 'no') {
            return {
              isSupported: false,
              status: 'no',
              message: 'Mô hình dịch AI trên trình duyệt chưa sẵn sàng.',
            }
          }
          return { isSupported: true, status: status === 'readily' ? 'readily' : 'after-download' }
        }
        return { isSupported: true, status: 'readily' }
      } catch (err: any) {
        console.warn('[BrowserTranslator] ai.translator.capabilities error:', err)
      }
    }

    return {
      isSupported: false,
      status: 'unsupported',
      message:
        'Trình duyệt của bạn chưa hỗ trợ Browser Translator API (yêu cầu Chrome 131+ hoặc bật cờ chrome://flags/#translation-api). Bạn có thể sử dụng nút "Dịch từ Transcript (AI)" bằng Gemini.',
    }
  },

  /**
   * Instantiate a translator object via available browser translation API.
   */
  createTranslatorInstance: async (sourceLanguage = 'en', targetLanguage = 'vi'): Promise<any> => {
    const globalObj = typeof window !== 'undefined' ? (window as any) : (self as any)

    // Option 1: self.Translator.create
    if (typeof globalObj.Translator?.create === 'function') {
      return await globalObj.Translator.create({
        sourceLanguage,
        targetLanguage,
      })
    }

    // Option 2: self.translation.createTranslator
    if (typeof globalObj.translation?.createTranslator === 'function') {
      return await globalObj.translation.createTranslator({
        sourceLanguage,
        targetLanguage,
      })
    }

    // Option 3: self.ai.translator.create
    if (typeof globalObj.ai?.translator?.create === 'function') {
      return await globalObj.ai.translator.create({
        sourceLanguage,
        targetLanguage,
      })
    }

    throw new Error(
      'Trình duyệt không hỗ trợ Browser Translator API. Vui lòng cập nhật Chrome 131+ hoặc bật cờ chrome://flags/#translation-api.',
    )
  },

  /**
   * Translate plain text using browser translator API.
   */
  translateText: async (
    text: string,
    sourceLanguage = 'en',
    targetLanguage = 'vi',
  ): Promise<string> => {
    const clean = text.trim()
    if (!clean) return ''

    const translator = await browserTranslatorService.createTranslatorInstance(
      sourceLanguage,
      targetLanguage,
    )
    try {
      const result = await translator.translate(clean)
      return (result || '').trim()
    } finally {
      if (typeof translator.destroy === 'function') {
        translator.destroy()
      }
    }
  },

  /**
   * Translates an entire transcript with timestamps using browser Translator API.
   * Preserves each segment timestamp marker so the resulting translation stays 100% in sync.
   */
  translateTranscript: async (
    transcript: string,
    options?: IBrowserTranslatorOptions,
  ): Promise<string> => {
    const clean = transcript.trim()
    if (!clean) return ''

    const sourceLang = options?.sourceLanguage || 'en'
    const targetLang = options?.targetLanguage || 'vi'

    const translator = await browserTranslatorService.createTranslatorInstance(
      sourceLang,
      targetLang,
    )

    try {
      // Parse transcript into segments to preserve timestamps
      const segments = parseTranscript(clean)

      if (segments.length === 0) {
        // Plain text without timestamps
        return await translator.translate(clean)
      }

      const total = segments.length
      const translatedSegments: { timeFormatted: string; text: string }[] = []

      for (let i = 0; i < total; i++) {
        const seg = segments[i]
        let translated = ''
        if (seg.text?.trim()) {
          translated = await translator.translate(seg.text.trim())
        }
        translatedSegments.push({
          timeFormatted: formatSegmentTime(seg.timeSeconds),
          text: (translated || seg.text).trim(),
        })

        if (options?.onProgress) {
          options.onProgress(i + 1, total)
        }
      }

      return translatedSegments.map((s) => `${s.timeFormatted}\n${s.text}`).join('\n\n')
    } finally {
      if (typeof translator.destroy === 'function') {
        translator.destroy()
      }
    }
  },
}
