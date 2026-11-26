import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Progress,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  FlagFilled,
  FlagOutlined,
  LeftOutlined,
  ReadOutlined,
  RightOutlined,
  SendOutlined,
} from '@ant-design/icons'
import {
  IToeicAttempt,
  IToeicExam,
  IToeicInProgressState,
  IToeicQuestion,
  ToeicOptionKey,
  ToeicPartNumber,
} from '@/models/toeic.model'
import {
  clearToeicProgress,
  evaluateToeicAttempt,
  getExamAllQuestions,
  getExamRenderItems,
  getPartMeta,
  loadToeicProgress,
  saveToeicProgress,
} from './toeicData'
import { ToeicAudioPlayer } from './ToeicAudioPlayer'

const { Title, Text, Paragraph } = Typography

interface ToeicExamPracticeProps {
  exam: IToeicExam
  uid?: string
  selectedParts: ToeicPartNumber[]
  durationMinutes: number // 0 = unlimited
  initialProgress?: IToeicInProgressState | null
  onSubmit: (attempt: IToeicAttempt) => void | Promise<void>
  onExit: () => void
}

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const ToeicExamPractice: React.FC<ToeicExamPracticeProps> = ({
  exam,
  uid,
  selectedParts,
  durationMinutes,
  initialProgress,
  onSubmit,
  onExit,
}) => {
  const { token } = theme.useToken()
  const { modal } = App.useApp()

  const savedDraft = useMemo(
    () => initialProgress ?? loadToeicProgress(exam.id, uid),
    // Only read initial draft once per exam mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam.id],
  )

  const effectiveParts = savedDraft?.selectedParts?.length
    ? savedDraft.selectedParts
    : selectedParts
  const effectiveDuration =
    typeof savedDraft?.durationMinutes === 'number' ? savedDraft.durationMinutes : durationMinutes

  const renderItems = useMemo(
    () => getExamRenderItems(exam, effectiveParts),
    [exam, effectiveParts],
  )
  const allQuestions = useMemo(
    () => getExamAllQuestions(exam, effectiveParts),
    [exam, effectiveParts],
  )

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = savedDraft?.currentIndex ?? 0
    return renderItems.length > 0 ? Math.min(Math.max(0, idx), renderItems.length - 1) : 0
  })
  const [answers, setAnswers] = useState<Record<string, ToeicOptionKey>>(
    () => savedDraft?.answers || {},
  )
  const [flaggedIds, setFlaggedIds] = useState<string[]>(() => savedDraft?.flaggedIds || [])
  const [showTranscript, setShowTranscript] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(() => savedDraft?.elapsedSeconds ?? 0)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (effectiveDuration <= 0) return 0
    if (typeof savedDraft?.remainingSeconds === 'number' && savedDraft.remainingSeconds > 0) {
      return savedDraft.remainingSeconds
    }
    return effectiveDuration * 60
  })

  const submittedRef = useRef(false)

  // Keep latest state in refs for auto-submit on timeout & auto-save
  const answersRef = useRef(answers)
  const flaggedRef = useRef(flaggedIds)
  const elapsedRef = useRef(elapsedSeconds)
  answersRef.current = answers
  flaggedRef.current = flaggedIds
  elapsedRef.current = elapsedSeconds

  // Persist local progress whenever answers, currentIndex, flags, or time changes
  useEffect(() => {
    if (submittedRef.current) return
    saveToeicProgress(
      {
        examId: exam.id,
        selectedParts: effectiveParts,
        durationMinutes: effectiveDuration,
        currentIndex,
        answers,
        flaggedIds,
        elapsedSeconds,
        remainingSeconds,
        updatedAt: Date.now(),
      },
      uid,
    )
  }, [
    exam.id,
    uid,
    effectiveParts,
    effectiveDuration,
    currentIndex,
    answers,
    flaggedIds,
    elapsedSeconds,
    remainingSeconds,
  ])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
      if (effectiveDuration > 0) {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            if (!submittedRef.current) {
              submittedRef.current = true
              clearToeicProgress(exam.id, uid)
              const attempt = evaluateToeicAttempt(
                exam,
                answersRef.current,
                flaggedRef.current,
                effectiveParts,
                elapsedRef.current + 1,
              )
              onSubmit(attempt)
            }
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [effectiveDuration, exam, uid, effectiveParts, onSubmit])

  const currentItem = renderItems[currentIndex]
  const currentMeta = currentItem ? getPartMeta(currentItem.part) : null
  const answeredCount = Object.keys(answers).length
  const totalCount = allQuestions.length

  const handleSelectOption = (questionId: string, optionKey: ToeicOptionKey) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }))
  }

  const handleToggleFlag = (questionId: string) => {
    setFlaggedIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    )
  }

  const handleConfirmSubmit = () => {
    const unanswered = totalCount - answeredCount
    modal.confirm({
      title: 'Nộp bài thi TOEIC?',
      content:
        unanswered > 0
          ? `Bạn đã trả lời ${answeredCount}/${totalCount} câu (còn ${unanswered} câu chưa làm). Bạn có chắc chắn muốn nộp bài?`
          : `Bạn đã hoàn thành tất cả ${totalCount}/${totalCount} câu. Nộp bài để xem kết quả ngay?`,
      okText: 'Nộp bài',
      cancelText: 'Làm tiếp',
      onOk: async () => {
        if (submittedRef.current) return
        submittedRef.current = true
        setIsSubmitting(true)
        try {
          clearToeicProgress(exam.id, uid)
          const attempt = evaluateToeicAttempt(
            exam,
            answers,
            flaggedIds,
            effectiveParts,
            elapsedSeconds,
          )
          await onSubmit(attempt)
        } finally {
          setIsSubmitting(false)
        }
      },
    })
  }

  const handleConfirmExit = () => {
    modal.confirm({
      title: 'Tạm dừng & Thoát khỏi bài làm?',
      content:
        'Trạng thái làm bài (đáp án đã chọn, câu hiện tại và thời gian) đã được lưu trên máy. Bạn có thể quay lại làm tiếp bất cứ lúc nào.',
      okText: 'Lưu & Thoát',
      cancelText: 'Ở lại',
      onOk: onExit,
    })
  }

  const jumpToQuestion = (questionId: string) => {
    const idx = renderItems.findIndex((item) => item.questions.some((q) => q.id === questionId))
    if (idx !== -1) setCurrentIndex(idx)
  }

  const renderQuestionBlock = (q: IToeicQuestion) => {
    const selected = answers[q.id]
    const isFlagged = flaggedIds.includes(q.id)

    return (
      <Card
        key={q.id}
        size='small'
        style={{
          borderColor: isFlagged ? token.colorWarning : token.colorBorder,
          marginBottom: 14,
        }}
        title={
          <Space>
            <Tag color='geekblue'>Câu {q.questionNumber}</Tag>
            {selected && <Tag color='success'>Đã chọn {selected}</Tag>}
          </Space>
        }
        extra={
          <Button
            size='small'
            type='text'
            icon={
              isFlagged ? <FlagFilled style={{ color: token.colorWarning }} /> : <FlagOutlined />
            }
            onClick={() => handleToggleFlag(q.id)}
          >
            {isFlagged ? 'Đã đánh dấu' : 'Đánh dấu'}
          </Button>
        }
      >
        <Space direction='vertical' size={12} style={{ width: '100%' }}>
          {q.prompt && <Text strong>{q.prompt}</Text>}

          {q.imageUrl && (
            <div className='flex justify-center'>
              <img
                src={q.imageUrl}
                alt={`Question ${q.questionNumber}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 10,
                  border: `1px solid ${token.colorBorder}`,
                }}
              />
            </div>
          )}

          {currentItem?.kind === 'single' && currentMeta?.section === 'listening' && (
            <>
              <ToeicAudioPlayer
                audioUrl={q.audioUrl}
                audioScript={q.audioScript}
                title={`Audio Câu ${q.questionNumber}`}
              />
              {showTranscript && q.audioScript && (
                <Alert
                  type='info'
                  showIcon
                  message='Transcript'
                  description={<Text>{q.audioScript}</Text>}
                />
              )}
            </>
          )}

          <div className='flex flex-col gap-2'>
            {q.options.map((opt) => {
              const isSelected = selected === opt.key
              return (
                <div
                  key={opt.key}
                  onClick={() => handleSelectOption(q.id, opt.key)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                    background: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 13,
                      flexShrink: 0,
                      background: isSelected ? token.colorPrimary : token.colorFillSecondary,
                      color: isSelected ? '#fff' : token.colorText,
                    }}
                  >
                    {opt.key}
                  </span>
                  <Text style={{ flex: 1 }}>{opt.text || `Đáp án ${opt.key}`}</Text>
                </div>
              )
            })}
          </div>
        </Space>
      </Card>
    )
  }

  if (!currentItem || !currentMeta) {
    return (
      <Card>
        <Alert
          type='warning'
          message='Không có câu hỏi nào trong các phần đã chọn.'
          action={<Button onClick={onExit}>Quay lại</Button>}
        />
      </Card>
    )
  }

  const questionsByPart = useMemo(() => {
    const map = new Map<ToeicPartNumber, IToeicQuestion[]>()
    for (const q of allQuestions) {
      const arr = map.get(q.part) || []
      arr.push(q)
      map.set(q.part, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [allQuestions])

  return (
    <Space direction='vertical' size={16} style={{ width: '100%' }}>
      {/* Top sticky header */}
      <Card size='small'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleConfirmExit}>
              Thoát
            </Button>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {exam.title}
              </Title>
              <Space size={6}>
                <Tag
                  icon={
                    currentMeta.section === 'listening' ? (
                      <CustomerServiceOutlined />
                    ) : (
                      <ReadOutlined />
                    )
                  }
                  color={currentMeta.section === 'listening' ? 'blue' : 'green'}
                >
                  {currentMeta.section === 'listening' ? 'Listening' : 'Reading'} — Part{' '}
                  {currentMeta.part}: {currentMeta.viName}
                </Tag>
              </Space>
            </div>
          </Space>

          <Space wrap size={12}>
            {currentMeta.section === 'listening' && (
              <Space size={6}>
                <Text type='secondary'>Hiện transcript:</Text>
                <Switch size='small' checked={showTranscript} onChange={setShowTranscript} />
              </Space>
            )}
            <Tag
              icon={<ClockCircleOutlined />}
              color={effectiveDuration > 0 && remainingSeconds < 300 ? 'error' : 'processing'}
              style={{ fontSize: 14, padding: '4px 10px' }}
            >
              {effectiveDuration > 0
                ? `Còn lại: ${formatCountdown(remainingSeconds)}`
                : `Đã làm: ${formatCountdown(elapsedSeconds)}`}
            </Tag>
            <Button
              type='primary'
              icon={<SendOutlined />}
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={handleConfirmSubmit}
            >
              {isSubmitting ? 'Đang nộp bài...' : `Nộp bài (${answeredCount}/${totalCount})`}
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Main Question Area */}
        <Col xs={24} lg={17}>
          <Card>
            {currentItem.kind === 'group' && currentItem.group && (
              <Space direction='vertical' size={14} style={{ width: '100%' }}>
                {currentMeta.section === 'listening' ? (
                  <>
                    <ToeicAudioPlayer
                      audioUrl={currentItem.group.audioUrl}
                      audioScript={currentItem.group.audioScript}
                      title={currentItem.group.title || `Part ${currentMeta.part} Audio`}
                    />
                    {currentItem.group.imageUrl && (
                      <div className='flex justify-center'>
                        <img
                          src={currentItem.group.imageUrl}
                          alt='Group graphic'
                          style={{
                            maxWidth: '100%',
                            maxHeight: 280,
                            borderRadius: 10,
                            border: `1px solid ${token.colorBorder}`,
                          }}
                        />
                      </div>
                    )}
                    {showTranscript && currentItem.group.audioScript && (
                      <Alert
                        type='info'
                        message='Audio Transcript'
                        description={
                          <Paragraph style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>
                            {currentItem.group.audioScript}
                          </Paragraph>
                        }
                      />
                    )}
                    <Divider style={{ margin: '8px 0' }} />
                    {currentItem.questions.map((q) => renderQuestionBlock(q))}
                  </>
                ) : (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} xl={12}>
                      <div
                        style={{
                          maxHeight: 560,
                          overflowY: 'auto',
                          paddingRight: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {currentItem.group.title && (
                          <Title level={5} style={{ margin: 0 }}>
                            {currentItem.group.title}
                          </Title>
                        )}
                        {(currentItem.group.passages || []).map((passage, idx) => (
                          <Card
                            key={idx}
                            size='small'
                            style={{ background: token.colorFillTertiary }}
                          >
                            <Paragraph style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>
                              {passage}
                            </Paragraph>
                          </Card>
                        ))}
                      </div>
                    </Col>
                    <Col xs={24} xl={12}>
                      <div style={{ maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
                        {currentItem.questions.map((q) => renderQuestionBlock(q))}
                      </div>
                    </Col>
                  </Row>
                )}
              </Space>
            )}

            {currentItem.kind === 'single' &&
              currentItem.question &&
              renderQuestionBlock(currentItem.question)}

            {/* Navigation Footer */}
            <div className='flex items-center justify-between pt-3'>
              <Button
                icon={<LeftOutlined />}
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                Prev
              </Button>
              <Text type='secondary'>
                {currentIndex + 1} / {renderItems.length}
              </Text>
              <Button
                type='primary'
                icon={<RightOutlined />}
                iconPosition='end'
                disabled={currentIndex === renderItems.length - 1}
                onClick={() => setCurrentIndex((i) => Math.min(renderItems.length - 1, i + 1))}
              >
                Next
              </Button>
            </div>
          </Card>
        </Col>

        {/* Answer Sheet Sidebar */}
        <Col xs={24} lg={7}>
          <Card
            size='small'
            title={
              <Space>
                <CheckCircleOutlined />
                <span>Phiếu trả lời</span>
              </Space>
            }
          >
            <Space direction='vertical' size={12} style={{ width: '100%' }}>
              <div>
                <div className='flex justify-between mb-1'>
                  <Text type='secondary'>Tiến độ</Text>
                  <Text strong>
                    {answeredCount}/{totalCount} câu
                  </Text>
                </div>
                <Progress
                  percent={totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0}
                  showInfo={false}
                  size='small'
                />
              </div>

              {questionsByPart.map(([part, qs]) => {
                const meta = getPartMeta(part)
                return (
                  <div key={part}>
                    <Text type='secondary' style={{ fontSize: 12, fontWeight: 600 }}>
                      Part {part} ({meta.section === 'listening' ? 'Nghe' : 'Đọc'})
                    </Text>
                    <div className='flex flex-wrap gap-1.5 mt-1.5'>
                      {qs.map((q) => {
                        const isAnswered = Boolean(answers[q.id])
                        const isFlagged = flaggedIds.includes(q.id)
                        const isCurrent = currentItem.questions.some((cq) => cq.id === q.id)

                        return (
                          <Button
                            key={q.id}
                            size='small'
                            type={isCurrent ? 'primary' : isAnswered ? 'default' : 'dashed'}
                            onClick={() => jumpToQuestion(q.id)}
                            style={{
                              minWidth: 38,
                              padding: '0 6px',
                              borderColor: isFlagged
                                ? token.colorWarning
                                : isAnswered && !isCurrent
                                  ? token.colorSuccess
                                  : undefined,
                              background:
                                isAnswered && !isCurrent ? token.colorSuccessBg : undefined,
                              color: isAnswered && !isCurrent ? token.colorSuccessText : undefined,
                            }}
                          >
                            {q.questionNumber}
                            {isFlagged ? '★' : ''}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
