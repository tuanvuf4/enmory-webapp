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
  Flex,
  Result,
  Popover,
  Select,
  Segmented,
  Switch,
} from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import {
  SoundOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  RightOutlined,
  LeftOutlined,
  CopyOutlined,
  ClearOutlined,
  InfoCircleOutlined,
  RobotOutlined,
  CloseOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  CheckSquareOutlined,
  SettingOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { IExample, IItem, ECategory, EType } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { sentenceListeningApi } from '@/services/firebase/api/sentenceListening.api'
import { itemApi } from '@/services/firebase/api/item.api'
import { initItem, meaningItem } from '@/views/features/modals/itemModal'
import {
  geminiTtsService,
  GEMINI_VOICES,
  TGeminiVoice,
  geminiTranslationReviewService,
  ITranslationReviewResponse,
} from '@/services/gemini'
import {
  SentenceDiffView,
  WordLookupPopover,
  evaluateDictation,
  IDictationResult,
} from '@/views/components'
import { shuffleArray } from '@/helpers/mics'
import { useSelector, useChecklist, itemKeys } from '@/core/hooks'
import { useItemModal } from '@/helpers/hooks'
import { useQueryClient } from '@tanstack/react-query'
import {
  translationStatsService,
  listeningStatsService,
  localDb,
  invalidateSearchIndex,
} from '@/services/localDb'
import styles from './dicTran.module.scss'

export type TDicTranMode = 'dictation' | 'translator'

export interface IDicTranQuestionRecord {
  userAnswer: string
  isChecked: boolean
  dictationResult: IDictationResult | null
  aiReviewResult?: ITranslationReviewResponse | null
}

export interface IDicTranProps {
  mode?: TDicTranMode
  initialExample?: IExample
  onCancel?: () => void
  onSuccess?: (example: IExample) => void
  className?: string
  style?: React.CSSProperties
}

const getSessionKey = (uid?: string, m: TDicTranMode = 'translator') =>
  `dictran_${m}_session_${uid || 'default'}`

const { Text } = Typography

const stripHtml = (html?: string): string => {
  if (!html) return ''
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export const DicTran: React.FC<IDicTranProps> = ({
  mode = 'translator',
  initialExample,
  onCancel,
  onSuccess,
  className,
  style,
}) => {
  const { token } = theme.useToken()
  const queryClient = useQueryClient()
  const { openItemModal } = useItemModal()

  // Practice mode: 'dictation' | 'translator'
  const [currentMode, setCurrentMode] = useState<TDicTranMode>(mode)

  // Keep currentMode synced if mode prop changes externally
  useEffect(() => {
    if (mode && mode !== currentMode) {
      setCurrentMode(mode)
      if (!initialExample) {
        loadBatch(false, mode)
      }
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    checklist,
    addItem: addChecklistItem,
    removeItem: removeChecklistItem,
    removeItemByItemId,
  } = useChecklist()

  const [isTogglingChecklist, setIsTogglingChecklist] = useState<boolean>(false)
  const [isLoadingEditItem, setIsLoadingEditItem] = useState<boolean>(false)

  const { user } = useSelector((state) => state.auth)
  const isCustom = Boolean(initialExample)

  // Isolated local history and currentIndex per DicTran instance (no cross-contamination)
  const [history, setHistory] = useState<IExample[]>(initialExample ? [initialExample] : [])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  // Bounds-safe index and current item
  const safeCurrentIndex =
    history.length > 0 ? Math.min(Math.max(0, currentIndex), history.length - 1) : 0
  const currentExample = history[safeCurrentIndex] || null

  // Audio & Voice Preferences
  const [geminiVoice, setGeminiVoice] = useState<TGeminiVoice>(() => {
    return (localStorage.getItem('gemini_tts_voice') as TGeminiVoice) || 'Aoede'
  })
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const [repeatCount, setRepeatCount] = useState<number>(() => {
    return Number(localStorage.getItem('dictran_repeat_count') || 1)
  })
  const [autoPlayOnNext, setAutoPlayOnNext] = useState<boolean>(() => {
    return localStorage.getItem('dictran_autoplay_next') === 'true'
  })

  // Match sentence with checklist entry by itemId or origin text
  const getChecklistEntry = useCallback(
    (example?: IExample | null) => {
      if (!example) return undefined
      if (example.itemId) {
        const found = checklist.find((c) => c.itemId === example.itemId || c.id === example.itemId)
        if (found) return found
      }
      const originKey = example.origin?.trim().toLowerCase()
      if (!originKey) return undefined
      return checklist.find((c) => c.origin?.trim().toLowerCase() === originKey)
    },
    [checklist],
  )

  const isSentenceInChecklist = useCallback(
    (example?: IExample | null) => {
      return Boolean(getChecklistEntry(example))
    },
    [getChecklistEntry],
  )

  const isCurrentInChecklist = isSentenceInChecklist(currentExample)

  // Ensure index stays within valid bounds
  useEffect(() => {
    if (history.length > 0 && currentIndex !== safeCurrentIndex) {
      setCurrentIndex(safeCurrentIndex)
    }
  }, [history.length, currentIndex, safeCurrentIndex])

  // User input & session evaluation states
  const [sessionRecords, setSessionRecords] = useState<Record<number, IDicTranQuestionRecord>>({})
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [dictationResult, setDictationResult] = useState<IDictationResult | null>(null)

  // Hints
  const [showHint, setShowHint] = useState<boolean>(false) // Single-step Hint toggle
  const [showMeaningHint, setShowMeaningHint] = useState<boolean>(false) // Dictation mode hint

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  // AI Review states
  const [isAiReviewing, setIsAiReviewing] = useState<boolean>(false)
  const [aiReviewResult, setAiReviewResult] = useState<ITranslationReviewResponse | null>(null)

  // Input ref
  const textAreaRef = useRef<TextAreaRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isLastQuestion = history.length > 0 && safeCurrentIndex === history.length - 1
  const batchSize = user?.configuration?.numberOfListeningSentences || 10

  // Stable state ref for async operations
  const stateRef = useRef({
    history,
    safeCurrentIndex,
    isCompleted,
    sessionRecords,
    currentMode,
  })
  stateRef.current = {
    history,
    safeCurrentIndex,
    isCompleted,
    sessionRecords,
    currentMode,
  }

  // Source (Vietnamese prompt) & Target (English reference sentence)
  const rawSource = currentExample?.translation
  const rawTarget = currentExample?.origin
  const sourceText = stripHtml(rawSource)
  const targetText = stripHtml(rawTarget)
  const noteText = currentExample?.note?.trim() || ''

  // Scrambled word tags for Hint (deduplicated so each word appears once)
  const scrambledWords = useMemo(() => {
    if (!targetText) return []
    const tokens = targetText
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean)
    const seen = new Set<string>()
    const uniqueTokens: string[] = []
    for (const w of tokens) {
      const lower = w.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        uniqueTokens.push(w)
      }
    }
    return shuffleArray(uniqueTokens)
  }, [targetText])

  // Reset current question UI states
  const resetExerciseState = useCallback(() => {
    setUserAnswer('')
    setIsChecked(false)
    setDictationResult(null)
    setShowHint(false)
    setShowMeaningHint(false)
    setAiReviewResult(null)
    setIsAiReviewing(false)
    setIsPlaying(false)
  }, [])

  // Persist session to localDb
  const saveSession = useCallback(
    async (patch: {
      currentIndex?: number
      isCompleted?: boolean
      sessionRecords?: Record<number, IDicTranQuestionRecord>
      items?: IExample[]
    }) => {
      if (isCustom) return
      try {
        const m = stateRef.current.currentMode
        const key = getSessionKey(user?.uid, m)
        const current = await localDb.syncMeta.get(key)
        const prev = current?.value || {}
        const cur = stateRef.current
        await localDb.syncMeta.put({
          key,
          value: {
            items: patch.items ?? prev.items ?? cur.history,
            currentIndex: patch.currentIndex ?? prev.currentIndex ?? cur.safeCurrentIndex,
            isCompleted: patch.isCompleted ?? prev.isCompleted ?? cur.isCompleted,
            sessionRecords: patch.sessionRecords ?? prev.sessionRecords ?? cur.sessionRecords,
            mode: m,
            updatedAt: Date.now(),
          },
        })
      } catch (err) {
        console.warn('Failed to update session progress in localDb:', err)
      }
    },
    [isCustom, user?.uid],
  )

  // Browser TTS fallback helper (English)
  const speakBrowser = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.()
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.onend = () => onEnd?.()
    utterance.onerror = () => onEnd?.()
    window.speechSynthesis.speak(utterance)
  }, [])

  // Play audio of reference sentence with Gemini TTS / Web Speech API
  const handlePlayAudio = useCallback(
    async (textToPlay = targetText) => {
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
        await geminiTtsService.playSpeech(textToPlay, {
          voice: geminiVoice,
          playbackRate: playbackSpeed,
          repeatCount,
          onStart: () => setIsPlaying(true),
          onEnd: () => setIsPlaying(false),
          onError: () => {
            speakBrowser(textToPlay, () => setIsPlaying(false))
          },
        })
      } catch (_err) {
        speakBrowser(textToPlay, () => setIsPlaying(false))
      }
    },
    [targetText, isPlaying, geminiVoice, playbackSpeed, repeatCount, speakBrowser],
  )

  // Fetch or restore batch of 10 sentences (isolated per mode & instance)
  const loadBatch = useCallback(
    async (forceNew = false, targetMode?: TDicTranMode) => {
      try {
        setLoading(true)
        setIsPlaying(false)
        geminiTtsService.stop()
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        const uid = user?.uid
        const m = targetMode || stateRef.current.currentMode

        // 1. If not custom & not forcing new, try restore from localDb.syncMeta
        if (!isCustom && !forceNew) {
          try {
            const key = getSessionKey(uid, m)
            const record = await localDb.syncMeta.get(key)
            if (
              record &&
              record.value &&
              Array.isArray(record.value.items) &&
              record.value.items.length > 0
            ) {
              const savedItems: IExample[] = record.value.items
              const savedIndex = Math.min(
                Math.max(0, record.value.currentIndex || 0),
                savedItems.length - 1,
              )
              const savedCompleted = Boolean(record.value.isCompleted)
              const savedRecords = record.value.sessionRecords || {}

              setHistory(savedItems)
              setCurrentIndex(savedIndex)
              setSessionRecords(savedRecords)
              setIsCompleted(savedCompleted)

              if (autoPlayOnNext && m === 'dictation' && savedItems[savedIndex]?.origin) {
                setTimeout(() => {
                  handlePlayAudio(stripHtml(savedItems[savedIndex].origin))
                }, 300)
              }
              return
            }
          } catch (e) {
            console.warn('Failed to restore DicTran session:', e)
          }
        }

        // 2. Fetch new batch of items (separate sources for Dictation vs Translator)
        let newContent: IExample[] = []
        if (m === 'dictation') {
          try {
            const res = await sentenceListeningApi.getListeningSentences({
              count: batchSize,
              sourceType: 'all',
            })
            if (res.isSuccess && res.content && res.content.length > 0) {
              newContent = res.content.map((item: any) => ({
                id: item.id,
                origin: item.origin,
                translation: item.translation,
                note: item.note,
                itemId: item.itemId,
                itemOrigin: item.itemOrigin,
                catId: item.catId,
              }))
            }
          } catch (err) {
            console.warn('Failed to fetch from sentenceListeningApi, fallback to exampleApi:', err)
          }
        }

        // Fallback or translator mode
        if (newContent.length === 0) {
          const { isSuccess, content } = await exampleApi.getRandomExamples(batchSize)
          if (isSuccess && content && content.length > 0) {
            newContent = content
          }
        }

        if (newContent.length > 0) {
          setHistory(newContent)
          setCurrentIndex(0)
          if (!isCustom) {
            const key = getSessionKey(uid, m)
            await localDb.syncMeta.put({
              key,
              value: {
                items: newContent,
                currentIndex: 0,
                isCompleted: false,
                sessionRecords: {},
                mode: m,
                updatedAt: Date.now(),
              },
            })
          }
          setSessionRecords({})
          setIsCompleted(false)
          resetExerciseState()

          if (autoPlayOnNext && m === 'dictation' && newContent[0]?.origin) {
            setTimeout(() => {
              handlePlayAudio(stripHtml(newContent[0].origin))
            }, 300)
          }
        } else {
          message.warning('Không tìm thấy câu ví dụ nào.')
        }
      } catch (error: any) {
        console.error('Failed to load DicTran batch:', error)
      } finally {
        setLoading(false)
      }
    },
    [batchSize, isCustom, resetExerciseState, user?.uid, autoPlayOnNext, handlePlayAudio],
  )

  // Toggle Checklist for Example/Sentence (persisted in Firestore & localDb cache)
  const handleToggleChecklist = useCallback(
    async (exampleToToggle?: IExample) => {
      const example = exampleToToggle || currentExample
      if (!example) return

      const existingEntry = getChecklistEntry(example)

      setIsTogglingChecklist(true)
      try {
        if (existingEntry) {
          // Remove from checklist
          const targetChecklistId = existingEntry.checklistId
          const targetItemId = existingEntry.itemId || existingEntry.id
          if (targetChecklistId) {
            await removeChecklistItem(targetChecklistId)
          } else if (targetItemId) {
            await removeItemByItemId(targetItemId)
          }
          message.info('Đã xóa câu khỏi Checklist!')
          return
        }

        // Add to checklist
        let targetItem: IItem | undefined

        // 1. Try finding existing item by itemId
        if (example.itemId) {
          try {
            targetItem = await localDb.items.get(example.itemId)
          } catch (err) {
            console.warn('Error fetching item by itemId:', err)
          }
        }

        // 2. Try finding existing item by origin text in localDb.items
        if (!targetItem && example.origin) {
          try {
            targetItem = await localDb.items
              .filter((i) => i.origin?.trim().toLowerCase() === example.origin.trim().toLowerCase())
              .first()
          } catch (err) {
            console.warn('Error fetching item by origin:', err)
          }
        }

        // 3. If item doesn't exist in Library yet, create it as a Sentence item
        if (!targetItem) {
          const newSentenceItem: IItem = {
            ...initItem,
            origin: example.origin.trim(),
            catId: ECategory.SENTENCE,
            level: 1,
            meanings: [
              {
                ...meaningItem,
                typeId: EType.ALL,
                translation: example.translation || '',
                definition: example.translation || '',
              },
            ],
          }
          const createRes = await itemApi.createItem(newSentenceItem)
          if (createRes.isSuccess && createRes.content) {
            targetItem = createRes.content
            await localDb.items.put(targetItem)
            invalidateSearchIndex()
            queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

            // Link newly created itemId to history array
            if (targetItem.id) {
              const newId = targetItem.id
              setHistory((prev) =>
                prev.map((it) => (it.origin === example.origin ? { ...it, itemId: newId } : it)),
              )
            }
          } else {
            message.error(
              createRes.message || 'Không thể tạo câu trong Thư viện để thêm vào Checklist',
            )
            return
          }
        }

        // 4. Add targetItem to Checklist
        if (!targetItem) {
          message.error('Không thể thêm câu vào Checklist')
          return
        }

        const res = await addChecklistItem(targetItem)
        if (res.isSuccess) {
          message.success('Đã thêm câu vào Checklist!')
        } else {
          message.error(res.message || 'Không thể thêm câu vào Checklist')
        }
      } catch (err: any) {
        console.error('Error toggling checklist:', err)
        message.error(err?.message || 'Lỗi khi cập nhật Checklist')
      } finally {
        setIsTogglingChecklist(false)
      }
    },
    [
      currentExample,
      getChecklistEntry,
      removeChecklistItem,
      removeItemByItemId,
      addChecklistItem,
      queryClient,
      history,
      safeCurrentIndex,
    ],
  )

  // Edit sentence/item via ItemModal
  const handleEditItem = useCallback(
    async (exampleToEdit?: IExample) => {
      const example = exampleToEdit || currentExample
      if (!example) return

      // Stop speech if currently playing
      geminiTtsService.stop()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsPlaying(false)

      setIsLoadingEditItem(true)
      try {
        let targetItem: IItem | null | undefined = null

        // 1. Try finding by itemId directly
        if (example.itemId) {
          const res = await itemApi.getItemById(example.itemId)
          if (res.isSuccess && res.content) {
            targetItem = res.content
          }
        }

        // 2. Fallback: Try finding by itemOrigin or origin in localDb.items
        if (!targetItem) {
          const searchOrigins = [example.itemOrigin, example.origin].filter(Boolean) as string[]
          for (const originStr of searchOrigins) {
            try {
              const found = await localDb.items
                .filter((i) => i.origin?.trim().toLowerCase() === originStr.trim().toLowerCase())
                .first()
              if (found?.id) {
                const res = await itemApi.getItemById(found.id)
                if (res.isSuccess && res.content) {
                  targetItem = res.content
                  break
                }
              }
            } catch (err) {
              console.warn('Error fetching item by origin fallback:', err)
            }
          }
        }

        // 3. If item exists in Library, open ItemModal in edit mode
        if (targetItem) {
          openItemModal('edit', targetItem)
          return
        }

        // 4. If item doesn't exist yet, construct a new Sentence item and open in add mode
        const newSentenceItem: IItem = {
          ...initItem,
          origin: example.origin.trim(),
          catId: ECategory.SENTENCE,
          level: 1,
          meanings: [
            {
              ...meaningItem,
              typeId: EType.ALL,
              translation: example.translation || '',
              definition: example.translation || '',
            },
          ],
        }
        openItemModal('add', newSentenceItem)
      } catch (err: any) {
        console.error('Error opening item modal for edit:', err)
        message.error(err?.message || 'Không thể mở modal chỉnh sửa item')
      } finally {
        setIsLoadingEditItem(false)
      }
    },
    [currentExample, openItemModal],
  )

  // Synchronize item updates into active history
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event?.type === 'updated' &&
        event.query.queryKey[0] === 'items' &&
        event.query.queryKey[1] === 'detail'
      ) {
        const updatedItem = event.query.state.data as IItem | undefined
        if (!updatedItem?.id) return

        const updater = (prev: IExample[]) =>
          prev.map((it) => {
            if (it.itemId === updatedItem.id || it.id === updatedItem.id) {
              return {
                ...it,
                origin: updatedItem.origin || it.origin,
                translation: updatedItem.meanings?.[0]?.translation || it.translation,
                itemOrigin: updatedItem.origin,
              }
            }
            return it
          })

        setHistory(updater)
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  // Mount effect to restore or load batch for the active mode
  useEffect(() => {
    if (!initialExample) {
      loadBatch(false, currentMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExample, user?.uid])

  // Sync state with sessionRecords when switching questions
  useEffect(() => {
    const record = sessionRecords[safeCurrentIndex]
    setUserAnswer(record?.userAnswer || '')
    setIsChecked(Boolean(record?.isChecked))
    setDictationResult(record?.dictationResult || null)
    setAiReviewResult(record?.aiReviewResult || null)
    setShowHint(false)
    setShowMeaningHint(false)
    setIsAiReviewing(false)
    setIsPlaying(false)
  }, [safeCurrentIndex, currentExample?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // User Answer change
  const handleAnswerChange = (val: string) => {
    setUserAnswer(val)
    if (isChecked) {
      setIsChecked(false)
      setDictationResult(null)
      setAiReviewResult(null)
      setSessionRecords((prev) => ({
        ...prev,
        [safeCurrentIndex]: {
          ...prev[safeCurrentIndex],
          userAnswer: val,
          isChecked: false,
          dictationResult: null,
          aiReviewResult: null,
        },
      }))
    } else {
      setSessionRecords((prev) => ({
        ...prev,
        [safeCurrentIndex]: {
          ...prev[safeCurrentIndex],
          userAnswer: val,
        },
      }))
    }
  }

  // Clear answer
  const handleClearAnswer = () => {
    setUserAnswer('')
    setIsChecked(false)
    setDictationResult(null)
    setAiReviewResult(null)
    setIsAiReviewing(false)
    setSessionRecords((prev) => ({
      ...prev,
      [safeCurrentIndex]: {
        userAnswer: '',
        isChecked: false,
        dictationResult: null,
        aiReviewResult: null,
      },
    }))
    textAreaRef.current?.focus()
  }

  // Retry current 10-question set
  const handleRetryCurrentSet = () => {
    setSessionRecords({})
    setIsCompleted(false)
    setCurrentIndex(0)
    saveSession({ currentIndex: 0, isCompleted: false, sessionRecords: {} })
    resetExerciseState()
    setTimeout(() => textAreaRef.current?.focus(), 50)
  }

  // Evaluate answer using LCS Diff
  const handleCheck = useCallback(() => {
    const cleanUser = userAnswer.trim()
    const evalResult = evaluateDictation(targetText, cleanUser)
    setDictationResult(evalResult)
    setIsChecked(true)

    const updatedRecords: Record<number, IDicTranQuestionRecord> = {
      ...sessionRecords,
      [safeCurrentIndex]: {
        userAnswer,
        isChecked: true,
        dictationResult: evalResult,
        aiReviewResult,
      },
    }
    setSessionRecords(updatedRecords)
    saveSession({ sessionRecords: updatedRecords })

    if (cleanUser) {
      if (currentMode === 'dictation') {
        listeningStatsService.recordPractice({
          uid: user?.uid,
          sentenceId: String(currentExample?.id || ''),
          sentenceOrigin: targetText,
          userText: cleanUser,
          accuracy: evalResult.accuracy,
          isPerfect: evalResult.isPerfect,
          sourceType: currentExample?.itemOrigin ? 'example' : 'sentence',
          voice: geminiVoice,
        })
      } else {
        translationStatsService.recordPractice({
          uid: user?.uid,
          sentenceId: String(currentExample?.id || ''),
          exampleId: String(currentExample?.id || ''),
          sourceText,
          targetText,
          userText: cleanUser,
          accuracy: evalResult.accuracy,
          isPerfect: evalResult.isPerfect,
          direction: 'vi-en',
        })
      }
    }

    if (evalResult.isPerfect && currentExample && onSuccess) {
      onSuccess(currentExample)
    }
  }, [
    userAnswer,
    targetText,
    safeCurrentIndex,
    sessionRecords,
    aiReviewResult,
    saveSession,
    currentExample,
    onSuccess,
    user?.uid,
    sourceText,
    currentMode,
    geminiVoice,
  ])

  // Navigate to previous question
  const handlePrev = useCallback(() => {
    if (safeCurrentIndex > 0) {
      const nextIndex = safeCurrentIndex - 1
      setCurrentIndex(nextIndex)
      saveSession({ currentIndex: nextIndex })
      resetExerciseState()
      setTimeout(() => textAreaRef.current?.focus(), 50)
    }
  }, [safeCurrentIndex, saveSession, resetExerciseState])

  // Navigate to next question or complete session
  const handleNext = useCallback(() => {
    if (!isChecked) {
      return
    }

    if (isLastQuestion) {
      setIsCompleted(true)
      saveSession({ isCompleted: true })
      return
    }

    const nextIndex = safeCurrentIndex + 1
    setCurrentIndex(nextIndex)
    saveSession({ currentIndex: nextIndex })
    resetExerciseState()

    if (autoPlayOnNext && currentMode === 'dictation') {
      const nextItem = history[nextIndex]
      if (nextItem?.origin) {
        setTimeout(() => {
          handlePlayAudio(stripHtml(nextItem.origin))
        }, 200)
      }
    }

    setTimeout(() => textAreaRef.current?.focus(), 50)
  }, [
    isChecked,
    handleCheck,
    isLastQuestion,
    safeCurrentIndex,
    saveSession,
    resetExerciseState,
    autoPlayOnNext,
    currentMode,
    history,
    handlePlayAudio,
  ])

  // Unified Ctrl+Enter: Check on 1st press, Next on 2nd press
  const handleCheckOrNext = useCallback(() => {
    if (!isChecked) {
      handleCheck()
    } else {
      handleNext()
    }
  }, [isChecked, handleCheck, handleNext])

  // AI Review via Gemini Mentor
  const handleAiReview = async () => {
    const cleanUser = userAnswer.trim()
    if (!cleanUser) {
      message.warning('Vui lòng nhập câu trả lời của bạn trước khi nhờ AI phân tích.')
      textAreaRef.current?.focus()
      return
    }

    try {
      setIsAiReviewing(true)
      let evalResult = dictationResult
      if (!isChecked) {
        evalResult = evaluateDictation(targetText, cleanUser)
        setDictationResult(evalResult)
        setIsChecked(true)

        if (currentMode === 'dictation') {
          listeningStatsService.recordPractice({
            uid: user?.uid,
            sentenceId: String(currentExample?.id || ''),
            sentenceOrigin: targetText,
            userText: cleanUser,
            accuracy: evalResult.accuracy,
            isPerfect: evalResult.isPerfect,
            sourceType: currentExample?.itemOrigin ? 'example' : 'sentence',
            voice: geminiVoice,
          })
        } else {
          translationStatsService.recordPractice({
            uid: user?.uid,
            sentenceId: String(currentExample?.id || ''),
            exampleId: String(currentExample?.id || ''),
            sourceText,
            targetText,
            userText: cleanUser,
            accuracy: evalResult.accuracy,
            isPerfect: evalResult.isPerfect,
            direction: 'vi-en',
          })
        }
      }

      const response = await geminiTranslationReviewService.reviewTranslation({
        sourceText: currentMode === 'translator' ? sourceText : targetText,
        referenceText: targetText,
        userTranslation: cleanUser,
        direction: 'vi-en',
      })

      if (response.isSuccess && response.content) {
        setAiReviewResult(response.content)
        const updatedRecords: Record<number, IDicTranQuestionRecord> = {
          ...sessionRecords,
          [safeCurrentIndex]: {
            userAnswer: cleanUser,
            isChecked: true,
            dictationResult: evalResult,
            aiReviewResult: response.content,
          },
        }
        setSessionRecords(updatedRecords)
        saveSession({ sessionRecords: updatedRecords })
      } else {
        message.error(response.message || 'Không thể lấy nhận xét từ AI.')
      }
    } catch (err: any) {
      message.error(err?.message || 'Lỗi khi gọi AI Mentor.')
    } finally {
      setIsAiReviewing(false)
    }
  }

  // Keyboard shortcut on container
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && e.target === containerRef.current) {
      e.preventDefault()
      handlePlayAudio()
    }
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        handleCheckOrNext()
      } else if (currentMode === 'dictation' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlePlayAudio()
      }
    }
  }

  // Toggle mode
  // const handleToggleMode = (newMode?: TDicTranMode) => {
  //   const nextMode: TDicTranMode =
  //     typeof newMode === 'string'
  //       ? newMode
  //       : currentMode === 'dictation'
  //         ? 'translator'
  //         : 'dictation'
  //   setCurrentMode(nextMode)
  //   resetExerciseState()
  //   if (!initialExample) {
  //     loadBatch(false, nextMode)
  //   }
  // }

  // Toggle Hint (single step: show/hide)
  const handleToggleHint = () => {
    setShowHint((prev) => !prev)
  }

  // Click on a hint word to append into input
  const handleInsertWord = (word: string) => {
    const cleanPrev = userAnswer.trim()
    const newVal = cleanPrev ? `${cleanPrev} ${word}` : word
    handleAnswerChange(newVal)
    textAreaRef.current?.focus()
  }

  // Copy reference text
  const handleCopyReference = () => {
    if (targetText) {
      navigator.clipboard.writeText(targetText)
      message.success('Đã sao chép câu mẫu!')
    }
  }

  // Settings Popover Panel
  const settingsContent = (
    <div className={styles.settingsPanel}>
      {/* Mode selection */}
      {/* <div className={styles.settingRow}>
        <span>Chế độ:</span>
        <Segmented
          size='small'
          value={currentMode}
          onChange={(val) => {
            handleToggleMode(val as TDicTranMode)
          }}
          options={[
            { label: 'Dictation', value: 'dictation' },
            { label: 'Translator', value: 'translator' },
          ]}
        />
      </div> */}

      {/* Auto Replay count */}
      <div className={styles.settingRow}>
        <span>Lặp lại câu:</span>
        <Segmented
          size='small'
          value={repeatCount}
          onChange={(val) => {
            const r = Number(val)
            setRepeatCount(r)
            localStorage.setItem('dictran_repeat_count', String(r))
          }}
          options={[
            { label: '1 lần', value: 1 },
            { label: '2 lần', value: 2 },
            { label: '3 lần', value: 3 },
          ]}
        />
      </div>

      {/* Auto Play on Next */}
      <div className={styles.settingRow}>
        <span>Tự động phát khi Next:</span>
        <Switch
          size='small'
          checked={autoPlayOnNext}
          onChange={(checked) => {
            setAutoPlayOnNext(checked)
            localStorage.setItem('dictran_autoplay_next', String(checked))
          }}
        />
      </div>

      {/* Voice Selection */}
      <div className={styles.settingRow}>
        <span>Giọng đọc Gemini:</span>
        <Select
          size='small'
          value={geminiVoice}
          onChange={(val) => {
            setGeminiVoice(val)
            localStorage.setItem('gemini_tts_voice', val)
          }}
          style={{ width: 130 }}
          options={GEMINI_VOICES.map((v) => ({
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
    </div>
  )

  if (loading && !currentExample) {
    return (
      <div style={{ padding: '36px 0', textAlign: 'center' }}>
        <Spin size='large' tip='Đang tải câu thực hành...' />
      </div>
    )
  }

  if (!loading && history.length === 0) {
    return (
      <div style={{ padding: '36px 0', textAlign: 'center' }}>
        <p style={{ color: token.colorTextSecondary }}>Chưa có câu ví dụ để luyện tập.</p>
        <Button type='primary' icon={<SyncOutlined />} onClick={() => loadBatch(true)}>
          Tải câu mới
        </Button>
      </div>
    )
  }

  // 0. Completion & Review Screen
  if (isCompleted && history.length > 0) {
    const totalCount = history.length
    let totalAccuracy = 0
    let perfectCount = 0
    let checkedCount = 0
    let needsImprovementCount = 0

    history.forEach((_, idx) => {
      const rec = sessionRecords[idx]
      if (rec?.isChecked && rec.dictationResult) {
        checkedCount++
        totalAccuracy += rec.dictationResult.accuracy
        if (rec.dictationResult.isPerfect || rec.dictationResult.accuracy === 100) {
          perfectCount++
        } else if (rec.dictationResult.accuracy < 60) {
          needsImprovementCount++
        }
      }
    })

    const avgAccuracy = checkedCount > 0 ? Math.round(totalAccuracy / checkedCount) : 0

    return (
      <div
        ref={containerRef}
        tabIndex={0}
        className={styles.completedContainer}
        style={{ outline: 'none' }}
      >
        <Result
          status='success'
          title={
            currentMode === 'dictation'
              ? 'Hoàn thành bài luyện Dictation!'
              : 'Hoàn thành bài luyện dịch!'
          }
          subTitle={`Bạn đã hoàn thành bộ ${totalCount} câu hỏi. Xem lại chi tiết lịch sử bên dưới:`}
          extra={[
            <Button
              type='primary'
              key='new-batch'
              icon={<SyncOutlined spin={loading} />}
              onClick={() => loadBatch(true)}
              loading={loading}
            >
              Bộ 10 câu mới
            </Button>,
            <Button key='retry' icon={<ReloadOutlined />} onClick={handleRetryCurrentSet}>
              Làm lại bộ này
            </Button>,
            <Button
              key='review-step'
              icon={<EyeOutlined />}
              onClick={() => {
                setIsCompleted(false)
                setCurrentIndex(0)
                saveSession({ currentIndex: 0, isCompleted: false })
                setTimeout(() => textAreaRef.current?.focus(), 50)
              }}
            >
              Xem lại từng câu
            </Button>,
            ...(onCancel
              ? [
                  <Button key='close' icon={<CloseOutlined />} onClick={onCancel}>
                    Đóng
                  </Button>,
                ]
              : []),
          ]}
        />

        {/* Stats Grid */}
        <div className={styles.completedStatsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statNumber} style={{ color: token.colorPrimary }}>
              {avgAccuracy}%
            </div>
            <div className={styles.statLabel}>Độ chính xác TB</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statNumber} style={{ color: '#52c41a' }}>
              {perfectCount}/{totalCount}
            </div>
            <div className={styles.statLabel}>Tuyệt đối 100%</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statNumber} style={{ color: token.colorText }}>
              {checkedCount}/{totalCount}
            </div>
            <div className={styles.statLabel}>Đã kiểm tra</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statNumber} style={{ color: '#fa8c16' }}>
              {needsImprovementCount}
            </div>
            <div className={styles.statLabel}>Cần cải thiện</div>
          </div>
        </div>

        {/* Detailed Review List */}
        <div className={styles.reviewList}>
          {history.map((example, idx) => {
            const rec = sessionRecords[idx]
            const rawSrc = example.translation
            const rawTgt = example.origin
            const srcText = stripHtml(rawSrc)
            const tgtText = stripHtml(rawTgt)
            const userAns = rec?.userAnswer?.trim() || ''
            const isCheckedRec = Boolean(rec?.isChecked)
            const dictRes = rec?.dictationResult
            const accuracy = dictRes?.accuracy ?? 0
            const isPerfect = Boolean(dictRes?.isPerfect || accuracy === 100)
            const inChecklist = isSentenceInChecklist(example)

            return (
              <div
                key={example.id || idx}
                className={styles.reviewCard}
                style={{
                  backgroundColor: token.colorBgContainer,
                  borderColor: token.colorBorderSecondary,
                }}
              >
                {/* Header */}
                <div className={styles.reviewCardHeader}>
                  <Space size='small' align='center'>
                    <span style={{ fontWeight: 700, fontSize: 13, color: token.colorPrimary }}>
                      Câu {idx + 1}
                    </span>
                    <Tag
                      color={example.itemOrigin ? 'purple' : 'blue'}
                      style={{ fontSize: 11, margin: 0 }}
                    >
                      {example.itemOrigin ? example.itemOrigin : 'Sentence'}
                    </Tag>
                    {isCheckedRec ? (
                      <Tag
                        color={isPerfect ? 'success' : accuracy >= 70 ? 'warning' : 'error'}
                        icon={isPerfect ? <CheckCircleOutlined /> : undefined}
                      >
                        {isPerfect ? 'Chính xác 100%' : `Độ khớp: ${accuracy}%`}
                      </Tag>
                    ) : userAns ? (
                      <Tag color='default'>Chưa kiểm tra</Tag>
                    ) : (
                      <Tag color='default'>Chưa làm</Tag>
                    )}
                  </Space>

                  <Space size='small'>
                    <Tooltip title={inChecklist ? 'Xóa khỏi Checklist' : 'Thêm vào Checklist'}>
                      <Button
                        type='text'
                        size='small'
                        icon={
                          <CheckSquareOutlined
                            style={{
                              color: inChecklist ? token.colorSuccess : undefined,
                            }}
                          />
                        }
                        onClick={() => handleToggleChecklist(example)}
                      />
                    </Tooltip>
                    <Tooltip title='Chỉnh sửa câu'>
                      <Button
                        type='text'
                        size='small'
                        icon={<EditOutlined />}
                        onClick={() => handleEditItem(example)}
                      />
                    </Tooltip>
                    <Tooltip title='Nghe phát âm chuẩn'>
                      <Button
                        type='text'
                        size='small'
                        icon={<SoundOutlined />}
                        onClick={() => handlePlayAudio(tgtText)}
                      />
                    </Tooltip>
                    <Tooltip title='Sao chép câu chuẩn'>
                      <Button
                        type='text'
                        size='small'
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(tgtText)
                          message.success('Đã sao chép câu chuẩn!')
                        }}
                      />
                    </Tooltip>
                    <Tooltip title='Luyện lại câu này'>
                      <Button
                        type='link'
                        size='small'
                        onClick={() => {
                          setIsCompleted(false)
                          setCurrentIndex(idx)
                          saveSession({ currentIndex: idx, isCompleted: false })
                          setTimeout(() => textAreaRef.current?.focus(), 50)
                        }}
                      >
                        Luyện lại
                      </Button>
                    </Tooltip>
                  </Space>
                </div>

                {/* Source & Target */}
                {currentMode === 'translator' && (
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Câu tiếng Việt:</span>
                    <span className={styles.reviewText}>{srcText}</span>
                  </div>
                )}

                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel} style={{ color: token.colorPrimary }}>
                    Câu tiếng Anh chuẩn:
                  </span>
                  <span className={styles.reviewText} style={{ fontWeight: 600 }}>
                    {tgtText}
                  </span>
                </div>

                {/* User Translation & Diff */}
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Câu bạn gõ:</span>
                  {userAns ? (
                    <div>
                      <div className={styles.reviewUserAnswer}>{userAns}</div>
                      {dictRes && dictRes.words.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <SentenceDiffView
                            result={dictRes}
                            sentenceContext={tgtText}
                            compact
                            showTitle={false}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontStyle: 'italic', opacity: 0.6 }}>(Chưa nhập nội dung)</span>
                  )}
                </div>

                {/* Note if any */}
                {example.note?.trim() && (
                  <div style={{ fontSize: 12, opacity: 0.75, fontStyle: 'italic' }}>
                    💡 Ghi chú: {example.note.trim()}
                  </div>
                )}

                {/* AI Review if any */}
                {rec?.aiReviewResult && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 8,
                      borderRadius: 6,
                      background: 'rgba(114, 46, 209, 0.08)',
                      border: '1px dashed rgba(114, 46, 209, 0.3)',
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#722ed1',
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <RobotOutlined /> AI Review:
                    </div>
                    <div>{rec.aiReviewResult.feedback}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const progressPercent =
    history.length > 0 ? Math.round(((safeCurrentIndex + 1) / history.length) * 100) : 0

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      className={`${styles.container} ${className || ''}`}
      style={{ outline: 'none', ...style }}
    >
      {/* 1. Header Bar: Counter badge, Origin Tag, Mode Tag, Replay Tag, Action buttons (Identical to Dictation) */}
      <div className={styles.header}>
        <Flex align='center' gap={token.size / 4} wrap='wrap'>
          <Tag className={styles.counterBadge} style={{ color: token.colorTextSecondary }}>
            {safeCurrentIndex + 1} / {history.length}
          </Tag>

          {isChecked && (
            <Tag
              color={currentExample?.itemOrigin ? 'purple' : 'blue'}
              className={styles.counterBadge}
            >
              {currentExample?.itemOrigin ? currentExample.itemOrigin : 'Sentence'}
            </Tag>
          )}

          {/* <Tag
            color={currentMode === 'dictation' ? 'cyan' : 'green'}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => handleToggleMode()}
          >
            {currentMode === 'dictation' ? '🎧 Dictation' : '🌐 Translator'}
          </Tag> */}

          {repeatCount > 1 && currentMode === 'dictation' && (
            <Tag color='cyan' className='text-xs'>
              {repeatCount}x Replay
            </Tag>
          )}
        </Flex>

        <div className={styles.headerRight}>
          {/* Edit button */}
          <Tooltip title='Chỉnh sửa câu'>
            <Button
              type='text'
              size='small'
              loading={isLoadingEditItem}
              icon={<EditOutlined style={{ fontSize: 16 }} />}
              onClick={(e) => {
                e.stopPropagation()
                handleEditItem()
              }}
            />
          </Tooltip>

          {/* Checklist button */}
          <Tooltip title={isCurrentInChecklist ? 'Xóa khỏi Checklist' : 'Thêm vào Checklist'}>
            <Button
              type='text'
              size='small'
              loading={isTogglingChecklist}
              icon={
                <CheckSquareOutlined
                  style={{
                    color: isCurrentInChecklist ? token.colorSuccess : undefined,
                    fontSize: 16,
                  }}
                />
              }
              onClick={(e) => {
                e.stopPropagation()
                handleToggleChecklist()
              }}
            />
          </Tooltip>

          {/* Refresh Random Batch */}
          <Tooltip title='Tải bộ 10 câu mới'>
            <Button
              type='text'
              size='small'
              icon={<SyncOutlined spin={loading} />}
              onClick={() => loadBatch(true)}
              loading={loading}
            />
          </Tooltip>

          {/* Settings Popover */}
          {mode === 'dictation' && (
            <Popover
              content={settingsContent}
              title='Cài đặt nâng cao'
              trigger='click'
              placement='bottomRight'
            >
              <Tooltip title='Cài đặt giọng đọc & tùy chọn'>
                <Button type='text' size='small' icon={<SettingOutlined />} />
              </Tooltip>
            </Popover>
          )}

          {onCancel && (
            <Tooltip title='Đóng'>
              <Button size='small' type='text' icon={<CloseOutlined />} onClick={onCancel} />
            </Tooltip>
          )}
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

      {/* 2. Prompt Card: The exercise challenge */}
      <div className={styles.promptCard}>
        {currentMode === 'translator' ? (
          <>
            <div className={styles.promptLabel}>
              <InfoCircleOutlined style={{ color: token.colorPrimary }} />
              <span>Câu tiếng Việt cần dịch:</span>
            </div>
            <p className={styles.promptText}>{sourceText}</p>
          </>
        ) : (
          <>
            <div className={styles.promptLabel}>
              <SoundOutlined style={{ color: token.colorPrimary }} />
              <span>Nghe và chép lại câu tiếng Anh:</span>
            </div>
            <div className={styles.audioPlayerBox}>
              <Button
                type='primary'
                size='large'
                shape='round'
                icon={<SoundOutlined spin={isPlaying} />}
                onClick={() => handlePlayAudio(targetText)}
                style={{ minWidth: 160 }}
              >
                {isPlaying ? 'Dừng phát âm' : 'Phát âm câu'}
              </Button>

              {sourceText && (
                <div>
                  <Button
                    type='link'
                    size='small'
                    icon={showMeaningHint ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowMeaningHint((prev) => !prev)}
                  >
                    {showMeaningHint ? 'Ẩn nghĩa gợi ý' : 'Gợi ý nghĩa tiếng Việt'}
                  </Button>
                  {showMeaningHint && (
                    <div
                      className={styles.promptNote}
                      style={{ justifyContent: 'center', marginTop: 4 }}
                    >
                      <BulbOutlined style={{ color: '#faad14' }} />
                      <span>{sourceText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {noteText && (
          <div className={styles.promptNote}>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>Ghi chú: {noteText}</span>
          </div>
        )}
      </div>

      {/* 3. Hint Area (Word tags) */}
      {showHint && scrambledWords.length > 0 && (
        <div className={styles.hintArea}>
          <Flex gap={6} wrap='wrap' align='center'>
            <Text type='secondary' style={{ fontSize: 12, marginRight: 4 }}>
              Từ gợi ý (click để thêm):
            </Text>
            {scrambledWords.map((word, idx) => (
              <span key={idx} className={styles.hintWordTag} onClick={() => handleInsertWord(word)}>
                {word}
              </span>
            ))}
          </Flex>
        </div>
      )}

      {/* 4. User Input */}
      <div className={styles.inputWrapper}>
        <Input.TextArea
          ref={textAreaRef}
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          autoSize={{ minRows: 2, maxRows: 5 }}
          className={styles.textAreaInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                e.stopPropagation()
                handleCheckOrNext()
              } else if (currentMode === 'dictation' && !e.shiftKey && !e.altKey) {
                e.preventDefault()
                e.stopPropagation()
                handlePlayAudio()
              }
            }
          }}
        />
        <div className={styles.shortcutTip}>
          {currentMode === 'dictation' ? (
            <>
              
            </>
          ) : (
            <>
              Tip: Press <b>Ctrl + Enter</b> to{' '}
              {isChecked ? (isLastQuestion ? 'Complete' : 'Next') : 'Check'}
            </>
          )}
        </div>
      </div>

      {/* 5. Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionGroup}>
          <Button
            type={!isChecked ? 'primary' : 'default'}
            icon={<CheckOutlined />}
            onClick={handleCheck}
          >
            Check
          </Button>

          <Button
            icon={<BulbOutlined />}
            onClick={handleToggleHint}
            type={showHint ? 'primary' : 'default'}
            ghost={showHint}
          >
            Hint
          </Button>

          {userAnswer && <Button icon={<ClearOutlined />} onClick={handleClearAnswer} />}
        </div>

        <div className={styles.actionGroup}>
          <Button icon={<LeftOutlined />} onClick={handlePrev} disabled={safeCurrentIndex === 0} />

          {mode === 'dictation' && (
            <Button
              icon={<SoundOutlined spin={isPlaying} />}
              onClick={() => handlePlayAudio(targetText)}
            >
              Listen
            </Button>
          )}

          <Button
            type={isChecked ? 'primary' : 'default'}
            icon={isLastQuestion ? <CheckCircleOutlined /> : <RightOutlined />}
            onClick={handleNext}
            loading={loading}
            disabled={!isChecked}
          >
            {isLastQuestion ? 'Hoàn thành' : 'Next'}
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

          {/* Reusable LCS Diff Comparison with Interactive Word Lookups */}
          {dictationResult && (
            <SentenceDiffView result={dictationResult} sentenceContext={targetText} />
          )}

          {/* Reference Sentence & TTS */}
          <div>
            <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Câu chuẩn tham khảo (bấm vào từ để xem từ điển):
            </Text>
            <div className={styles.referenceBox}>
              <div className={styles.referenceContent}>
                {targetText.split(/\s+/).map((word, wIdx) => (
                  <WordLookupPopover key={wIdx} word={word} sentenceContext={targetText}>
                    <span style={{ cursor: 'pointer', display: 'inline-block', margin: '0 1px' }}>
                      {word}{' '}
                    </span>
                  </WordLookupPopover>
                ))}
              </div>
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
                  <span>AI Mentor nhận xét:</span>
                </Space>
                <Tag color={aiReviewResult.score >= 80 ? 'success' : 'warning'}>
                  Điểm AI: {aiReviewResult.score}/100
                </Tag>
              </div>

              <div className={styles.aiFeedbackText}>{aiReviewResult.feedback}</div>

              {aiReviewResult.grammarFeedback && (
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  <Text strong style={{ display: 'block', marginBottom: 2, color: '#fa8c16' }}>
                    Điểm ngữ pháp cần lưu ý:
                  </Text>
                  <div>{aiReviewResult.grammarFeedback}</div>
                </div>
              )}

              {aiReviewResult.betterAlternatives &&
                aiReviewResult.betterAlternatives.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                      Cách diễn đạt tự nhiên hơn:
                    </Text>
                    <div className={styles.aiAlternativesList}>
                      {aiReviewResult.betterAlternatives.map((alt, aIdx) => (
                        <div key={aIdx} className={styles.aiAlternativeItem}>
                          💡 {alt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Trigger AI Review Button */}
          {!aiReviewResult && !isAiReviewing && (
            <div style={{ textAlign: 'right' }}>
              <Button
                size='small'
                icon={<RobotOutlined />}
                onClick={handleAiReview}
                style={{ color: '#722ed1', borderColor: 'rgba(114, 46, 209, 0.4)' }}
              >
                Nhờ AI Mentor phân tích chi tiết
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
