import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  BulbOutlined,
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useSelector, itemKeys } from '@/core/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { usePrompt } from '@/helpers/hooks'
import { ISentenceListeningItem } from '@/models/sentenceListening.model'
import { ECategory, EType } from '@/models/item.model'
import { sentenceListeningApi } from '@/services/firebase/api/sentenceListening.api'
import { itemApi } from '@/services/firebase/api/item.api'
import { geminiTtsService, GEMINI_VOICES, TGeminiVoice } from '@/services/gemini/geminiTts.service'
import { geminiDictionaryService, resolveGeminiApiKey } from '@/services/gemini'
import { resolveOpenAiApiKey } from '@/services/openai/tts.service'
import { localDb, listeningStatsService, invalidateSearchIndex } from '@/services/localDb'
import { getType } from '@/helpers/item'
import { evaluateDictation, cleanPunctuation, IDictationResult } from './dictationUtil'
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

  // Split sentence into individual words for interactive hint tags
  const sentenceWords = useMemo(() => {
    if (!currentItem?.origin) return []
    return currentItem.origin.trim().split(/\s+/).filter(Boolean)
  }, [currentItem?.origin])

  // Suggestion 1.5: Hint states (interactive word tags + translation hint)
  const [showHintTags, setShowHintTags] = useState<boolean>(false)
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set())
  const [showTranslationHint, setShowTranslationHint] = useState<boolean>(false)

  // Suggestion 1.5: Interactive word lookup popover states
  const [lookupWord, setLookupWord] = useState<string | null>(null)
  const [activePopoverKey, setActivePopoverKey] = useState<string | null>(null)
  const [lookupData, setLookupData] = useState<{
    origin: string
    phonetic?: string
    translation?: string
    definition?: string
    pos?: string
    typeId?: EType
    itemId?: string
    fromAi?: boolean
  } | null>(null)
  const [isLookingUpAi, setIsLookingUpAi] = useState<boolean>(false)
  const [isSavingToLibrary, setIsSavingToLibrary] = useState<boolean>(false)

  // Voice Selection (Google Gemini TTS / OpenAI)
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

  // Fetch sentences: restore saved session from localDb first, only fetch new when forceNew = true
  const loadSentences = useCallback(
    async (forceNew = false) => {
      setIsLoading(true)
      setIsRevealed(false)
      setUserDictationInput('')
      setDictationResult(null)
      setShowHintTags(false)
      setRevealedHintIndices(new Set())
      setShowTranslationHint(false)
      setLookupWord(null)
      setLookupData(null)

      geminiTtsService.stop()
      setIsPlaying(false)

      try {
        const uid = user?.uid

        // 1. If not forcing new batch, restore existing session from localDb
        if (!forceNew) {
          const stored = await sentenceListeningApi.getStoredSession(uid)
          if (
            stored &&
            stored.items &&
            stored.items.length > 0 &&
            stored.sourceFilter === sourceFilter
          ) {
            setItems(stored.items)
            setCurrentIndex(Math.min(stored.currentIndex || 0, stored.items.length - 1))
            setIsCompleted(Boolean(stored.isCompleted))
            setIsLoading(false)
            return
          }
        }

        // 2. Otherwise generate a new batch and persist to localDb
        const res = await sentenceListeningApi.getListeningSentences({
          count: configuredCount,
          sourceType: sourceFilter,
        })
        if (res.isSuccess && res.content && res.content.length > 0) {
          setItems(res.content)
          setCurrentIndex(0)
          setIsCompleted(false)

          await sentenceListeningApi.saveSession(
            {
              items: res.content,
              currentIndex: 0,
              isCompleted: false,
              sourceFilter,
              updatedAt: Date.now(),
            },
            uid,
          )
        } else {
          setItems([])
          setCurrentIndex(0)
          setIsCompleted(false)
          await sentenceListeningApi.clearSession(uid)
        }
      } catch (err) {
        console.error('Failed to load listening sentences:', err)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    },
    [configuredCount, sourceFilter, user?.uid],
  )

  useEffect(() => {
    loadSentences(false)
    return () => {
      geminiTtsService.stop()
    }
  }, [loadSentences])

  const total = items.length
  const currentItem = items[currentIndex] as ISentenceListeningItem | undefined
  const currentId = currentItem?.id || ''
  const isCurrentBookmarked = bookmarkedIds.has(currentId)

  // Audio Playback with Gemini TTS / OpenAI
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
      setShowHintTags(false)
      setRevealedHintIndices(new Set())
      setShowTranslationHint(false)
      setLookupWord(null)
      setLookupData(null)

      // Persist progress to localDb
      sentenceListeningApi.updateSessionProgress(
        { currentIndex: nextIdx, isCompleted: false },
        user?.uid,
      )

      if (autoPlayOnNext && items[nextIdx]?.origin) {
        setTimeout(() => {
          handlePlayAudio(items[nextIdx].origin)
        }, 300)
      }
    },
    [autoPlayOnNext, items, handlePlayAudio, user?.uid],
  )

  // Next sentence
  const handleNext = useCallback(() => {
    geminiTtsService.stop()
    setIsPlaying(false)

    if (currentIndex >= total - 1) {
      setIsCompleted(true)
      sentenceListeningApi.updateSessionProgress(
        { currentIndex, isCompleted: true },
        user?.uid,
      )
    } else {
      triggerNextSentence(currentIndex + 1)
    }
  }, [currentIndex, total, triggerNextSentence, user?.uid])

  // Previous sentence
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      geminiTtsService.stop()
      setIsPlaying(false)
      triggerNextSentence(currentIndex - 1)
    }
  }, [currentIndex, triggerNextSentence])

  // Dictation Check (1.1 LCS Diff + 2.3 Stats tracking)
  const handleCheckDictation = useCallback(() => {
    if (!currentItem?.origin || !userDictationInput.trim()) return
    const result = evaluateDictation(currentItem.origin, userDictationInput)
    setDictationResult(result)

    // Feature 2.3: Record practice stats into localDb
    listeningStatsService.recordPractice({
      uid: user?.uid,
      sentenceId: currentItem.id,
      sentenceOrigin: currentItem.origin,
      userText: userDictationInput,
      accuracy: result.accuracy,
      isPerfect: result.isPerfect,
      sourceType: currentItem.sourceType,
      voice: geminiVoice,
    })

    if (result.isPerfect) {
      setIsRevealed(true)
      message({ type: 'success', content: '🎉 Chính xác 100%! Tuyệt vời!' })
    }
  }, [currentItem, userDictationInput, user?.uid, geminiVoice, message])

  // Feature 1.5: Interactive Hint Logic & Word Tags
  const handleGiveHint = useCallback(() => {
    if (!currentItem?.origin || sentenceWords.length === 0) return

    if (!showHintTags) {
      setShowHintTags(true)
      // Reveal the first word as an initial starting point
      setRevealedHintIndices(new Set([0]))
      message({
        type: 'info',
        content: `💡 Gợi ý từ đầu tiên: "${sentenceWords[0]}". Nhấn vào các tag để hiện từng từ!`,
      })
      return
    }

    // Find next unrevealed word index in sequence
    const nextUnrevealedIdx = sentenceWords.findIndex((_, i) => !revealedHintIndices.has(i))
    if (nextUnrevealedIdx !== -1) {
      setRevealedHintIndices((prev) => new Set(prev).add(nextUnrevealedIdx))
      const nextWord = sentenceWords[nextUnrevealedIdx]
      message({
        type: 'info',
        content: `💡 Gợi ý từ #${nextUnrevealedIdx + 1}: "${nextWord}"`,
      })
    } else {
      message({
        type: 'info',
        content: 'Tất cả các từ trong câu đã được gợi ý!',
      })
    }
  }, [currentItem?.origin, sentenceWords, showHintTags, revealedHintIndices, message])

  const handleRevealHintWord = useCallback(
    (idx: number) => {
      setRevealedHintIndices((prev) => new Set(prev).add(idx))
      const word = sentenceWords[idx]
      if (word) {
        message({
          type: 'info',
          content: `💡 Từ #${idx + 1}: "${word}"`,
        })
      }
    },
    [sentenceWords, message],
  )

  const handleHideHintWord = useCallback((idx: number) => {
    setRevealedHintIndices((prev) => {
      const next = new Set(prev)
      next.delete(idx)
      return next
    })
  }, [])

  const handleRevealedTagClick = useCallback(
    (word: string) => {
      if (!isDictationMode) return
      const clean = cleanPunctuation(word)
      if (clean) {
        setUserDictationInput((prev) => {
          const trimmed = prev.trim()
          return trimmed ? `${trimmed} ${clean}` : clean
        })
        message({ type: 'success', content: `Đã điền "${clean}" vào ô gõ!` })
      }
    },
    [isDictationMode, message],
  )

  const allWordsRevealed = useMemo(() => {
    return (
      sentenceWords.length > 0 &&
      sentenceWords.every((_, i) => revealedHintIndices.has(i))
    )
  }, [sentenceWords, revealedHintIndices])

  const handleToggleAllHintWords = useCallback(() => {
    if (allWordsRevealed) {
      setRevealedHintIndices(new Set())
    } else {
      setRevealedHintIndices(new Set(sentenceWords.map((_, i) => i)))
    }
  }, [allWordsRevealed, sentenceWords])

  // Feature 1.5: Interactive Word Lookup
  const handleWordClick = useCallback(async (rawWord: string, popoverKey?: string) => {
    const clean = cleanPunctuation(rawWord)
    if (!clean) return
    if (popoverKey) setActivePopoverKey(popoverKey)
    setLookupWord(clean)
    setLookupData({ origin: clean })

    try {
      const matched = await localDb.items
        .filter((item) => (item.origin || '').toLowerCase() === clean.toLowerCase())
        .first()
      if (matched) {
        const m = matched.meanings?.[0]
        setLookupData({
          origin: matched.origin,
          translation: m?.translation,
          definition: m?.definition,
          phonetic: m?.pronunciation?.us || m?.pronunciation?.common,
          pos: m?.typeId !== undefined ? getType(m.typeId).origin : undefined,
          typeId: m?.typeId,
          itemId: matched.id,
          fromAi: false,
        })
      }
    } catch (err) {
      console.warn('Word lookup in localDb failed:', err)
    }
  }, [])

  const handleAiLookup = useCallback(async () => {
    if (!lookupWord) return

    let geminiKey = resolveGeminiApiKey()
    let openAiKey = resolveOpenAiApiKey()
    if (!geminiKey && !openAiKey) {
      const inputKey = window.prompt(
        'Chưa tìm thấy API Key cho Gemini hoặc OpenAI. Vui lòng nhập Gemini API Key của bạn (sẽ được lưu trong trình duyệt):',
      )
      if (inputKey && inputKey.trim()) {
        localStorage.setItem('gemini_api_key', inputKey.trim())
        geminiKey = inputKey.trim()
      } else {
        message({
          type: 'warning',
          content: 'Cần có Gemini API Key hoặc OpenAI API Key để tra nghĩa từ điển AI.',
        })
        return
      }
    }

    setIsLookingUpAi(true)
    try {
      const res = await geminiDictionaryService.fetchFromGoogle(lookupWord, currentItem?.origin)
      if (res.isSuccess && res.content) {
        const m = res.content.meanings?.[0]
        setLookupData((prev) => ({
          origin: prev?.origin || lookupWord,
          translation: m?.translation || 'Không có bản dịch',
          definition: m?.definition || '',
          phonetic: m?.pronunciation?.us || m?.pronunciation?.common || '',
          pos: m?.typeId !== undefined ? getType(m.typeId).origin : undefined,
          typeId: m?.typeId,
          itemId: prev?.itemId,
          fromAi: true,
        }))
        message({ type: 'success', content: `Đã tra nghĩa AI cho "${lookupWord}"` })
      } else {
        message({
          type: 'error',
          content: res.message || 'Không tìm thấy định nghĩa cho từ này',
        })
      }
    } catch (err: any) {
      message({ type: 'error', content: err?.message || 'Lỗi tra từ điển AI' })
    } finally {
      setIsLookingUpAi(false)
    }
  }, [lookupWord, currentItem?.origin, message])

  const handleAddWordToLibrary = useCallback(async () => {
    if (!lookupData) return
    try {
      if (lookupData.itemId) {
        message({ type: 'info', content: `Từ "${lookupData.origin}" đã có sẵn trong Thư viện!` })
        return
      }

      setIsSavingToLibrary(true)
      const createRes = await itemApi.createItem({
        origin: lookupData.origin,
        catId: ECategory.WORD,
        level: 1,
        meanings: [
          {
            typeId: lookupData.typeId ?? EType.NOUN,
            definition: lookupData.definition || '',
            translation: lookupData.translation || '',
            common: true,
            enable: true,
            synonyms: [],
            antonyms: [],
            examples: [],
            pronunciation: {
              us: lookupData.phonetic || '',
              uk: '',
              common: lookupData.phonetic || '',
            },
          },
        ],
      })

      if (createRes.isSuccess && createRes.content) {
        const newItem = createRes.content
        // Save to IndexedDB local cache
        await localDb.items.put(newItem)
        invalidateSearchIndex()
        // Invalidate React Query item lists cache
        queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

        setLookupData((prev) => (prev ? { ...prev, itemId: newItem.id } : prev))
        message({
          type: 'success',
          content: `Đã thêm "${lookupData.origin}" vào Thư viện thành công!`,
        })
      } else {
        message({
          type: 'error',
          content: createRes.message || 'Không thể thêm vào Thư viện',
        })
      }
    } catch (err: any) {
      console.warn('Failed to add word to library:', err)
      message({ type: 'error', content: err?.message || 'Không thể thêm vào Thư viện' })
    } finally {
      setIsSavingToLibrary(false)
    }
  }, [lookupData, queryClient, message])

  // Bookmark Favorite Sentence Toggle
  const handleToggleBookmark = useCallback(async () => {
    if (!currentItem) return

    const newBookmarks = new Set(bookmarkedIds)
    const isAdding = !newBookmarks.has(currentId)

    if (isAdding) {
      newBookmarks.add(currentId)
      setBookmarkedIds(newBookmarks)
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(newBookmarks)))
      message({ type: 'success', content: 'Đã đánh dấu câu yêu thích!' })
    } else {
      newBookmarks.delete(currentId)
      setBookmarkedIds(newBookmarks)
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(newBookmarks)))
      message({ type: 'info', content: 'Đã bỏ đánh dấu câu!' })
    }
  }, [currentItem, currentId, bookmarkedIds, message])

  // Toggle Dictation Mode
  const handleToggleDictationMode = (enabled: boolean) => {
    setIsDictationMode(enabled)
    localStorage.setItem(DICTATION_MODE_STORAGE_KEY, String(enabled))
    setUserDictationInput('')
    setDictationResult(null)
    setShowHintTags(false)
    setRevealedHintIndices(new Set())
    setShowTranslationHint(false)
  }

  // Feature 1.2: Keyboard shortcuts: Enter to listen, Shift+Enter to check, Ctrl+Enter to next
  // Only applies when user is actively focused on SentenceListening component
  const containerRef = useRef<HTMLDivElement>(null)

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter') return

      // 1. Ctrl + Enter (or Cmd + Enter): Always navigate to next sentence
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        handleNext()
        return
      }

      // 2. Shift + Enter: Check dictation (if dictation mode enabled)
      if (e.shiftKey) {
        if (isDictationMode) {
          e.preventDefault()
          handleCheckDictation()
          return
        }
      }

      // 3. Plain Enter: Play audio
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        handlePlayAudio()
        return
      }
    },
    [handleCheckDictation, handleNext, handlePlayAudio, isDictationMode],
  )

  // Popover Content for Interactive Word Lookup
  const renderWordPopoverContent = () => {
    if (!lookupData) return null
    return (
      <div className={styles.popoverWordContent}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='font-bold text-base' style={{ color: token.colorPrimary }}>
              {lookupData.origin}
            </span>
            {lookupData.pos && (
              <Tag color='blue' style={{ fontSize: 11, padding: '0 4px' }}>
                {lookupData.pos}
              </Tag>
            )}
          </div>
          <Button
            type='text'
            size='small'
            icon={<SoundOutlined />}
            onClick={() => handlePlayAudio(lookupData.origin)}
          />
        </div>

        {lookupData.phonetic && (
          <div className='text-xs italic' style={{ color: token.colorTextSecondary }}>
            /{lookupData.phonetic}/
          </div>
        )}

        {lookupData.translation ? (
          <div className='flex flex-col gap-1'>
            <div className='text-sm flex items-center justify-between' style={{ color: token.colorText }}>
              <div>
                👉 <b>{lookupData.translation}</b>
              </div>
              {lookupData.fromAi ? (
                <Tag color='green' style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                  AI
                </Tag>
              ) : (
                <Tag color='cyan' style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                  Thư viện
                </Tag>
              )}
            </div>
            <div className='flex justify-end'>
              <Button
                size='small'
                type='text'
                icon={<SearchOutlined />}
                onClick={handleAiLookup}
                loading={isLookingUpAi}
                style={{
                  fontSize: 11,
                  padding: 0,
                  height: 'auto',
                  color: token.colorTextTertiary,
                }}
              >
                Tra lại với AI
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            <span className='text-xs' style={{ color: token.colorTextSecondary }}>
              Chưa có trong từ điển cá nhân.
            </span>
            <Button
              size='small'
              type='primary'
              icon={<SearchOutlined />}
              onClick={handleAiLookup}
              loading={isLookingUpAi}
            >
              Tra nghĩa AI
            </Button>
          </div>
        )}

        {lookupData.definition && (
          <div
            className='text-xs'
            style={{ color: token.colorTextSecondary, maxHeight: 60, overflowY: 'auto' }}
          >
            {lookupData.definition}
          </div>
        )}

        <div className='flex justify-between items-center pt-2 border-t border-dashed'>
          {lookupData.itemId ? (
            <Tag color='success' style={{ fontSize: 11, margin: 0, padding: '2px 8px' }}>
              ✓ Đã có trong Thư viện
            </Tag>
          ) : (
            <Button
              size='small'
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleAddWordToLibrary}
              loading={isSavingToLibrary}
              style={{ fontSize: 12 }}
            >
              Thêm vào Thư viện
            </Button>
          )}
        </div>
      </div>
    )
  }

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
        <Button icon={<ReloadOutlined />} onClick={() => loadSentences(true)}>
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
            <Button
              type='primary'
              key='restart'
              icon={<ReloadOutlined />}
              onClick={() => loadSentences(true)}
            >
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
    <div
      ref={containerRef}
      tabIndex={0}
      className={styles.container}
      onKeyDown={handleContainerKeyDown}
      style={{ outline: 'none' }}
    >
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
          <Tooltip title='Tải bộ câu mới'>
            <Button
              type='text'
              size='small'
              icon={<ReloadOutlined />}
              onClick={() => loadSentences(true)}
            />
          </Tooltip>
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
        {/* Card Top Action: Bookmark Favorite Sentence */}
        <div className={styles.cardBoxTopActions}>
          <Tooltip
            title={
              isCurrentBookmarked ? 'Đã đánh dấu (Bấm để bỏ ghim)' : 'Đánh dấu câu yêu thích'
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

        {/* English Sentence Display (with 1.5 Interactive Word Lookup when revealed) */}
        <div
          className={`${styles.sentenceDisplay} ${isRevealed ? styles.revealed : styles.blurred}`}
          style={{ color: token.colorText }}
          onClick={() => !isRevealed && handleToggleReveal()}
        >
          {isRevealed
            ? currentItem?.origin?.split(/\s+/).map((word, wIdx) => {
                const clean = cleanPunctuation(word)
                const popoverKey = `sentence_${wIdx}_${clean}`
                return (
                  <Popover
                    key={wIdx}
                    open={activePopoverKey === popoverKey}
                    onOpenChange={(open) => {
                      if (!open && activePopoverKey === popoverKey) {
                        setActivePopoverKey(null)
                        setLookupWord(null)
                      }
                    }}
                    trigger='click'
                    content={renderWordPopoverContent()}
                    placement='top'
                  >
                    <span
                      className={styles.interactiveWord}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleWordClick(word, popoverKey)
                      }}
                    >
                      {word}
                    </span>
                  </Popover>
                )
              })
            : currentItem?.origin}
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

        {/* Feature 1.5: Interactive Word Hint Tags */}
        {showHintTags && !isRevealed && (
          <div
            className={styles.hintTagsContainer}
            style={{
              backgroundColor: token.colorWarningBg,
              border: `1px dashed ${token.colorWarningBorder}`,
            }}
          >
            <div className={styles.hintTagsHeader}>
              <div className='flex items-center gap-2'>
                <BulbOutlined style={{ color: token.colorWarning, fontSize: 14 }} />
                <span className='font-semibold text-xs' style={{ color: token.colorWarningText }}>
                  Gợi ý từ trong câu (Nhấn vào tag để hiện từ):
                </span>
              </div>
              <Flex gap={token.sizeXXS} align='center'>
                <Button
                  type='link'
                  size='small'
                  style={{ fontSize: 11, padding: '0 4px' }}
                  onClick={handleToggleAllHintWords}
                >
                  {allWordsRevealed ? 'Ẩn tất cả' : 'Hiện tất cả'}
                </Button>
                {currentItem?.translation && (
                  <Button
                    type='link'
                    size='small'
                    style={{ fontSize: 11, padding: '0 4px' }}
                    onClick={() => setShowTranslationHint((prev) => !prev)}
                  >
                    {showTranslationHint ? 'Ẩn dịch' : 'Nghĩa câu'}
                  </Button>
                )}
              </Flex>
            </div>

            {/* Tags Row */}
            <div className={styles.hintTagsRow}>
              {sentenceWords.map((word, idx) => {
                const isWordRevealed = revealedHintIndices.has(idx)
                const clean = cleanPunctuation(word)
                const dotCount = Math.max(2, Math.min(clean.length, 7))

                if (isWordRevealed) {
                  return (
                    <Tooltip
                      key={idx}
                      title={
                        isDictationMode
                          ? `Nhấn để điền "${clean}" vào ô gõ • Nhấn [x] để ẩn lại`
                          : `Nhấn [x] để ẩn lại`
                      }
                    >
                      <Tag
                        color='blue'
                        closable
                        onClose={(e) => {
                          e.stopPropagation()
                          handleHideHintWord(idx)
                        }}
                        className={styles.hintWordTag}
                        onClick={() => handleRevealedTagClick(word)}
                      >
                        <span className='font-semibold opacity-70 mr-1'>#{idx + 1}</span>
                        <span className='font-bold'>{word}</span>
                      </Tag>
                    </Tooltip>
                  )
                }

                return (
                  <Tooltip key={idx} title={`Nhấn để mở từ #${idx + 1} (${clean.length} ký tự)`}>
                    <Tag
                      className={`${styles.hintWordTag} ${styles.hintWordTagUnrevealed}`}
                      style={{
                        backgroundColor: token.colorBgContainer,
                        borderColor: token.colorWarningBorder,
                        color: token.colorTextSecondary,
                      }}
                      onClick={() => handleRevealHintWord(idx)}
                    >
                      <EyeInvisibleOutlined style={{ fontSize: 11, marginRight: 4 }} />
                      <span className='font-semibold opacity-70 mr-1'>#{idx + 1}</span>
                      <span style={{ letterSpacing: 2 }}>{'•'.repeat(dotCount)}</span>
                    </Tag>
                  </Tooltip>
                )
              })}
            </div>

            {/* Optional Translation Hint */}
            {showTranslationHint && currentItem?.translation && (
              <div
                className='text-xs italic pt-1 border-t border-dashed'
                style={{ borderColor: token.colorWarningBorder, color: token.colorTextSecondary }}
              >
                💡 <b>Nghĩa câu:</b> {currentItem.translation}
              </div>
            )}
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
                placeholder='Nghe audio và gõ lại câu tại đây...'
                value={userDictationInput}
                onChange={(e) => {
                  setUserDictationInput(e.target.value)
                  if (dictationResult) setDictationResult(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault()
                      handleNext()
                    } else if (e.shiftKey) {
                      e.preventDefault()
                      handleCheckDictation()
                    } else {
                      e.preventDefault()
                      handlePlayAudio()
                    }
                  }
                }}
              />
            </div>

            <div className='flex justify-between items-center mt-1'>
              <Flex gap={token.sizeXS}>
                <Button
                  type='dashed'
                  size='small'
                  icon={<CheckOutlined />}
                  onClick={handleCheckDictation}
                  disabled={!userDictationInput.trim()}
                >
                  Kiểm tra
                </Button>
                <Button
                  type='default'
                  size='small'
                  icon={<BulbOutlined />}
                  onClick={handleGiveHint}
                >
                  Gợi ý {revealedHintIndices.size > 0 ? `(${revealedHintIndices.size}/${sentenceWords.length})` : ''}
                </Button>
              </Flex>
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

            {/* Feature 1.1: LCS Diff Comparison Visualization with Interactive Lookups */}
            {dictationResult && (
              <div
                className={styles.diffResults}
                style={{
                  backgroundColor: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div className='text-xs font-semibold' style={{ color: token.colorTextSecondary }}>
                  So khớp từng từ (Bấm vào từ để xem chi tiết / tra từ điển):
                </div>
                <div className={styles.diffTokensRow}>
                  {dictationResult.words.map((item, idx) => {
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

                    const clean = cleanPunctuation(item.word)
                    const popoverKey = `diff_${idx}_${clean}`

                    return (
                      <Popover
                        key={idx}
                        open={activePopoverKey === popoverKey}
                        onOpenChange={(open) => {
                          if (!open && activePopoverKey === popoverKey) {
                            setActivePopoverKey(null)
                            setLookupWord(null)
                          }
                        }}
                        trigger='click'
                        content={renderWordPopoverContent()}
                        placement='top'
                      >
                        <Tooltip title={tooltipText}>
                          <span
                            className={`${styles.diffWordTag} ${isExtra ? styles.diffExtraTag : ''}`}
                            style={{
                              backgroundColor: bgColor,
                              color: textColor,
                              border: `1px solid ${borderColor}`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleWordClick(item.word, popoverKey)
                            }}
                          >
                            {item.word}
                          </span>
                        </Tooltip>
                      </Popover>
                    )
                  })}
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
        <Button
          type='primary'
          className={styles.actionBtn}
          icon={<CustomerServiceOutlined />}
          onClick={() => handlePlayAudio()}
          loading={isPlaying}
        >
          {isPlaying ? 'Đang đọc...' : 'Nghe'}
        </Button>

        {/* Button 2: Gợi ý (Word Hint Tags) */}
        {!isRevealed && (
          <Button
            className={styles.actionBtn}
            icon={<BulbOutlined />}
            onClick={handleGiveHint}
          >
            {showHintTags
              ? `Gợi ý (${revealedHintIndices.size}/${sentenceWords.length})`
              : 'Gợi ý'}
          </Button>
        )}

        {/* Button 3: Reveal Answer */}
        <Button
          className={styles.actionBtn}
          icon={isRevealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={handleToggleReveal}
        >
          {isRevealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
        </Button>

        {/* Button 4: Next Sentence */}
        <Button
          type={isLastSentence ? 'primary' : 'default'}
          className={styles.actionBtn}
          icon={isLastSentence ? <CheckCircleOutlined /> : <RightOutlined />}
          onClick={handleNext}
        >
          {isLastSentence ? 'Hoàn thành' : 'Tiếp theo'}
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint (1.2) */}
      <div className={styles.shortcutsHint} style={{ color: token.colorTextQuaternary }}>
        Phím tắt: <b>[Enter]</b> Nghe lại • <b>[Shift+Enter]</b> Kiểm tra • <b>[Ctrl+Enter]</b> Câu tiếp theo
      </div>
    </div>
  )
}
