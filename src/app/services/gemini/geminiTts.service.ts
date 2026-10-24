import { GoogleGenAI } from '@google/genai'
import {
  generateOpenAiSpeech,
  generateOpenAiSpeechBlob,
  mapGeminiVoiceToOpenAi,
  OPENAI_VOICES,
  resolveOpenAiApiKey,
  TOpenAiVoice,
} from '../openai/tts.service'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { GEMINI_TTS_MODELS } from './geminiModels'
import { localDb } from '../localDb/db'

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
    label: 'Default (Multi-Voice)',
    desc: 'Tự động chọn giọng Gemini nam/nữ phù hợp theo từng nhân vật hội thoại',
    gender: 'auto',
  },
  {
    value: 'Aoede',
    label: 'Aoede (Nữ)',
    desc: 'Giọng nữ chuẩn Anh-Mỹ, phát âm rõ ràng, rất thích hợp luyện nghe',
    gender: 'female',
  },
  {
    value: 'Puck',
    label: 'Puck (Nam)',
    desc: 'Giọng nam tươi vui, phát âm sinh động',
    gender: 'male',
  },
  {
    value: 'Kore',
    label: 'Kore (Nữ)',
    desc: 'Giọng nữ êm dịu, ngữ điệu truyền cảm',
    gender: 'female',
  },
  {
    value: 'Charon',
    label: 'Charon (Nam)',
    desc: 'Giọng nam trầm, phát âm chuẩn xác, phong thái chuyên nghiệp',
    gender: 'male',
  },
  {
    value: 'Fenrir',
    label: 'Fenrir (Nam)',
    desc: 'Giọng nam dứt khoát, ngữ điệu rõ nét',
    gender: 'male',
  },
]

// In-memory audio URL cache: key -> objectUrl
const audioCache = new Map<string, string>()
const ongoingRequests = new Map<string, Promise<string>>()

// Rate-limit tracking: if Gemini models hit 429 quota exhaustion,
// cooldown for 60s so subsequent requests immediately fall back to OpenAI without lag
let lastGeminiRateLimitTime = 0
const GEMINI_RATE_LIMIT_COOLDOWN_MS = 60000

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Converts Gemini base64 audio payload to a clean, playable WAV Blob.
 *
 * Automatically handles:
 * 1. Already-formatted RIFF WAVE audio (e.g. from gemini-3.8-flash-lite-tts):
 *    - Strips non-audio trailing chunks (such as Google C2PA provenance metadata chunks)
 *      which previously caused loud static/crackling noise ("tiếng dè lớn") at the end of the clip.
 *    - Applies a micro fade-out (last 64 samples) to eliminate DC offset clicks.
 * 2. Raw L16 / PCM mono audio without container header (e.g. from preview models):
 *    - Validates sample alignment (multiples of 2 bytes for 16-bit).
 *    - Applies micro fade-out.
 *    - Prepends standard 44-byte RIFF/WAVE header.
 */
