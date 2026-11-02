import { useState, useRef, useCallback, useEffect, useMemo } from 'react'

export interface IInstantSpeechStats {
  matchedWords: string[]
  missingWords: string[]
  matchPercentage: number
  wpm: number
}

export interface IUseSpeechRecognitionResult {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

/**
 * Tính toán nhanh độ so khớp từ và tốc độ nói (WPM) giữa chuỗi nhận diện và câu mẫu
 */
export const computeInstantSpeechStats = (
  spokenText: string,
  targetSentence: string,
  durationSeconds: number,
): IInstantSpeechStats => {
  const cleanTargetWords = (targetSentence || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  const cleanSpokenWords = (spokenText || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  const spokenSet = new Set(cleanSpokenWords)
  const matchedWords: string[] = []
  const missingWords: string[] = []

  cleanTargetWords.forEach((word) => {
    if (spokenSet.has(word)) {
      matchedWords.push(word)
    } else {
      missingWords.push(word)
    }
  })

  const matchPercentage =
    cleanTargetWords.length > 0
      ? Math.round((matchedWords.length / cleanTargetWords.length) * 100)
      : 0

  const durationMin = Math.max((durationSeconds || 1) / 60, 0.04)
  const wpm = Math.round(cleanSpokenWords.length / durationMin)

  return {
    matchedWords,
    missingWords,
    matchPercentage,
    wpm,
  }
}

/**
 * Hook nhận diện giọng nói thời gian thực (Web Speech API) chạy tức thời tại client
 */
export const useSpeechRecognition = (lang: string = 'en-US'): IUseSpeechRecognitionResult => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>('')

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore inactive stop error
      }
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    stopListening()
    setTranscript('')
    setInterimTranscript('')
    finalTranscriptRef.current = ''
    setError(null)
  }, [stopListening])

  const startListening = useCallback(() => {
    if (!isSupported) {
      return
    }

    resetTranscript()

    try {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognitionConstructor()
      recognitionRef.current = recognition

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        let final = finalTranscriptRef.current

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          if (item.isFinal) {
            final += (final ? ' ' : '') + item[0].transcript
          } else {
            interim += item[0].transcript
          }
        }

        finalTranscriptRef.current = final
        setTranscript(final)
        setInterimTranscript(interim)
      }

      recognition.onerror = (event: any) => {
        // Ignorable events
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[useSpeechRecognition] Error:', event.error)
          setError(event.error)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch (err: any) {
      console.warn('[useSpeechRecognition] start error:', err)
      setError(err?.message || 'Speech recognition initialization failed')
      setIsListening(false)
    }
  }, [isSupported, lang, resetTranscript])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {}
      }
    }
  }, [])

  return useMemo(
    () => ({
      isListening,
      isSupported,
      transcript,
      interimTranscript,
      error,
      startListening,
      stopListening,
      resetTranscript,
    }),
    [
      isListening,
      isSupported,
      transcript,
      interimTranscript,
      error,
      startListening,
      stopListening,
      resetTranscript,
    ],
  )
}
