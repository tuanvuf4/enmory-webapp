import React, { useRef, useState, useEffect, useLayoutEffect } from 'react'
import styles from './listening.module.scss'

interface MarqueeTextProps {
  children: React.ReactNode
  isPlaying?: boolean
  className?: string
  textKey?: string | number
  speed?: number // pixels per second (comfortable reading speed ~35-40px/s)
  title?: string
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  children,
  isPlaying = false,
  className = '',
  textKey,
  speed = 36,
  title,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [overflow, setOverflow] = useState<number>(0)

  const checkOverflow = () => {
    if (!containerRef.current || !contentRef.current) return
    const containerW = containerRef.current.clientWidth
    if (containerW === 0) return
    const contentW = contentRef.current.scrollWidth
    const diff = contentW - containerW
    // 6px threshold to prevent minor rounding jitter
    setOverflow(diff > 6 ? diff : 0)
  }

  useLayoutEffect(() => {
    checkOverflow()
  }, [children, textKey])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => {
      checkOverflow()
    })
    observer.observe(containerRef.current)
    if (contentRef.current) {
      observer.observe(contentRef.current)
    }
    return () => observer.disconnect()
  }, [])

  const hasOverflow = overflow > 0
  const distance = hasOverflow ? overflow + 16 : 0
  // Travel distance: travelTime is 50% of the keyframe cycle (18% hold at start, 50% travel, 17% hold at end, 15% return)
  const travelTime = distance / speed
  const duration = hasOverflow ? Math.max(6, travelTime * 2) : 0

  return (
    <div
      ref={containerRef}
      className={`${styles.marqueeContainer} ${hasOverflow ? styles.marqueeHasOverflow : ''} ${className}`}
      title={title}
    >
      <div
        key={textKey !== undefined ? String(textKey) : undefined}
        ref={contentRef}
        className={`${styles.marqueeContent} ${hasOverflow && isPlaying ? styles.marqueeScrolling : ''}`}
        style={
          hasOverflow
            ? ({
                '--marquee-distance': `-${distance}px`,
                '--marquee-duration': `${duration.toFixed(2)}s`,
                animationPlayState: isPlaying ? 'running' : 'paused',
              } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
    </div>
  )
}
