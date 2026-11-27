import React, { useEffect, useRef, useState } from 'react'
import { App, Button, Select, Slider, Space, Tag, Typography, theme } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, SoundOutlined } from '@ant-design/icons'
import { useSelector } from '@/core/hooks'
import {
  TGeminiVoice,
  TGeminiTtsModel,
  DEFAULT_USER_TTS_MODEL,
  DEFAULT_USER_TTS_VOICE,
  geminiTtsService,
} from '@/services/gemini'

const { Text } = Typography

interface ToeicAudioPlayerProps {
  audioUrl?: string
  audioScript?: string
  title?: string
  compact?: boolean
}

const formatSeconds = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Format option labels (e.g. "A:", "(A)") as "A." so TTS pronounces A, B, C, D
 * instead of treating them as speaker tags or parenthetical stage directions.
 */
const formatOptionLabelsForSpeech = (text: string): string => {
  return text
    .replace(/(?:^|(?<=\s))\(([A-D])\)\s*/g, '$1. ')
    .replace(/(?:^|(?<=\s))([A-D]):\s*/g, '$1. ')
    .trim()
}

/**
 * Split multi-speaker script into segments if formatted with speaker labels on new lines
 * (e.g., "Woman: ...\nMan: ..."), otherwise keep as a single segment.
 */
const splitScriptSegments = (script: string): string[] => {
  const formatted = formatOptionLabelsForSpeech(script)
  const lines = formatted
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length <= 1) return [formatted]
  return lines
}

export const ToeicAudioPlayer: React.FC<ToeicAudioPlayerProps> = ({
  audioUrl,
  audioScript,
  title,
  compact = false,
}) => {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoadingTts, setIsLoadingTts] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const userConfig = useSelector((state) => state.auth.user?.configuration)
  const userTtsVoice = (userConfig?.defaultTtsVoice as TGeminiVoice) || DEFAULT_USER_TTS_VOICE
  const userTtsModel = (userConfig?.defaultTtsModel as TGeminiTtsModel) || DEFAULT_USER_TTS_MODEL

  const hasAudioFile = Boolean(audioUrl && audioUrl.trim())
  const hasScript = Boolean(audioScript && audioScript.trim())

  const stopAllPlayback = () => {
    cancelledRef.current = true
    setIsPlaying(false)
    setIsPaused(false)
    setIsLoadingTts(false)
    geminiTtsService.stop()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  useEffect(() => {
    stopAllPlayback()
    setCurrentTime(0)
    setDuration(0)
    return () => {
      stopAllPlayback()
    }
  }, [audioUrl, audioScript])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
    geminiTtsService.setPlaybackRate(playbackRate)
  }, [playbackRate])

  const handleToggleAudioFile = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }

  const fallbackBrowserTts = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = playbackRate
    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }
    utterance.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }

  const playWithGemini = async () => {
    if (!hasScript) return
    stopAllPlayback()
    cancelledRef.current = false
    setIsLoadingTts(true)
    setIsPaused(false)

    const segments = splitScriptSegments(audioScript!)

    try {
      for (let i = 0; i < segments.length; i++) {
        if (cancelledRef.current) break
        setIsLoadingTts(i === 0)
        setIsPlaying(true)
        await geminiTtsService.playSpeech(segments[i], {
          voice: userTtsVoice,
          model: userTtsModel,
          playbackRate,
        })
        setIsLoadingTts(false)
        if (cancelledRef.current) break
        if (i < segments.length - 1) {
          await new Promise((r) => setTimeout(r, 350))
        }
      }
      if (!cancelledRef.current) {
        setIsPlaying(false)
        setIsPaused(false)
      }
    } catch (err: any) {
      setIsLoadingTts(false)
      setIsPlaying(false)
      setIsPaused(false)
      if (!cancelledRef.current) {
        message.warning(
          `Không thể phát giọng Gemini (${err?.message || 'kiểm tra API key'}). Đang chuyển sang giọng trình duyệt.`,
        )
        fallbackBrowserTts(formatOptionLabelsForSpeech(audioScript!))
      }
    }
  }

  const handleToggleGeminiTts = () => {
    if (isLoadingTts) {
      stopAllPlayback()
      return
    }
    if (isPlaying && !isPaused) {
      geminiTtsService.pause()
      setIsPaused(true)
      setIsPlaying(false)
      return
    }
    if (isPaused) {
      geminiTtsService.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }
    playWithGemini()
  }

  if (!hasAudioFile && !hasScript) {
    return (
      <div
        style={{
          padding: compact ? '8px 12px' : '12px 16px',
          borderRadius: token.borderRadius,
          border: `1px dashed ${token.colorBorder}`,
          background: token.colorFillTertiary,
        }}
      >
        <Text type='secondary'>Chưa có file âm thanh hoặc kịch bản TTS cho câu hỏi này.</Text>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: compact ? '10px 14px' : '14px 18px',
        borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorder}`,
        background: token.colorBgContainer,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Space size={8}>
          <SoundOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
          <Text strong>{title || 'Audio Player'}</Text>
          <Tag color={hasAudioFile ? 'blue' : 'purple'}>
            {hasAudioFile ? 'Audio File' : 'Gemini TTS'}
          </Tag>
        </Space>

        <Space wrap size={8}>
          <Select
            size='small'
            value={playbackRate}
            onChange={(val) => setPlaybackRate(val)}
            style={{ width: 80 }}
            options={[
              { value: 0.85, label: '0.85x' },
              { value: 1, label: '1.0x' },
              { value: 1.15, label: '1.15x' },
              { value: 1.3, label: '1.3x' },
            ]}
          />

          {hasAudioFile ? (
            <Button
              type='primary'
              size='small'
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleToggleAudioFile}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
          ) : (
            <Button
              type='primary'
              size='small'
              icon={isLoadingTts || isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleToggleGeminiTts}
            >
              {isLoadingTts || isPlaying ? 'Pause' : isPaused ? 'Play' : 'Listen'}
            </Button>
          )}
        </Space>
      </div>

      {hasAudioFile && (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
          />
          <div className='flex items-center gap-3'>
            <Text type='secondary' style={{ fontSize: 12, minWidth: 40 }}>
              {formatSeconds(currentTime)}
            </Text>
            <Slider
              style={{ flex: 1, margin: 0 }}
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              tooltip={{ formatter: (val) => formatSeconds(val || 0) }}
              onChange={(val) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = val
                  setCurrentTime(val)
                }
              }}
            />
            <Text type='secondary' style={{ fontSize: 12, minWidth: 40 }}>
              {formatSeconds(duration)}
            </Text>
          </div>
        </>
      )}
    </div>
  )
}
