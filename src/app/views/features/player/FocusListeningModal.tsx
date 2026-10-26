import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  FullscreenExitOutlined,
  PlayCircleFilled,
  PauseCircleFilled,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  RetweetOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UnorderedListOutlined,
  AimOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, MenuProps, Space, Tag, Tooltip } from 'antd'
import styles from './listening.module.scss'
import { useSelector, useDispatch } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { parseTranscript, formatSegmentTime, getActiveSegmentIndex } from './transcriptUtils'
import { KaraokeText } from './KaraokeText'
import { useSmoothTime } from './useSmoothTime'

export const FocusListeningModal: React.FC = () => {
  const dispatch = useDispatch()
  const { currentTrack, player } = useSelector((state) => state.listening)

  const {
    playing,
    playedSeconds,
    duration,
    playbackRate = 1,
    loop,
    loopSegment,
    isFocusMode,
    transcriptDisplayMode = 'visible',
  } = player

  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeAllRef = useRef<HTMLDivElement | null>(null)
  const scrollAllContainerRef = useRef<HTMLDivElement | null>(null)

  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus')
  const [revealedSegments, setRevealedSegments] = useState<Record<number, boolean>>({})

  const transcript = currentTrack?.transcript || ''
  const smoothTime = useSmoothTime(playedSeconds, playing, playbackRate)
  const segments = useMemo(() => parseTranscript(transcript), [transcript])
  const activeIndex = getActiveSegmentIndex(segments, smoothTime)

  // Calculate karaoke fill progress for the active segment
  const activeSegmentProgress = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= segments.length) return 0
    const seg = segments[activeIndex]
    const startTime = seg.timeSeconds
    const endTime =
      activeIndex < segments.length - 1
        ? segments[activeIndex + 1].timeSeconds
        : duration || startTime + 5
    const segDuration = endTime - startTime
    const elapsed = smoothTime - startTime
    return segDuration > 0 ? Math.max(0, Math.min(100, (elapsed / segDuration) * 100)) : 0
  }, [segments, activeIndex, smoothTime, duration])

  // Reset revealed segments when track changes or display mode changes
  useEffect(() => {
    setRevealedSegments({})
  }, [currentTrack?.id, transcriptDisplayMode])

  // Request browser fullscreen when modal mounts
  useEffect(() => {
    if (!isFocusMode) return

    const el = containerRef.current
    if (el && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {
        // Fallback to CSS fullscreen
      })
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        dispatch(listeningAction.updatePlayer({ isFocusMode: false }))
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isFocusMode, dispatch])

  // Auto-scroll in 'all' view mode
  useEffect(() => {
    if (viewMode === 'all') {
      activeAllRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, viewMode])

  // Handlers for playback controls
  const handlePlayPause = useCallback(() => {
    dispatch(listeningAction.updatePlayer({ playing: !playing }))
  }, [dispatch, playing])

  const handleSeekTo = useCallback(
    (time: number) => {
      dispatch(listeningAction.updatePlayer({ seekTo: Math.max(0, time), playing: true }))
    },
    [dispatch],
  )

  const handleSeekBy = useCallback(
    (delta: number) => {
      const target = Math.max(0, Math.min(duration || 0, (playedSeconds || 0) + delta))
      handleSeekTo(target)
    },
    [duration, playedSeconds, handleSeekTo],
  )

  const handlePrevSegment = useCallback(() => {
    if (activeIndex > 0) {
      handleSeekTo(segments[activeIndex - 1].timeSeconds)
    } else if (segments.length > 0) {
      handleSeekTo(segments[0].timeSeconds)
    }
  }, [activeIndex, segments, handleSeekTo])

  const handleNextSegment = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < segments.length - 1) {
      handleSeekTo(segments[activeIndex + 1].timeSeconds)
    }
  }, [activeIndex, segments, handleSeekTo])

  const handleToggleLoopSegment = useCallback(() => {
    dispatch(listeningAction.updatePlayer({ loopSegment: !loopSegment }))
  }, [dispatch, loopSegment])

  const handleToggleLoop = useCallback(() => {
    dispatch(listeningAction.updatePlayer({ loop: !loop }))
  }, [dispatch, loop])

  const handleSetSpeed = useCallback(
    (rate: number) => {
      dispatch(listeningAction.updatePlayer({ playbackRate: rate }))
    },
    [dispatch],
  )

  // Direct toggle: visible <-> blur
  const handleToggleDisplayMode = useCallback(() => {
    const nextMode = transcriptDisplayMode === 'visible' ? 'blur' : 'visible'
    dispatch(listeningAction.updatePlayer({ transcriptDisplayMode: nextMode }))
  }, [dispatch, transcriptDisplayMode])

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
    dispatch(listeningAction.updatePlayer({ isFocusMode: false }))
  }, [dispatch])

  // Toggle reveal state for a specific segment when clicked in blur mode
  const handleToggleReveal = (index: number, e?: React.MouseEvent) => {
    if (transcriptDisplayMode === 'visible') return
    e?.stopPropagation()
    setRevealedSegments((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  // Keyboard shortcut handler inside Focus Mode
  useEffect(() => {
    if (!isFocusMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetDoc = e.view?.document || document
      const activeEl = targetDoc.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.hasAttribute('contenteditable'))
      ) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleSeekBy(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          handleSeekBy(5)
          break
        case 'ArrowUp':
          e.preventDefault()
          handlePrevSegment()
          break
        case 'ArrowDown':
          e.preventDefault()
          handleNextSegment()
          break
        case 'KeyL':
          e.preventDefault()
          handleToggleLoopSegment()
          break
        case 'KeyH':
          e.preventDefault()
          handleToggleDisplayMode()
          break
        case 'Escape':
          e.preventDefault()
          handleClose()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isFocusMode,
    handlePlayPause,
    handleSeekBy,
    handlePrevSegment,
    handleNextSegment,
    handleToggleLoopSegment,
    handleToggleDisplayMode,
    handleClose,
  ])

  if (!isFocusMode) return null

  const currentSegment = activeIndex >= 0 ? segments[activeIndex] : null

  // Dropdown menu for speed selection
  const speedMenu: MenuProps = {
    items: [0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => ({
      key: String(rate),
      label: `${rate}x`,
      onClick: () => handleSetSpeed(rate),
    })),
    selectable: true,
    selectedKeys: [String(playbackRate)],
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00'
    const minutes = Math.floor(secs / 60)
    const seconds = Math.floor(secs % 60)
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // Helper to render text with blur status
  const renderSegmentText = (
    seg: { text: string; timeSeconds: number },
    index: number,
    isActive: boolean,
  ) => {
    const isRevealed = revealedSegments[index]
    const isBlur = transcriptDisplayMode === 'blur' && !isRevealed

    let textClass = ''
    if (isBlur) textClass = styles.focusBlurred
    if (isRevealed) textClass = styles.focusRevealed

    return (
      <span
        className={`${styles.focusTextItem} ${textClass}`}
        onClick={(e) => {
          if (isBlur) {
            handleToggleReveal(index, e)
          }
        }}
        title={isBlur ? 'Nhấp để lật mở câu này' : undefined}
      >
        {isActive ? <KaraokeText text={seg.text} progress={activeSegmentProgress} /> : seg.text}
      </span>
    )
  }

  return createPortal(
    <div ref={containerRef} className={styles.focusOverlay}>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className={styles.focusHeader}>
        <div className={styles.focusTrackInfo}>
          <h2 className={styles.focusTitle}>{currentTrack?.title || 'Không có bài nghe'}</h2>
          <Space size={6} wrap>
            <Tag color='cyan' style={{ fontSize: 12, borderRadius: 12 }}>
              <SoundOutlined style={{ marginRight: 4 }} />
              {activeIndex >= 0
                ? `${activeIndex + 1} / ${segments.length}`
                : `0 / ${segments.length}`}
            </Tag>
            {loopSegment && (
              <Tag color='gold' style={{ fontSize: 12, borderRadius: 12 }}>
                Đang lặp câu
              </Tag>
            )}
            {transcriptDisplayMode === 'blur' && (
              <Tag
                color='gold'
                style={{ fontSize: 12, borderRadius: 12, cursor: 'pointer' }}
                onClick={handleToggleDisplayMode}
              >
                Mờ chữ (Nhấp để hiện lại)
              </Tag>
            )}
          </Space>
        </div>

        <Space size='middle' align='center'>
          {/* Switch View Mode: 1-line Focus vs All scroll */}
          <Tooltip
            title={
              viewMode === 'focus'
                ? 'Chuyển sang cuộn tất cả câu'
                : 'Chuyển sang xem 1 câu tập trung'
            }
          >
            <Button
              type='text'
              className={styles.focusHeaderBtn}
              icon={viewMode === 'focus' ? <UnorderedListOutlined /> : <AimOutlined />}
              onClick={() => setViewMode(viewMode === 'focus' ? 'all' : 'focus')}
            >
              {viewMode === 'focus' ? 'Toàn bộ bài' : 'Tập trung'}
            </Button>
          </Tooltip>

          {/* Transcript Blur Button (1-Click Direct Toggle) */}
          <Tooltip title='Nhấp để làm mờ / hiện chữ (Phím H)'>
            <Button
              type='text'
              className={styles.focusHeaderBtn}
              icon={
                transcriptDisplayMode === 'visible' ? (
                  <EyeOutlined />
                ) : (
                  <EyeInvisibleOutlined style={{ color: '#fab005' }} />
                )
              }
              onClick={handleToggleDisplayMode}
            >
              {transcriptDisplayMode === 'visible' ? 'Hiện chữ' : 'Đang làm mờ'}
            </Button>
          </Tooltip>

          {/* Exit Fullscreen Button */}
          <Tooltip title='Thoát toàn màn hình (Esc)'>
            <Button
              type='text'
              className={styles.focusCloseBtn}
              icon={<FullscreenExitOutlined style={{ fontSize: 24 }} />}
              onClick={handleClose}
            />
          </Tooltip>
        </Space>
      </div>

      {/* ── Main Body: Lyrics ────────────────────────────────────────────── */}
      <div className={styles.focusBody}>
        {segments.length === 0 ? (
          <div className={styles.focusEmpty}>
            <p>Bài nghe này chưa có transcript có mốc thời gian.</p>
          </div>
        ) : viewMode === 'focus' ? (
          /* Focus View Mode: 1 line (Only Active segment with Karaoke) */
          <div className={styles.focusLyricsCentral}>
            {/* Active line with big Karaoke highlight */}
            <div className={`${styles.focusLyricLine} ${styles.focusLyricActive}`}>
              {currentSegment ? (
                <>
                  <span className={styles.focusTimeTag}>
                    {formatSegmentTime(currentSegment.timeSeconds)}
                  </span>
                  {renderSegmentText(currentSegment, activeIndex, true)}
                </>
              ) : (
                <span className={styles.focusPlaceholder}>Đang chuẩn bị phát...</span>
              )}
            </div>
          </div>
        ) : (
          /* All View Mode: Scrollable list of all segments */
          <div ref={scrollAllContainerRef} className={styles.focusLyricsAll}>
            {segments.map((seg, i) => {
              const isActive = i === activeIndex
              return (
                <div
                  key={i}
                  ref={isActive ? activeAllRef : null}
                  className={`${styles.focusAllSegment} ${isActive ? styles.focusAllActive : ''}`}
                  onClick={() => handleSeekTo(seg.timeSeconds)}
                >
                  <span className={styles.focusTimeTag}>{formatSegmentTime(seg.timeSeconds)}</span>
                  <div className={styles.focusAllTextWrapper}>
                    {renderSegmentText(seg, i, isActive)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bottom Controls ──────────────────────────────────────────────── */}
      <div className={styles.focusFooter}>
        {/* Seek Bar */}
        <div className={styles.focusSeekBar}>
          <span className={styles.focusTimeText}>{formatTime(playedSeconds)}</span>
          <input
            type='range'
            min={0}
            max={duration || 100}
            step='any'
            value={playedSeconds || 0}
            onChange={(e) => handleSeekTo(parseFloat(e.target.value))}
            className={styles.focusSeekRange}
          />
          <span className={styles.focusTimeText}>{formatTime(duration)}</span>
        </div>

        {/* Buttons Row */}
        <div className={styles.focusControlsRow}>
          {/* Playback Rate Dropdown (bên trái) */}
          <Dropdown menu={speedMenu} trigger={['click']}>
            <Tooltip title='Tốc độ phát'>
              <Button
                type='text'
                className={styles.focusCtrlBtn}
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {playbackRate}x
              </Button>
            </Tooltip>
          </Dropdown>

          {/* Loop Whole Track */}
          <Tooltip title={loop ? 'Tắt lặp lại bài' : 'Bật lặp lại toàn bài'}>
            <Button
              type='text'
              icon={<ReloadOutlined style={{ fontSize: 20 }} />}
              className={`${styles.focusCtrlBtn} ${loop ? styles.focusBtnActive : ''}`}
              onClick={handleToggleLoop}
            />
          </Tooltip>

          {/* Seek -10s */}
          <Tooltip title='Lùi 10s (Mũi tên trái)'>
            <Button
              type='text'
              icon={<FastBackwardOutlined style={{ fontSize: 24 }} />}
              className={styles.focusCtrlBtn}
              onClick={() => handleSeekBy(-10)}
            />
          </Tooltip>

          {/* Previous Segment */}
          <Tooltip title='Câu trước (Mũi tên lên)'>
            <Button
              type='text'
              icon={<StepBackwardOutlined style={{ fontSize: 26 }} />}
              className={styles.focusCtrlBtn}
              onClick={handlePrevSegment}
            />
          </Tooltip>

          {/* Big Play/Pause Button */}
          <Tooltip title={playing ? 'Tạm dừng (Space)' : 'Phát tiếp (Space)'}>
            <Button
              type='text'
              className={styles.focusPlayBtn}
              icon={
                playing ? (
                  <PauseCircleFilled style={{ fontSize: 64 }} />
                ) : (
                  <PlayCircleFilled style={{ fontSize: 64 }} />
                )
              }
              onClick={handlePlayPause}
            />
          </Tooltip>

          {/* Next Segment */}
          <Tooltip title='Câu tiếp (Mũi tên xuống)'>
            <Button
              type='text'
              icon={<StepForwardOutlined style={{ fontSize: 26 }} />}
              className={styles.focusCtrlBtn}
              onClick={handleNextSegment}
            />
          </Tooltip>

          {/* Seek +10s */}
          <Tooltip title='Tiến 10s (Mũi tên phải)'>
            <Button
              type='text'
              icon={<FastForwardOutlined style={{ fontSize: 24 }} />}
              className={styles.focusCtrlBtn}
              onClick={() => handleSeekBy(10)}
            />
          </Tooltip>

          {/* Loop Current Segment */}
          <Tooltip
            title={loopSegment ? 'Đang lặp câu này (L để tắt)' : 'Lặp câu hiện tại (Phím L)'}
          >
            <Button
              type='text'
              icon={
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <RetweetOutlined style={{ fontSize: 22 }} />
                  <span
                    style={{
                      position: 'absolute',
                      fontSize: 9,
                      fontWeight: 'bold',
                      top: -4,
                      right: -5,
                    }}
                  >
                    1
                  </span>
                </div>
              }
              className={`${styles.focusCtrlBtn} ${loopSegment ? styles.focusBtnActive : ''}`}
              onClick={handleToggleLoopSegment}
            />
          </Tooltip>

          {/* Fullscreen Button (bên phải) */}
          <Tooltip title='Thoát toàn màn hình (Esc)'>
            <Button
              type='text'
              icon={<FullscreenExitOutlined style={{ fontSize: 22 }} />}
              className={styles.focusCtrlBtn}
              onClick={handleClose}
            />
          </Tooltip>
        </div>
      </div>
    </div>,
    document.body,
  )
}
