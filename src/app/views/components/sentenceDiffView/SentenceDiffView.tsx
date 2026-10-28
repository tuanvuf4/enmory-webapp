import React from 'react'
import { theme, Space, Tag, Progress } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { IDictationResult } from './sentenceDiffUtil'
import { DiffWordTag } from './DiffWordTag'
import styles from './sentenceDiffView.module.scss'

export interface ISentenceDiffViewProps {
  result?: IDictationResult | null
  sentenceContext?: string
  title?: React.ReactNode
  showTitle?: boolean
  showScore?: boolean
  interactive?: boolean
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}

export const SentenceDiffView: React.FC<ISentenceDiffViewProps> = ({
  result,
  sentenceContext,
  title,
  showTitle = true,
  showScore = false,
  interactive = true,
  compact = false,
  className,
  style,
}) => {
  const { token } = theme.useToken()

  if (!result || !result.words || result.words.length === 0) {
    return null
  }

  const defaultTitle = compact
    ? 'So khớp từng từ:'
    : 'So khớp từng từ (Bấm vào từ để xem chi tiết / tra từ điển):'

  return (
    <div
      className={`${styles.diffContainer} ${compact ? styles.diffContainerCompact : ''} ${className || ''}`}
      style={{
        backgroundColor: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
        ...style,
      }}
    >
      {/* Optional Score & Progress Row */}
      {showScore && (
        <div className={styles.scoreRow}>
          <Space align='center' size='small'>
            <Tag
              color={
                result.accuracy >= 90
                  ? 'success'
                  : result.accuracy >= 60
                    ? 'warning'
                    : 'error'
              }
              style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}
            >
              Độ khớp từ: {result.accuracy}%
            </Tag>

            {result.isPerfect && (
              <Tag color='gold' icon={<CheckCircleOutlined />}>
                Tuyệt đối chính xác! 🎉
              </Tag>
            )}
          </Space>

          <Progress
            percent={result.accuracy}
            size='small'
            style={{ width: 120, margin: 0 }}
            showInfo={false}
            status={
              result.accuracy >= 90
                ? 'success'
                : result.accuracy >= 60
                  ? 'normal'
                  : 'exception'
            }
          />
        </div>
      )}

      {/* Header title */}
      {showTitle && (
        <div className={styles.diffTitle} style={{ color: token.colorTextSecondary }}>
          {title ?? defaultTitle}
        </div>
      )}

      {/* Word tokens diff row */}
      <div className={`${styles.diffTokensRow} ${compact ? styles.diffTokensRowCompact : ''}`}>
        {result.words.map((item, idx) => (
          <DiffWordTag
            key={idx}
            item={item}
            sentenceContext={sentenceContext}
            interactive={interactive}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}

// Backward compatible aliases
export const DictationDiffView = SentenceDiffView
export type IDictationDiffViewProps = ISentenceDiffViewProps

