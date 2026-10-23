import OpenAI from 'openai'

export type TOpenAiVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface IOpenAiVoiceOption {
  value: TOpenAiVoice
  label: string
  desc: string
  gender: 'neutral' | 'male' | 'female'
}

export const OPENAI_VOICES: IOpenAiVoiceOption[] = [
  {
    value: 'alloy',
    label: 'Alloy (Trung tính - Cân bằng)',
    desc: 'Giọng đọc trung tính, truyền cảm, phù hợp đọc chung',
    gender: 'neutral',
  },
  {
    value: 'echo',
    label: 'Echo (Nam)',
    desc: 'Giọng nam ấm, phát âm chuẩn xác, tự nhiên',
    gender: 'male',
  },
  {
    value: 'fable',
    label: 'Fable (Nam)',
    desc: 'Giọng nam ngữ điệu Anh sống động, diễn cảm tốt',
    gender: 'male',
  },
  {
    value: 'onyx',
    label: 'Onyx (Nam)',
    desc: 'Giọng nam trầm ấm, điềm tĩnh, phong thái chuyên nghiệp',
    gender: 'male',
  },
  {
    value: 'nova',
    label: 'Nova (Nữ)',
    desc: 'Giọng nữ trẻ trung, trong trẻo, tự nhiên chuẩn Anh-Mỹ',
    gender: 'female',
  },
  {
    value: 'shimmer',
    label: 'Shimmer (Nữ)',
    desc: 'Giọng nữ êm dịu, rõ nét, rất thích hợp luyện nghe',
    gender: 'female',
  },
]

export const resolveOpenAiApiKey = (): string => {
  return (
    localStorage.getItem('openai_api_key') ||
    localStorage.getItem('openaiApiKey') ||
    localStorage.getItem('enmory_openai_api_key') ||
    import.meta.env.VITE_OPENAI_API_KEY ||
    ''
  ).trim()
}

/**
 * Maps Gemini TTS voice personas to corresponding OpenAI TTS voices.
 */
export const mapGeminiVoiceToOpenAi = (geminiVoice?: string): TOpenAiVoice => {
  if (!geminiVoice) return 'alloy'
  const v = geminiVoice.toLowerCase()

  if (v.includes('aoede')) return 'nova' // Clear, natural female
  if (v.includes('kore')) return 'shimmer' // Warm, gentle female
  if (v.includes('puck')) return 'fable' // Expressive, lively male
  if (v.includes('charon')) return 'onyx' // Deep, calm male
  if (v.includes('fenrir')) return 'echo' // Strong, assertive male

  if (['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(geminiVoice)) {
    return geminiVoice as TOpenAiVoice
  }

  return 'alloy'
}

let openAiClientInstance: OpenAI | null = null
let currentClientKey = ''

function getOpenAiClient(apiKey: string): OpenAI {
  if (!openAiClientInstance || currentClientKey !== apiKey) {
    openAiClientInstance = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
    currentClientKey = apiKey
  }
  return openAiClientInstance
}

/**
 * Generates speech using OpenAI TTS ('tts-1') and returns a playable Blob Object URL.
 */
export const generateOpenAiSpeech = async (
  text: string,
  voice: TOpenAiVoice | string = 'alloy',
  speed = 1.0,
): Promise<string> => {
  const apiKey = resolveOpenAiApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY in .env')
  }

  const cleanText = text.replace(/\[.*?\]|\(.*?\)/g, '').trim()
  if (!cleanText) {
    throw new Error('No text provided for OpenAI TTS')
  }

  const openai = getOpenAiClient(apiKey)
  const resolvedVoice = mapGeminiVoiceToOpenAi(voice)

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: resolvedVoice,
    input: cleanText,
    speed: Math.max(0.25, Math.min(4.0, speed)),
  })

  const blob =
    typeof response.blob === 'function'
      ? await response.blob()
      : new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' })

  return URL.createObjectURL(blob)
}

export class OpenAITTSPlayer {
  private currentAudio: HTMLAudioElement | null = null
  private isSpeaking = false

  async play(text: string, voice: TOpenAiVoice = 'alloy'): Promise<void> {
    this.stop()
    const url = await generateOpenAiSpeech(text, voice)
    const audio = new Audio(url)
    this.currentAudio = audio
    this.isSpeaking = true

    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        this.isSpeaking = false
        this.currentAudio = null
        resolve()
      }
      audio.onerror = (e) => {
        this.isSpeaking = false
        this.currentAudio = null
        reject(e)
      }
      audio.play().catch(reject)
    })
  }

  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause()
        this.currentAudio.currentTime = 0
      } catch (e) {}
      this.currentAudio = null
    }
    this.isSpeaking = false
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking
  }
}

export const openAiTtsService = new OpenAITTSPlayer()
