import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  theme,
  Button,
  Input,
  Progress,
  Tag,
  Tooltip,
  Space,
  Typography,
  message,
  Spin,
  Empty,
  Flex,
} from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import {
  SoundOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  RightOutlined,
  LeftOutlined,
  CopyOutlined,
  ClearOutlined,
  InfoCircleOutlined,
  RobotOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import {
  geminiTtsService,
  geminiTranslationReviewService,
  ITranslationReviewResponse,
} from '@/services/gemini'
import {
  evaluateDictation,
  IDictationResult,
  TDictationWordStatus,
} from '../sentenceListening/dictationUtil'
import { shuffleArray } from '@/helpers/mics'
import styles from './translationPractice.module.scss'

const { Text } = Typography

export interface ITranslationPracticeProps {
  initialExample?: IExample
  onCancel?: () => void
  onSuccess?: (example: IExample) => void
}

const stripHtml = (html?: string): string => {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim()
}

const getWordStatusClass = (status: TDictationWordStatus): string => {
  switch (status) {
    case 'correct':
      return styles.correct
    case 'typo':
      return styles.typo
    case 'missing':
      return styles.missing
    case 'extra':
      return styles.extra
    default:
      return ''
  }
}

export const TranslationPractice: React.FC<ITranslationPracticeProps> = ({
  initialExample,
  onCancel,
  onSuccess,
}) => {
  const { token } = theme.useToken()

  // Direction: 'vi-en' (Translate to English) or 'en-vi' (Translate to Vietnamese)
  const [direction, setDirection] = useState<'vi-en' | 'en-vi'>('vi-en')

  // History & navigation
  const [history, setHistory] = useState<IExample[]>(initialExample ? [initialExample] : [])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  // Current item
  const currentExample = history[currentIndex] || null

  // User input & evaluation states
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [dictationResult, setDictationResult] = useState<IDictationResult | null>(null)

  // Hints
  const [hintLevel, setHintLevel] = useState<number>(0) // 0: None, 1: Word bank, 2: First letters

  // Audio / TTS state
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  // AI Review states
  const [isAiReviewing, setIsAiReviewing] = useState<boolean>(false)
  const [aiReviewResult, setAiReviewResult] = useState<ITranslationReviewResponse | null>(null)

  // Input ref
  const textAreaRef = useRef<TextAreaRef>(null)

  // Determine Source (Prompt) & Target (Expected Answer) based on direction
  const rawSource = direction === 'vi-en' ? currentExample?.translation : currentExample?.origin
  const rawTarget = direction === 'vi-en' ? currentExample?.origin : currentExample?.translation
  const sourceText = stripHtml(rawSource)
  const targetText = stripHtml(rawTarget)
  const noteText = currentExample?.note?.trim() || ''

  // Scrambled word tags for Hint level 1
  const scrambledWords = useMemo(() => {
    if (!targetText) return []
    const tokens = targetText
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean)
    return shuffleArray(tokens)
  }, [targetText])

  // First-letter clues for Hint level 2
  const firstLetterClue = useMemo(() => {
    if (!targetText) return ''
    return targetText
      .split(/\s+/)
      .map((w) => {
        const clean = w.replace(/^[^\w]+|[^\w]+$/g, '')
        if (!clean) return w
        return clean.charAt(0) + '_'.repeat(Math.max(1, clean.length - 1))
      })
      .join(' ')
  }, [targetText])

  // Reset all exercise states for next item
  const resetExerciseState = useCallback(() => {
    setUserAnswer('')
    setIsChecked(false)
    setDictationResult(null)
    setHintLevel(0)
    setAiReviewResult(null)
    setIsAiReviewing(false)
    setIsPlaying(false)
  }, [])

  // Fetch a random sentence
  const fetchRandomSentence = useCallback(async () => {
    try {
      setLoading(true)
      setIsPlaying(false)
      const { isSuccess, content } = await exampleApi.getRandomExamples(1)
      if (isSuccess && content && content[0]) {
        const newEx = content[0]
        setHistory((prev) => {
          const next = [...prev, newEx]
          setCurrentIndex(next.length - 1)
          return next
        })
        resetExerciseState()
      } else {
        message.warning('Không tìm thấy câu ví dụ nào.')
      }
    } catch (error: any) {
      console.error('Failed to load random example:', error)
      message.error('Lỗi khi tải câu ví dụ mới.')
    } finally {
      setLoading(false)
    }
  }, [resetExerciseState])

  // Load initial example or fetch random on mount
  useEffect(() => {
    if (!initialExample && history.length === 0) {
      fetchRandomSentence()
    }
  }, [fetchRandomSentence, initialExample, history.length])

  // Browser TTS fallback helper
  const speakBrowser = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = direction === 'vi-en' ? 'en-US' : 'vi-VN'
      utterance.rate = 0.95
      utterance.onend = () => onEnd?.()
      utterance.onerror = () => onEnd?.()
      window.speechSynthesis.speak(utterance)
    } else {
      onEnd?.()
    }
  }, [direction])

  // Play audio of reference sentence
  const handlePlayAudio = async (textToPlay = targetText) => {
    if (!textToPlay) return

    if (isPlaying) {
      geminiTtsService.stop()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsPlaying(false)
      return
    }

    setIsPlaying(true)
    try {
      if (direction === 'vi-en') {
        // High quality Gemini TTS for English
        await geminiTtsService.play(textToPlay, {
          voice: 'Aoede',
          onEnded: () => setIsPlaying(false),
          onError: () => {
            speakBrowser(textToPlay, () => setIsPlaying(false))
          },
        })
      } else {
        // Vietnamese speech
        speakBrowser(textToPlay, () => setIsPlaying(false))
      }
    } catch (_err) {
      speakBrowser(textToPlay, () => setIsPlaying(false))
    }
  }

  // Check user answer using LCS diff (local instant evaluation)
  const handleCheck = () => {
    const cleanUser = userAnswer.trim()
    if (!cleanUser) {
      message.warning('Vui lòng nhập bản dịch của bạn trước khi kiểm tra.')
      textAreaRef.current?.focus()
      return
    }

    const evalResult = evaluateDictation(targetText, cleanUser)
    setDictationResult(evalResult)
    setIsChecked(true)

    if (evalResult.isPerfect && currentExample && onSuccess) {
      onSuccess(currentExample)
    }
  }

  // AI Review via Gemini (triggered explicitly on clicking AI Review button)
  const handleAiReview = async () => {
    const cleanUser = userAnswer.trim()
    if (!cleanUser) {
      message.warning('Vui lòng nhập bản dịch của bạn trước khi nhờ AI phân tích.')
      textAreaRef.current?.focus()
      return
    }

    try {
      setIsAiReviewing(true)
      if (!isChecked) {
        const evalResult = evaluateDictation(targetText, cleanUser)
        setDictationResult(evalResult)
        setIsChecked(true)
      }

      const response = await geminiTranslationReviewService.reviewTranslation({
        sourceText,
        referenceText: targetText,
        userTranslation: cleanUser,
        direction,
      })

      if (response.isSuccess && response.content) {
        setAiReviewResult(response.content)
      } else {
        message.error(response.message || 'Không thể đánh giá bằng AI.')
      }
    } catch (err: any) {
      console.error('AI Review error:', err)
      message.error('Lỗi khi phân tích bằng AI.')
    } finally {
      setIsAiReviewing(false)
    }
  }

  // Toggle Hint level
  const handleToggleHint = () => {
    setHintLevel((prev) => (prev + 1) % 3)
  }

  // Click on a hint word to append into input
  const handleInsertWord = (word: string) => {
    setUserAnswer((prev) => {
      const cleanPrev = prev.trim()
      return cleanPrev ? `${cleanPrev} ${word}` : word
    })
    textAreaRef.current?.focus()
  }

  // Navigate to previous question in session
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      resetExerciseState()
    }
  }

  // Navigate to next or fetch new
  const handleNext = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      resetExerciseState()
    } else {
      fetchRandomSentence()
    }
  }

  // Switch direction
  const handleSwitchDirection = () => {
    setDirection((prev) => (prev === 'vi-en' ? 'en-vi' : 'vi-en'))
    resetExerciseState()
  }

  // Copy reference text
  const handleCopyReference = () => {
    if (targetText) {
      navigator.clipboard.writeText(targetText)
      message.success('Đã sao chép câu mẫu!')
    }
  }

  if (loading && !currentExample) {
    return (
      <div style={{ padding: '36px 0', textAlign: 'center' }}>
        <Spin size='large' tip='Đang tải câu thực hành...' />
      </div>
    )
  }

  if (!currentExample) {
    return (
      <Empty description='Chưa có câu ví dụ nào để luyện dịch'>
        <Button type='primary' icon={<SyncOutlined />} onClick={fetchRandomSentence}>
          Tải câu mới
        </Button>
      </Empty>
    )
  }

  return (
    <div className={styles.container}>
      {/* 1. Header Bar: Mode badge, Direction Switch, Session counter */}
      <div className={styles.headerBar}>
        <div className={styles.modeBadge}>
          <span>{direction === 'vi-en' ? '🇻🇳 Tiếng Việt → 🇬🇧 English' : '🇬🇧 English → 🇻🇳 Tiếng Việt'}</span>
        </div>

        <Space size='small'>
          <Tooltip title='Đổi chiều dịch'>
            <Button
              size='small'
              icon={<SwapOutlined />}
              onClick={handleSwitchDirection}
            >
              Đổi chiều
            </Button>
          </Tooltip>

          <span style={{ fontSize: 12, opacity: 0.65 }}>
            Câu {currentIndex + 1}/{history.length}
          </span>

          {onCancel && (
            <Tooltip title='Đóng'>
              <Button
                size='small'
                type='text'
                icon={<CloseOutlined />}
                onClick={onCancel}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* 2. Prompt Card: The text to translate */}
      <div className={styles.promptCard}>
        <div className={styles.promptLabel}>
          <InfoCircleOutlined style={{ color: token.colorPrimary }} />
          <span>{direction === 'vi-en' ? 'Câu tiếng Việt cần dịch:' : 'Original English sentence:'}</span>
        </div>

        <p className={styles.promptText}>{sourceText}</p>

        {noteText && (
          <div className={styles.promptNote}>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>Ghi chú: {noteText}</span>
          </div>
        )}
      </div>

      {/* 3. Hint Area (Conditional) */}
      {hintLevel > 0 && (
        <div className={styles.hintArea}>
          {hintLevel === 1 && (
            <Flex gap={6} wrap='wrap' align='center'>
              <Text type='secondary' style={{ fontSize: 12, marginRight: 4 }}>
                Từ gợi ý (click để thêm):
              </Text>
              {scrambledWords.map((word, idx) => (
                <span
                  key={idx}
                  className={styles.hintWordTag}
                  onClick={() => handleInsertWord(word)}
                >
                  {word}
                </span>
              ))}
            </Flex>
          )}

          {hintLevel === 2 && (
            <div>
              <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                Gợi ý chữ cái đầu:
              </Text>
              <Text code style={{ fontSize: 14, letterSpacing: 1 }}>
                {firstLetterClue}
              </Text>
            </div>
          )}
        </div>
      )}

      {/* 4. User Translation Input */}
      <div className={styles.inputWrapper}>
        <Input.TextArea
          ref={textAreaRef}
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder={
            direction === 'vi-en'
              ? 'Nhập bản dịch tiếng Anh của bạn...'
              : 'Nhập bản dịch tiếng Việt của bạn...'
          }
          autoSize={{ minRows: 2, maxRows: 5 }}
          className={styles.textAreaInput}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault()
              handleCheck()
            }
          }}
        />
        <div className={styles.shortcutTip}>
          Mẹo: Nhấn <b>Ctrl + Enter</b> để kiểm tra nhanh
        </div>
      </div>

      {/* 5. Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionGroup}>
          <Button
            type='primary'
            onClick={handleCheck}
            icon={<CheckOutlined />}
            style={{ minWidth: 100 }}
          >
            Kiểm tra
          </Button>

          <Tooltip title='Nhờ AI Gemini chấm điểm ngữ pháp & độ tự nhiên'>
            <Button
              icon={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
              onClick={handleAiReview}
              loading={isAiReviewing}
            >
              AI Review
            </Button>
          </Tooltip>

          <Tooltip
            title={
              hintLevel === 0
                ? 'Hiện từ gợi ý'
                : hintLevel === 1
                  ? 'Gợi ý chữ cái đầu'
                  : 'Tắt gợi ý'
            }
          >
            <Button
              icon={<BulbOutlined />}
              onClick={handleToggleHint}
              type={hintLevel > 0 ? 'dashed' : 'default'}
              style={{ color: hintLevel > 0 ? '#faad14' : undefined }}
            >
              {hintLevel === 0 ? 'Gợi ý' : `Gợi ý (${hintLevel}/2)`}
            </Button>
          </Tooltip>

          {userAnswer && (
            <Tooltip title='Xóa câu trả lời'>
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  setUserAnswer('')
                  setIsChecked(false)
                  setDictationResult(null)
                  setAiReviewResult(null)
                  setIsAiReviewing(false)
                }}
              />
            </Tooltip>
          )}
        </div>

        <div className={styles.actionGroup}>
          <Tooltip title='Quay lại câu trước'>
            <Button
              icon={<LeftOutlined />}
              onClick={handlePrev}
              disabled={currentIndex === 0}
            />
          </Tooltip>

          <Button
            icon={<RightOutlined />}
            onClick={handleNext}
            loading={loading}
          >
            Câu tiếp
          </Button>
        </div>
      </div>

      {/* 6. Evaluation Result Section (LCS Diff & Reference) */}
      {isChecked && (
        <div className={styles.resultCard}>
          {/* Accuracy Score */}
          <div className={styles.accuracyHeader}>
            <Space align='center'>
              <Tag
                color={
                  (dictationResult?.accuracy ?? 0) >= 90
                    ? 'success'
                    : (dictationResult?.accuracy ?? 0) >= 60
                      ? 'warning'
                      : 'error'
                }
                style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}
              >
                Độ khớp từ: {dictationResult?.accuracy ?? 0}%
              </Tag>

              {dictationResult?.isPerfect && (
                <Tag color='gold' icon={<CheckCircleOutlined />}>
                  Tuyệt đối chính xác! 🎉
                </Tag>
              )}
            </Space>

            <Progress
              percent={dictationResult?.accuracy ?? 0}
              size='small'
              style={{ width: 120, margin: 0 }}
              showInfo={false}
              status={
                (dictationResult?.accuracy ?? 0) >= 90
                  ? 'success'
                  : (dictationResult?.accuracy ?? 0) >= 60
                    ? 'normal'
                    : 'exception'
              }
            />
          </div>

          {/* Word Diff Highlight */}
          {dictationResult && dictationResult.words.length > 0 && (
            <div>
              <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Đối chiếu chi tiết từng từ:
              </Text>
              <div className={styles.diffDisplay}>
                {dictationResult.words.map((w, i) => (
                  <span key={i} className={`${styles.diffWord} ${getWordStatusClass(w.status)}`}>
                    {w.status === 'typo' ? (
                      <Tooltip title={`Bạn gõ: "${w.userWord}" → Đúng: "${w.word}"`}>
                        {w.word}
                      </Tooltip>
                    ) : w.status === 'extra' ? (
                      <Tooltip title='Từ thừa trong câu dịch của bạn'>{w.word}</Tooltip>
                    ) : w.status === 'missing' ? (
                      <Tooltip title='Từ bị thiếu trong câu dịch của bạn'>[{w.word}]</Tooltip>
                    ) : (
                      w.word
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reference Sentence & TTS */}
          <div>
            <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Câu chuẩn tham khảo:
            </Text>
            <div className={styles.referenceBox}>
              <div className={styles.referenceContent}>{targetText}</div>
              <Space size='small'>
                <Tooltip title={isPlaying ? 'Dừng phát âm' : 'Nghe phát âm chuẩn'}>
                  <Button
                    type='primary'
                    shape='circle'
                    icon={<SoundOutlined spin={isPlaying} />}
                    onClick={() => handlePlayAudio(targetText)}
                    size='small'
                  />
                </Tooltip>
                <Tooltip title='Sao chép câu chuẩn'>
                  <Button
                    shape='circle'
                    icon={<CopyOutlined />}
                    onClick={handleCopyReference}
                    size='small'
                  />
                </Tooltip>
              </Space>
            </div>
          </div>

          {/* 7. AI Review Feedback Panel */}
          {isAiReviewing && (
            <div className={styles.aiFeedbackCard} style={{ textAlign: 'center', padding: '16px' }}>
              <Space>
                <RobotOutlined style={{ fontSize: 18, color: '#722ed1' }} />
                <Spin size='small' tip='AI Mentor đang phân tích câu dịch của bạn...' />
              </Space>
            </div>
          )}

          {!isAiReviewing && aiReviewResult && (
            <div className={styles.aiFeedbackCard}>
              <div className={styles.aiHeader}>
                <Space>
                  <RobotOutlined style={{ fontSize: 16 }} />
                  <span>AI Mentor Đánh giá ({aiReviewResult.score}/100 điểm)</span>
                </Space>
                <Tag
                  color={
                    aiReviewResult.verdict === 'excellent'
                      ? 'purple'
                      : aiReviewResult.verdict === 'good'
                        ? 'blue'
                        : 'orange'
                  }
                >
                  {aiReviewResult.verdict === 'excellent'
                    ? 'Xuất sắc'
                    : aiReviewResult.verdict === 'good'
                      ? 'Rất tốt'
                      : 'Cần hoàn thiện'}
                </Tag>
              </div>

              <div className={styles.aiFeedbackText}>{aiReviewResult.feedback}</div>

              {aiReviewResult.grammarFeedback && (
                <div style={{ fontSize: 13, color: '#fa8c16' }}>
                  <b>Lưu ý ngữ pháp:</b> {aiReviewResult.grammarFeedback}
                </div>
              )}

              {aiReviewResult.betterAlternatives && aiReviewResult.betterAlternatives.length > 0 && (
                <div>
                  <Text strong style={{ fontSize: 13 }}>
                    Các cách diễn đạt tự nhiên khác:
                  </Text>
                  <div className={styles.aiAlternativesList}>
                    {aiReviewResult.betterAlternatives.map((alt, idx) => (
                      <div key={idx} className={styles.aiAltItem}>
                        <span>• {alt}</span>
                        <Tooltip title='Nghe cách đọc này'>
                          <Button
                            type='text'
                            size='small'
                            icon={<SoundOutlined />}
                            onClick={() => handlePlayAudio(alt)}
                          />
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
