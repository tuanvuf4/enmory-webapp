import React, { useMemo } from 'react'
import styles from './player.module.scss'

interface IProps {
  text: string
  progress: number // from 0 to 100
}

export const KaraokeText: React.FC<IProps> = ({ text, progress }) => {
  const parts = useMemo(() => {
    if (!text) return []
    // Split by whitespace boundaries to preserve both words and spaces/newlines
    const tokens = text.split(/(\s+)/)
    let charCount = 0
    return tokens.map((token) => {
      const startChar = charCount
      charCount += token.length
      const endChar = charCount
      return {
        text: token,
        isSpace: /^\s+$/.test(token),
        startChar,
        endChar,
      }
    })
  }, [text])

  const totalChars = text ? text.length : 0

  return (
    <>
      {parts.map((part, idx) => {
        if (part.isSpace) {
          return <span key={idx}>{part.text}</span>
        }

        // Calculate progress for this word based on character indexes
        const startPercent = totalChars > 0 ? (part.startChar / totalChars) * 100 : 0
        const endPercent = totalChars > 0 ? (part.endChar / totalChars) * 100 : 100

        let wordProgress = 0
        if (progress >= endPercent) {
          wordProgress = 100
        } else if (progress <= startPercent) {
          wordProgress = 0
        } else {
          const range = endPercent - startPercent
          wordProgress = range > 0 ? ((progress - startPercent) / range) * 100 : 0
        }

        const isWordPlayed = wordProgress > 0

        return (
          <span
            key={idx}
            className={`${styles.karaokeWord} ${isWordPlayed ? styles.boldWord : ''}`}
            style={{ '--word-progress': `${wordProgress}%` } as React.CSSProperties}
          >
            {part.text}
          </span>
        )
      })}
    </>
  )
}
