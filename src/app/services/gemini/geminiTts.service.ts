import { GoogleGenAI } from '@google/genai'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { GEMINI_TTS_MODELS } from './geminiModels'

export type TGeminiVoice = 'auto' | 'Aoede' | 'Puck' | 'Kore' | 'Charon' | 'Fenrir'

export interface IGeminiVoiceOption {
  value: TGeminiVoice
  label: string
  desc: string
  gender: 'auto' | 'neutral' | 'male' | 'female'
}

export const GEMINI_VOICES: IGeminiVoiceOption[] = [
  {
    value: 'auto',
    label: 'Default (Multi-Voice theo nhân vật)',
    desc: 'Tự động chọn giọng Gemini nam/nữ phù hợp theo từng nhân vật hội thoại',
    gender: 'auto',
  },
  {
    value: 'Aoede',
    label: 'Aoede (Nữ - Trong trẻo, tự nhiên)',
    desc: 'Giọng nữ chuẩn Anh-Mỹ, phát âm rõ ràng, rất thích hợp luyện nghe',
    gender: 'female',
  },
  {
    value: 'Puck',
    label: 'Puck (Nam - Tự nhiên, hoạt bát)',
    desc: 'Giọng nam tươi vui, phát âm sinh động',
    gender: 'male',
  },
  {
    value: 'Kore',
    label: 'Kore (Nữ - Dịu dàng, ấm áp)',
    desc: 'Giọng nữ êm dịu, ngữ điệu truyền cảm',
    gender: 'female',
  },
  {
    value: 'Charon',
    label: 'Charon (Nam - Trầm ấm, điềm tĩnh)',
    desc: 'Giọng nam trầm, phát âm chuẩn xác, phong thái chuyên nghiệp',
    gender: 'male',
  },
  {
    value: 'Fenrir',
    label: 'Fenrir (Nam - Mạnh mẽ, dứt khoát)',
    desc: 'Giọng nam dứt khoát, ngữ điệu rõ nét',
    gender: 'male',
  },
]

// In-memory audio URL cache: key -> objectUrl
const audioCache = new Map<string, string>()
const ongoingRequests = new Map<string, Promise<string>>()

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Converts Gemini 24kHz 16-bit Mono PCM base64 string to a playable WAV Blob.
 */
function pcmToWavBlob(
  base64Pcm: string,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16,
): Blob {
  const binaryString = atob(base64Pcm)
  const len = binaryString.length
  const pcmBytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i)
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = len
  const chunkSize = 36 + dataSize

  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, chunkSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const wavBytes = new Uint8Array(buffer)
  wavBytes.set(pcmBytes, 44)

  return new Blob([wavBytes], { type: 'audio/wav' })
}

/**
 * Extracts speaker name and cleaned spoken dialogue from raw text.
 * e.g. "Alex: Good morning!" -> { speaker: "Alex", text: "Good morning!" }
 */
export const parseSpeakerAndText = (rawText: string): { speaker: string | null; text: string } => {
  if (!rawText) return { speaker: null, text: '' }
  const trimmed = rawText.trim()

  const match = trimmed.match(/^(?:\[([^\]]+)\]|([A-Za-z0-9_\s]{2,20}))\s*:\s*([\s\S]+)$/)
  if (match) {
    const speaker = (match[1] || match[2] || '').trim()
    const cleanSpeech = (match[3] || '').replace(/\[.*?\]|\(.*?\)/g, '').trim()
    return { speaker, text: cleanSpeech }
  }

  const cleanSpeech = trimmed.replace(/\[.*?\]|\(.*?\)/g, '').trim()
  return { speaker: null, text: cleanSpeech }
}

const speakerVoiceMap = new Map<string, TGeminiVoice>()
const maleVoices: TGeminiVoice[] = ['Puck', 'Charon', 'Fenrir']
const femaleVoices: TGeminiVoice[] = ['Aoede', 'Kore']
const allPool: TGeminiVoice[] = ['Aoede', 'Puck', 'Kore', 'Charon', 'Fenrir']

