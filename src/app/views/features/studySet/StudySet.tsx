import { ReloadOutlined } from '@ant-design/icons'
import { appSetting } from '@/config/appConfig'
import { useDispatch, useSelector, itemKeys } from '@/core/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { getType } from '@/helpers/item'
import { IItemQuiz, ECategory, EQuiz, IOption, IAnswer, IItem } from '@/models/item.model'
import { GetStudySetByCatId } from '@/models/studySet.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { IStudySetStatus, studySetAction } from '@/store/reducers/studySet.reducer'
import { theme, InputRef, Button, Input, Flex } from 'antd'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Item } from '../item/Item'
import { EItemLevel } from '../modals/itemModal/data'
import styles from './studySet.module.scss'
import appStyle from '@/style/appStyle.module.scss'
import clsx from 'clsx'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'
import { categories as defaultCategories } from '@/constant/item'

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
    [configuration],
  )

  // Use resolved categories with fallback to defaultCategories if setting hasn't loaded
  const resolvedCategories = categories && categories.length > 0 ? categories : defaultCategories

  // Prepare study set params
  const studySetParams = resolvedCategories
    .filter((cat) => cat.id !== 0)
    .map((cat) => ({
      id: cat.id,
      size: getStudySetSizeByCategory(cat.value),
    })) as GetStudySetByCatId[]

  const reset = useCallback(() => {
    dispatch(studySetAction.isSubmitAnswer(false))
    dispatch(studySetAction.updateUserRespond(null))
  }, [dispatch])

  const createStudySet = async (params: Partial<IStudySetStatus>) => {
    try {
      setLoading(true)
      reset()

      const response = await itemApi.getStudySet(studySetParams)

      if (!response.isSuccess) {
        notification({
          type: 'error',
          message: response.message || 'Failed to create study set',
        })
        return
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
        dispatch(studySetAction.updateProgress({ ...params }))
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

  const updateItemStatus = async (targetItem: IItemQuiz, level: number, result: boolean) => {
    let nextLevel = level
    if (nextLevel < EItemLevel.ZERO) nextLevel = EItemLevel.ZERO
    if (nextLevel > EItemLevel.FIVE) nextLevel = EItemLevel.FIVE

    const nextCount =
      typeof targetItem.count === 'number' && targetItem.count >= 0 ? targetItem.count + 1 : 1

    // Update quiz result and learning stats in Redux
    dispatch(
      studySetAction.update({
        id: targetItem.id,
        level: nextLevel,
        count: nextCount,
        quiz: { ...targetItem.quiz, result },
      }),
    )

    // Persist learning stats to DB
    if (targetItem.id) {
      try {
        const res = await itemApi.updateItem(targetItem.id, {
          level: nextLevel,
          count: nextCount,
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

    const currentLevel = typeof currentItem.level === 'number' ? currentItem.level : EItemLevel.ZERO

    if (quizType === EQuiz.FILL_IN_BLANK) {
      const expected = String(currentItem.quiz.answer || '')
        .trim()
        .toLowerCase()
      const actual = String(respond || '')
        .trim()
        .toLowerCase()
      const isCorrect = actual.length > 0 && actual === expected

      await updateItemStatus(currentItem, isCorrect ? currentLevel + 1 : EItemLevel.ZERO, isCorrect)
    }

    if (quizType === EQuiz.MULTI_CHOICE) {
      const isCorrect = String(currentItem.id) === String(respond)
      await updateItemStatus(
        currentItem,
        isCorrect ? currentLevel + 1 : currentLevel - 1,
        isCorrect,
      )
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
    await createStudySet({
      currentIndex: 0,
      isDone: false,
      inProgress: true,
    })
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

  return (
    <div className={styles.studySet} id='studySet' tabIndex={0}>
      {inProgress && (
        <div className={styles.studySetHeader}>
          {!isDone && (
            <Button
              icon={<ReloadOutlined spin={loading} />}
              variant='outlined'
              onClick={() => onReload()}
            >
              Reload
            </Button>
          )}

          <div className={styles.progress}>
            <div className={styles.progressCounter}>{`${currentIndex + 1}/${list.length}`}</div>
          </div>
        </div>
      )}

      <div className={styles.studySetBody}>
        {!isDone && !inProgress && <h2>LET'S PRACTICE!</h2>}

        {isDone && !inProgress && (
          <div className={styles.result}>
            <h2>
              Result: {list.filter((it) => it.quiz?.result).length}/{list.length}
            </h2>
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
        {!inProgress && (
          <div className={styles.btnAction}>
            <Button
              loading={loading}
              onClick={() =>
                createStudySet({
                  currentIndex: 0,
                  isDone: false,
                  inProgress: true,
                })
              }
            >
              {!inProgress && isDone ? 'Restart' : 'Start Now'}
            </Button>
          </div>
        )}

        {inProgress && list.length > 0 && (
          <div className={styles.btnAction}>
            {!isSubmit && (
              <Button type='primary' onClick={() => onSubmit(currentItem?.quiz?.type as EQuiz)}>
                Submit
              </Button>
            )}

            {isSubmit && (
              <Button variant='outlined' color='primary' onClick={() => onNext()}>
                {currentIndex + 1 >= list.length ? 'Finish' : 'Next'}
              </Button>
            )}
          </div>
        )}

        {isSubmit && currentItem && (
          <div className={clsx(styles.resultReference, appStyle.boxItem)}>
            <Item data={currentItem as IItem} />
          </div>
        )}
      </div>
    </div>
  )
}
