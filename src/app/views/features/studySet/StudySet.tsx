import { ReloadOutlined } from '@ant-design/icons'
import { appSetting } from '@/config/appConfig'
import { useDispatch, useSelector } from '@/core/hooks'
import { getType } from '@/helpers/item'
import { IItemQuiz, ECategory, EQuiz, IOption, IAnswer, IItem } from '@/models/item.model'
import { GetStudySetByCatId } from '@/models/studySet.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { IStudySetStatus, studySetAction } from '@/store/reducers/studySet.reducer'
import { theme, InputRef, Button, Input, Flex } from 'antd'
import { useState, useRef, useEffect } from 'react'
import { Item } from '../item/Item'
import { EItemLevel } from '../modals/itemModal/data'
import styles from './style.module.scss'
import clsx from 'clsx'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'

export const StudySet: React.FC = () => {
  const { token } = theme.useToken()

  const [item, setItem] = useState<IItemQuiz>()
  const [loading, setLoading] = useState(false)
  const inputEl = useRef<InputRef | null>(null)

  const { openNotification } = usePrompt()

  const { openItemModal } = useItemModal()

  const dispatch = useDispatch()

  const { list, status, respond, isSubmit } = useSelector((state) => state.studySet)

  const { user } = useSelector((state) => state.auth)
  const configuration = user?.configuration
  const { categories } = useSelector((state) => state.setting)

  const { inProgress, isDone, currentIndex } = status

  const getStudySetSizeByCategory = (category: ECategory) => {
    if (category === ECategory.WORD) return configuration?.numberOfWordsInStudySet

    if (category === ECategory.PHRASE) return configuration?.numberOfPhraseInStudySet

    if (category === ECategory.IDIOM) return configuration?.numberOfIdiomInStudySet

    if (category === ECategory.SLANG) return configuration?.numberOfSlangInStudySet

    if (category === ECategory.COLLOCATION) return configuration?.numberOfCollocationsInStudySet

    if (category === ECategory.SENTENCE) return configuration?.numberOfSentencesInStudySet

    return appSetting.meta.numberOfWordsInStudySet
  }

  // Prepare study set params
  const studySetParams = categories
    .filter((cat) => cat.id !== 0)
    .map((cat) => ({
      id: cat.id,
      size: getStudySetSizeByCategory(cat.value),
    })) as GetStudySetByCatId[]

  const createStudySet = async (params: Partial<IStudySetStatus>) => {
    try {
      setLoading(true)

      const response = await itemApi.getStudySet(studySetParams)

      if (!response.isSuccess) {
        openNotification({
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
        openNotification({ type: 'warning', message: 'No items found for study set' })
      }
    } catch (error) {
      console.error('Error creating study set:', error)
      openNotification({
        type: 'error',
        message:
          'Failed to create study set: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      })
    } finally {
      setLoading(false)
    }
  }

  const onNext = () => {
    const studySet = document.getElementById('studySet')
    studySet?.focus()
    reset()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (currentIndex + 1 === list.length) {
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
  }

  const onSubmit = async (type: EQuiz) => {
    dispatch(studySetAction.isSubmitAnswer(true))

    if (type === EQuiz.FILL_IN_BLANK) {
      if (
        respond &&
        (item?.quiz.answer as string).trim().toLowerCase() ===
          (respond as string).trim().toLowerCase()
      ) {
        await updateItemStatus(item as IItemQuiz, (item?.level as number) + 1, true)
      } else {
        await updateItemStatus(item as IItemQuiz, EItemLevel.ZERO, false)
      }
    }

    if (type === EQuiz.MULTI_CHOICE) {
      if (item?.id === respond) {
        await updateItemStatus(item as IItemQuiz, (item?.level as number) + 1, true)
      } else {
        await updateItemStatus(item as IItemQuiz, (item?.level as number) - 1, false)
      }
    }
  }

  const updateItemStatus = async (item: IItemQuiz, level: number, result: boolean) => {
    const { quiz, ...rest } = item
    if (level < EItemLevel.ZERO) level = EItemLevel.ZERO
    if (level > EItemLevel.FIVE) level = EItemLevel.FIVE

    dispatch(
      studySetAction.update({
        id: item.id,
        level: level,
        count: rest.count && rest.count >= 0 ? rest.count + 1 : 1,
        quiz: { ...item.quiz, result: result },
      }),
    )

    await itemApi.updateItem(item.id ?? '', {
      ...rest,
      ...item,
      level: level,
      count: rest.count && rest.count >= 0 ? rest.count + 1 : 1,
      meanings: item?.meanings?.map((meaning) => ({
        ...meaning,
        examples: meaning.examples.map((example) =>
          typeof example === 'string' ? example : example.id || '',
        ),
      })),
    })
  }

  const onSelectMultiChoice = (answer: IOption<string, boolean>) => {
    dispatch(studySetAction.updateUserRespond(answer.id))
    dispatch(
      studySetAction.onSelectAnswer({
        ...answer,
        value: true,
      }),
    )
  }

  const reset = () => {
    dispatch(studySetAction.isSubmitAnswer(false))
    dispatch(studySetAction.updateUserRespond(null))
  }

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
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const getClassValidate = (ans: IOption<string, boolean>, item: IItemQuiz, isSubmit: boolean) => {
    if (isSubmit && ans.value && ans.id === item.id) return styles.correct
    if (isSubmit && ans.value && ans.id !== item.id) return clsx(styles.active, styles.incorrect)
    if (isSubmit && ans.value) return clsx(styles.active, styles.correct)
    if (
      isSubmit &&
      ans.id === item.id &&
      Array.isArray(item?.quiz.answer) &&
      item.quiz.answer.findIndex((ans) => ans.value) === -1
    )
      return styles.incorrect
    if (isSubmit && !ans.value && ans.id === item.id) return styles.correct
    if (ans.value) return styles.active
  }

  const onKeyBoardPress = (e: KeyboardEvent) => {
    const studySet = document.getElementById('studySet')
    if (!studySet?.contains(e.target as Node)) {
      return
    }

    if (isDone && !inProgress && e.code === 'Enter') {
      createStudySet({
        currentIndex: 0,
        isDone: false,
        inProgress: true,
      })
    }

    if (!isDone) {
      if (item?.quiz.type === EQuiz.FILL_IN_BLANK) {
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          inputEl.current?.focus()
        }

        if (e.code === 'Enter') {
          isSubmit ? onNext() : onSubmit(EQuiz.FILL_IN_BLANK)
        }
      }

      if (item?.quiz.type === EQuiz.MULTI_CHOICE) {
        const index = (
          list[status.currentIndex].quiz.answer as Partial<IOption<string, boolean>>[]
        ).findIndex((item) => item.value)

        if (!isSubmit) {
          if (e.code === 'ArrowUp' && index > 0) {
            onSelectMultiChoice(item?.quiz.answer[index - 1] as IOption<string, boolean>)
          }

          if (e.code === 'ArrowDown' && index < 3) {
            onSelectMultiChoice(item?.quiz.answer[index + 1] as IOption<string, boolean>)
          }
        }

        if (e.code === 'Enter') {
          isSubmit ? onNext() : onSubmit(EQuiz.MULTI_CHOICE)
        }
      }
    }
  }

  const disableWindowScroll = (e: KeyboardEvent) => {
    const studySet = document.getElementById('studySet')
    if (studySet?.contains(e.target as Node)) {
      if (['ArrowUp', 'ArrowDown'].indexOf(e.code) > -1) {
        e.preventDefault()
      }
    }
  }

  const getInputPlaceholder = (value: string, placeholder: string) => {
    if (!value) {
      return (
        <div className={styles.fibQuestion}>
          {placeholder.split('').map((char, key) => {
            return (
              <span key={key} className={styles.fibInput}>
                {char}
              </span>
            )
          })}
        </div>
      )
    }

    const valueArray = value.split('')

    return (
      <div className={styles.fibQuestion}>
        {placeholder.split('').map((char, key) => {
          if (valueArray[key]) {
            return (
              <span key={key} className={clsx(styles.fibInput, styles.fibInputActive)}>
                {valueArray[key]}
              </span>
            )
          } else {
            return (
              <span key={key} className={styles.fibInput}>
                {char}
              </span>
            )
          }
        })}
      </div>
    )
  }

  // const onEdit = async (id: string) => {
  //   try {
  //     const { content } = await itemApi.getItemById(id)
  //   } catch (error) {
  //     openNotification({ type: 'error', message: JSON.stringify(error) })
  //   }
  // }

  useEffect(() => {
    window.addEventListener('keydown', onKeyBoardPress)

    return () => {
      window.removeEventListener('keydown', onKeyBoardPress)
    }
  }, [list, isSubmit, item, currentIndex, respond])

  useEffect(() => {
    window.addEventListener('keydown', disableWindowScroll)

    return () => {
      window.removeEventListener('keydown', disableWindowScroll)
    }
  }, [])

  useEffect(() => setItem(list[currentIndex]), [list, currentIndex])

  return (
    <div className={styles.studySet} id='studySet' tabIndex={0}>
      <div className={styles.studySeHeader}>
        {inProgress && (
          <>
            {!isDone && (
              <Button
                icon={<ReloadOutlined spin={loading} />}
                type='primary'
                danger
                onClick={() => onReload()}
              >
                Reload
              </Button>
            )}

            <div className={styles.progress}>
              <div className={styles.progressCounter}>{`${currentIndex + 1}/${list.length}`}</div>
            </div>
          </>
        )}
      </div>

      <div className={styles.studySetBody}>
        {!isDone && !inProgress && <h2>LET'S PRACTICE!</h2>}

        {isDone && !inProgress && (
          <div className={styles.result}>
            <h2>Result</h2>
            <h3>
              {list.filter((item) => item.quiz.result).length}/{list.length}
            </h3>
          </div>
        )}

        {inProgress && list.length === 0 && <NotFound />}

        {inProgress && list.length > 0 && (
          <>
            <h4
              dangerouslySetInnerHTML={{
                __html: item?.quiz.title ? item?.quiz.title.replaceAll(/\n/g, '<br />') : '',
              }}
            />

            {item?.quiz.type === EQuiz.FILL_IN_BLANK && (
              <>{getInputPlaceholder(respond as string, item?.quiz.question.replaceAll(' ', ''))}</>
            )}

            {item?.quiz.type === EQuiz.MULTI_CHOICE && (
              <h3
                dangerouslySetInnerHTML={{
                  __html: item?.quiz.question.replaceAll(/\n/g, '<br />'),
                }}
              />
            )}

            {item?.quiz.hint && (
              <h5
                dangerouslySetInnerHTML={{ __html: item?.quiz.hint.replaceAll(/\n/g, '<br />') }}
              />
            )}
          </>
        )}

        {!isDone && item?.quiz.type === EQuiz.MULTI_CHOICE && (
          <div className={styles.mtc}>
            <ul>
              {(item?.quiz.answer as IAnswer<string, boolean>[]).map((ans, key) => {
                return (
                  <li
                    className={clsx(
                      getClassValidate(
                        ans as IOption<string, boolean>,
                        item as IItemQuiz,
                        isSubmit,
                      ),
                    )}
                    key={key}
                    onClick={() => {
                      isSubmit
                        ? onSearch(ans.id)
                        : onSelectMultiChoice(ans as IOption<string, boolean>)
                    }}
                  >
                    <Flex justify={'space-between'} align={'center'} gap={token.size / 4}>
                      <div className={'flex items-center justify-between'}>
                        <span dangerouslySetInnerHTML={{ __html: `${ans.label}` }} />

                        <i
                          dangerouslySetInnerHTML={{ __html: `${isSubmit ? `${ans.key}` : ''}` }}
                        />
                      </div>

                      {isSubmit && item.catId === ECategory.WORD && ans.typeId && (
                        <i className={'text-sm'}>
                          {`(${getType(ans.typeId).origin.toLowerCase()})`}
                        </i>
                      )}
                    </Flex>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!isDone && item?.quiz.type === EQuiz.FILL_IN_BLANK && (
          <div className={styles.fib}>
            <div className={styles.fibWrapper}>
              <Input
                value={respond as string}
                className={clsx(
                  item?.quiz.answer === respond && isSubmit ? styles.correct : '',
                  item?.quiz.answer !== respond && isSubmit ? styles.incorrect : '',
                )}
                onInput={(e) => {
                  const input = e.target as HTMLInputElement
                  input.value = input.value.toLowerCase()
                  if (isSubmit) return
                }}
                ref={inputEl}
                maxLength={item?.quiz.answer.length}
                onChange={(e) =>
                  dispatch(studySetAction.updateUserRespond(e.target.value.toLowerCase()))
                }
                autoFocus={true}
                readOnly={isSubmit}
              />
            </div>
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
              <Button type='primary' onClick={() => onSubmit(item?.quiz.type as EQuiz)}>
                Submit
              </Button>
            )}

            {!isDone && isSubmit && currentIndex + 1 <= list.length && (
              <Button type='default' onClick={() => onNext()}>
                {isDone ? 'Finish' : 'Next'}
              </Button>
            )}
          </div>
        )}

        {isSubmit && (
          <div className={styles.resultReference}>
            <Item data={item as IItem} />
          </div>
        )}

        {isSubmit && !isDone && isSubmit && currentIndex + 1 <= list.length && (
          <div className={styles.btnAction}>
            <Button type='default' onClick={() => onNext()}>
              {isDone ? 'Finish' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
