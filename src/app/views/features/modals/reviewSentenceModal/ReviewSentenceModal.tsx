import { IReviewSentenceResponse } from '@/services/openai/reviewSentence.service'
import { Modal, Card, Empty, Tag, Space, Button, Spin } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, CopyOutlined } from '@ant-design/icons'
import styles from './reviewSentenceModal.module.scss'
import { usePrompt } from '@/helpers/hooks'

export interface ReviewSentenceModalProps {
  open: boolean
  loading: boolean
  result: IReviewSentenceResponse | null
  onClose: () => void
  onApplySuggestion?: (suggestion: string) => void
}

export const ReviewSentenceModal: React.FC<ReviewSentenceModalProps> = ({
  open,
  loading,
  result,
  onClose,
  onApplySuggestion,
}) => {
  const { message } = usePrompt()

  const handleCopySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion)
    message({ type: 'success', content: 'Suggestion copied to clipboard!' })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✨ Sentence Review</span>
          {result && !loading && (
            <Tag
              color={result.isCorrect ? 'green' : 'orange'}
              icon={result.isCorrect ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            >
              {result.score}/100
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Spin spinning={loading} tip='Analyzing your sentence...'>
        {result ? (
          <div className={styles.reviewContainer}>
            {/* Original Sentence */}
            <Card
              size='small'
              style={{ marginBottom: 16 }}
              title={
                <span style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                  Original
                </span>
              }
            >
              <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{result.original}</p>
            </Card>

            {/* Summary */}
            <Card
              size='small'
              style={{ marginBottom: 16 }}
              title={
                <span style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                  Assessment
                </span>
              }
            >
              <p style={{ margin: 0, fontSize: 14 }}>{result.summary}</p>
            </Card>

            {/* Suggestions */}
            {result.suggestions.length > 0 ? (
              <div className={styles.suggestionsContainer}>
                <h3
                  style={{
                    marginBottom: 12,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  Issues Found ({result.suggestions.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.suggestions.map((suggestion, idx) => (
                    <Card
                      key={idx}
                      size='small'
                      style={{
                        borderLeft: `4px solid ${getScoreColor(60)}`,
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <Tag color='blue'>{suggestion.issue}</Tag>
                        <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                          Issue {idx + 1}
                        </span>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>
                            Current:
                          </span>
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 13,
                              fontFamily: 'monospace',
                              color: '#ff4d4f',
                              backgroundColor: '#fff1f0',
                              padding: '2px 6px',
                              borderRadius: 3,
                            }}
                          >
                            {suggestion.current}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>
                            Suggestion:
                          </span>
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 13,
                              fontFamily: 'monospace',
                              color: '#52c41a',
                              backgroundColor: '#f6ffed',
                              padding: '2px 6px',
                              borderRadius: 3,
                            }}
                          >
                            {suggestion.suggestion}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: '#666' }}>
                          <strong>Why:</strong> {suggestion.explanation}
                        </span>
                      </div>

                      <Space size='small'>
                        <Button
                          size='small'
                          type='primary'
                          ghost
                          icon={<CopyOutlined />}
                          onClick={() => handleCopySuggestion(suggestion.suggestion)}
                        >
                          Copy
                        </Button>
                        {onApplySuggestion && (
                          <Button
                            size='small'
                            type='primary'
                            onClick={() => {
                              onApplySuggestion(suggestion.suggestion)
                              onClose()
                            }}
                          >
                            Apply
                          </Button>
                        )}
                      </Space>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Empty
                description='No issues found!'
                style={{ marginTop: 20 }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        ) : (
          <Empty description='No review result' />
        )}
      </Spin>
    </Modal>
  )
}
