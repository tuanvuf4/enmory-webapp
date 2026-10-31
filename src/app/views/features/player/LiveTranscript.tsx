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
import { Button, Space, Tag, Tooltip, theme } from 'antd'
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
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Detect manual scroll — pause auto-follow while user is scrolling
  const handleScroll = useCallback(() => {
    if (!isUserScrolling.current) {
      isUserScrolling.current = true
      setAutoFollow(false)
    }
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      isUserScrolling.current = false
    }, 1500)
  }, [])

  // Auto-scroll when active segment changes AND autoFollow is on
  useEffect(() => {
    if (!autoFollow) return
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeIndex, autoFollow])

  const handleSync = () => {
    setAutoFollow(true)
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          <Tooltip
            title={
              transcriptDisplayMode === 'visible'
                ? 'Nhấp để làm mờ chữ (Luyện nghe)'
                : 'Đang làm mờ chữ. Nhấp để hiện lại'
            }
          >
            <Button
              size={'small'}
              type={'text'}
              variant={'text'}
              icon={
                transcriptDisplayMode === 'visible' ? (
                  <EyeOutlined style={{ fontSize: '16px' }} />
                ) : (
                  <EyeInvisibleOutlined style={{ fontSize: '16px', color: '#fab005' }} />
                )
              }
              onClick={handleToggleDisplayMode}
              style={{ background: 'transparent' }}
            />
          </Tooltip>

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
            icon={<AimOutlined />}
            title={'Sync câu hiện tại'}
            onClick={handleSync}
            style={{ background: 'transparent' }}
            color={autoFollow ? 'primary' : 'gold'}
          />

          {/* Fullscreen Focus Mode Button */}
          <Tooltip title='Toàn màn hình Focus Karaoke'>
            <Button
              size={'small'}
              type={'text'}
              variant={'text'}
              icon={<FullscreenOutlined style={{ fontSize: '16px' }} />}
              onClick={() => dispatch(listeningAction.updatePlayer({ isFocusMode: true }))}
              style={{ background: 'transparent' }}
            />
          </Tooltip>
        </Space>
      </div>

      {show && (
        <div ref={containerRef} className={styles.liveTranscriptFull} onScroll={handleScroll}>
          {segments.map((seg, i) => {
            const isActive = i === activeIndex
            const isPlayed = i < activeIndex
            const isRevealed = revealedSegments[i]
            const isBlur = transcriptDisplayMode === 'blur' && !isRevealed
            const isCopied = copiedIndex === i

            return (
              <div
                key={i}
                ref={isActive ? activeRef : null}
                className={`${styles.transcriptSegment} ${
                  isActive ? styles.transcriptActive : ''
                } ${isPlayed ? styles.transcriptPlayed : ''}`}
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

                  <Tooltip title={isCopied ? 'Đã sao chép' : 'Sao chép'}>
                    <Button
                      type='text'
                      size='small'
                      className={styles.copySegmentBtn}
                      icon={
                        isCopied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />
                      }
                      onClick={(e) => handleCopySegment(seg.text, i, e)}
                    />
                  </Tooltip>
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
                    style={{
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: token.colorTextSecondary,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
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
