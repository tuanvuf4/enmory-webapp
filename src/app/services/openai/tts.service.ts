import OpenAI from 'openai'

export type TOpenAIVoice = 'auto' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface IOpenAIVoiceOption {
  value: TOpenAIVoice
  label: string
  desc: string
  gender: 'auto' | 'neutral' | 'male' | 'female'
}

export const OPENAI_VOICES: IOpenAIVoiceOption[] = [
  {
    value: 'auto',
    label: 'Default (Multi-Voice theo nhân vật)',
    desc: 'Tự động đổi giọng nam/nữ theo từng nhân vật',
    gender: 'auto',
  },
  {
    value: 'alloy',
    label: 'Alloy (Tự nhiên, cân bằng)',
    desc: 'Giọng đọc trung tính, truyền cảm và rõ ràng',
    gender: 'neutral',
  },
  {
    value: 'nova',
    label: 'Nova (Giọng nữ trẻ trung, ấm áp)',
    desc: 'Giọng nữ tự nhiên, rất phù hợp học tiếng Anh',
    gender: 'female',
  },
  {
    value: 'echo',
    label: 'Echo (Giọng nam trầm ấm, truyền cảm)',
    desc: 'Giọng nam tự nhiên, phát âm chuẩn Mỹ',
    gender: 'male',
  },
  {
    value: 'shimmer',
    label: 'Shimmer (Giọng nữ trong trẻo, rõ nét)',
    desc: 'Giọng nữ tươi sáng, tốc độ và ngữ điệu tự nhiên',
    gender: 'female',
  },
  {
    value: 'onyx',
    label: 'Onyx (Giọng nam trầm sâu, tự tin)',
    desc: 'Giọng nam chuyên nghiệp, uy quyền',
    gender: 'male',
  },
  {
    value: 'fable',
    label: 'Fable (Giọng Anh-Anh diễn cảm)',
    desc: 'Giọng đọc ngữ điệu British thanh lịch',
    gender: 'neutral',
  },
]

const resolveApiKey = () => {
  return String(
    localStorage.getItem('enmory_openai_api_key') ||
      localStorage.getItem('openaiApiKey') ||
      import.meta.env.VITE_OPENAI_API_KEY ||
      '',
  ).trim()
}

const getOpenAIClient = () => {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key chưa được cấu hình. Vui lòng kiểm tra VITE_OPENAI_API_KEY.')
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}

/**
 * Parses raw text from a transcript segment to extract speaker name and spoken dialogue.
 * Example: "Alex: Good morning everyone!" -> { speaker: "Alex", text: "Good morning everyone!" }
 */
export const parseSpeakerAndText = (rawText: string) => {
  if (!rawText) return { speaker: null, text: '' }
  const trimmed = rawText.trim()

  // Match patterns like "Alex:", "Sarah: ", "[Alex]:", "Speaker 1:"
  const match = trimmed.match(/^(?:\[([^\]]+)\]|([A-Za-z0-9_\s]{2,20}))\s*:\s*([\s\S]+)$/)
  if (match) {
    const speaker = (match[1] || match[2] || '').trim()
    // Strip bracketed instructions like [Laughs] or (Chuckles)
    const cleanSpeech = (match[3] || '').replace(/\[.*?\]|\(.*?\)/g, '').trim()
    return { speaker, text: cleanSpeech }
  }

  const cleanSpeech = trimmed.replace(/\[.*?\]|\(.*?\)/g, '').trim()
  return { speaker: null, text: cleanSpeech }
}

// Maps unique speakers to OpenAI voices dynamically to simulate a realistic multi-person dialogue
const speakerVoiceMap = new Map<string, TOpenAIVoice>()
const dialogueVoicePool: TOpenAIVoice[] = ['alloy', 'nova', 'echo', 'shimmer', 'onyx', 'fable']

export const getVoiceForSpeaker = (
  speaker: string | null,
  preferredVoice: TOpenAIVoice = 'auto',
): TOpenAIVoice => {
  if (preferredVoice && preferredVoice !== 'auto') {
    return preferredVoice
  }

  if (!speaker) return 'alloy'

  const key = speaker.toLowerCase().trim()
  if (!speakerVoiceMap.has(key)) {
    const femaleNames = [
      'sarah',
      'lisa',
      'emily',
      'anna',
      'jane',
      'mary',
      'emma',
      'woman',
      'female',
      'girl',
      'rachel',
      'hannah',
      'jessica',
      'laura',
    ]
    const maleNames = [
      'alex',
      'john',
      'mike',
      'david',
      'tom',
      'bob',
      'man',
      'male',
      'guy',
      'mark',
      'kevin',
      'peter',
      'chris',
      'dan',
      'sam',
    ]

    if (femaleNames.some((w) => key.includes(w))) {
      speakerVoiceMap.set(key, speakerVoiceMap.size % 2 === 0 ? 'nova' : 'shimmer')
    } else if (maleNames.some((w) => key.includes(w))) {
      speakerVoiceMap.set(key, speakerVoiceMap.size % 2 === 0 ? 'echo' : 'onyx')
    } else {
      const assigned = dialogueVoicePool[speakerVoiceMap.size % dialogueVoicePool.length]
      speakerVoiceMap.set(key, assigned)
    }
  }

  return speakerVoiceMap.get(key) || 'alloy'
}