export const getVoiceForSpeaker = (
  speaker: string | null,
  preferredVoice: TGeminiVoice = 'auto',
): TGeminiVoice => {
  if (preferredVoice && preferredVoice !== 'auto') {
    return preferredVoice
  }

  if (!speaker) return 'Aoede'

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
      'karen',
      'amy',
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
      'brian',
      'jack',
    ]

    if (femaleNames.some((n) => key.includes(n))) {
      const assigned = femaleVoices[speakerVoiceMap.size % femaleVoices.length]
      speakerVoiceMap.set(key, assigned)
    } else if (maleNames.some((n) => key.includes(n))) {
      const assigned = maleVoices[speakerVoiceMap.size % maleVoices.length]
      speakerVoiceMap.set(key, assigned)
    } else {
      const assigned = allPool[speakerVoiceMap.size % allPool.length]
      speakerVoiceMap.set(key, assigned)
    }
  }

  return speakerVoiceMap.get(key) || 'Aoede'
}

export interface IPlaySpeechOptions {
  voice?: TGeminiVoice
  playbackRate?: number
  repeatCount?: number // 1, 2, 3
  volume?: number
  muted?: boolean
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: any) => void
}

export class GeminiTTSPlayer {
  private currentAudio: HTMLAudioElement | null = null
  private isSpeaking = false
  private isCancelled = false
  private playRequestId = 0

  /**
   * Generates audio for a given sentence using Gemini TTS.
   * Returns a cached Blob URL.
   */
  async getAudioUrl(text: string, voice: TGeminiVoice = 'Aoede'): Promise<string> {
    const cleanText = text.replace(/\[.*?\]|\(.*?\)/g, '').trim()
    if (!cleanText) {
      throw new Error('No text provided for Gemini TTS')
    }

    const resolvedVoice = voice === 'auto' ? 'Aoede' : voice
    const cacheKey = `${resolvedVoice}_${cleanText}`

    if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!
    }

    if (ongoingRequests.has(cacheKey)) {
      return ongoingRequests.get(cacheKey)!
    }

