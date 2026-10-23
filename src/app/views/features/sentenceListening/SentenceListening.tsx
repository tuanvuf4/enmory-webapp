import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  theme,
  Button,
  Progress,
  Tag,
  Tooltip,
  Spin,
  Empty,
  Segmented,
  Result,
  Select,
  Popover,
  Switch,
  Input,
  Flex,
} from 'antd'
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  RightOutlined,
  LeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
  StarOutlined,
  StarFilled,
  CheckOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { useSelector, checklistKeys } from '@/core/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { usePrompt } from '@/helpers/hooks'
import { ISentenceListeningItem } from '@/models/sentenceListening.model'
import { sentenceListeningApi } from '@/services/firebase/api/sentenceListening.api'
import { checklistApi } from '@/services/firebase/api/checklist.api'
import { geminiTtsService, GEMINI_VOICES, TGeminiVoice } from '@/services/gemini/geminiTts.service'
import { evaluateDictation, IDictationResult } from './dictationUtil'
import styles from './sentenceListening.module.scss'

type TSourceFilter = 'all' | 'sentence' | 'example'

const BOOKMARKS_STORAGE_KEY = 'sentence_listening_bookmarks'
const DICTATION_MODE_STORAGE_KEY = 'sentence_listening_dictation_mode'
const AUTOPLAY_STORAGE_KEY = 'sentence_listening_autoplay_next'
const REPEAT_STORAGE_KEY = 'sentence_listening_repeat_count'

