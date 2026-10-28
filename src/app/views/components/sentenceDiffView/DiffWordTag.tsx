import React from 'react'
import { theme, Tooltip } from 'antd'
import { IDictationWord } from './sentenceDiffUtil'
import { WordLookupPopover } from '../wordLookup'
import styles from './sentenceDiffView.module.scss'

export interface IDiffWordTagProps {
  item: IDictationWord
  sentenceContext?: string
  interactive?: boolean
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}

export const DiffWordTag: React.FC<IDiffWordTagProps> = ({
  item,
  sentenceContext,
  interactive = true,
  compact = false,
  className,
  style,
}) => {
  const { token } = theme.useToken()

  const isCorrect = item.status === 'correct'
  const isTypo = item.status === 'typo'
  const isMissing = item.status === 'missing'
  const isExtra = item.status === 'extra'

  const tooltipText = isCorrect
    ? 'Chính xác!'
    : isTypo
      ? `Gần đúng! Bạn gõ: "${item.userWord}" (Chuẩn: "${item.word}")`
      : isMissing
        ? `Từ bị thiếu: "${item.word}"`
        : `Từ gõ thừa: "${item.userWord}"`

  const bgColor = isCorrect
    ? token.colorSuccessBg
    : isTypo
      ? token.colorWarningBg
      : isMissing
        ? token.colorErrorBg
        : token.colorFillAlter

  const textColor = isCorrect
    ? token.colorSuccess
    : isTypo
      ? token.colorWarning
      : isMissing
        ? token.colorError
        : token.colorTextSecondary

  const borderColor = isCorrect
    ? token.colorSuccessBorder
    : isTypo
      ? token.colorWarningBorder
      : isMissing
        ? token.colorErrorBorder
        : token.colorBorder

  const tagContent = (
    <Tooltip title={tooltipText}>
      <span
        className={`${styles.diffWordTag} ${compact ? styles.diffWordTagCompact : ''} ${
          isExtra ? styles.diffExtraTag : ''
        } ${className || ''}`}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          border: `1px solid ${borderColor}`,
          ...style,
        }}
      >
        {item.word}
      </span>
    </Tooltip>
  )

  if (!interactive) {
    return tagContent
  }

  return (
    <WordLookupPopover word={item.word} sentenceContext={sentenceContext}>
      {tagContent}
    </WordLookupPopover>
  )
}