    const apiKey = resolveGeminiApiKey()
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY in .env')
    }

    const ai = new GoogleGenAI({ apiKey })

    const promise = (async () => {
      try {
        let lastError: any = null

        for (const model of GEMINI_TTS_MODELS) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: cleanText,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: resolvedVoice,
                    },
                  },
                },
              },
            })

            const candidate = response.candidates?.[0]
            const parts = candidate?.content?.parts || []
            const audioPart = parts.find((p) => p.inlineData && p.inlineData.data)

            if (audioPart && audioPart.inlineData?.data) {
              const wavBlob = pcmToWavBlob(audioPart.inlineData.data)
              const objectUrl = URL.createObjectURL(wavBlob)
              audioCache.set(cacheKey, objectUrl)
              return objectUrl
            }
          } catch (err) {
            lastError = err
            console.warn(`Gemini TTS model ${model} failed, trying next...`, err)
          }
        }

        throw lastError || new Error('Failed to generate audio from Gemini TTS models')
      } finally {
        ongoingRequests.delete(cacheKey)
      }
    })()

    ongoingRequests.set(cacheKey, promise)
    return promise
  }

  /**
   * Prefetches audio in background for seamless subsequent playback.
   */
  prefetch(
    rawText: string,
    options?: { voice?: TGeminiVoice; playbackRate?: number; speed?: number },
  ): void {
    const { speaker, text: speechText } = parseSpeakerAndText(rawText)
    if (!speechText) return

    const voice = getVoiceForSpeaker(speaker, options?.voice || 'auto')
    this.getAudioUrl(speechText, voice).catch((err) => {
      console.debug('Gemini TTS prefetch ignored error:', err?.message)
    })
  }

  /**
   * Plays a text segment using Gemini TTS.
   */
  async play(
    rawText: string,
    options: {
      voice?: TGeminiVoice
      playbackRate?: number
      volume?: number
      muted?: boolean
      onEnded?: () => void
      onError?: (err: any) => void
    } = {},
  ): Promise<HTMLAudioElement | null> {
    const requestId = ++this.playRequestId
    this.stopAudioOnly()

    const { speaker, text: speechText } = parseSpeakerAndText(rawText)
    if (!speechText) return null

    const resolvedVoice = getVoiceForSpeaker(speaker, options.voice || 'auto')

    try {
      const audioUrl = await this.getAudioUrl(speechText, resolvedVoice)

      if (requestId !== this.playRequestId) {
        return null
      }

      const audio = new Audio(audioUrl)
      this.currentAudio = audio
      this.isSpeaking = true

      audio.playbackRate = options.playbackRate ?? 1.0
      audio.volume = options.muted ? 0 : typeof options.volume === 'number' ? options.volume : 1.0

      audio.onended = () => {
        if (requestId === this.playRequestId) {
          this.isSpeaking = false
          this.currentAudio = null
          options.onEnded?.()
        }
      }

      audio.onerror = (e) => {
        if (requestId === this.playRequestId) {
          this.isSpeaking = false
          this.currentAudio = null
          options.onError?.(e)
        }
      }

      await audio.play()
      return audio
    } catch (err) {
      if (requestId === this.playRequestId) {
        this.isSpeaking = false
        this.currentAudio = null
        options.onError?.(err)
      }
      return null
    }
  }

  /**
   * Single sentence playback helper with promise.
   */
  async playOnce(text: string, options?: IPlaySpeechOptions): Promise<void> {
    if (this.isCancelled) return

    const { speaker, text: speechText } = parseSpeakerAndText(text)
    const voice = getVoiceForSpeaker(speaker, options?.voice || 'Aoede')
    const playbackRate = options?.playbackRate ?? 1.0

    return new Promise<void>(async (resolve, reject) => {
      try {
        const audioUrl = await this.getAudioUrl(speechText || text, voice)
        if (this.isCancelled) return resolve()

        const audio = new Audio(audioUrl)
        this.currentAudio = audio
        this.isSpeaking = true
        audio.playbackRate = playbackRate
        if (typeof options?.volume === 'number') {
          audio.volume = options.muted ? 0 : options.volume
        }

        audio.onended = () => {
          this.currentAudio = null
          this.isSpeaking = false
          resolve()
        }

        audio.onerror = (e) => {
          this.currentAudio = null
          this.isSpeaking = false
          reject(e)
        }

        await audio.play()
      } catch (err) {
        this.currentAudio = null
        this.isSpeaking = false
        reject(err)
      }
    })
  }

  /**
   * Play speech using Gemini TTS with repeat count support.
   */
  async playSpeech(text: string, options?: IPlaySpeechOptions): Promise<void> {
    this.stop()
    this.isCancelled = false

    const repeat = Math.max(1, Math.min(options?.repeatCount || 1, 3))
    options?.onStart?.()

    try {
      for (let i = 0; i < repeat; i++) {
        if (this.isCancelled) break
        await this.playOnce(text, options)
        if (this.isCancelled) break

        if (i < repeat - 1) {
          // Natural pause between repetitions
          await new Promise((r) => setTimeout(r, 600))
        }
      }
    } catch (err) {
      options?.onError?.(err)
      throw err
    } finally {
      if (!this.isCancelled) {
        options?.onEnd?.()
      }
    }
  }

  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause()
    }
    this.isSpeaking = false
  }

  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch((err) => {
        console.warn('Gemini TTS resume failed:', err)
      })
      this.isSpeaking = true
    }
  }

  private stopAudioOnly(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause()
        this.currentAudio.currentTime = 0
      } catch (e) {}
      this.currentAudio = null
    }
    this.isSpeaking = false
  }

  stop(): void {
    this.isCancelled = true
    this.playRequestId++
    this.stopAudioOnly()
  }

  setVolume(volume: number, muted = false): void {
    if (this.currentAudio) {
      this.currentAudio.volume = muted ? 0 : Math.max(0, Math.min(1, volume))
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.currentAudio) {
      this.currentAudio.playbackRate = Math.max(0.5, Math.min(2.0, rate))
    }
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  getCurrentAudio(): HTMLAudioElement | null {
    return this.currentAudio
  }
}

export const geminiTtsService = new GeminiTTSPlayer()
export const ttsService = geminiTtsService
