import {
  ReloadOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ThunderboltOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { appSetting } from '@/config/appConfig'
import { useDispatch, useSelector, itemKeys, useChecklist } from '@/core/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { getType, getCategory, hasValidMeaning } from '@/helpers/item'
import { IItemQuiz, ECategory, EQuiz, IOption, IAnswer, IItem } from '@/models/item.model'
import { GetStudySetByCatId } from '@/models/studySet.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { IStudySetStatus, studySetAction } from '@/store/reducers/studySet.reducer'
import {
  theme,
  InputRef,
  Button,
  Input,
  Flex,
  Segmented,
  Badge,
  Tag,
  Space,
  Modal,
  Table,
  Card,
} from 'antd'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Item } from '../item/Item'
import { EItemLevel } from '../modals/itemModal/data'
import styles from './studySet.module.scss'
import appStyle from '@/style/appStyle.module.scss'
import clsx from 'clsx'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'
import { categories as defaultCategories } from '@/constant/item'
import { useLiveQuery } from 'dexie-react-hooks'
import { localDb } from '@/services/localDb'
import {
  calculateSRSUpdate,
  isItemDue,
  getDueDurationText,
  getDueStats,
  ISRSUpdateResult,
} from '@/services/srs/srs.service'

export const StudySet: React.FC = () => {
  const { token } = theme.useToken()

  const [loading, setLoading] = useState(false)
  const inputEl = useRef<InputRef | null>(null)

  const { notification } = usePrompt()
  const { openItemModal } = useItemModal()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  const { list, status, respond, isSubmit } = useSelector((state) => state.studySet)
  const { user } = useSelector((state) => state.auth)
  const configuration = user?.configuration
  const { categories } = useSelector((state) => state.setting)

  const { inProgress, isDone, currentIndex } = status

  // Study Mode: 'due' = Spaced Repetition (Due for Review) | 'checklist' = From Checklist | 'custom' = Classic Random Set
  const [studyMode, setStudyMode] = useState<'due' | 'custom' | 'checklist'>('due')

  // Real-time Checklist items for Checklist Mode (only defined items)
  const { checklist } = useChecklist()
  const checklistValid = useMemo(() => (checklist || []).filter(hasValidMeaning), [checklist])
  const checklistToLearn = useMemo(
    () => checklistValid.filter((i) => !i.isCompleted),
    [checklistValid],
  )
  const checklistToLearnCount = checklistToLearn.length
  const checklistTotal = checklistValid.length
  const checklistCompleted = checklistTotal - checklistToLearnCount
  const checklistPercent =
    checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0

  // Last SRS result for real-time visual feedback upon submitting
  const [lastSrsFeedback, setLastSrsFeedback] = useState<{
    prevLevel: number
    nextLevel: number
    intervalDays: number
    isCorrect: boolean
  } | null>(null)

  // Due items list modal
  const [isDueModalOpen, setIsDueModalOpen] = useState(false)
  const [dueSearchText, setDueSearchText] = useState('')

  // Real-time live query of due items from Dexie IndexedDB
  const dueItems = useLiveQuery(
    async () => {
      if (!user?.uid) return []
      const all = await localDb.items.toArray()
      const userItems = all.filter((i) => i.uid === user.uid && !i.archive && hasValidMeaning(i))
      return userItems.filter((i) => isItemDue(i))
    },
    [user?.uid],
    [],
  )

  const dueCount = dueItems ? dueItems.length : 0
  const dueStats = useMemo(() => getDueStats(dueItems || []), [dueItems])

  // Derive current item synchronously from Redux to prevent 1-render lag and stale state
  const currentItem = list[currentIndex] as IItemQuiz | undefined

  const getStudySetSizeByCategory = useCallback(
    (category: ECategory) => {
      switch (category) {
        case ECategory.WORD:
          return (
            user?.configuration?.numberOfWordsInStudySet || configuration?.numberOfWordsInStudySet
          )

        case ECategory.PHRASE:
          return (
            user?.configuration?.numberOfPhraseInStudySet || configuration?.numberOfPhraseInStudySet
          )

        case ECategory.IDIOM:
          return (
            user?.configuration?.numberOfIdiomInStudySet || configuration?.numberOfIdiomInStudySet
          )

        case ECategory.SLANG:
          return (
            user?.configuration?.numberOfSlangInStudySet || configuration?.numberOfSlangInStudySet
          )

        case ECategory.COLLOCATION:
          return (
            user?.configuration?.numberOfCollocationsInStudySet ||
            configuration?.numberOfCollocationsInStudySet
          )

        case ECategory.SENTENCE:
          return (
            user?.configuration?.numberOfSentencesInStudySet ||
            configuration?.numberOfSentencesInStudySet
          )

        default:
          return appSetting.meta.numberOfWordsInStudySet
      }
    },
    [configuration, user?.configuration],
  )

  // Use resolved categories with fallback to defaultCategories if setting hasn't loaded
  const resolvedCategories = categories && categories.length > 0 ? categories : defaultCategories

  // Prepare study set params for custom mode
  const studySetParams = resolvedCategories
    .filter((cat) => cat.id !== 0)
    .map((cat) => ({
      id: cat.id,
      size: getStudySetSizeByCategory(cat.value),
    })) as GetStudySetByCatId[]

  const totalCustomSize = useMemo(
    () => studySetParams.reduce((acc, curr) => acc + (curr.size || 0), 0),
    [studySetParams],
  )

  const reset = useCallback(() => {
    dispatch(studySetAction.isSubmitAnswer(false))
    dispatch(studySetAction.updateUserRespond(null))
    setLastSrsFeedback(null)
  }, [dispatch])

  const createStudySet = async (
    params: Partial<IStudySetStatus>,
    overrideMode?: 'due' | 'custom' | 'checklist',
    customItems?: IItem[],
  ) => {
    const activeMode = overrideMode ?? studyMode

    try {
      setLoading(true)
      reset()

      let response
      if (activeMode === 'due') {
        // Fetch up to 15 due items prioritized by SRS
        response = await itemApi.getDueStudySet(15)
        if (!response.isSuccess) {
          notification({
            type: 'info',
            message: response.message || 'Không có từ nào cần ôn hôm nay.',
          })
          setLoading(false)
          return
        }
      } else if (activeMode === 'checklist') {
        response = await itemApi.getChecklistStudySet(customItems)
        if (!response.isSuccess) {
          notification({
            type: 'warning',
            message: response.message || 'Checklist của bạn đang trống.',
          })
          setLoading(false)
          return
        }
      } else {
        // Custom mode
        response = await itemApi.getStudySet(studySetParams)
        if (!response.isSuccess) {
          notification({
            type: 'error',
            message: response.message || 'Failed to create study set',
          })
          setLoading(false)
          return
        }
      }

      if (response.content && response.content.length > 0) {
        const formattedItems = response.content.map((item) => ({
          ...item,
          quiz: {
            ...item.quiz,
            answer:
              typeof item.quiz.answer === 'string'
                ? item.quiz.answer
                : (item.quiz.answer as IOption<string, boolean>[]).map((ans) => ({
                    ...ans,
                    value: false,
                  })),
            result: false,
          },
        })) as unknown as IItemQuiz[]

        dispatch(studySetAction.setList(formattedItems))
        dispatch(studySetAction.updateProgress({ ...params, mode: activeMode }))
      } else {
        notification({ type: 'warning', message: 'No items found for study set' })
      }
    } catch (error) {
      console.error('Error creating study set:', error)
      notification({
        type: 'error',
        message:
          'Failed to create study set: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      })
    } finally {
      setLoading(false)
    }
  }

  const onNext = useCallback(() => {
    const studySet = document.getElementById('studySet')
    reset()
    if (studySet) {
      studySet.focus()
      const rect = studySet.getBoundingClientRect()
      window.scrollTo({ top: rect.top + window.scrollY - 140, behavior: 'smooth' })
    }
    if (currentIndex + 1 >= list.length) {
      dispatch(
        studySetAction.updateProgress({
          currentIndex: 0,
          isDone: true,
          inProgress: false,
        }),
      )
    } else {
      dispatch(
        studySetAction.updateProgress({
          currentIndex: currentIndex + 1,
          inProgress: true,
        }),
      )
    }
  }, [currentIndex, list.length, dispatch, reset])

  const updateItemStatus = async (targetItem: IItemQuiz, isCorrect: boolean, quizType?: EQuiz) => {
    const currentLevel = typeof targetItem.level === 'number' ? targetItem.level : EItemLevel.ZERO

    // Calculate SRS parameters: level, interval days, next review date
    const srs: ISRSUpdateResult = calculateSRSUpdate(currentLevel, isCorrect, quizType)

    const nextCount =
      typeof targetItem.count === 'number' && targetItem.count >= 0 ? targetItem.count + 1 : 1

    // Real-time visual feedback for the user
    setLastSrsFeedback({
      prevLevel: currentLevel,
      nextLevel: srs.nextLevel,
      intervalDays: srs.intervalDays,
      isCorrect,
    })

    // Update quiz result and learning stats in Redux
    dispatch(
      studySetAction.update({
        id: targetItem.id,
        level: srs.nextLevel,
        count: nextCount,
        quiz: { ...targetItem.quiz, result: isCorrect },
      }),
    )

    // Persist learning stats & SRS fields to localDb and Firestore
    if (targetItem.id) {
      try {
        const res = await itemApi.updateItem(targetItem.id, {
          level: srs.nextLevel,
          count: nextCount,
          next_review_date: srs.nextReviewDate,
          last_reviewed: srs.lastReviewed,
          interval_days: srs.intervalDays,
        })
        if (res.isSuccess && res.content) {
          queryClient.setQueryData(itemKeys.detail(targetItem.id), res.content)
          await queryClient.invalidateQueries({ queryKey: itemKeys.detail(targetItem.id) })
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          dispatch(iotdAction.update(res.content))
        }
      } catch (err) {
        console.warn('Failed to persist item stats:', err)
      }
    }
  }

  const onSubmit = async (type?: EQuiz) => {
    if (isSubmit || !currentItem) return
    const quizType = type ?? currentItem.quiz.type

    dispatch(studySetAction.isSubmitAnswer(true))

    if (quizType === EQuiz.FILL_IN_BLANK) {
      const expected = String(currentItem.quiz.answer || '')
        .trim()
        .toLowerCase()
      const actual = String(respond || '')
        .trim()
        .toLowerCase()
      const isCorrect = actual.length > 0 && actual === expected

      await updateItemStatus(currentItem, isCorrect, EQuiz.FILL_IN_BLANK)
    }

    if (quizType === EQuiz.MULTI_CHOICE) {
      const isCorrect = String(currentItem.id) === String(respond)
      await updateItemStatus(currentItem, isCorrect, EQuiz.MULTI_CHOICE)
    }
  }

  const onSelectMultiChoice = useCallback(
    (answer: IOption<string, boolean>) => {
      dispatch(studySetAction.updateUserRespond(answer.id))
      dispatch(
        studySetAction.onSelectAnswer({
          ...answer,
          value: true,
        }),
      )
    },
    [dispatch],
  )

  const onReload = async () => {
    reset()
    await createStudySet(
      {
        currentIndex: 0,
        isDone: false,
        inProgress: true,
      },
      status.mode ?? studyMode,
    )
  }

  const onSearch = async (id: string) => {
    try {
      const { isSuccess, content } = await itemApi.getItemById(id)
      if (isSuccess && content) {
        openItemModal('view', content)
      }
    } catch (error) {
      notification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const getClassValidate = (ans: IOption<string, boolean>, item: IItemQuiz, submitted: boolean) => {
    if (!submitted) {
      return ans.value ? styles.active : undefined
    }

    // After submit:
    const isThisCorrect = String(ans.id) === String(item.id)
    const isThisSelected = !!ans.value

    if (isThisCorrect) {
      return styles.correct
    }
    if (isThisSelected) {
      return clsx(styles.active, styles.incorrect)
    }
    return undefined
  }

  const onKeyBoardPress = useCallback(
    (e: KeyboardEvent) => {
      const studySet = document.getElementById('studySet')
      // Only process when inside studySet or general body focus
      if (!studySet?.contains(e.target as Node) && e.target !== document.body) {
        return
      }

      if (isDone && !inProgress && e.code === 'Enter') {
        createStudySet({
          currentIndex: 0,
          isDone: false,
          inProgress: true,
        })
        return
      }

      if (inProgress && currentItem) {
        if (currentItem.quiz.type === EQuiz.FILL_IN_BLANK) {
          if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            inputEl.current?.focus()
          }

          if (e.code === 'Enter') {
            isSubmit ? onNext() : onSubmit(EQuiz.FILL_IN_BLANK)
          }
        }

        if (currentItem.quiz.type === EQuiz.MULTI_CHOICE) {
          const answers = (currentItem.quiz.answer as Partial<IOption<string, boolean>>[]) || []
          const index = answers.findIndex((ans) => ans.value)

          if (!isSubmit && answers.length > 0) {
            if (e.code === 'ArrowUp') {
              const nextIndex = index <= 0 ? answers.length - 1 : index - 1
              if (answers[nextIndex]) {
                onSelectMultiChoice(answers[nextIndex] as IOption<string, boolean>)
              }
            }

            if (e.code === 'ArrowDown') {
              const nextIndex = index === -1 || index >= answers.length - 1 ? 0 : index + 1
              if (answers[nextIndex]) {
                onSelectMultiChoice(answers[nextIndex] as IOption<string, boolean>)
              }
            }
          }

          if (e.code === 'Enter') {
            isSubmit ? onNext() : onSubmit(EQuiz.MULTI_CHOICE)
          }
        }
      }
    },
    [isDone, inProgress, currentItem, isSubmit, onNext, onSubmit, onSelectMultiChoice],
  )

  const disableWindowScroll = (e: KeyboardEvent) => {
    const studySet = document.getElementById('studySet')
    if (studySet?.contains(e.target as Node)) {
      if (['ArrowUp', 'ArrowDown'].indexOf(e.code) > -1) {
        e.preventDefault()
      }
    }
  }

  const getInputPlaceholder = (value: string, placeholder: string) => {
    const cleanPlaceholder = (placeholder || '').replace(/\s+/g, '')

    if (!value) {
      return (
        <div className={styles.fibQuestion}>
          {cleanPlaceholder.split('').map((char, key) => (
            <span key={key} className={styles.fibInput}>
              {char}
            </span>
          ))}
        </div>
      )
    }

    const valueArray = value.split('')

    return (
      <div className={styles.fibQuestion}>
        {cleanPlaceholder.split('').map((char, key) => {
          if (valueArray[key]) {
            return (
              <span key={key} className={clsx(styles.fibInput, styles.fibInputActive)}>
                {valueArray[key]}
              </span>
            )
          }
          return (
            <span key={key} className={styles.fibInput}>
              {char}
            </span>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyBoardPress)
    return () => {
      window.removeEventListener('keydown', onKeyBoardPress)
    }
  }, [onKeyBoardPress])

  useEffect(() => {
    window.addEventListener('keydown', disableWindowScroll)
    return () => {
      window.removeEventListener('keydown', disableWindowScroll)
    }
  }, [])

  // Auto-focus input on Fill in blank questions
  useEffect(() => {
    if (currentItem?.quiz.type === EQuiz.FILL_IN_BLANK && !isSubmit) {
      const timer = setTimeout(() => {
        inputEl.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, isSubmit, currentItem?.quiz.type])

  const isFibCorrect =
    isSubmit &&
    String(currentItem?.quiz.answer || '')
      .trim()
      .toLowerCase() ===
      String(respond || '')
        .trim()
        .toLowerCase()

  // Filtered due items for modal table
  const filteredDueItems = useMemo(() => {
    if (!dueItems) return []
    if (!dueSearchText.trim()) return dueItems
    const kw = dueSearchText.toLowerCase()
    return dueItems.filter(
      (item) =>
        (item.origin || '').toLowerCase().includes(kw) ||
        (item.meanings || []).some(
          (m) =>
            (m.definition || '').toLowerCase().includes(kw) ||
            (m.translation || '').toLowerCase().includes(kw),
        ),
    )
  }, [dueItems, dueSearchText])

  return (
    <div className={styles.studySet} id='studySet' tabIndex={0}>
      {/* Header during quiz */}
      {inProgress && (
        <div className={styles.studySetHeader}>
          <Space>
            <Tag
              color={
                status.mode === 'checklist' || studyMode === 'checklist'
                  ? 'purple'
                  : (status.mode ?? studyMode) === 'due'
                    ? 'gold'
                    : 'blue'
              }
            >
              {status.mode === 'checklist' || studyMode === 'checklist'
                ? '📋 Ôn tập Checklist'
                : (status.mode ?? studyMode) === 'due'
                  ? '🕒 SRS: Cần ôn hôm nay'
                  : '🎲 Luyện tập tự do'}
            </Tag>
            {!isDone && (
              <Button
                icon={<ReloadOutlined spin={loading} />}
                variant='outlined'
                size='small'
                onClick={() => onReload()}
              >
                Reload
              </Button>
            )}
          </Space>

          <div className={styles.progress}>
            <div className={styles.progressCounter}>{`${currentIndex + 1}/${list.length}`}</div>
          </div>
        </div>
      )}

      <div className={styles.studySetBody}>
        {/* Mode Selector & Dashboard when NOT in progress */}
        {!isDone && !inProgress && (
          <div style={{ width: '100%', marginBottom: 16 }}>
            <Segmented
              value={studyMode}
              onChange={(val) => setStudyMode(val as 'due' | 'checklist' | 'custom')}
              block
              style={{ marginBottom: 16 }}
              options={[
                {
                  label: (
                    <Space>
                      <ClockCircleOutlined
                        style={{
                          color: dueCount > 0 ? token.colorWarning : token.colorSuccess,
                        }}
                      />
                      <span>Cần ôn hôm nay</span>
                      <Badge
                        count={dueCount}
                        overflowCount={99}
                        style={{
                          backgroundColor: dueCount > 0 ? token.colorWarning : token.colorSuccess,
                        }}
                      />
                    </Space>
                  ),
                  value: 'due',
                },
                {
                  label: (
                    <Space>
                      <CheckSquareOutlined
                        style={{
                          color: checklistToLearnCount > 0 ? token.colorSuccess : undefined,
                        }}
                      />
                      <span>Checklist</span>
                      <Badge
                        count={checklistToLearnCount}
                        overflowCount={99}
                        style={{
                          backgroundColor:
                            checklistToLearnCount > 0
                              ? token.colorSuccess
                              : token.colorTextQuaternary,
                        }}
                      />
                    </Space>
                  ),
                  value: 'checklist',
                },
                {
                  label: (
                    <Space>
                      <AppstoreOutlined />
                      <span>Luyện tập tự do</span>
                    </Space>
                  ),
                  value: 'custom',
                },
              ]}
            />

            {studyMode === 'due' && (
              <Card
                size='small'
                style={{
                  border: `1px solid ${dueCount > 0 ? token.colorWarningBorder : token.colorSuccessBorder}`,
                  backgroundColor: dueCount > 0 ? token.colorWarningBg : token.colorSuccessBg,
                  borderRadius: 12,
                  textAlign: 'left',
                }}
              >
                {dueCount > 0 ? (
                  <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                    <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            color: token.colorTextHeading,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <ThunderboltOutlined style={{ color: token.colorWarning }} />
                          {dueCount} từ vựng cần ôn tập hôm nay
                        </h3>
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: 13,
                            color: token.colorTextSecondary,
                          }}
                        >
                          Thuật toán Spaced Repetition (SRS) tự động tính chu kỳ để bạn ghi nhớ lâu
                          nhất.
                        </p>
                      </div>

                      <Button
                        size='small'
                        icon={<UnorderedListOutlined />}
                        onClick={() => setIsDueModalOpen(true)}
                      >
                        Xem danh sách ({dueCount})
                      </Button>
                    </Flex>

                    {/* Breakdown Badges */}
                    <Flex gap={6} wrap='wrap'>
                      {Object.entries(dueStats.byCategory).map(([catId, count]) => (
                        <Tag key={catId} color='default'>
                          {getCategory(Number(catId))}: <b>{count}</b>
                        </Tag>
                      ))}
                      {dueStats.byLevel[0] > 0 && (
                        <Tag color='red'>
                          Mới / Level 0: <b>{dueStats.byLevel[0]}</b>
                        </Tag>
                      )}
                      {dueStats.byLevel[1] > 0 && (
                        <Tag color='volcano'>
                          Level 1: <b>{dueStats.byLevel[1]}</b>
                        </Tag>
                      )}
                    </Flex>
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <CheckCircleOutlined
                      style={{ fontSize: 36, color: token.colorSuccess, marginBottom: 8 }}
                    />
                    <h3 style={{ margin: '0 0 6px 0', color: token.colorSuccess }}>
                      Hoan hô! Bạn không còn từ nào cần ôn hôm nay
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: token.colorTextSecondary }}>
                      Tất cả từ vựng đều đang trong chu kỳ ghi nhớ an toàn. Bạn có thể chuyển sang
                      "Luyện tập tự do" để ôn lại toàn bộ từ vựng.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {studyMode === 'checklist' && (
              <Card
                size='small'
                style={{
                  border: `1px solid ${checklistToLearnCount > 0 ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                  backgroundColor:
                    checklistToLearnCount > 0 ? token.colorFillAlter : token.colorBgContainer,
                  borderRadius: 12,
                  textAlign: 'left',
                }}
              >
                {checklistTotal > 0 ? (
                  <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                    <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 600 }}>
                          Ôn tập Checklist ({checklistToLearnCount} từ cần nhớ)
                        </h4>
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: 13,
                            color: token.colorTextSecondary,
                          }}
                        >
                          Tập trung kiểm tra các từ bạn đã lưu vào Checklist để củng cố trí nhớ
                          ngay.
                        </p>
                      </div>

                      <Tag color={checklistToLearnCount > 0 ? 'processing' : 'success'}>
                        {checklistToLearnCount > 0
                          ? `${checklistToLearnCount} chưa thuộc`
                          : 'Đã thuộc tất cả'}
                      </Tag>
                    </Flex>

                    <Flex gap={6} wrap='wrap'>
                      <Tag color='default'>
                        Tổng số: <b>{checklistTotal}</b>
                      </Tag>
                      <Tag color='success'>
                        Đã nhớ: <b>{checklistCompleted}</b> ({checklistPercent}%)
                      </Tag>
                      <Tag color='processing'>
                        Cần học: <b>{checklistToLearnCount}</b>
                      </Tag>
                    </Flex>
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <CheckSquareOutlined
                      style={{ fontSize: 36, color: token.colorPrimary, marginBottom: 8 }}
                    />
                    <h3 style={{ margin: '0 0 6px 0' }}>Checklist của bạn đang trống</h3>
                    <p style={{ margin: 0, fontSize: 13, color: token.colorTextSecondary }}>
                      Thêm từ vào Checklist ở khung bên trái hoặc trong Thư viện để tạo bài ôn tập
                      tập trung.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {studyMode === 'custom' && (
              <Card
                size='small'
                style={{
                  borderRadius: 12,
                  textAlign: 'left',
                }}
              >
                <h3 style={{ margin: '0 0 4px 0' }}>Luyện tập tự do</h3>
                <p style={{ margin: 0, fontSize: 13, color: token.colorTextSecondary }}>
                  Tạo bộ câu hỏi ngẫu nhiên ({totalCustomSize} mục) dựa trên cấu hình trong Cài đặt
                  của bạn.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Results Screen */}
        {isDone && !inProgress && (
          <div className={styles.result}>
            <h2>
              Kết quả: {list.filter((it) => it.quiz?.result).length}/{list.length} (
              {Math.round((list.filter((it) => it.quiz?.result).length / (list.length || 1)) * 100)}
              %)
            </h2>
            {studyMode === 'due' && (
              <p style={{ color: token.colorTextSecondary, marginTop: 8 }}>
                {dueCount > 0
                  ? `Còn lại ${dueCount} từ cần ôn tập trong ngày hôm nay.`
                  : '🎉 Tuyệt vời! Bạn đã hoàn thành tất cả từ cần ôn hôm nay!'}
              </p>
            )}
            {(status.mode === 'checklist' || studyMode === 'checklist') && (
              <p style={{ color: token.colorTextSecondary, marginTop: 8 }}>
                {checklistToLearnCount > 0
                  ? `Còn lại ${checklistToLearnCount} từ chưa nhớ trong Checklist.`
                  : '🎉 Tuyệt vời! Bạn đã ghi nhớ toàn bộ từ trong Checklist!'}
              </p>
            )}
          </div>
        )}

        {inProgress && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <NotFound />
            <div style={{ marginTop: 16 }}>
              <Button type='primary' onClick={() => onReload()}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Quiz Question */}
        {inProgress && currentItem && (
          <>
            <h4
              dangerouslySetInnerHTML={{
                __html: currentItem.quiz?.title
                  ? currentItem.quiz.title.replaceAll(/\n/g, '<br />')
                  : '',
              }}
            />

            {currentItem.quiz?.type === EQuiz.FILL_IN_BLANK && (
              <>
                {getInputPlaceholder((respond as string) || '', currentItem.quiz?.question || '')}
              </>
            )}

            {currentItem.quiz?.type === EQuiz.MULTI_CHOICE && currentItem.quiz?.question && (
              <h3
                dangerouslySetInnerHTML={{
                  __html: currentItem.quiz.question.replaceAll(/\n/g, '<br />'),
                }}
              />
            )}

            {currentItem.quiz?.hint && (
              <h5
                dangerouslySetInnerHTML={{
                  __html: currentItem.quiz.hint.replaceAll(/\n/g, '<br />'),
                }}
              />
            )}
          </>
        )}

        {/* Multi-Choice Options */}
        {!isDone && currentItem?.quiz?.type === EQuiz.MULTI_CHOICE && (
          <div className={styles.mtc}>
            <ul>
              {Array.isArray(currentItem.quiz.answer) &&
                (currentItem.quiz.answer as IAnswer<string, boolean>[]).map((ans, key) => (
                  <li
                    className={clsx(
                      getClassValidate(ans as IOption<string, boolean>, currentItem, isSubmit),
                    )}
                    key={key}
                    onClick={() => {
                      isSubmit
                        ? onSearch(String(ans.id))
                        : onSelectMultiChoice(ans as IOption<string, boolean>)
                    }}
                  >
                    <Flex align={'center'} gap={token.size / 2}>
                      {isSubmit && currentItem.catId === ECategory.WORD && ans.typeId && (
                        <span className={'text-sm'}>
                          {`(${getType(ans.typeId).origin.toLowerCase()})`}
                        </span>
                      )}

                      <span
                        style={{ wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: `${ans.label}` }}
                      />
                    </Flex>

                    <div>
                      <i
                        dangerouslySetInnerHTML={{
                          __html: `${isSubmit ? `${ans.key || ''}` : ''}`,
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Fill in the blank input */}
        {!isDone && currentItem?.quiz?.type === EQuiz.FILL_IN_BLANK && (
          <div className={styles.fib}>
            <div className={styles.fibWrapper}>
              <Input
                value={(respond as string) || ''}
                className={clsx(isSubmit && (isFibCorrect ? styles.correct : styles.incorrect))}
                ref={inputEl}
                maxLength={
                  typeof currentItem.quiz?.answer === 'string'
                    ? currentItem.quiz.answer.length
                    : undefined
                }
                onChange={(e) =>
                  dispatch(studySetAction.updateUserRespond(e.target.value.toLowerCase()))
                }
                autoFocus={true}
                readOnly={isSubmit}
              />
            </div>

            {isSubmit && !isFibCorrect && (
              <div style={{ marginTop: 8, fontSize: 13, color: token.colorTextSecondary }}>
                Correct answer:{' '}
                <b style={{ color: token.colorSuccess }}>
                  {String(currentItem.quiz?.answer || '')}
                </b>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.studySetFooter}>
        {/* Footer when not in progress */}
        {!inProgress && (
          <div className={styles.btnAction}>
            {studyMode === 'due' && dueCount === 0 && !isDone ? (
              <Button type='primary' onClick={() => setStudyMode('custom')}>
                Chuyển sang Luyện tập tự do
              </Button>
            ) : (
              <Button
                type='primary'
                loading={loading}
                disabled={studyMode === 'checklist' && checklistTotal === 0}
                onClick={() =>
                  createStudySet({
                    currentIndex: 0,
                    isDone: false,
                    inProgress: true,
                  })
                }
              >
                {!inProgress && isDone
                  ? studyMode === 'due' && dueCount > 0
                    ? `Tiếp tục ôn (${Math.min(dueCount, 15)} từ còn lại)`
                    : (status.mode === 'checklist' || studyMode === 'checklist') &&
                        checklistToLearnCount > 0
                      ? `Tiếp tục ôn Checklist (${checklistToLearnCount} từ chưa nhớ)`
                      : 'Luyện tập lại'
                  : studyMode === 'due'
                    ? `Ôn tập ngay (${Math.min(dueCount, 15)} từ)`
                    : studyMode === 'checklist'
                      ? `Ôn tập Checklist (${checklistToLearnCount > 0 ? checklistToLearnCount : checklistTotal} từ)`
                      : 'Bắt đầu luyện tập'}
              </Button>
            )}
          </div>
        )}

        {/* Footer during quiz */}
        {inProgress && list.length > 0 && (
          <div className={styles.btnAction}>
            {!isSubmit && (
              <Button type='primary' onClick={() => onSubmit(currentItem?.quiz?.type as EQuiz)}>
                Submit
              </Button>
            )}

            {isSubmit && (
              <Button variant='outlined' color='primary' onClick={() => onNext()}>
                {currentIndex + 1 >= list.length ? 'Hoàn thành' : 'Tiếp theo'}
              </Button>
            )}
          </div>
        )}

        {/* Real-time SRS Feedback & Reference item */}
        {isSubmit && currentItem && (
          <div className={clsx(styles.resultReference, appStyle.boxItem)}>
            {lastSrsFeedback && (
              <div
                style={{
                  padding: '8px 12px',
                  marginBottom: 12,
                  borderRadius: 8,
                  backgroundColor: lastSrsFeedback.isCorrect
                    ? token.colorSuccessBg
                    : token.colorErrorBg,
                  border: `1px solid ${lastSrsFeedback.isCorrect ? token.colorSuccessBorder : token.colorErrorBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Flex align='center' gap={8} wrap='wrap'>
                  <Tag
                    color={lastSrsFeedback.isCorrect ? 'success' : 'error'}
                    style={{ fontSize: 13, padding: '2px 8px' }}
                  >
                    {lastSrsFeedback.isCorrect ? '✅ Chính xác!' : '❌ Chưa chính xác'}
                  </Tag>
                  <Tag color='blue' style={{ fontSize: 13 }}>
                    Level {lastSrsFeedback.prevLevel} → Level {lastSrsFeedback.nextLevel}
                  </Tag>
                  <Tag
                    color={lastSrsFeedback.intervalDays > 0 ? 'cyan' : 'orange'}
                    style={{ fontSize: 13 }}
                  >
                    {lastSrsFeedback.intervalDays > 0
                      ? `Ôn lại sau ${lastSrsFeedback.intervalDays} ngày`
                      : 'Cần ôn lại sớm'}
                  </Tag>
                </Flex>
              </div>
            )}
            <Item data={currentItem as IItem} />
          </div>
        )}
      </div>

      {/* Modal: View Due Items List */}
      <Modal
        title={
          <Space>
            <ClockCircleOutlined style={{ color: token.colorWarning }} />
            <span>Danh sách từ vựng cần ôn tập hôm nay ({dueCount})</span>
          </Space>
        }
        open={isDueModalOpen}
        onCancel={() => setIsDueModalOpen(false)}
        width={700}
        footer={[
          <Button key='close' onClick={() => setIsDueModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key='start'
            type='primary'
            disabled={dueCount === 0}
            onClick={() => {
              setIsDueModalOpen(false)
              createStudySet(
                {
                  currentIndex: 0,
                  isDone: false,
                  inProgress: true,
                },
                'due',
              )
            }}
          >
            Bắt đầu ôn tập ({Math.min(dueCount, 15)} từ)
          </Button>,
        ]}
      >
        <Space direction='vertical' style={{ width: '100%' }} size={12}>
          <Input
            placeholder='Tìm kiếm từ trong danh sách cần ôn...'
            prefix={<SearchOutlined />}
            value={dueSearchText}
            onChange={(e) => setDueSearchText(e.target.value)}
            allowClear
          />

          <Table
            dataSource={filteredDueItems}
            rowKey='id'
            size='small'
            pagination={{ pageSize: 6 }}
            columns={[
              {
                title: 'Từ / Cụm từ',
                dataIndex: 'origin',
                key: 'origin',
                render: (origin: string, record: IItem) => (
                  <span
                    style={{ fontWeight: 600, color: token.colorPrimary, cursor: 'pointer' }}
                    onClick={() => {
                      setIsDueModalOpen(false)
                      openItemModal('view', record)
                    }}
                  >
                    {origin}
                  </span>
                ),
              },
              {
                title: 'Loại',
                dataIndex: 'catId',
                key: 'catId',
                width: 90,
                render: (catId: number) => <Tag>{getCategory(catId)}</Tag>,
              },
              {
                title: 'Level',
                dataIndex: 'level',
                key: 'level',
                width: 70,
                render: (level: number) => <Tag color='blue'>Lv {level ?? 0}</Tag>,
              },
              {
                title: 'Trạng thái SRS',
                key: 'srsStatus',
                width: 140,
                render: (_: any, record: IItem) => (
                  <Tag color='warning' icon={<ClockCircleOutlined />}>
                    {getDueDurationText(record)}
                  </Tag>
                ),
              },
              {
                title: 'Định nghĩa / Dịch',
                key: 'meaning',
                ellipsis: true,
                render: (_: any, record: IItem) => {
                  const m = record.meanings?.[0]
                  return m?.definition || m?.translation || ''
                },
              },
            ]}
          />
        </Space>
      </Modal>
    </div>
  )
}

export default StudySet