function geminiAudioToWavBlob(
  base64Data: string,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16,
): Blob {
  const binaryString = atob(base64Data)
  const len = binaryString.length
  const rawBytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    rawBytes[i] = binaryString.charCodeAt(i)
  }

  // Check if payload starts with 'RIFF' and 'WAVE'
  const isRiffWave =
    len >= 12 &&
    rawBytes[0] === 0x52 && // 'R'
    rawBytes[1] === 0x49 && // 'I'
    rawBytes[2] === 0x46 && // 'F'
    rawBytes[3] === 0x46 && // 'F'
    rawBytes[8] === 0x57 && // 'W'
    rawBytes[9] === 0x41 && // 'A'
    rawBytes[10] === 0x56 && // 'V'
    rawBytes[11] === 0x45 // 'E'

  if (isRiffWave) {
    const view = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength)
    let fmtOffset = -1
    let fmtLength = 0
    let dataOffset = -1
    let dataLength = 0

    let offset = 12
    while (offset + 8 <= len) {
      const chunkId =
        String.fromCharCode(rawBytes[offset]) +
        String.fromCharCode(rawBytes[offset + 1]) +
        String.fromCharCode(rawBytes[offset + 2]) +
        String.fromCharCode(rawBytes[offset + 3])
      const chunkSize = view.getUint32(offset + 4, true)

      if (chunkId === 'fmt ') {
        fmtOffset = offset
        fmtLength = 8 + chunkSize
      } else if (chunkId === 'data') {
        dataOffset = offset
        dataLength = 8 + chunkSize
      }

      offset += 8 + chunkSize
      if (chunkSize % 2 !== 0) {
        offset += 1 // WAV chunk padding
      }
    }

    if (fmtOffset >= 0 && dataOffset >= 0 && dataOffset + dataLength <= len) {
      // Apply micro fade-out to the last 64 audio samples (128 bytes) of the data chunk
      // to eliminate any DC pop/buzz at the end of audio
      const audioDataStart = dataOffset + 8
      const audioDataBytes = dataLength - 8
      const sampleCount = Math.floor(audioDataBytes / 2)
      const fadeSamples = Math.min(64, sampleCount)

      if (fadeSamples > 0) {
        for (let i = 0; i < fadeSamples; i++) {
          const sampleIdx = sampleCount - fadeSamples + i
          const bytePos = audioDataStart + sampleIdx * 2
          const rawVal = view.getInt16(bytePos, true)
          const gain = 1 - (i + 1) / (fadeSamples + 1)
          view.setInt16(bytePos, Math.round(rawVal * gain), true)
        }
      }

      // Construct clean WAV containing only RIFF header, fmt chunk, and data chunk (discarding C2PA / metadata)
      const totalCleanSize = 12 + fmtLength + dataLength
      const cleanBuffer = new ArrayBuffer(totalCleanSize)
      const cleanView = new DataView(cleanBuffer)
      const cleanBytes = new Uint8Array(cleanBuffer)

      writeString(cleanView, 0, 'RIFF')
      cleanView.setUint32(4, 4 + fmtLength + dataLength, true)
      writeString(cleanView, 8, 'WAVE')

      cleanBytes.set(rawBytes.subarray(fmtOffset, fmtOffset + fmtLength), 12)
      cleanBytes.set(rawBytes.subarray(dataOffset, dataOffset + dataLength), 12 + fmtLength)

      return new Blob([cleanBytes], { type: 'audio/wav' })
    }

    // Fallback: if structure parsing didn't find chunks, return the clean raw bytes as audio/wav
    return new Blob([rawBytes], { type: 'audio/wav' })
  }

  // Raw PCM case (audio/l16):
  const bytesPerSample = (bitsPerSample * numChannels) / 8
  const validDataSize = len - (len % bytesPerSample)
  const pcmBytes = validDataSize === len ? rawBytes : rawBytes.subarray(0, validDataSize)

  // Apply micro fade-out to last 64 samples
  const pcmView = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, validDataSize)
  const sampleCount = Math.floor(validDataSize / 2)
  const fadeSamples = Math.min(64, sampleCount)
  if (fadeSamples > 0) {
    for (let i = 0; i < fadeSamples; i++) {
      const sampleIdx = sampleCount - fadeSamples + i
      const bytePos = sampleIdx * 2
      const rawVal = pcmView.getInt16(bytePos, true)
      const gain = 1 - (i + 1) / (fadeSamples + 1)
      pcmView.setInt16(bytePos, Math.round(rawVal * gain), true)
    }
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const chunkSize = 36 + validDataSize

  const buffer = new ArrayBuffer(44 + validDataSize)
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
  view.setUint32(40, validDataSize, true)

  const wavBytes = new Uint8Array(buffer)
  wavBytes.set(pcmBytes, 44)

  return new Blob([wavBytes], { type: 'audio/wav' })
}

