import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './player.module.scss'
import { formatSegmentTime, getActiveSegmentIndex, parseTranscript } from './transcriptUtils'
import { AimOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { KaraokeText } from './KaraokeText'
import { useSmoothTime } from './useSmoothTime'

interface IProps {
  transcript: string
  playedSeconds: number
  duration: number
  playing: boolean
  playbackRate?: number
  onSeekTo?: (seconds: number) => void
}

export const LiveTranscript: React.FC<IProps> = ({
  transcript,
  playedSeconds,
  duration,
  playing,
  playbackRate = 1,
  onSeekTo,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
  const isUserScrolling = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [autoFollow, setAutoFollow] = useState(true)

  const smoothTime = useSmoothTime(playedSeconds, playing, playbackRate)

  const segments = useMemo(() => parseTranscript(transcript), [transcript])
  const activeIndex = getActiveSegmentIndex(segments, smoothTime)

  const activeSegmentProgress = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= segments.length) return 0
    const seg = segments[activeIndex]
    const startTime = seg.timeSeconds
    const endTime =
      activeIndex < segments.length - 1
        ? segments[activeIndex + 1].timeSeconds
        : (duration || startTime + 5)
    const segDuration = endTime - startTime
    const elapsed = smoothTime - startTime
    return segDuration > 0 ? Math.max(0, Math.min(100, (elapsed / segDuration) * 100)) : 0
  }, [segments, activeIndex, smoothTime, duration])

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

  // Fallback: raw HTML when no timestamp segments are detected
  if (!segments.length) {
    return <div className={styles.transcript} dangerouslySetInnerHTML={{ __html: transcript }} />
  }

  return (
    <div className={styles.liveTranscriptWrapper}>
      <div className={styles.liveTranscriptHeader}>
        <h3>
          Transcript
          <span>
            {activeIndex >= 0
              ? `(${activeIndex + 1} / ${segments.length})`
              : `(0 / ${segments.length})`}
          </span>
        </h3>

        <Button
          type={'text'}
          variant={'text'}
          icon={<AimOutlined />}
          title={'Sync'}
          onClick={handleSync}
          color={autoFollow ? 'primary' : 'gold'}
        />
      </div>

      <div ref={containerRef} className={styles.liveTranscriptFull} onScroll={handleScroll}>
        {segments.map((seg, i) => {
          const isActive = i === activeIndex
          const isPlayed = i < activeIndex
          return (
            <div
              key={i}
              ref={isActive ? activeRef : null}
              className={`${styles.transcriptSegment} ${
                isActive ? styles.transcriptActive : ''
              } ${isPlayed ? styles.transcriptPlayed : ''}`}
              onClick={() => onSeekTo?.(seg.timeSeconds)}
              title='Click to seek'
            >
              <span className={styles.transcriptTime}>{formatSegmentTime(seg.timeSeconds)}</span>
              <p>
                {isActive ? (
                  <KaraokeText text={seg.text} progress={activeSegmentProgress} />
                ) : (
                  seg.text
                )}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