// In-memory cache of generated audio Blob URLs
const audioCache = new Map<string, string>()
const ongoingRequests = new Map<string, Promise<string>>()

export const getSpeechAudioUrl = async (
  text: string,
  options?: { voice?: TOpenAIVoice; speed?: number },
): Promise<string> => {
  const cleanText = text.replace(/\[.*?\]|\(.*?\)/g, '').trim()
  if (!cleanText) return ''

  const voice = options?.voice && options.voice !== 'auto' ? options.voice : 'alloy'
  const speed = options?.speed ? Math.max(0.5, Math.min(2.0, options.speed)) : 1.0
  const cacheKey = `${voice}_${speed.toFixed(2)}_${cleanText}`

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!
  }

  if (ongoingRequests.has(cacheKey)) {
    return ongoingRequests.get(cacheKey)!
  }

  const promise = (async () => {
    try {
      const openai = getOpenAIClient()
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice,
        input: cleanText,
        speed,
        response_format: 'mp3',
      })

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      audioCache.set(cacheKey, blobUrl)
      return blobUrl
    } finally {
      ongoingRequests.delete(cacheKey)
    }
  })()

  ongoingRequests.set(cacheKey, promise)
  return promise
}

export class OpenAITTSPlayer {
  private currentAudio: HTMLAudioElement | null = null
  private isSpeaking = false

  /**
   * Plays a text segment using OpenAI TTS.
   * If an error occurs (such as missing API key or offline network), smoothly falls back to Web Speech API.
   */
  async play(
    rawText: string,
    options: {
      voice?: TOpenAIVoice
      playbackRate?: number
      volume?: number
      muted?: boolean
      onEnded?: () => void
      onError?: (err: any) => void
    } = {},
  ): Promise<HTMLAudioElement | null> {
    this.stop()

    const { speaker, text: speechText } = parseSpeakerAndText(rawText)
    if (!speechText) return null

    const resolvedVoice = getVoiceForSpeaker(speaker, options.voice || 'auto')
    const speed = options.playbackRate || 1.0

    try {
      const audioUrl = await getSpeechAudioUrl(speechText, {
        voice: resolvedVoice,
        speed,
      })

      if (!audioUrl) return null

      const audio = new Audio(audioUrl)
      audio.playbackRate = options.playbackRate || 1.0
      audio.volume = options.muted ? 0 : Math.max(0, Math.min(1, options.volume ?? 1))

      audio.onended = () => {
        this.isSpeaking = false
        options.onEnded?.()
      }

      audio.onerror = (e) => {
        console.warn('Audio playback error, fallback to Web Speech:', e)
        this.isSpeaking = false
        this.fallbackWebSpeech(
          speechText,
          options.playbackRate || 1.0,
          options.volume ?? 1,
          options.muted ?? false,
          options.onEnded,
        )
      }

      this.currentAudio = audio
      this.isSpeaking = true

      await audio.play()
      return audio
    } catch (err) {
      console.warn('OpenAI TTS request failed, fallback to Web Speech API:', err)
      this.fallbackWebSpeech(
        speechText,
        options.playbackRate || 1.0,
        options.volume ?? 1,
        options.muted ?? false,
        options.onEnded,
      )
      options.onError?.(err)
      return null
    }
  }

  /**
   * Pre-fetches an upcoming segment into the in-memory cache so that when playback reaches it,
   * audio starts with 0ms delay.
   */
  prefetch(
    rawText: string,
    options: {
      voice?: TOpenAIVoice
      playbackRate?: number
    } = {},
  ) {
    const { speaker, text: speechText } = parseSpeakerAndText(rawText)
    if (!speechText) return
    const resolvedVoice = getVoiceForSpeaker(speaker, options.voice || 'auto')
    getSpeechAudioUrl(speechText, {
      voice: resolvedVoice,
      speed: options.playbackRate || 1.0,
    }).catch(() => {
      // Ignore prefetch errors silently
    })
  }

  pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause()
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
    }
  }

  resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {})
    }
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
  }

  stop() {
    this.isSpeaking = false
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  setVolume(vol: number, isMuted: boolean) {
    if (this.currentAudio) {
      this.currentAudio.volume = isMuted ? 0 : Math.max(0, Math.min(1, vol))
    }
  }

  setPlaybackRate(rate: number) {
    if (this.currentAudio) {
      this.currentAudio.playbackRate = Math.max(0.5, Math.min(2.0, rate))
    }
  }

  getIsSpeaking() {
    return this.isSpeaking
  }

  private fallbackWebSpeech(
    text: string,
    rate: number,
    vol: number,
    isMuted: boolean,
    onEnded?: () => void,
  ) {
    if (!('speechSynthesis' in window)) {
      onEnded?.()
      return
    }
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = Math.max(0.5, Math.min(2.0, rate))
    utterance.volume = isMuted ? 0 : vol

    const voices = window.speechSynthesis.getVoices()
    const enVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('US') ||
            v.name.includes('UK')),
      ) || voices.find((v) => v.lang.startsWith('en'))

    if (enVoice) {
      utterance.voice = enVoice
    }

    if (onEnded) {
      utterance.onend = () => onEnded()
      utterance.onerror = () => onEnded()
    }

    window.speechSynthesis.speak(utterance)
  }
}

export const ttsService = new OpenAITTSPlayer()
