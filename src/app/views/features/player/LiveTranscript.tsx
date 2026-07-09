import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './player.module.scss'
import { formatSegmentTime, getActiveSegmentIndex, parseTranscript } from './transcriptUtils'
import { AimOutlined } from '@ant-design/icons'
import { Button } from 'antd'

interface IProps {
  transcript: string
  playedSeconds: number
  onSeekTo?: (seconds: number) => void
}

export const LiveTranscript: React.FC<IProps> = ({ transcript, playedSeconds, onSeekTo }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
  const isUserScrolling = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [autoFollow, setAutoFollow] = useState(true)

  const segments = useMemo(() => parseTranscript(transcript), [transcript])
  const activeIndex = getActiveSegmentIndex(segments, playedSeconds)

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
          <span className={styles.liveTranscriptCount}>
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
        {segments.map((seg, i) => (
          <div
            key={i}
            ref={i === activeIndex ? activeRef : null}
            className={`${styles.transcriptSegment} ${
              i === activeIndex ? styles.transcriptActive : ''
            }`}
            onClick={() => onSeekTo?.(seg.timeSeconds)}
            title='Click to seek'
          >
            <span className={styles.transcriptTime}>{formatSegmentTime(seg.timeSeconds)}</span>
            <p>{seg.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
