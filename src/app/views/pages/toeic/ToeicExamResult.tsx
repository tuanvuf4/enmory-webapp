import React, { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Progress,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CustomerServiceOutlined,
  MinusCircleOutlined,
  ReadOutlined,
  RedoOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { IToeicAttempt, IToeicExam, IToeicPartStat, IToeicQuestion } from '@/models/toeic.model'
import { getExamRenderItems, getPartMeta } from './toeicData'
import { ToeicAudioPlayer } from './ToeicAudioPlayer'

const { Title, Text, Paragraph } = Typography

interface ToeicExamResultProps {
  exam: IToeicExam
  attempt: IToeicAttempt
  onRetry: () => void
  onBackToList: () => void
}

type ReviewFilter = 'all' | 'wrong' | 'correct' | 'unanswered' | 'flagged'

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m} phút ${s} giây`
}

export const ToeicExamResult: React.FC<ToeicExamResultProps> = ({
  exam,
  attempt,
  onRetry,
  onBackToList,
}) => {
  const { token } = theme.useToken()
  const [filter, setFilter] = useState<ReviewFilter>('all')

  const renderItems = useMemo(
    () => getExamRenderItems(exam, attempt.selectedParts),
    [exam, attempt.selectedParts],
  )

  const totalCorrect = attempt.listeningCorrect + attempt.readingCorrect
  const totalQuestions = attempt.listeningTotal + attempt.readingTotal
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  const matchesFilter = (q: IToeicQuestion): boolean => {
    const userAns = attempt.answers[q.id]
    if (filter === 'all') return true
    if (filter === 'correct') return userAns === q.correctAnswer
    if (filter === 'wrong') return Boolean(userAns) && userAns !== q.correctAnswer
    if (filter === 'unanswered') return !userAns
    if (filter === 'flagged') return attempt.flaggedIds.includes(q.id)
    return true
  }

  const partColumns = [
    {
      title: 'Phần thi',
      dataIndex: 'part',
      key: 'part',
      render: (part: IToeicPartStat['part']) => {
        const meta = getPartMeta(part)
        return (
          <Space>
            <Tag color={meta.section === 'listening' ? 'blue' : 'green'}>Part {part}</Tag>
            <Text strong>{meta.viName}</Text>
          </Space>
        )
      },
    },
    {
      title: 'Kỹ năng',
      dataIndex: 'section',
      key: 'section',
      render: (section: IToeicPartStat['section']) =>
        section === 'listening' ? 'Nghe hiểu (Listening)' : 'Đọc hiểu (Reading)',
    },
    {
      title: 'Đúng / Tổng',
      key: 'ratio',
      render: (_: unknown, record: IToeicPartStat) => (
        <Text strong>
          {record.correct} / {record.total}
        </Text>
      ),
    },
    {
      title: 'Tỷ lệ chính xác',
      key: 'accuracy',
      width: 200,
      render: (_: unknown, record: IToeicPartStat) => {
        const pct = record.total > 0 ? Math.round((record.correct / record.total) * 100) : 0
        return <Progress percent={pct} size='small' />
      },
    },
  ]

  const renderReviewQuestion = (q: IToeicQuestion) => {
    const userAns = attempt.answers[q.id]
    const isCorrect = userAns === q.correctAnswer
    const isUnanswered = !userAns

    return (
      <Card
        key={q.id}
        size='small'
        style={{
          marginBottom: 12,
          borderColor: isUnanswered
            ? token.colorBorder
            : isCorrect
              ? token.colorSuccessBorder
              : token.colorErrorBorder,
        }}
        title={
          <Space>
            <Tag color='geekblue'>Câu {q.questionNumber}</Tag>
            {isUnanswered ? (
              <Tag icon={<MinusCircleOutlined />} color='default'>
                Chưa trả lời
              </Tag>
            ) : isCorrect ? (
              <Tag icon={<CheckCircleFilled />} color='success'>
                Chính xác
              </Tag>
            ) : (
              <Tag icon={<CloseCircleFilled />} color='error'>
                Sai (Chọn {userAns})
              </Tag>
            )}
            <Tag color='processing'>Đáp án đúng: {q.correctAnswer}</Tag>
          </Space>
        }
      >
        <Space direction='vertical' size={10} style={{ width: '100%' }}>
          {q.prompt && <Text strong>{q.prompt}</Text>}

          {q.imageUrl && (
            <img
              src={q.imageUrl}
              alt={`Question ${q.questionNumber}`}
              style={{ maxHeight: 220, borderRadius: 8, width: 'fit-content' }}
            />
          )}

          {(q.audioUrl || q.audioScript) && (
            <>
              <ToeicAudioPlayer
                compact
                audioUrl={q.audioUrl}
                audioScript={q.audioScript}
                title={`Nghe lại Câu ${q.questionNumber}`}
              />
              {q.audioScript && (
                <Alert
                  type='info'
                  message='Transcript'
                  description={<Text>{q.audioScript}</Text>}
                />
              )}
            </>
          )}

          <div className='flex flex-col gap-1.5'>
            {q.options.map((opt) => {
              const isUserChoice = userAns === opt.key
              const isCorrectChoice = q.correctAnswer === opt.key
              let borderColor = token.colorBorder
              let bg = token.colorBgContainer
              if (isCorrectChoice) {
                borderColor = token.colorSuccess
                bg = token.colorSuccessBg
              } else if (isUserChoice && !isCorrectChoice) {
                borderColor = token.colorError
                bg = token.colorErrorBg
              }

              return (
                <div
                  key={opt.key}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${borderColor}`,
                    background: bg,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text>
                    <strong>{opt.key}.</strong> {opt.text || `Đáp án ${opt.key}`}
                  </Text>
                  <Space size={4}>
                    {isUserChoice && <Tag>Bạn chọn</Tag>}
                    {isCorrectChoice && <Tag color='success'>Đáp án đúng</Tag>}
                  </Space>
                </div>
              )
            })}
          </div>

          {q.explanation && (
            <Alert
              type='success'
              message='Giải thích chi tiết'
              description={<Text>{q.explanation}</Text>}
            />
          )}
        </Space>
      </Card>
    )
  }

  return (
    <Space direction='vertical' size={16} style={{ width: '100%' }}>
      <Card>
        <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onBackToList}>
              Danh sách đề thi
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              Kết quả: {attempt.examTitle}
            </Title>
          </Space>
          <Space>
            <Button type='primary' icon={<RedoOutlined />} onClick={onRetry}>
              Làm lại đề này
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size='small' style={{ background: token.colorPrimaryBg }}>
              <Statistic
                title='Tổng điểm quy đổi (10–990)'
                value={attempt.totalScore}
                prefix={<TrophyOutlined style={{ color: token.colorPrimary }} />}
                valueStyle={{ color: token.colorPrimary, fontWeight: 700 }}
              />
              <Text type='secondary'>
                Đúng {totalCorrect}/{totalQuestions} câu ({overallAccuracy}%)
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size='small'>
              <Statistic
                title='Listening (5–495)'
                value={attempt.listeningScore}
                prefix={<CustomerServiceOutlined style={{ color: '#1677ff' }} />}
              />
              <Text type='secondary'>
                Đúng {attempt.listeningCorrect}/{attempt.listeningTotal} câu nghe
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size='small'>
              <Statistic
                title='Reading (5–495)'
                value={attempt.readingScore}
                prefix={<ReadOutlined style={{ color: '#52c41a' }} />}
              />
              <Text type='secondary'>
                Đúng {attempt.readingCorrect}/{attempt.readingTotal} câu đọc
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size='small'>
              <Statistic
                title='Thời gian hoàn thành'
                value={formatDuration(attempt.durationSeconds)}
              />
              <Text type='secondary'>{new Date(attempt.submittedAt).toLocaleString('vi-VN')}</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title='Thống kê chi tiết theo từng Part'>
        <Table
          dataSource={attempt.partStats}
          columns={partColumns}
          rowKey='part'
          pagination={false}
          size='small'
        />
      </Card>

      <Card
        title='Xem lại bài làm & Giải thích chi tiết'
        extra={
          <Segmented
            value={filter}
            onChange={(val) => setFilter(val as ReviewFilter)}
            options={[
              { label: 'Tất cả', value: 'all' },
              { label: 'Câu sai', value: 'wrong' },
              { label: 'Câu đúng', value: 'correct' },
              { label: 'Chưa làm', value: 'unanswered' },
              { label: 'Đã đánh dấu', value: 'flagged' },
            ]}
          />
        }
      >
        {renderItems.map((item) => {
          const filteredQs = item.questions.filter(matchesFilter)
          if (filteredQs.length === 0) return null

          if (item.kind === 'single') {
            return filteredQs.map((q) => renderReviewQuestion(q))
          }

          if (item.kind === 'group' && item.group) {
            const meta = getPartMeta(item.part)
            return (
              <Card
                key={item.group.id}
                size='small'
                type='inner'
                title={`Part ${item.part}: ${item.group.title || meta.viName}`}
                style={{ marginBottom: 16 }}
              >
                <Space direction='vertical' size={12} style={{ width: '100%' }}>
                  {meta.section === 'listening' ? (
                    <>
                      <ToeicAudioPlayer
                        compact
                        audioUrl={item.group.audioUrl}
                        audioScript={item.group.audioScript}
                        title={item.group.title}
                      />
                      {item.group.audioScript && (
                        <Alert
                          type='info'
                          message='Audio Transcript'
                          description={
                            <Paragraph style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>
                              {item.group.audioScript}
                            </Paragraph>
                          }
                        />
                      )}
                    </>
                  ) : (
                    (item.group.passages || []).map((passage, pIdx) => (
                      <Card key={pIdx} size='small' style={{ background: token.colorFillTertiary }}>
                        <Paragraph style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>
                          {passage}
                        </Paragraph>
                      </Card>
                    ))
                  )}
                  <Divider style={{ margin: '4px 0' }} />
                  {filteredQs.map((q) => renderReviewQuestion(q))}
                </Space>
              </Card>
            )
          }
          return null
        })}
      </Card>
    </Space>
  )
}
