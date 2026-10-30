import { useState, useRef, useCallback, useEffect } from 'react'

export interface IUseAudioRecorderResult {
  isRecording: boolean
  recordingDuration: number
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  startRecording: () => Promise<boolean>
  stopRecording: () => void
  resetRecording: () => void
}

const getSupportedMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return ''
  }
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
  ]
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

export const useAudioRecorder = (maxDurationSeconds: number = 60): IUseAudioRecorderResult => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<any>(null)
  const audioUrlRef = useRef<string | null>(null)

  // Keep track of audioUrl to revoke properly
  useEffect(() => {
    audioUrlRef.current = audioUrl
  }, [audioUrl])

  const cleanupStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopRecording = useCallback(() => {
    stopTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.warn('mediaRecorder stop error:', e)
      }
    }
    setIsRecording(false)
  }, [stopTimer])

  const resetRecording = useCallback(() => {
    stopRecording()
    cleanupStream()
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingDuration(0)
    setError(null)
    audioChunksRef.current = []
  }, [cleanupStream, stopRecording])

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null)
    resetRecording()

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Trình duyệt của bạn không hỗ trợ thu âm qua MediaDevices API.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        })
        const finalUrl = URL.createObjectURL(finalBlob)
        setAudioBlob(finalBlob)
        setAudioUrl(finalUrl)
        cleanupStream()
      }

      recorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event)
        setError('Có lỗi xảy ra trong quá trình thu âm.')
        setIsRecording(false)
        stopTimer()
        cleanupStream()
      }

      // Collect data every 200ms
      recorder.start(200)
      setIsRecording(true)
      setRecordingDuration(0)

      // Start duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            stopRecording()
            return maxDurationSeconds
          }
          return prev + 1
        })
      }, 1000)

      return true
    } catch (err: any) {
      console.error('Failed to start recording:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(
          'Quyền truy cập microphone đã bị từ chối. Vui lòng cho phép truy cập micro để thu âm.',
        )
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Không tìm thấy thiết bị microphone nào trên máy tính.')
      } else {
        setError(err.message || 'Không thể khởi động microphone.')
      }
      setIsRecording(false)
      cleanupStream()
      return false
    }
  }, [cleanupStream, maxDurationSeconds, resetRecording, stopRecording, stopTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      cleanupStream()
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [cleanupStream, stopTimer])

  return {
    isRecording,
    recordingDuration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  }
}
