import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './listening.module.scss'
import { formatSegmentTime, getActiveSegmentIndex, parseTranscript } from './transcriptUtils'
import {
  AimOutlined,
  CheckOutlined,
  CopyOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FullscreenOutlined,
  RetweetOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Space, Tag, theme } from 'antd'
import { KaraokeText } from './KaraokeText'
import { useSmoothTime } from './useSmoothTime'
import { useSelector } from '@/core/hooks'
import { useDispatch } from 'react-redux'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { usePrompt } from '@/helpers/hooks'

export const LiveTranscript: React.FC = () => {
  const { token } = theme.useToken()
  const { message } = usePrompt()

  const { currentTrack, player } = useSelector((state) => state.listening)

  const dispatch = useDispatch()

  const [show, setShow] = useState(true)

  const transcript = currentTrack?.transcript || ''

  const {
    playedSeconds,
    duration,
    playing,
    playbackRate = 1,
    loopSegment,
    transcriptDisplayMode = 'visible',
  } = player

  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
  const isUserScrolling = useRef(false)
  const isAutoScrolling = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [autoFollow, setAutoFollow] = useState(true)
  const [revealedSegments, setRevealedSegments] = useState<Record<number, boolean>>({})
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const smoothTime = useSmoothTime(playedSeconds, playing, playbackRate)

  const segments = useMemo(
    () => parseTranscript(transcript, currentTrack?.translation || ''),
    [transcript, currentTrack?.translation],
  )
  const activeIndex = getActiveSegmentIndex(segments, smoothTime)

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

  // Smoothly scroll container to active segment without scrolling outer window
  const scrollToActiveSegment = useCallback(
    (behavior: ScrollBehavior = 'smooth', align: 'center' | 'nearest' = 'center') => {
      const container = containerRef.current
      const target = activeRef.current
      if (!container || !target) return

      const targetTop = target.offsetTop - container.offsetTop
      const containerHeight = container.clientHeight
      const targetHeight = target.offsetHeight

      let targetScrollTop = targetTop - containerHeight / 2 + targetHeight / 2

      if (align === 'nearest') {
        const currentScroll = container.scrollTop
        const targetBottom = targetTop + targetHeight

        // If segment is already safely visible inside container, don't jitter
        if (
          targetTop >= currentScroll + 30 &&
          targetBottom <= currentScroll + containerHeight - 30
        ) {
          return
        }
        targetScrollTop = targetTop - containerHeight / 2 + targetHeight / 2
      }

      // Mark programmatic scroll so handleScroll does NOT disable autoFollow
      isAutoScrolling.current = true
      if (autoScrollTimeout.current) clearTimeout(autoScrollTimeout.current)

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior,
      })

      autoScrollTimeout.current = setTimeout(() => {
        isAutoScrolling.current = false
      }, 700)
    },
    [],
  )

  // Detect user manual interaction (mouse wheel / touch) to pause auto-follow
  const handleUserManualScroll = useCallback(() => {
    if (isAutoScrolling.current) return
    setAutoFollow(false)
  }, [])

  // Detect scroll events — only pause autoFollow if triggered by actual user
  const handleScroll = useCallback(() => {
    if (isAutoScrolling.current) return

    if (!isUserScrolling.current) {
      isUserScrolling.current = true
      setAutoFollow(false)
    }
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      isUserScrolling.current = false
    }, 1200)
  }, [])

  // Auto-scroll inside container when active segment changes AND autoFollow is true
  useEffect(() => {
    if (!autoFollow || activeIndex < 0) return
    // Small timeout to allow DOM ref assignment on new activeIndex
    const timer = setTimeout(() => {
      scrollToActiveSegment('smooth', 'nearest')
    }, 50)
    return () => clearTimeout(timer)
  }, [activeIndex, autoFollow, scrollToActiveSegment])

  const handleSync = () => {
    setAutoFollow(true)
    scrollToActiveSegment('smooth', 'center')
  }

  // Toggle display mode directly: visible <-> blur
  const handleToggleDisplayMode = () => {
    const nextMode = transcriptDisplayMode === 'visible' ? 'blur' : 'visible'
    dispatch(listeningAction.updatePlayer({ transcriptDisplayMode: nextMode }))
  }

  const handleToggleReveal = (index: number, e: React.MouseEvent) => {
    if (transcriptDisplayMode === 'visible') return
    e.stopPropagation()
    setRevealedSegments((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleCopySegment = (text: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(index)
        message({ type: 'success', content: 'Đã sao chép câu vào clipboard!' })
        setTimeout(() => {
          setCopiedIndex((prev) => (prev === index ? null : prev))
        }, 2000)
      })
      .catch(() => {
        message({ type: 'error', content: 'Không thể sao chép vào clipboard!' })
      })
  }

  // Fallback: raw HTML when no timestamp segments are detected
  if (!segments.length) {
    return <div className={styles.transcript} dangerouslySetInnerHTML={{ __html: transcript }} />
  }

  if (!currentTrack?.transcript) return null

  return (
    <div className={styles.liveTranscriptWrapper} style={{ background: token.colorBgContainer }}>
      <div className={styles.liveTranscriptHeader}>
        <Button
          size='small'
          variant={'text'}
          type={'text'}
          icon={<UnorderedListOutlined />}
          onClick={() => setShow(!show)}
          style={{ background: 'transparent', fontSize: 14 }}
        >
          Transcript{' '}
          <span>
            {activeIndex >= 0
              ? ` (${activeIndex + 1}/${segments.length})`
              : ` (0/${segments.length})`}
          </span>
        </Button>

        <Space size='small' align='center'>
          {/* Transcript Blur/Visible Button */}

          <Button
            size={'small'}
            type={'text'}
            variant={'text'}
            icon={
              transcriptDisplayMode === 'visible' ? (
                <EyeOutlined style={{ fontSize: '16px' }} />
              ) : (
                <EyeInvisibleOutlined
                  style={{ fontSize: '16px', color: token.palette?.yellow?.[0] }}
                />
              )
            }
            onClick={handleToggleDisplayMode}
            style={{ background: 'transparent' }}
          />

          {/* Loop Segment Button */}
          <Button
            size={'small'}
            type={'text'}
            variant={'text'}
            icon={
              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RetweetOutlined style={{ fontSize: '16px' }} />
                <span
                  style={{
                    position: 'absolute',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    top: '-3px',
                    right: '-4px',
                    lineHeight: 1,
                  }}
                >
                  1
                </span>
              </div>
            }
            title={
              loopSegment ? 'Đang bật lặp câu (Nhấp để tắt)' : 'Lặp câu hiện tại (Nhấp để bật)'
            }
            onClick={() => dispatch(listeningAction.updatePlayer({ loopSegment: !loopSegment }))}
            style={{
              background: 'transparent',
              color: loopSegment ? token.palette?.yellow?.[0] : token.colorTextSecondary,
            }}
          />

          {/* Sync Button */}

          <Button
            size={'small'}
            type={'text'}
            variant={'text'}
            icon={
              autoFollow ? (
                <AimOutlined />
              ) : (
                <AimOutlined style={{ color: token.palette?.yellow?.[0] }} />
              )
            }
            onClick={handleSync}
          />

          {/* Fullscreen Focus Mode Button */}
          <Button
            size={'small'}
            type={'text'}
            variant={'text'}
            icon={<FullscreenOutlined style={{ fontSize: '16px' }} />}
            onClick={() => dispatch(listeningAction.updatePlayer({ isFocusMode: true }))}
            style={{ background: 'transparent' }}
          />
        </Space>
      </div>

      {show && (
        <div
          ref={containerRef}
          className={styles.liveTranscriptFull}
          onScroll={handleScroll}
          onWheel={handleUserManualScroll}
          onTouchMove={handleUserManualScroll}
        >
          {segments.map((seg, i) => {
            const isActive = i === activeIndex
            const isRevealed = revealedSegments[i]
            const isBlur = transcriptDisplayMode === 'blur' && !isRevealed
            const isCopied = copiedIndex === i

            return (
              <div
                key={i}
                ref={isActive ? activeRef : null}
                className={`${styles.transcriptSegment} ${isActive ? styles.transcriptActive : ''}`}
                onClick={() =>
                  dispatch(listeningAction.updatePlayer({ seekTo: seg.timeSeconds, playing: true }))
                }
              >
                <div className={styles.segmentHeader}>
                  <div className={styles.segmentTags}>
                    <Tag
                      color='cyan'
                      style={{
                        fontSize: 11,
                        lineHeight: '18px',
                        verticalAlign: 'middle',
                        cursor: 'pointer',
                      }}
                    >
                      {formatSegmentTime(seg.timeSeconds)}
                    </Tag>
                    {isActive && loopSegment && (
                      <Tag
                        color='gold'
                        style={{
                          fontSize: 10,
                          lineHeight: '18px',
                          verticalAlign: 'middle',
                        }}
                      >
                        Lặp câu
                      </Tag>
                    )}
                    {isRevealed && transcriptDisplayMode === 'blur' && (
                      <Tag
                        color='purple'
                        style={{
                          fontSize: 10,
                          lineHeight: '18px',
                          verticalAlign: 'middle',
                        }}
                      >
                        Đã mở
                      </Tag>
                    )}
                  </div>

                  <Button
                    type='text'
                    size='small'
                    className={styles.copySegmentBtn}
                    icon={
                      isCopied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />
                    }
                    onClick={(e) => handleCopySegment(seg.text, i, e)}
                  />
                </div>

                <p
                  className={`${isBlur ? styles.transcriptBlurred : ''} ${
                    isRevealed ? styles.transcriptRevealed : ''
                  }`}
                  onClick={(e) => {
                    if (isBlur) {
                      handleToggleReveal(i, e)
                    }
                  }}
                  title={isBlur ? 'Nhấp vào để hé mở câu này' : undefined}
                >
                  {isActive ? (
                    <KaraokeText text={seg.text} progress={activeSegmentProgress} />
                  ) : (
                    seg.text
                  )}
                </p>

                {player.showTranslation !== false && seg.translation && (
                  <div
                    className={`${styles.liveTranslationText} ${isBlur ? styles.transcriptBlurred : ''} ${
                      isRevealed ? styles.transcriptRevealed : ''
                    }`}
                    onClick={(e) => {
                      if (isBlur) {
                        handleToggleReveal(i, e)
                      }
                    }}
                    title={isBlur ? 'Nhấp vào để hé mở câu này' : undefined}
                  >
                    {seg.translation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