export const SentenceListening: React.FC = () => {
  const { token } = theme.useToken()
  const { user } = useSelector((state) => state.auth)
  const { message } = usePrompt()
  const queryClient = useQueryClient()

  // Desired sentences count from user configuration (defaults to 10)
  const configuredCount = user?.configuration?.numberOfListeningSentences || 10

  // Core sentence states
  const [items, setItems] = useState<ISentenceListeningItem[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isRevealed, setIsRevealed] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)

  // Suggestion 1: Dictation Mode states
  const [isDictationMode, setIsDictationMode] = useState<boolean>(() => {
    return localStorage.getItem(DICTATION_MODE_STORAGE_KEY) === 'true'
  })
  const [userDictationInput, setUserDictationInput] = useState<string>('')
  const [dictationResult, setDictationResult] = useState<IDictationResult | null>(null)

  // Voice Selection (Google Gemini TTS)
  const [geminiVoice, setGeminiVoice] = useState<TGeminiVoice>(() => {
    return (localStorage.getItem('gemini_tts_voice') as TGeminiVoice) || 'Aoede'
  })
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)

  // Suggestion 3: Source Filter
  const [sourceFilter, setSourceFilter] = useState<TSourceFilter>('all')

  // Suggestion 4: Auto Replay & Auto Play on Next
  const [repeatCount, setRepeatCount] = useState<number>(() => {
    const saved = localStorage.getItem(REPEAT_STORAGE_KEY)
    return saved ? parseInt(saved, 10) : 1
  })
  const [autoPlayOnNext, setAutoPlayOnNext] = useState<boolean>(() => {
    return localStorage.getItem(AUTOPLAY_STORAGE_KEY) === 'true'
  })

  // Suggestion 5: Bookmarks (Saved IDs)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Fetch sentences from localDb / Firestore based on sourceFilter
  const loadSentences = useCallback(async () => {
    setIsLoading(true)
    setIsCompleted(false)
    setCurrentIndex(0)
    setIsRevealed(false)
    setUserDictationInput('')
    setDictationResult(null)

    geminiTtsService.stop()
    setIsPlaying(false)

    try {
      const res = await sentenceListeningApi.getListeningSentences({
        count: configuredCount,
        sourceType: sourceFilter,
      })
      if (res.isSuccess && res.content) {
        setItems(res.content)
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('Failed to load listening sentences:', err)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [configuredCount, sourceFilter])

  useEffect(() => {
    loadSentences()
    return () => {
      geminiTtsService.stop()
    }
  }, [loadSentences])

  const total = items.length
  const currentItem = items[currentIndex] as ISentenceListeningItem | undefined
  const currentId = currentItem?.id || ''
  const isCurrentBookmarked = bookmarkedIds.has(currentId)

  // Audio Playback with Gemini TTS
  const handlePlayAudio = useCallback(
    async (textToSpeak?: string) => {
      const text = textToSpeak || currentItem?.origin
      if (!text) return

      setIsPlaying(true)
      await geminiTtsService.playSpeech(text, {
        voice: geminiVoice,
        playbackRate: playbackSpeed,
        repeatCount,
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      })
    },
    [currentItem?.origin, geminiVoice, playbackSpeed, repeatCount],
  )

  // Toggle reveal state
  const handleToggleReveal = useCallback(() => {
    setIsRevealed((prev) => !prev)
  }, [])

  // Auto-play when moving to next sentence if enabled
  const triggerNextSentence = useCallback(
    (nextIdx: number) => {
      setCurrentIndex(nextIdx)
      setIsRevealed(false)
      setUserDictationInput('')
      setDictationResult(null)

      if (autoPlayOnNext && items[nextIdx]?.origin) {
        setTimeout(() => {
          handlePlayAudio(items[nextIdx].origin)
        }, 300)
      }
    },
    [autoPlayOnNext, items, handlePlayAudio],
  )

  // Next sentence
  const handleNext = useCallback(() => {
    geminiTtsService.stop()
    setIsPlaying(false)

    if (currentIndex >= total - 1) {
      setIsCompleted(true)
    } else {
      triggerNextSentence(currentIndex + 1)
    }
  }, [currentIndex, total, triggerNextSentence])

  // Previous sentence
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      geminiTtsService.stop()
      setIsPlaying(false)
      triggerNextSentence(currentIndex - 1)
    }
  }, [currentIndex, triggerNextSentence])

  // Dictation Check
  const handleCheckDictation = useCallback(() => {
    if (!currentItem?.origin || !userDictationInput.trim()) return
    const result = evaluateDictation(currentItem.origin, userDictationInput)
    setDictationResult(result)
    // Also auto reveal if desired or keep blurred
    if (result.isPerfect) {
      setIsRevealed(true)
      message({ type: 'success', content: '🎉 Chính xác 100%! Tuyệt vời!' })
    }
  }, [currentItem?.origin, userDictationInput, message])

  // Bookmark & Checklist Toggle
  const handleToggleBookmark = useCallback(async () => {
    if (!currentItem) return

    const newBookmarks = new Set(bookmarkedIds)
    const isAdding = !newBookmarks.has(currentId)

    if (isAdding) {
      newBookmarks.add(currentId)
      setBookmarkedIds(newBookmarks)
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(newBookmarks)))

      // Attempt to add to Checklist if itemId exists
      if (currentItem.itemId) {
        try {
          const itemStub: any = {
            id: currentItem.itemId,
            origin: currentItem.origin,
            meanings: [
              {
                translation: currentItem.translation || '',
                definition: '',
              },
            ],
          }
          const checkRes = await checklistApi.addFromItem(itemStub)
          if (checkRes.isSuccess) {
            queryClient.invalidateQueries({ queryKey: checklistKeys.list() })
            message({
              type: 'success',
              content: `Đã đánh dấu & thêm "${currentItem.origin}" vào Checklist!`,
            })
            return
          }
        } catch (e) {
          console.warn('Could not auto-add to checklist:', e)
        }
      }
      message({ type: 'success', content: 'Đã đánh dấu câu yêu thích!' })
    } else {
      newBookmarks.delete(currentId)
      setBookmarkedIds(newBookmarks)
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(newBookmarks)))
      message({ type: 'info', content: 'Đã bỏ đánh dấu câu!' })
    }
  }, [currentItem, currentId, bookmarkedIds, queryClient, message])

  // Toggle Dictation Mode
  const handleToggleDictationMode = (enabled: boolean) => {
    setIsDictationMode(enabled)
    localStorage.setItem(DICTATION_MODE_STORAGE_KEY, String(enabled))
    setUserDictationInput('')
    setDictationResult(null)
  }

  // Keyboard shortcut: Ctrl + Enter to check dictation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleCheckDictation()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCheckDictation])

  // Settings Popover Content
  const settingsContent = useMemo(
    () => (
      <div className={styles.settingsPanel}>
        {/* Voice Selection */}
        <div className={styles.settingRow}>
          <span>Giọng đọc Gemini:</span>
          <Select
            size='small'
            value={geminiVoice}
            onChange={(v) => {
              setGeminiVoice(v)
              localStorage.setItem('gemini_tts_voice', v)
            }}
            style={{ minWidth: 150 }}
            options={GEMINI_VOICES.filter((v) => v.value !== 'auto').map((v) => ({
              value: v.value,
              label: v.label,
            }))}
          />
        </div>

        {/* Playback Speed */}
        <div className={styles.settingRow}>
          <span>Tốc độ đọc:</span>
          <Segmented
            size='small'
            value={playbackSpeed}
            onChange={(val) => setPlaybackSpeed(val as number)}
            options={[
              { label: '0.75x', value: 0.75 },
              { label: '1.0x', value: 1.0 },
              { label: '1.25x', value: 1.25 },
            ]}
          />
        </div>

        {/* Auto Replay count */}
        <div className={styles.settingRow}>
          <span>Lặp lại câu:</span>
          <Segmented
            size='small'
            value={repeatCount}
            onChange={(val) => {
              const r = Number(val)
              setRepeatCount(r)
              localStorage.setItem(REPEAT_STORAGE_KEY, String(r))
            }}
            options={[
              { label: '1 lần', value: 1 },
              { label: '2 lần', value: 2 },
              { label: '3 lần', value: 3 },
            ]}
          />
        </div>

        {/* Auto Play on Next sentence */}
        <div className={styles.settingRow}>
          <span>Tự động phát khi Next:</span>
          <Switch
            size='small'
            checked={autoPlayOnNext}
            onChange={(checked) => {
              setAutoPlayOnNext(checked)
              localStorage.setItem(AUTOPLAY_STORAGE_KEY, String(checked))
            }}
          />
        </div>

        {/* Dictation Mode Switch */}
        <div className={styles.settingRow}>
          <span>Chế độ Dictation (Gõ lại):</span>
          <Switch size='small' checked={isDictationMode} onChange={handleToggleDictationMode} />
        </div>

        {/* Source Filter */}
        <div className={styles.settingRow}>
          <span>Nguồn câu:</span>
          <Segmented
            size='small'
            value={sourceFilter}
            onChange={(val) => setSourceFilter(val as TSourceFilter)}
            options={[
              { label: 'Tất cả', value: 'all' },
              { label: 'Sentence', value: 'sentence' },
              { label: 'Example', value: 'example' },
            ]}
          />
        </div>
      </div>
    ),
    [geminiVoice, playbackSpeed, repeatCount, autoPlayOnNext, isDictationMode, sourceFilter],
  )

  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-6'>
        <Spin tip='Đang tải câu luyện nghe...' />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className={styles.emptyState}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              Chưa có câu hoặc ví dụ nào theo bộ lọc <b>"{sourceFilter}"</b>.
              <br />
              Hãy thêm từ vựng kèm <b>câu ví dụ (Example)</b> hoặc thêm mục <b>Sentence</b> vào thư
              viện!
            </span>
          }
        />
        <Button icon={<ReloadOutlined />} onClick={loadSentences}>
          Thử lại
        </Button>
      </div>
    )
  }

  // Completed State
  if (isCompleted) {
    return (
      <div className={styles.completedState}>
        <Result
          status='success'
          title='Hoàn thành bài luyện nghe!'
          subTitle={`Bạn đã nghe xong tất cả ${total} câu trong phiên này.`}
          extra={[
            <Button type='primary' key='restart' icon={<ReloadOutlined />} onClick={loadSentences}>
              Luyện tập lượt mới
            </Button>,
          ]}
        />

        <div className={styles.completedSummaryList}>
          {items.map((item, idx) => {
            const isBookmarked = bookmarkedIds.has(item.id)
            return (
              <div
                key={item.id || idx}
                className={styles.summaryItem}
                style={{
                  backgroundColor: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div className='flex items-center gap-2 overflow-hidden text-ellipsis'>
                  <Tag color={item.sourceType === 'sentence' ? 'blue' : 'purple'}>#{idx + 1}</Tag>
                  {isBookmarked && (
                    <StarFilled style={{ color: token.colorWarning, fontSize: 13 }} />
                  )}
                  <span className='font-medium' style={{ color: token.colorText }}>
                    {item.origin}
                  </span>
                  {item.translation && (
                    <span className='text-xs italic' style={{ color: token.colorTextSecondary }}>
                      ({item.translation})
                    </span>
                  )}
                </div>
                <Button
                  type='text'
                  size='small'
                  icon={<SoundOutlined />}
                  onClick={() => handlePlayAudio(item.origin)}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const isLastSentence = currentIndex === total - 1
  const progressPercent = Math.round(((currentIndex + 1) / total) * 100)

  return (
    <div className={styles.container}>
      {/* Top Header / Stats & Quick Controls */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Tag
            color={currentItem?.sourceType === 'sentence' ? 'blue' : 'purple'}
            className={styles.counterBadge}
          >
            {currentItem?.sourceType === 'sentence'
              ? 'Sentence'
              : currentItem?.sourceItemOrigin
                ? `${currentItem.sourceItemOrigin}`
                : ''}
          </Tag>

          <span className='text-xs font-semibold' style={{ color: token.colorTextSecondary }}>
            Câu {currentIndex + 1} / {total}
          </span>

          {repeatCount > 1 && (
            <Tag color='cyan' className='text-xs'>
              {repeatCount}x Replay
            </Tag>
          )}

          {isDictationMode && (
            <Tag color='gold' className='text-xs'>
              ✍️ Dictation
            </Tag>
          )}
        </div>

        <div className={styles.headerRight}>
          {/* Settings Popover */}
          <Popover
            content={settingsContent}
            title='Cài đặt nâng cao'
            trigger='click'
            placement='bottomRight'
          >
            <Button type='text' size='small' icon={<SettingOutlined />} />
          </Popover>

          {/* Refresh Random Batch */}
          <Button type='text' size='small' icon={<ReloadOutlined />} onClick={loadSentences} />
        </div>
      </div>

      {/* Progress Bar */}
      <Progress
        percent={progressPercent}
        size='small'
        showInfo={false}
        strokeColor={token.colorPrimary}
        className={styles.progressBar}
      />

      {/* Sentence Display Card */}
      <div
        className={styles.cardBox}
        style={{
          backgroundColor: token.colorBgContainer,
          borderColor: token.colorBorder,
          boxShadow: token.boxShadowTertiary,
        }}
      >
        {/* Card Top Action: Bookmark / Add to Checklist */}
        <div className={styles.cardBoxTopActions}>
          <Tooltip
            title={
              isCurrentBookmarked ? 'Đã đánh dấu (Bấm để bỏ ghim)' : 'Đánh dấu & Thêm vào Checklist'
            }
          >
            <Button
              type='text'
              size='small'
              icon={
                isCurrentBookmarked ? (
                  <StarFilled style={{ color: token.colorWarning, fontSize: 16 }} />
                ) : (
                  <StarOutlined style={{ fontSize: 16 }} />
                )
              }
              onClick={(e) => {
                e.stopPropagation()
                handleToggleBookmark()
              }}
            />
          </Tooltip>
        </div>

        {/* English Sentence Display */}
        <div
          className={`${styles.sentenceDisplay} ${isRevealed ? styles.revealed : styles.blurred}`}
          style={{ color: token.colorText }}
          onClick={() => !isRevealed && handleToggleReveal()}
        >
          {currentItem?.origin}
        </div>

        {/* Translation Box if revealed */}
        {isRevealed && currentItem?.translation && (
          <div
            className={styles.translationBox}
            style={{
              backgroundColor: token.colorFillAlter,
              color: token.colorTextSecondary,
            }}
          >
            💡 {currentItem.translation}
          </div>
        )}

        {/* Suggestion 1: Dictation Input Section */}
        {isDictationMode && (
          <div className={styles.dictationBox}>
            <div className={styles.dictationHeader}>
              <span style={{ color: token.colorTextSecondary }}>
                ✍️ Gõ lại những gì bạn nghe được:
              </span>
              {dictationResult && (
                <Tag
                  color={
                    dictationResult.isPerfect
                      ? 'success'
                      : dictationResult.accuracy >= 70
                        ? 'warning'
                        : 'error'
                  }
                >
                  Chính xác: {dictationResult.accuracy}% ({dictationResult.correctCount}/
                  {dictationResult.totalWords} từ)
                </Tag>
              )}
            </div>

            <div className={styles.dictationInputArea}>
              <Input.TextArea
                rows={2}
                placeholder='Nghe audio và gõ lại câu tại đây... (Nhấn Ctrl+Enter để kiểm tra)'
                value={userDictationInput}
                onChange={(e) => {
                  setUserDictationInput(e.target.value)
                  if (dictationResult) setDictationResult(null)
                }}
              />
            </div>

            <div className='flex justify-between items-center mt-1'>
              <Button
                type='dashed'
                size='small'
                icon={<CheckOutlined />}
                onClick={handleCheckDictation}
                disabled={!userDictationInput.trim()}
              >
                Kiểm tra
              </Button>
              {userDictationInput && (
                <Button
                  type='text'
                  size='small'
                  onClick={() => {
                    setUserDictationInput('')
                    setDictationResult(null)
                  }}
                >
                  Xóa
                </Button>
              )}
            </div>

            {/* Word Diff Comparison Visualization */}
            {dictationResult && (
              <div
                className={styles.diffResults}
                style={{
                  backgroundColor: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div className='text-xs font-semibold' style={{ color: token.colorTextSecondary }}>
                  So khớp từng từ:
                </div>
                <div className={styles.diffTokensRow}>
                  {dictationResult.words.map((item, idx) => (
                    <Tooltip
                      key={idx}
                      title={
                        item.isCorrect
                          ? 'Đúng!'
                          : item.userWord
                            ? `Bạn gõ: "${item.userWord}" (Chuẩn: "${item.word}")`
                            : `Từ bị thiếu: "${item.word}"`
                      }
                    >
                      <span
                        className={styles.diffWordTag}
                        style={{
                          backgroundColor: item.isCorrect
                            ? token.colorSuccessBg
                            : token.colorErrorBg,
                          color: item.isCorrect ? token.colorSuccess : token.colorError,
                          border: `1px solid ${
                            item.isCorrect ? token.colorSuccessBorder : token.colorErrorBorder
                          }`,
                        }}
                      >
                        {item.word}
                      </span>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons (Listen, Reveal Answer, Next) */}
      <div className={styles.actionsRow}>
        {currentIndex > 0 && (
          <Tooltip title='Câu trước'>
            <Button icon={<LeftOutlined />} onClick={handlePrev} disabled={isPlaying} />
          </Tooltip>
        )}

        {/* Button 1: Audio Playback with Gemini AI */}
        <Flex vertical align='center' justify='center' gap={token.sizeXS}>
          <Button
            type='primary'
            className={styles.actionBtn}
            icon={<CustomerServiceOutlined />}
            onClick={() => handlePlayAudio()}
            loading={isPlaying}
          >
            {isPlaying ? 'Đang đọc...' : ``}
          </Button>

          {/* Button 2: Reveal Answer */}
          <Button
            className={styles.actionBtn}
            icon={isRevealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={handleToggleReveal}
          >
            {isRevealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
          </Button>
        </Flex>

        {/* Button 3: Next Sentence */}
        <Button
          type={isLastSentence ? 'primary' : 'default'}
          className={styles.actionBtn}
          icon={isLastSentence ? <CheckCircleOutlined /> : <RightOutlined />}
          onClick={handleNext}
        >
          {isLastSentence ? 'Hoàn thành' : ''}
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      {isDictationMode && (
        <div className={styles.shortcutsHint} style={{ color: token.colorTextQuaternary }}>
          Phím tắt: [Ctrl+Enter] Kiểm tra
        </div>
      )}
    </div>
  )
}
