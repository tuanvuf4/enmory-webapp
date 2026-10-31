import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CaretRightFilled,
  CustomerServiceOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  FullscreenOutlined,
  MutedOutlined,
  PauseOutlined,
  ReloadOutlined,
  RetweetOutlined,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from '@ant-design/icons'
import { FocusListeningModal } from './FocusListeningModal'
import { Button, Dropdown, MenuProps, Popover, Slider, Tag, Tooltip, theme } from 'antd'
import ReactPlayer from 'react-player'
import { createPortal } from 'react-dom'
import styles from './listening.module.scss'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { appSetting } from '@/config/appConfig'
import { getActiveSegmentIndex, parseTranscript } from './transcriptUtils'
import { KaraokeText } from './KaraokeText'
import { MarqueeText } from './MarqueeText'
import { useSmoothTime } from './useSmoothTime'
import { tracksApi } from '@/services/firebase'
import { TrackList } from './TrackList'
import { firebaseAuthService } from '@/services/firebase/authService'
import { usePrompt } from '@/helpers/hooks'
import { geminiTtsService as ttsService, TGeminiVoice, GEMINI_VOICES } from '@/services/gemini'

export const PlayerDock: React.FC = () => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const playerRef = useRef<HTMLVideoElement | null>(null)
  const isFirstLoadRef = useRef(true)
  const hasUserStartedPlaybackRef = useRef(false)
  const isSessionRestoredRef = useRef(false)
  const shouldSeekOnReadyRef = useRef(false)
  const shouldAutoPlayOnReadyRef = useRef(false)
  const hasHandledTrackEndRef = useRef(false)
  const lastInvalidSpotifySrcRef = useRef<string | null>(null)

  const [trackListOpen, setTrackListOpen] = useState(false)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)
  const { user } = useSelector((state) => state.auth)
  const showPlayer = user?.configuration?.showPlayer ?? appSetting.meta.showPlayer

  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  const normalizeMediaSrc = useCallback((rawSrc?: string) => {
    if (!rawSrc) return rawSrc

    let normalized = rawSrc.trim()

    if (normalized.includes('<iframe')) {
      const match = normalized.match(/src=["']([^"']+)["']/i)
      if (match?.[1]) {
        normalized = match[1]
      }
    }

    try {
      const parsed = new URL(normalized)
      const host = parsed.hostname.toLowerCase()

      if (host === 'open.spotify.com' || host === 'www.open.spotify.com') {
        const segments = parsed.pathname.split('/').filter(Boolean)

        if (segments[0]?.startsWith('intl-')) {
          segments.shift()
        }

        if (segments[0] === 'embed') {
          segments.shift()
        }

        const supportedTypes = new Set(['track', 'album', 'playlist', 'artist', 'episode', 'show'])

        const type = segments[0]
        const id = segments[1]

        if (type && id && supportedTypes.has(type)) {
          return `https://open.spotify.com/${type}/${id}`
        }
      }
    } catch (e) {
      // Keep original value for non-URL sources.
    }

    return normalized
  }, [])

  // const handleToggleShowPlayer = async () => {
  //   const currentConfig = user?.configuration || appSetting.meta
  //   const newConfig = {
  //     ...currentConfig,
  //     showPlayer: !showPlayer,
  //   }
  //   dispatch(authAction.updateUserConfig(newConfig))
  //   if (user?.uid) {
  //     try {
  //       await apiUser.updateUserConfig(newConfig)
  //     } catch (err) {
  //       console.error('Failed to update showPlayer config:', err)
  //     }
  //   }
  // }

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      if (user) {
        fetchTracks()
      } else {
        dispatch(listeningAction.setTracks([]))
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    ttsService.stop()
    dispatch(
      listeningAction.updatePlayer({
        playing: false,
        seeking: false,
        seekTo: null,
      }),
    )
  }, [dispatch])

  const fetchTracks = async () => {
    try {
      const response = await tracksApi.getTracks({
        page: 1,
        size: 100,
        orderBy: 'created_date',
        order: 'DESC',
      })

      if (response.isSuccess && response.content) {
        dispatch(listeningAction.setTracks(response.content))
      } else {
        message({ type: 'error', content: response.message || 'Failed to fetch tracks' })
      }
    } catch (error: any) {
      message({ type: 'error', content: error.message || 'Error fetching tracks' })
    }
  }

  const toggleDocumentPiP = async () => {
    if (pipWindow) {
      pipWindow.close()
      setPipWindow(null)
      return
    }

    if (!('documentPictureInPicture' in window)) {
      message({
        type: 'warning',
        content:
          'Trình duyệt của bạn không hỗ trợ chế độ Document Picture-in-Picture. Hãy thử Chrome hoặc Edge.',
      })
      return
    }

    try {
      // @ts-ignore
      const w = await window.documentPictureInPicture.requestWindow({
        width: 500,
        height: 350,
      })

      const d = w.document

      // Copy all styles from the main window to the PiP window
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.cssRules && styleSheet.cssRules.length > 0) {
            const newStyle = d.createElement('style')
            const rules = Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('\n')
            newStyle.appendChild(d.createTextNode(rules))
            d.head.appendChild(newStyle)
          } else if (styleSheet.href) {
            const newLink = d.createElement('link')
            newLink.rel = 'stylesheet'
            newLink.href = styleSheet.href
            d.head.appendChild(newLink)
          }
        } catch (e) {
          if (styleSheet.href) {
            const newLink = d.createElement('link')
            newLink.rel = 'stylesheet'
            newLink.href = styleSheet.href
            d.head.appendChild(newLink)
          }
        }
      })

      // Also copy any direct <style> or <link> tags in document.head that might not be in document.styleSheets
      document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
        if (el.tagName.toLowerCase() === 'link') {
          const href = (el as HTMLLinkElement).href
          if (href && !d.head.querySelector(`link[href="${href}"]`)) {
            d.head.appendChild(el.cloneNode(true))
          }
        } else if (el.tagName.toLowerCase() === 'style' && el.textContent) {
          const newStyle = d.createElement('style')
          newStyle.textContent = el.textContent
          d.head.appendChild(newStyle)
        }
      })

      w.addEventListener('pagehide', () => {
        setPipWindow(null)
      })

      setPipWindow(w)
    } catch (err) {
      console.error(err)
      message({ type: 'error', content: 'Không thể mở cửa sổ Picture-in-Picture.' })
    }
  }

  // Set fixed styling inside the PiP window document (independent of app theme)
  useEffect(() => {
    if (!pipWindow) return
    const d = pipWindow.document

    d.documentElement.setAttribute('data-theme', 'dark')
    d.body.style.margin = '0'
    d.body.style.padding = '0'
    d.body.style.backgroundColor = '#054753'
    d.body.style.color = '#8ea5b0'
    d.body.style.fontFamily = "'Lora', Georgia, serif"
    d.body.style.overflow = 'hidden'
  }, [pipWindow])

  useEffect(() => {
    return () => {
      if (pipWindow) {
        pipWindow.close()
      }
    }
  }, [pipWindow])

  const {
    src,
    playing,
    controls,
    light,
    volume,
    muted,
    loop,
    loopSegment,
    played,
    duration,
    playbackRate,
    seekTo,
    playedSeconds,
  } = player

  const resolvedSrc = useMemo(() => normalizeMediaSrc(src), [src, normalizeMediaSrc])

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    playerRef.current = player
  }, [])

  const playedSecondsRef = useRef(playedSeconds)

  useEffect(() => {
    playedSecondsRef.current = playedSeconds
  }, [playedSeconds])

  const smoothTime = useSmoothTime(playedSeconds, playing, playbackRate)

  const transcriptSegments = useMemo(
    () => parseTranscript(currentTrack?.transcript || '', currentTrack?.translation || ''),
    [currentTrack?.transcript, currentTrack?.translation],
  )
  const activeIndex = useMemo(() => {
    return getActiveSegmentIndex(transcriptSegments, smoothTime)
  }, [transcriptSegments, smoothTime])

  const activeSegment = useMemo(() => {
    return activeIndex >= 0 && activeIndex < transcriptSegments.length
      ? transcriptSegments[activeIndex]
      : null
  }, [transcriptSegments, activeIndex])

  const activeSegmentText = useMemo(() => {
    return activeSegment ? activeSegment.text : ''
  }, [activeSegment])

  const activeSegmentTranslation = useMemo(() => {
    return activeSegment?.translation || ''
  }, [activeSegment])

  const activeSegmentProgress = useMemo(() => {
    if (activeIndex < 0) return 0
    const seg = transcriptSegments[activeIndex]
    const startTime = seg.timeSeconds
    const endTime =
      activeIndex < transcriptSegments.length - 1
        ? transcriptSegments[activeIndex + 1].timeSeconds
        : player.duration || startTime + 5
    const segDuration = endTime - startTime
    const elapsed = smoothTime - startTime
    return segDuration > 0 ? Math.max(0, Math.min(100, (elapsed / segDuration) * 100)) : 0
  }, [transcriptSegments, activeIndex, smoothTime, player.duration])

  const hasValidMediaUrl = useMemo(() => {
    if (!resolvedSrc) return false
    const trimmed = resolvedSrc.trim()
    if (!trimmed || trimmed === 'transcript') return false
    return (
      trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')
    )
  }, [resolvedSrc])

  const isTranscriptPlayback = useMemo(() => {
    return !hasValidMediaUrl && transcriptSegments.length > 0
  }, [hasValidMediaUrl, transcriptSegments.length])

  const transcriptDuration = useMemo(() => {
    if (!transcriptSegments.length) return 0
    const lastSeg = transcriptSegments[transcriptSegments.length - 1]
    const wordCount = lastSeg.text.trim().split(/\s+/).length
    const estDuration = Math.max(12, Math.ceil(wordCount / 2.5))
    return lastSeg.timeSeconds + estDuration
  }, [transcriptSegments])

  useEffect(() => {
    if (
      isTranscriptPlayback &&
      transcriptDuration > 0 &&
      Math.abs(duration - transcriptDuration) > 1
    ) {
      dispatch(listeningAction.updatePlayer({ duration: transcriptDuration }))
    }
  }, [isTranscriptPlayback, transcriptDuration, duration, dispatch])

  useEffect(() => {
    if (
      isTranscriptPlayback &&
      shouldAutoPlayOnReadyRef.current &&
      !isFirstLoadRef.current &&
      hasUserStartedPlaybackRef.current
    ) {
      shouldAutoPlayOnReadyRef.current = false
      dispatch(listeningAction.updatePlayer({ playing: true }))
    }
  }, [isTranscriptPlayback, dispatch])

  // Selected voice for Gemini TTS (per track or default to multi-voice auto)
  const currentVoice = useMemo<TGeminiVoice>(() => {
    return (currentTrack?.voice as TGeminiVoice) || 'auto'
  }, [currentTrack?.voice])

  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLoopTimer = useCallback(() => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current)
      loopTimerRef.current = null
    }
  }, [])

  // Keep refs for callbacks so closures never get stale
  const loopSegmentRef = useRef(loopSegment)
  useEffect(() => {
    loopSegmentRef.current = loopSegment
    if (!loopSegment) {
      clearLoopTimer()
    }
  }, [loopSegment, clearLoopTimer])

  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
    if (!playing || isFirstLoadRef.current || !hasUserStartedPlaybackRef.current) {
      clearLoopTimer()
    }
  }, [playing, clearLoopTimer])

  const activeIndexRef = useRef(activeIndex)
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const isTranscriptPlaybackRef = useRef(isTranscriptPlayback)
  useEffect(() => {
    isTranscriptPlaybackRef.current = isTranscriptPlayback
    if (!isTranscriptPlayback) {
      clearLoopTimer()
    }
  }, [isTranscriptPlayback, clearLoopTimer])

  const playbackRateRef = useRef(playbackRate)
  useEffect(() => {
    playbackRateRef.current = playbackRate
  }, [playbackRate])

  const volumeRef = useRef(volume)
  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  const mutedRef = useRef(muted)
  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  const currentVoiceRef = useRef(currentVoice)
  useEffect(() => {
    currentVoiceRef.current = currentVoice
  }, [currentVoice])

  // Gemini TTS speaker for transcript mode / AI generated tracks
  const lastSpokenIndexRef = useRef<number>(-1)

  const speakTranscriptSegment = useCallback(
    (
      text: string,
      rate: number,
      vol: number,
      isMuted: boolean,
      voice: TGeminiVoice,
      segIndex: number,
    ) => {
      clearLoopTimer()
      ttsService.play(text, {
        voice,
        playbackRate: rate,
        volume: vol,
        muted: isMuted,
        onEnded: () => {
          if (!playingRef.current || !isTranscriptPlaybackRef.current) return

          // If loopSegment is active, repeat the same segment
          if (loopSegmentRef.current) {
            const segs = transcriptSegments
            if (segIndex >= 0 && segIndex < segs.length) {
              const seg = segs[segIndex]
              const startTime = seg.timeSeconds
              const targetDuration = transcriptDuration || duration || 0

              // Reset progress back to start of segment for visual sync
              playedSecondsRef.current = startTime
              dispatch(
                listeningAction.updatePlayer({
                  playedSeconds: startTime,
                  played: targetDuration > 0 ? startTime / targetDuration : 0,
                }),
              )

              // Small natural pause (500ms) before repeating the sentence
              loopTimerRef.current = setTimeout(() => {
                if (!playingRef.current || !isTranscriptPlaybackRef.current) return
                if (!loopSegmentRef.current) return
                if (lastSpokenIndexRef.current !== segIndex) return

                speakTranscriptSegment(
                  seg.text,
                  playbackRateRef.current,
                  volumeRef.current,
                  mutedRef.current,
                  currentVoiceRef.current,
                  segIndex,
                )
              }, 500)
            }
          }
        },
      })
    },
    [clearLoopTimer, transcriptSegments, transcriptDuration, duration, dispatch],
  )

  // Playback timer loop for transcript mode
  useEffect(() => {
    if (
      !isTranscriptPlayback ||
      !playing ||
      isFirstLoadRef.current ||
      !hasUserStartedPlaybackRef.current
    )
      return

    const intervalMs = 100
    const timer = setInterval(() => {
      const current = playedSecondsRef.current
      const targetDuration = transcriptDuration || duration || 300

      // Segment loop check for transcript mode
      if (loopSegment && transcriptSegments.length > 0 && activeIndex >= 0) {
        const seg = transcriptSegments[activeIndex]
        const startTime = seg.timeSeconds
        const endTime =
          activeIndex < transcriptSegments.length - 1
            ? transcriptSegments[activeIndex + 1].timeSeconds
            : targetDuration || startTime + 5

        const threshold = Math.min(0.25, Math.max(0.05, (endTime - startTime) * 0.1))

        // If time reaches near the end of the segment
        if (current >= endTime - threshold) {
          // If audio is still speaking, keep current clamped inside the segment so it doesn't spill over
          if (ttsService.getIsSpeaking()) {
            playedSecondsRef.current = Math.max(startTime, endTime - threshold)
            return
          }

          // If audio finished, reset playhead to startTime
          playedSecondsRef.current = startTime
          dispatch(
            listeningAction.updatePlayer({
              playedSeconds: startTime,
              played: targetDuration > 0 ? startTime / targetDuration : 0,
            }),
          )

          // If a loop replay isn't already scheduled, trigger replay
          if (!loopTimerRef.current) {
            speakTranscriptSegment(seg.text, playbackRate, volume, muted, currentVoice, activeIndex)
          }
          return
        }
      }

      if (targetDuration > 0 && current >= targetDuration - 0.15) {
        if (!loopSegment) {
          handlePlaybackEnded()
          return
        }
      }

      const step = (intervalMs / 1000) * playbackRate
      const nextTime = Math.min(targetDuration, current + step)
      playedSecondsRef.current = nextTime

      if (currentTrack) {
        localStorage.setItem(
          'enmory_playback_session',
          JSON.stringify({
            trackId: currentTrack.id,
            playedSeconds: nextTime,
          }),
        )
      }

      dispatch(
        listeningAction.updatePlayer({
          playedSeconds: nextTime,
          played: targetDuration > 0 ? nextTime / targetDuration : 0,
        }),
      )
    }, intervalMs)

    return () => clearInterval(timer)
  }, [
    isTranscriptPlayback,
    playing,
    playbackRate,
    transcriptDuration,
    duration,
    currentTrack,
    dispatch,
    loopSegment,
    transcriptSegments,
    activeIndex,
    volume,
    muted,
    currentVoice,
    speakTranscriptSegment,
  ])

  useEffect(() => {
    if (!isTranscriptPlayback) {
      clearLoopTimer()
      ttsService.stop()
      return
    }

    if (playerRef.current) {
      try {
        if (typeof (playerRef.current as any).pause === 'function') {
          ;(playerRef.current as any).pause()
        } else if (typeof (playerRef.current as any).getInternalPlayer === 'function') {
          const internal = (playerRef.current as any).getInternalPlayer()
          if (internal && typeof internal.pause === 'function') {
            internal.pause()
          }
        }
      } catch (e) {}
    }

    if (!playing || isFirstLoadRef.current || !hasUserStartedPlaybackRef.current) {
      clearLoopTimer()
      ttsService.pause()
      return
    }

    if (activeIndex >= 0 && activeIndex < transcriptSegments.length) {
      if (activeIndex !== lastSpokenIndexRef.current) {
        clearLoopTimer()
        lastSpokenIndexRef.current = activeIndex
        const seg = transcriptSegments[activeIndex]
        speakTranscriptSegment(seg.text, playbackRate, volume, muted, currentVoice, activeIndex)

        // Prefetch next segment into memory for instant zero-latency transition
        if (activeIndex + 1 < transcriptSegments.length) {
          const nextSeg = transcriptSegments[activeIndex + 1]
          ttsService.prefetch(nextSeg.text, {
            voice: currentVoice,
            playbackRate,
          })
        }
      } else {
        ttsService.resume()
      }
    }
  }, [
    isTranscriptPlayback,
    playing,
    activeIndex,
    transcriptSegments,
    playbackRate,
    volume,
    muted,
    currentVoice,
    speakTranscriptSegment,
    clearLoopTimer,
  ])

  useEffect(() => {
    if (isTranscriptPlayback) {
      ttsService.setVolume(volume, muted)
    }
  }, [volume, muted, isTranscriptPlayback])

  useEffect(() => {
    if (isTranscriptPlayback) {
      ttsService.setPlaybackRate(playbackRate)
    }
  }, [playbackRate, isTranscriptPlayback])

  useEffect(() => {
    return () => {
      ttsService.stop()
    }
  }, [])

  useEffect(() => {
    if (seekTo === null || seekTo === undefined) return
    isFirstLoadRef.current = false
    hasUserStartedPlaybackRef.current = true
    if (isTranscriptPlayback) {
      const targetDuration = transcriptDuration || duration || 0
      playedSecondsRef.current = seekTo
      lastSpokenIndexRef.current = -1
      clearLoopTimer()
      ttsService.stop()
      dispatch(
        listeningAction.updatePlayer({
          seekTo: null,
          playedSeconds: seekTo,
          played: targetDuration > 0 ? seekTo / targetDuration : 0,
          playing: true,
        }),
      )
      return
    }
    if (!playerRef.current) return
    if (typeof (playerRef.current as any).seekTo === 'function') {
      ;(playerRef.current as any).seekTo(seekTo, 'seconds')
    } else if ('currentTime' in playerRef.current) {
      playerRef.current.currentTime = seekTo
    }
    dispatch(listeningAction.updatePlayer({ seekTo: null, playing: true }))
  }, [seekTo, isTranscriptPlayback, transcriptDuration, duration, dispatch, clearLoopTimer])

  const handlePlayerEnginePlay = () => {
    if (isFirstLoadRef.current || !hasUserStartedPlaybackRef.current) {
      if (playerRef.current) {
        try {
          if (typeof (playerRef.current as any).pause === 'function') {
            ;(playerRef.current as any).pause()
          } else if (typeof (playerRef.current as any).getInternalPlayer === 'function') {
            const internal = (playerRef.current as any).getInternalPlayer()
            if (internal && typeof internal.pause === 'function') {
              internal.pause()
            }
          }
        } catch (e) {}
      }
      return
    }
    dispatch(listeningAction.updatePlayer({ playing: true }))
  }

  const handlePlayerEnginePause = () => {
    if (isFirstLoadRef.current || !hasUserStartedPlaybackRef.current) {
      return
    }
    dispatch(listeningAction.updatePlayer({ playing: false }))
  }

  const handlePlay = () => {
    isFirstLoadRef.current = false
    hasUserStartedPlaybackRef.current = true
    if (isTranscriptPlayback) {
      const targetDuration = transcriptDuration || duration || 0
      if (targetDuration > 0 && playedSecondsRef.current >= targetDuration - 0.5) {
        playedSecondsRef.current = 0
        lastSpokenIndexRef.current = -1
        dispatch(
          listeningAction.updatePlayer({
            played: 0,
            playedSeconds: 0,
          }),
        )
      }
      dispatch(listeningAction.updatePlayer({ playing: true }))
      return
    }

    if (playerRef.current) {
      const current =
        typeof (playerRef.current as any).getCurrentTime === 'function'
          ? (playerRef.current as any).getCurrentTime()
          : playerRef.current.currentTime || 0
      const latestPlayedSeconds = playedSecondsRef.current
      const hasDuration = duration > 0
      const isAtEnd = hasDuration && latestPlayedSeconds >= duration - 1

      if (hasDuration && current >= duration - 1) {
        if (typeof (playerRef.current as any).seekTo === 'function') {
          ;(playerRef.current as any).seekTo(0, 'seconds')
        } else if ('currentTime' in playerRef.current) {
          playerRef.current.currentTime = 0
        }
        dispatch(
          listeningAction.updatePlayer({
            played: 0,
            playedSeconds: 0,
          }),
        )
      } else if (
        current < 1 &&
        latestPlayedSeconds > 0 &&
        Math.abs(current - latestPlayedSeconds) > 1 &&
        !isAtEnd
      ) {
        if (typeof (playerRef.current as any).seekTo === 'function') {
          ;(playerRef.current as any).seekTo(latestPlayedSeconds, 'seconds')
        } else if ('currentTime' in playerRef.current) {
          playerRef.current.currentTime = latestPlayedSeconds
        }
      }
    }
    dispatch(listeningAction.updatePlayer({ playing: true }))
  }

  const handlePause = () => {
    clearLoopTimer()
    if (isTranscriptPlayback) {
      ttsService.pause()
      if ('speechSynthesis' in window) {
        // no-op
      }
    }
    dispatch(listeningAction.updatePlayer({ playing: false }))
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const targetDoc = event.view?.document || document
      const activeEl = targetDoc.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.hasAttribute('contenteditable'))
      ) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        if (playing) {
          handlePause()
        } else {
          handlePlay()
        }
      }

      if (event.code === 'KeyL' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        handleToggleLoopSegment()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    if (pipWindow) {
      pipWindow.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (pipWindow) {
        pipWindow.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [playing, pipWindow, loopSegment])

  const load = (src?: string, startPosition?: number) => {
    const normalizedSrc = normalizeMediaSrc(src)
    hasHandledTrackEndRef.current = false

    dispatch(
      listeningAction.updatePlayer({
        ...player,
        src: normalizedSrc,
        playedSeconds: startPosition !== undefined ? startPosition : 0,
        played: startPosition !== undefined && duration ? startPosition / duration : 0,
        loaded: 0,
        pip: false,
        playing: false,
      }),
    )
  }

  useEffect(() => {
    if (!src) return

    const raw = src.trim()
    const isSpotifyShortLink = /https?:\/\/(spotify\.link|spoti\.fi)\//i.test(raw)

    if (isSpotifyShortLink && lastInvalidSpotifySrcRef.current !== raw) {
      lastInvalidSpotifySrcRef.current = raw
      message({
        type: 'warning',
        content:
          'Spotify short link (spotify.link/spoti.fi) chưa được hỗ trợ trực tiếp. Hãy dùng link dạng https://open.spotify.com/track/...',
      })
    }
  }, [src, message])

  const restoreTimeRef = useRef(0)

  useEffect(() => {
    if ('speechSynthesis' in window) {
      // no-op
    }
    clearLoopTimer()
    ttsService.stop()
    lastSpokenIndexRef.current = -1

    if (currentTrack) {
      if (!isSessionRestoredRef.current) {
        // First load initialization: restore saved playback position from previous session
        isSessionRestoredRef.current = true

        let savedTime = 0
        try {
          const sessionStr = localStorage.getItem('enmory_playback_session')
          if (sessionStr) {
            const session = JSON.parse(sessionStr)
            if (session.trackId === currentTrack.id) {
              savedTime = session.playedSeconds || 0
            }
          }
        } catch (e) {
          console.error(e)
        }

        restoreTimeRef.current = savedTime
        shouldSeekOnReadyRef.current = savedTime > 0
        load(currentTrack.srcUrl, savedTime)
      } else {
        shouldSeekOnReadyRef.current = false
        load(currentTrack.srcUrl, 0)
      }
    }
  }, [currentTrack])

  const handleReady = () => {
    if (shouldSeekOnReadyRef.current) {
      if (playerRef.current) {
        if (typeof (playerRef.current as any).seekTo === 'function') {
          ;(playerRef.current as any).seekTo(restoreTimeRef.current, 'seconds')
        } else if ('currentTime' in playerRef.current) {
          playerRef.current.currentTime = restoreTimeRef.current
        }
      }
      shouldSeekOnReadyRef.current = false
    }

    if (
      shouldAutoPlayOnReadyRef.current &&
      !isFirstLoadRef.current &&
      hasUserStartedPlaybackRef.current
    ) {
      dispatch(listeningAction.updatePlayer({ playing: true }))
      shouldAutoPlayOnReadyRef.current = false
    }
  }

  const handlePlaybackEnded = () => {
    if (isFirstLoadRef.current || !hasUserStartedPlaybackRef.current) return
    if (hasHandledTrackEndRef.current) return
    hasHandledTrackEndRef.current = true

    if (loop) {
      if (playerRef.current) {
        if (typeof (playerRef.current as any).seekTo === 'function') {
          ;(playerRef.current as any).seekTo(0, 'seconds')
        } else if ('currentTime' in playerRef.current) {
          playerRef.current.currentTime = 0
        }
      }

      dispatch(
        listeningAction.updatePlayer({
          playing: true,
          played: 0,
          playedSeconds: 0,
        }),
      )
      return
    }

    onNext()
  }

  const handleDurationChange = () => {
    const player = playerRef.current
    if (!player) return
    dispatch(listeningAction.updatePlayer({ duration: player.duration || 0 }))
  }

  const handleTimeUpdate = () => {
    const player = playerRef.current
    // We only want to update time slider if we are not currently seeking
    if (!player || player.seeking) return

    if (isFirstLoadRef.current || !hasUserStartedPlaybackRef.current) return

    if (!player.duration) return

    const remaining = player.duration - player.currentTime
    if (remaining <= 0.15) {
      handlePlaybackEnded()
      return
    }

    if (remaining > 0.5) {
      hasHandledTrackEndRef.current = false
    }

    // Segment loop check for media playback
    if (loopSegment && transcriptSegments.length > 0 && activeIndex >= 0) {
      const seg = transcriptSegments[activeIndex]
      const startTime = seg.timeSeconds
      const endTime =
        activeIndex < transcriptSegments.length - 1
          ? transcriptSegments[activeIndex + 1].timeSeconds
          : player.duration || startTime + 5

      const threshold = Math.min(0.25, Math.max(0.05, (endTime - startTime) * 0.15))
      if (player.currentTime >= endTime - threshold && player.currentTime >= startTime + 0.1) {
        player.currentTime = startTime
        playedSecondsRef.current = startTime
        dispatch(
          listeningAction.updatePlayer({
            playedSeconds: startTime,
            played: player.duration > 0 ? startTime / player.duration : 0,
          }),
        )
        return
      }
    }

    if (currentTrack) {
      localStorage.setItem(
        'enmory_playback_session',
        JSON.stringify({
          trackId: currentTrack.id,
          playedSeconds: player.currentTime,
        }),
      )
    }

    dispatch(
      listeningAction.updatePlayer({
        playedSeconds: player.currentTime,
        played: player.currentTime / player.duration,
      }),
    )
  }

  const handleToggleLoop = () => {
    dispatch(listeningAction.updatePlayer({ loop: !player.loop }))
  }

  const handleToggleLoopSegment = () => {
    const nextVal = !loopSegment
    dispatch(listeningAction.updatePlayer({ loopSegment: nextVal }))
    if (!nextVal) {
      clearLoopTimer()
    } else if (
      isTranscriptPlayback &&
      playing &&
      activeIndex >= 0 &&
      activeIndex < transcriptSegments.length
    ) {
      // If loop is turned on and audio has already finished, immediately replay current segment
      if (!ttsService.getIsSpeaking()) {
        clearLoopTimer()
        const seg = transcriptSegments[activeIndex]
        const startTime = seg.timeSeconds
        const targetDuration = transcriptDuration || duration || 0
        playedSecondsRef.current = startTime
        dispatch(
          listeningAction.updatePlayer({
            playedSeconds: startTime,
            played: targetDuration > 0 ? startTime / targetDuration : 0,
            playing: true,
          }),
        )
        speakTranscriptSegment(seg.text, playbackRate, volume, muted, currentVoice, activeIndex)
      }
    }
  }

  const handleRateChange = () => {
    const player = playerRef.current
    if (!player) return

    dispatch(
      listeningAction.updatePlayer({
        playbackRate: player.playbackRate,
      }),
    )
  }

  const handleProgress = () => {
    const player = playerRef.current
    // We only want to update time slider if we are not currently seeking
    if (!player || player.seeking || !player.buffered?.length) return

    dispatch(
      listeningAction.updatePlayer({
        loadedSeconds: player.buffered?.end(player.buffered?.length - 1),
        loaded: player.buffered?.end(player.buffered?.length - 1) / player.duration,
      }),
    )
  }

  const handleEnded = () => {
    handlePlaybackEnded()
  }

  const handleSeekMouseDown = () => {
    dispatch(listeningAction.updatePlayer({ seeking: true }))
  }

  const handleSeekChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const inputTarget = event.target as HTMLInputElement
    dispatch(
      listeningAction.updatePlayer({
        played: Number.parseFloat(inputTarget.value),
      }),
    )
  }

  const handleSeekMouseUp = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const inputTarget = event.target as HTMLInputElement
    const val = Number.parseFloat(inputTarget.value)
    dispatch(listeningAction.updatePlayer({ seeking: false }))
    if (isTranscriptPlayback) {
      const targetDuration = transcriptDuration || duration || 0
      const newTime = val * targetDuration
      playedSecondsRef.current = newTime
      lastSpokenIndexRef.current = -1
      clearLoopTimer()
      ttsService.stop()
      dispatch(
        listeningAction.updatePlayer({
          playedSeconds: newTime,
          played: val,
        }),
      )
      return
    }
    if (playerRef.current) {
      playerRef.current.currentTime = val * playerRef.current.duration
    }
  }

  const onPrev = () => {
    if (!tracks.length) return
    isFirstLoadRef.current = false
    hasUserStartedPlaybackRef.current = true
    clearLoopTimer()
    ttsService.stop()
    lastSpokenIndexRef.current = -1
    if (playerRef.current) {
      if (typeof (playerRef.current as any).seekTo === 'function') {
        ;(playerRef.current as any).seekTo(0, 'seconds')
      } else if ('currentTime' in playerRef.current) {
        playerRef.current.currentTime = 0
      }
    }
    dispatch(
      listeningAction.resetPlayer({
        loop,
        playing: false,
        loaded: 0,
        loadedSeconds: 0,
        played: 0,
        playedSeconds: 0,
      }),
    )
    const index = trackIndex - 1 < 0 ? tracks.length - 1 : trackIndex - 1
    const item = tracks[index]
    shouldAutoPlayOnReadyRef.current = true
    hasHandledTrackEndRef.current = false
    dispatch(listeningAction.setCurrentTrack(item))
  }

  const onNext = () => {
    if (!tracks.length) return
    isFirstLoadRef.current = false
    hasUserStartedPlaybackRef.current = true
    clearLoopTimer()
    ttsService.stop()
    lastSpokenIndexRef.current = -1
    if (playerRef.current) {
      if (typeof (playerRef.current as any).seekTo === 'function') {
        ;(playerRef.current as any).seekTo(0, 'seconds')
      } else if ('currentTime' in playerRef.current) {
        playerRef.current.currentTime = 0
      }
    }
    dispatch(
      listeningAction.resetPlayer({
        loop,
        playing: false,
        loaded: 0,
        loadedSeconds: 0,
        played: 0,
        playedSeconds: 0,
      }),
    )
    const index = trackIndex + 1 === tracks.length ? 0 : trackIndex + 1
    const item = tracks[index]
    shouldAutoPlayOnReadyRef.current = true
    hasHandledTrackEndRef.current = false
    dispatch(listeningAction.setCurrentTrack(item))
  }

  const onSeekBy = (offset: number) => {
    if (isTranscriptPlayback) {
      const targetDuration = transcriptDuration || duration || 0
      const newTime = Math.max(0, Math.min(playedSecondsRef.current + offset, targetDuration))
      playedSecondsRef.current = newTime
      lastSpokenIndexRef.current = -1
      clearLoopTimer()
      ttsService.stop()
      dispatch(
        listeningAction.updatePlayer({
          playedSeconds: newTime,
          played: targetDuration > 0 ? newTime / targetDuration : 0,
        }),
      )
      return
    }
    const player = playerRef.current
    if (!player) return
    player.currentTime = Math.max(0, Math.min(player.currentTime + offset, player.duration || 0))
    dispatch(
      listeningAction.updatePlayer({
        playedSeconds: player.currentTime,
        played: player.duration ? player.currentTime / player.duration : 0,
      }),
    )
  }

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds))
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${String(sec).padStart(2, '0')}`
  }

  const handleVolumeChange = (val: number) => {
    const newVol = val / 100
    dispatch(listeningAction.updatePlayer({ volume: newVol, muted: false }))
    if (playerRef.current) {
      playerRef.current.volume = newVol
      playerRef.current.muted = false
    }
  }

  const handleToggleMute = () => {
    const nextMuted = !muted
    dispatch(listeningAction.updatePlayer({ muted: nextMuted }))
    if (playerRef.current) {
      playerRef.current.muted = nextMuted
    }
  }

  const volumeContent = (
    <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Button
        type='text'
        size='small'
        icon={
          muted || volume === 0 ? (
            <MutedOutlined style={{ color: token.colorError }} />
          ) : (
            <SoundOutlined />
          )
        }
        onClick={handleToggleMute}
      />
      <Slider
        min={0}
        max={100}
        value={muted ? 0 : Math.round(volume * 100)}
        onChange={handleVolumeChange}
        style={{ width: 90, margin: 0 }}
      />
      <span style={{ fontSize: 11, minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
        {muted ? '0%' : `${Math.round(volume * 100)}%`}
      </span>
    </div>
  )

  const speedMenuProps: MenuProps = {
    items: [
      { key: '0.5', label: '0.5x' },
      { key: '0.75', label: '0.75x' },
      { key: '1', label: '1x' },
      { key: '1.25', label: '1.25x' },
      { key: '1.5', label: '1.5x' },
    ],
    selectable: true,
    selectedKeys: [String(playbackRate)],
    onClick: (e) => {
      const speed = Number.parseFloat(e.key)
      dispatch(listeningAction.updatePlayer({ playbackRate: speed }))
    },
  }

  return (
    <div
      className={styles.playerDock}
      style={{
        width: showPlayer ? '100%' : 50,
        transition: 'width 0.3s ease',
      }}
    >
      {/* Track list panel (appears inside dock, above controls) */}
      {trackListOpen && (
        <div className={styles.dockTrackList}>
          <TrackList />
        </div>
      )}

      {showPlayer && (
        <div className={styles.dockContainer}>
          {/* ── Left Zone: Disc + Meta + Bilingual Subtitles + Mobile Quick Tools ── */}
          <div className={styles.dockLeft}>
            <Tooltip title={trackListOpen ? 'Đóng danh sách bài' : 'Xem danh sách bài nghe'}>
              <div
                className={`${styles.dockDisc} ${playing ? styles.spinning : ''}`}
                onClick={() => setTrackListOpen((v) => !v)}
              >
                <CustomerServiceOutlined />
              </div>
            </Tooltip>

            <div className={styles.dockMeta}>
              <div className={styles.dockTitleRow}>
                <span
                  className={styles.dockTitle}
                  title={currentTrack?.title || 'Chưa chọn bài nghe'}
                >
                  {currentTrack?.title || 'Chưa chọn bài nghe'}
                </span>

                {isTranscriptPlayback && (
                  <Dropdown
                    menu={{
                      items: GEMINI_VOICES.map((v) => ({
                        key: v.value,
                        label: v.label,
                        onClick: () => {
                          if (currentTrack) {
                            dispatch(
                              listeningAction.updateTrack({ ...currentTrack, voice: v.value }),
                            )
                            ttsService.stop()
                            lastSpokenIndexRef.current = -1
                          }
                        },
                      })),
                      selectable: true,
                      selectedKeys: [currentVoice],
                    }}
                    trigger={['click']}
                  >
                    <Tag
                      color='cyan'
                      style={{
                        fontSize: 10,
                        lineHeight: '16px',
                        padding: '0 6px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title='Nhấp để đổi giọng đọc tự nhiên Gemini TTS'
                    >
                      <SoundOutlined style={{ marginRight: 3 }} />
                      {GEMINI_VOICES.find((v) => v.value === currentVoice)?.label.split(' ')[0] ||
                        'Auto'}
                    </Tag>
                  </Dropdown>
                )}
              </div>

              {/* Subtitles: English Karaoke + Vietnamese Translation */}
              {activeSegmentText ? (
                <div className={styles.dockSubtitles}>
                  <div
                    className={`${styles.dockKaraoke} ${
                      player.transcriptDisplayMode === 'blur'
                        ? styles.transcriptBlurred
                        : player.transcriptDisplayMode === 'hidden'
                          ? styles.transcriptHidden
                          : ''
                    }`}
                    onClick={() => {
                      if (player.transcriptDisplayMode !== 'visible') {
                        dispatch(listeningAction.updatePlayer({ transcriptDisplayMode: 'visible' }))
                      }
                    }}
                  >
                    <MarqueeText
                      isPlaying={playing}
                      textKey={`en-${activeIndex}-${activeSegmentText}`}
                      title={activeSegmentText}
                    >
                      <KaraokeText text={activeSegmentText} progress={activeSegmentProgress} />
                    </MarqueeText>
                  </div>

                  {activeSegmentTranslation && (
                    <div className={styles.dockTranslation}>
                      <MarqueeText
                        isPlaying={playing}
                        textKey={`vi-${activeIndex}-${activeSegmentTranslation}`}
                        title={activeSegmentTranslation}
                      >
                        <span>{activeSegmentTranslation}</span>
                      </MarqueeText>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Center Zone: Playback Controls & Modern Seek Bar ── */}
          <div className={styles.dockCenter}>
            <div className={styles.dockControlsRow}>
              {/* Loop Segment 1 */}
              <Tooltip title={loopSegment ? 'Tắt lặp câu (Đang bật)' : 'Bật lặp câu hiện tại'}>
                <Button
                  type='text'
                  size='middle'
                  className={`${styles.dockControlBtn} ${loopSegment ? styles.dockBtnActive : ''}`}
                  icon={
                    <div
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <RetweetOutlined style={{ fontSize: '18px' }} />
                      <span
                        style={{
                          position: 'absolute',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          top: '-4px',
                          right: '-4px',
                          lineHeight: 1,
                        }}
                      >
                        1
                      </span>
                    </div>
                  }
                  onClick={handleToggleLoopSegment}
                />
              </Tooltip>

              {/* Previous */}
              <Tooltip title='Bài trước'>
                <Button
                  type='text'
                  size='middle'
                  className={styles.dockControlBtn}
                  icon={<StepBackwardOutlined style={{ fontSize: '18px' }} />}
                  onClick={onPrev}
                />
              </Tooltip>

              {/* -10s */}
              <Tooltip title='Lùi 10 giây'>
                <Button
                  type='text'
                  size='middle'
                  className={styles.dockControlBtn}
                  icon={<FastBackwardOutlined style={{ fontSize: '18px' }} />}
                  onClick={() => onSeekBy(-10)}
                />
              </Tooltip>

              {/* Main Play / Pause */}
              <Tooltip title={playing ? 'Tạm dừng (Space)' : 'Phát (Space)'}>
                <Button
                  type='text'
                  className={styles.dockMainPlayBtn}
                  icon={
                    playing ? (
                      <PauseOutlined style={{ fontSize: '20px' }} />
                    ) : (
                      <CaretRightFilled style={{ fontSize: '22px', marginLeft: '2px' }} />
                    )
                  }
                  onClick={playing ? handlePause : handlePlay}
                />
              </Tooltip>

              {/* +10s */}
              <Tooltip title='Tua nhanh 10 giây'>
                <Button
                  type='text'
                  size='middle'
                  className={styles.dockControlBtn}
                  icon={<FastForwardOutlined style={{ fontSize: '18px' }} />}
                  onClick={() => onSeekBy(10)}
                />
              </Tooltip>

              {/* Next */}
              <Tooltip title='Bài tiếp'>
                <Button
                  type='text'
                  size='middle'
                  className={styles.dockControlBtn}
                  icon={<StepForwardOutlined style={{ fontSize: '18px' }} />}
                  onClick={onNext}
                />
              </Tooltip>

              {/* Loop Track */}
              <Tooltip title={loop ? 'Tắt lặp bài (Đang bật)' : 'Bật lặp bài'}>
                <Button
                  type='text'
                  size='middle'
                  className={`${styles.dockControlBtn} ${loop ? styles.dockBtnActive : ''}`}
                  icon={<ReloadOutlined style={{ fontSize: '18px' }} />}
                  onClick={handleToggleLoop}
                />
              </Tooltip>
            </div>

            {/* Modern seek bar */}
            <div className={styles.dockSeekBar}>
              <span className={styles.dockTime}>{formatTime(duration * played)}</span>
              <input
                type='range'
                className={styles.dockSlider}
                min={0}
                max={0.999999}
                step='any'
                value={played}
                style={
                  {
                    '--progress-percent': `${Math.min(100, Math.max(0, (played || 0) * 100))}%`,
                    '--dock-slider-color': token.colorPrimary,
                  } as React.CSSProperties
                }
                onMouseDown={handleSeekMouseDown}
                onChange={handleSeekChange}
                onMouseUp={handleSeekMouseUp}
              />
              <span className={styles.dockTime}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* ── Right Zone: Secondary Tools & Utilities ── */}
          <div className={styles.dockRight}>
            {/* Speed Pill Dropdown */}
            <Dropdown menu={speedMenuProps} trigger={['click']} placement='top'>
              <Tooltip title='Tốc độ phát'>
                <Button
                  type='text'
                  size='small'
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 12,
                    padding: '0 8px',
                    height: 26,
                    background: 'rgba(150, 150, 150, 0.1)',
                  }}
                >
                  {playbackRate}x
                </Button>
              </Tooltip>
            </Dropdown>

            {/* Transcript Display Mode (Visible / Blur toggle) */}
            <Tooltip
              title={
                player.transcriptDisplayMode === 'visible'
                  ? 'Làm mờ chữ (Luyện nghe)'
                  : 'Đang làm mờ chữ (Nhấp để hiện rõ)'
              }
            >
              <Button
                type='text'
                size='middle'
                className={`${styles.dockControlBtn} ${
                  player.transcriptDisplayMode === 'blur' ? styles.dockBtnActive : ''
                }`}
                icon={
                  player.transcriptDisplayMode === 'visible' ? (
                    <EyeOutlined style={{ fontSize: 18 }} />
                  ) : (
                    <EyeInvisibleOutlined style={{ fontSize: 18 }} />
                  )
                }
                onClick={() => {
                  const nextMode = player.transcriptDisplayMode === 'visible' ? 'blur' : 'visible'
                  dispatch(listeningAction.updatePlayer({ transcriptDisplayMode: nextMode }))
                }}
              />
            </Tooltip>

            {/* Volume Popover */}
            <Popover content={volumeContent} trigger='hover' placement='top'>
              <Button
                type='text'
                size='middle'
                className={styles.dockControlBtn}
                icon={
                  muted || volume === 0 ? (
                    <MutedOutlined style={{ fontSize: 18, color: token.colorError }} />
                  ) : (
                    <SoundOutlined style={{ fontSize: 18 }} />
                  )
                }
                onClick={handleToggleMute}
              />
            </Popover>

            {/* PiP Button */}
            <Tooltip title='Picture-in-Picture'>
              <Button
                type='text'
                size='middle'
                className={`${styles.dockControlBtn} ${pipWindow ? styles.dockBtnActive : ''}`}
                onClick={toggleDocumentPiP}
                icon={
                  <svg
                    viewBox='0 0 24 24'
                    width='18'
                    height='18'
                    fill='currentColor'
                    style={{ color: pipWindow ? token.palette?.yellow?.[0] : 'inherit' }}
                  >
                    <path d='M19 11h-8v6h8v-6zm4 8V5c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 0H3V5h18v14z' />
                  </svg>
                }
              />
            </Tooltip>

            {/* Focus Fullscreen Karaoke Button */}
            <Button
              type='text'
              size='middle'
              className={styles.dockControlBtn}
              onClick={() => dispatch(listeningAction.updatePlayer({ isFocusMode: true }))}
              icon={<FullscreenOutlined style={{ fontSize: 18 }} />}
            />
          </div>
        </div>
      )}

      {/* Hidden ReactPlayer engine */}
      <div style={{ display: 'none' }}>
        <ReactPlayer
          ref={setPlayerRef}
          className='react-player'
          style={{ width: 1, height: 1 }}
          src={isTranscriptPlayback ? undefined : resolvedSrc}
          playing={
            !isFirstLoadRef.current &&
            hasUserStartedPlaybackRef.current &&
            playing &&
            !isTranscriptPlayback
          }
          controls={controls}
          light={light}
          loop={loop}
          playbackRate={playbackRate}
          volume={volume}
          muted={isTranscriptPlayback ? true : muted}
          config={{
            youtube: {
              color: 'white',
            },
            vimeo: {
              color: 'ffffff',
            },
            spotify: {
              preferVideo: true,
            },
            tiktok: {
              fullscreen_button: true,
              progress_bar: true,
              play_button: true,
              volume_control: true,
              timestamp: false,
              music_info: false,
              description: false,
              rel: false,
              native_context_menu: true,
              closed_caption: false,
            },
          }}
          // onLoadStart={() => console.log('onLoadStart')}
          onReady={handleReady}
          // onStart={(e) => console.log('onStart', e)}
          onPlay={handlePlayerEnginePlay}
          onPause={handlePlayerEnginePause}
          onRateChange={handleRateChange}
          // onSeeking={(e) => console.log('onSeeking', e)}
          // onSeeked={(e) => console.log('onSeeked', e)}
          onEnded={handleEnded}
          // onError={(e) => console.log('onError', e)}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onDurationChange={handleDurationChange}
        />
      </div>

      {pipWindow &&
        createPortal(
          <div className={styles.pipContainer}>
            {/* Title */}
            <div className={styles.pipTitle}>{currentTrack?.title || 'No Track Playing'}</div>

            {/* Karaoke text + Translation */}
            <div className={styles.pipContentWrapper}>
              <div className={styles.pipKaraokeText}>
                {activeSegmentText ? (
                  <KaraokeText text={activeSegmentText} progress={activeSegmentProgress} />
                ) : (
                  <span style={{ color: '#8ea5b0', opacity: 0.6 }}>...</span>
                )}
                {activeSegmentTranslation && (
                  <div className={styles.pipTranslationText}>{activeSegmentTranslation}</div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className={styles.pipControls}>
              <Button
                type='text'
                title={'Previous'}
                className={styles.pipBtnSecondary}
                icon={<StepBackwardOutlined />}
                onClick={onPrev}
              />

              <Button
                type='text'
                title={'-10s'}
                className={styles.pipBtnSecondary}
                icon={<FastBackwardOutlined />}
                onClick={() => onSeekBy(-10)}
              />

              <Button
                type='text'
                className={styles.pipBtnPlay}
                icon={
                  playing ? (
                    <PauseOutlined style={{ fontSize: '20px', color: '#054753' }} />
                  ) : (
                    <CaretRightFilled
                      style={{ fontSize: '22px', color: '#054753', marginLeft: '3px' }}
                    />
                  )
                }
                onClick={playing ? handlePause : handlePlay}
              />

              <Button
                type='text'
                title={'+5s'}
                className={styles.pipBtnSecondary}
                icon={<FastForwardOutlined />}
                onClick={() => onSeekBy(10)}
              />

              <Button
                type='text'
                title={'Next'}
                className={styles.pipBtnSecondary}
                icon={<StepForwardOutlined />}
                onClick={onNext}
              />

              <Button
                type='text'
                title={
                  loopSegment ? 'Đang bật lặp câu (Nhấp để tắt)' : 'Lặp câu hiện tại (Nhấp để bật)'
                }
                className={styles.pipBtnSecondary}
                style={{
                  color: loopSegment ? '#fab005 !important' : '#8ea5b0 !important',
                }}
                icon={
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RetweetOutlined style={{ fontSize: '18px' }} />
                    <span
                      style={{
                        position: 'absolute',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        top: '-4px',
                        right: '-5px',
                        lineHeight: 1,
                      }}
                    >
                      1
                    </span>
                  </div>
                }
                onClick={handleToggleLoopSegment}
              />
            </div>
          </div>,
          pipWindow.document.body,
        )}

      {/* Focus Fullscreen Karaoke Modal */}
      <FocusListeningModal />
    </div>
  )
}