// Backward-compatibility alias
export const pcmToWavBlob = geminiAudioToWavBlob
export { geminiAudioToWavBlob }

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
   * Generates audio for a given sentence using Gemini TTS with OpenAI fallback.
   * Returns a cached Blob URL.
   */
  async getAudioUrl(text: string, voice: TGeminiVoice = 'Aoede'): Promise<string> {
    const cleanText = text.replace(/\[.*?\]|\(.*?\)/g, '').trim()
    if (!cleanText) {
      throw new Error('No text provided for TTS')
    }

    const resolvedVoice = voice === 'auto' ? 'Aoede' : voice
    const cacheKey = `${resolvedVoice}_${cleanText}`

    // 1. In-memory URL cache check
    if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!
    }

    if (ongoingRequests.has(cacheKey)) {
      return ongoingRequests.get(cacheKey)!
    }

    // 2. Persistent Dexie IndexedDB cache check (Instant, offline & preserves API quota)
    try {
      const persisted = await localDb.audioCache.get(cacheKey)
      if (persisted && persisted.blob) {
        const objectUrl = URL.createObjectURL(persisted.blob)
        audioCache.set(cacheKey, objectUrl)
        return objectUrl
      }
    } catch (dbReadErr) {
      console.warn('[TTS] Error reading from localDb.audioCache:', dbReadErr)
    }

    const geminiApiKey = resolveGeminiApiKey()
    const openAiApiKey = resolveOpenAiApiKey()

    if (!geminiApiKey && !openAiApiKey) {
      throw new Error(
        'Neither Gemini nor OpenAI API key is configured. Please add VITE_GEMINI_API_KEY or VITE_OPENAI_API_KEY in .env',
      )
    }

    const isGeminiCoolingDown = Date.now() - lastGeminiRateLimitTime < GEMINI_RATE_LIMIT_COOLDOWN_MS

    const promise = (async () => {
      try {
        // If Gemini is currently cooling down from a recent 429 error and OpenAI key exists,
        // execute OpenAI TTS fallback directly to prevent stutter/playback stalls.
        if (isGeminiCoolingDown && openAiApiKey) {
          try {
            const openAiBlob = await generateOpenAiSpeechBlob(cleanText, resolvedVoice)
            localDb.audioCache
              .put({ key: cacheKey, blob: openAiBlob, created_at: Date.now() })
              .catch((e) => console.warn('[TTS] Failed to persist OpenAI blob:', e))
            const objectUrl = URL.createObjectURL(openAiBlob)
            audioCache.set(cacheKey, objectUrl)
            return objectUrl
          } catch (openAiCooldownErr) {
            console.warn(
              '[TTS] OpenAI playback during Gemini cooldown failed, attempting Gemini models...',
              openAiCooldownErr,
            )
          }
        }

        let lastError: any = null
        let hitGeminiRateLimit = false

        if (geminiApiKey) {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey })

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
                const wavBlob = geminiAudioToWavBlob(audioPart.inlineData.data)
                localDb.audioCache
                  .put({ key: cacheKey, blob: wavBlob, created_at: Date.now() })
                  .catch((e) => console.warn('[TTS] Failed to persist Gemini wavBlob:', e))
                const objectUrl = URL.createObjectURL(wavBlob)
                audioCache.set(cacheKey, objectUrl)
                return objectUrl
              }
            } catch (err: any) {
              lastError = err
              const isRateLimit =
                err?.status === 429 ||
                err?.message?.includes('429') ||
                err?.message?.includes('RESOURCE_EXHAUSTED') ||
                err?.message?.includes('Quota exceeded')
              if (isRateLimit) {
                hitGeminiRateLimit = true
              }
              console.warn(
                `[TTS] Gemini TTS model ${model} failed${isRateLimit ? ' (429 Rate Limit)' : ''}, trying next...`,
                err?.message || err,
              )
            }
          }

          if (hitGeminiRateLimit) {
            lastGeminiRateLimitTime = Date.now()
            console.warn(
              '[TTS] Gemini TTS hit rate limits (429/quota). Entering 60s cooldown and falling back to OpenAI TTS...',
            )
          }
        }

        // Fallback to OpenAI TTS library
        if (openAiApiKey) {
          try {
            console.info(
              `[TTS] Gemini TTS ${geminiApiKey ? 'encountered errors' : 'not configured'}. Falling back to OpenAI TTS ('tts-1')...`,
            )
            const openAiBlob = await generateOpenAiSpeechBlob(cleanText, resolvedVoice)
            localDb.audioCache
              .put({ key: cacheKey, blob: openAiBlob, created_at: Date.now() })
              .catch((e) => console.warn('[TTS] Failed to persist OpenAI blob:', e))
            const objectUrl = URL.createObjectURL(openAiBlob)
            audioCache.set(cacheKey, objectUrl)
            return objectUrl
          } catch (openAiErr: any) {
            console.warn('[TTS] OpenAI TTS fallback also failed:', openAiErr?.message || openAiErr)
            throw new Error(
              `TTS Failed: Gemini (${lastError?.message || 'unavailable'}) & OpenAI fallback (${openAiErr?.message || 'failed'})`,
            )
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

export {
  generateOpenAiSpeech,
  OPENAI_VOICES,
  mapGeminiVoiceToOpenAi,
  resolveOpenAiApiKey,
  type TOpenAiVoice,
}
