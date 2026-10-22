import { geminiTtsService } from '@/services/gemini'

export function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

/**
 * Pronounces a word using Google Gemini TTS.
 */
export const speakWord = (origin: string, _lang = 'en-GB', _rate = 0.8) => {
  if (!origin) return
  geminiTtsService
    .playSpeech(origin, {
      voice: 'Aoede',
      playbackRate: 1.0,
    })
    .catch((err) => {
      console.warn('Gemini TTS speakWord error:', err)
    })
}

export interface ISpeakSentenceOptions {
  lang?: string
  rate?: number
  pitch?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: any) => void
}

/**
 * Speaks a sentence using Google Gemini TTS.
 */
export const speakSentence = (text: string, options?: ISpeakSentenceOptions) => {
  if (!text) return
  geminiTtsService
    .playSpeech(text, {
      voice: 'Aoede',
      playbackRate: options?.rate ?? 1.0,
      onStart: options?.onStart,
      onEnd: options?.onEnd,
      onError: options?.onError,
    })
    .catch((err) => {
      options?.onError?.(err)
    })
}
