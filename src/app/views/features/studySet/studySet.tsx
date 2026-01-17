import { appStyleConfig } from '@/style/appStyle'
import { ReloadOutlined, EditOutlined } from '@ant-design/icons'
import { appConfig, setting } from '@/config/appConfig'
import { useDispatch, useSelector } from '@/core/hooks'
import {
  transformItemModelToServer,
  transformItemModelToClient,
  getTypeOfItem,
} from '@/helpers/item'
import { ELoading } from '@/models/app.model'
import { IItemQuiz, TQuiz, ECategory, EQuiz, IPair, IAnswer, IItem } from '@/models/item.model'
import { GetStudySetByCatId } from '@/models/studySet.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { commonApi } from '@/services/firebase/api/common.api'
import { itemAsync } from '@/store/asyncActions/item.async'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { IStudySetStatus, studySetAction } from '@/store/reducers/studySet.reducer'
import { theme, InputRef, Button, Input, Flex } from 'antd'
import { useState, useRef, useEffect } from 'react'
import { Item } from '../item/Item'
import { EItemLevel } from '../modals/itemModal'
import styles from './style'
import clsx from 'clsx'
import { usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'

export const StudySet: React.FC = () => {
  const { token } = theme.useToken()
  const classes = styles()

  const [item, setItem] = useState<IItemQuiz<TQuiz, string[]>>()
  const inputEl = useRef<InputRef | null>(null)

  const { openNotification } = usePrompt()

  const dispatch = useDispatch()

  const { list, status, respond, isSubmit } = useSelector((state) => state.studySet)

  const { user } = useSelector((state) => state.auth)
  const configuration = user?.configuration
  const { categories } = useSelector((state) => state.config)

  const { inProgress, isDone, currentIndex } = status

  const getNumberOfItem = (category: ECategory) => {
    if (category === ECategory.WORD) return configuration.numberOfWordsInStudySet

    if (category === ECategory.PHRASE) return configuration.numberOfPhraseInStudySet

    if (category === ECategory.IDIOM) return configuration.numberOfIdiomInStudySet

    if (category === ECategory.SLANG) return configuration.numberOfSlangInStudySet

    if (category === ECategory.COLLOCATION) return configuration.numberOfCollocationsInStudySet

    if (category === ECategory.SENTENCE) return configuration.numberOfSentencesInStudySet

    return setting.studySet.numberOfWordsInStudySet
  }

  const createStudySet = (params: Partial<IStudySetStatus>) => {
    const body: GetStudySetByCatId[] = categories.map((cat) => ({
      id: cat.id,
      size: getNumberOfItem(cat.id),
    }))
    dispatch(itemAsync.fetchStudySet(body)).then(() => {
      dispatch(studySetAction.updateProgress({ ...params }))
    })
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

  const onSubmit = (type: EQuiz) => {
    dispatch(studySetAction.onSubmitAnswer(true))
    if (type === EQuiz.FILL_IN_BLANK) {
      if (
        respond &&
        (item?.quiz.answer as string).trim().toLowerCase() ===
          (respond as string).trim().toLowerCase()
      ) {
        updateItemStatus(item as IItemQuiz<TQuiz, string[]>, (item?.level as number) + 1, true)
      } else {
        updateItemStatus(item as IItemQuiz<TQuiz, string[]>, EItemLevel.ZERO, false)
      }
    }

    if (type === EQuiz.MULTI_CHOICE) {
      if (item?.id === respond) {
        updateItemStatus(item as IItemQuiz<TQuiz, string[]>, (item?.level as number) + 1, true)
      } else {
        updateItemStatus(item as IItemQuiz<TQuiz, string[]>, (item?.level as number) - 1, false)
      }
    }
  }

  const updateItemStatus = async (
    item: IItemQuiz<TQuiz, string[]>,
    level: number,
    result: boolean,
  ) => {
    const { quiz, ...rest } = item
    if (level < EItemLevel.ZERO) level = EItemLevel.ZERO
    if (level > EItemLevel.FIVE) level = EItemLevel.FIVE
    dispatch(itemAction.update({ level: level, practiceCount: (rest.practiceCount as number) + 1 }))
    dispatch(
      studySetAction.update({
        id: item.id as number,
        level: level,
        practiceCount: (rest.practiceCount as number) + 1,
        quiz: { ...item.quiz, result: result },
      }),
    )
    await itemApi.updateItem(
      item.id as number,
      transformItemModelToServer({
        ...rest,
        level: level,
        practiceCount: (rest.practiceCount as number) + 1,
      }),
      { headers: { loading: ELoading.NO } },
    )
  }

  const onSelectMultiChoice = (answer: IPair<string, boolean>) => {
    dispatch(studySetAction.updateUserRespond(answer.id))
    dispatch(
      studySetAction.onSelectAnswer({
        ...answer,
        value: true,
      }),
    )
  }

  const reset = () => {
    dispatch(studySetAction.onSubmitAnswer(false))
    dispatch(studySetAction.updateUserRespond(null))
  }

  const onReload = () => {
    reset()
    createStudySet({
      currentIndex: 0,
      isDone: false,
      inProgress: true,
    })
  }

  const onSearch = async (id: number) => {
    try {
      const { content: item } = await itemApi.getItemById(id)
      dispatch(settingAction.toggleViewItemModal())
      dispatch(
        settingAction.setCurrentItem({
          ...transformItemModelToClient(item),
        }),
      )
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const getClassValidate = (
    ans: IPair<string, boolean>,
    item: IItemQuiz<IPair<string, boolean>[], string[]>,
    isSubmit: boolean,
  ) => {
    if (isSubmit && ans.value && ans.id === item.id) return 'correct'
    if (isSubmit && ans.value && ans.id !== item.id) return 'active incorrect'
    if (isSubmit && ans.value) return 'active correct'
    if (isSubmit && ans.id === item.id && item?.quiz.answer.findIndex((item) => item.value) === -1)
      return 'incorrect'
    if (isSubmit && !ans.value && ans.id === item.id) return 'correct'
    if (ans.value) return 'active'
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
          list[status.currentIndex].quiz.answer as Partial<IPair<string, boolean>>[]
        ).findIndex((item) => item.value)

        if (!isSubmit) {
          if (e.code === 'ArrowUp' && index > 0) {
            onSelectMultiChoice(item?.quiz.answer[index - 1] as IPair<string, boolean>)
          }

          if (e.code === 'ArrowDown' && index < 3) {
            onSelectMultiChoice(item?.quiz.answer[index + 1] as IPair<string, boolean>)
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

  const getInputPlayholder = (value: string, playholder: string) => {
    if (!value) {
      return (
        <div className={classes.fibQuestion}>
          {playholder.split('').map((char, key) => {
            return (
              <span key={key} className={classes.fibInput}>
                {char}
              </span>
            )
          })}
        </div>
      )
    }

    const valueArray = value.split('')

    return (
      <div className={classes.fibQuestion}>
        {playholder.split('').map((char, key) => {
          if (valueArray[key]) {
            return (
              <span key={key} className={clsx(classes.fibInput, classes.fibInputActive)}>
                {valueArray[key]}
              </span>
            )
          } else {
            return (
              <span key={key} className={classes.fibInput}>
                {char}
              </span>
            )
          }
        })}
      </div>
    )
  }

  const onEdit = async (id: number) => {
    try {
      const { content } = await itemApi.getItemById(id as number)
      dispatch(settingAction.setOnEditItem(true))
      dispatch(settingAction.toggleItemModal())
      dispatch(
        settingAction.setCurrentItem({
          ...transformItemModelToClient(content),
        }),
      )
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

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
    <div className={classes.studySet} id='studySet' tabIndex={0}>
      <div className={classes.studySeHeader}>
        {inProgress && (
          <>
            {!isDone && (
              <Button icon={<ReloadOutlined />} type='primary' danger onClick={() => onReload()}>
                Reload
              </Button>
            )}

            <div className={classes.progress}>
              <div className={classes.progressCounter}>
                {currentIndex + 1}
                {' / '}
                {list.length}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={classes.studySetBody}>
        {!isDone && !inProgress && <h2>LET'S PRACTICE!</h2>}

        {isDone && !inProgress && (
          <div className={classes.result}>
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
              <>{getInputPlayholder(respond as string, item?.quiz.question.replaceAll(' ', ''))}</>
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
          <div className={classes.mtc}>
            <ul>
              {(item?.quiz.answer as IAnswer<string, boolean>[]).map((ans, key) => {
                return (
                  <li
                    className={clsx(
                      getClassValidate(
                        ans as IPair<string, boolean>,
                        item as IItemQuiz<IPair<string, boolean>[], string[]>,
                        isSubmit,
                      ),
                    )}
                    key={key}
                    onClick={() => {
                      isSubmit
                        ? onSearch(ans.id as number)
                        : onSelectMultiChoice(ans as IPair<string, boolean>)
                    }}
                  >
                    <Flex justify={'space-between'} align={'center'} gap={token.size / 4}>
                      <div className={'flex items-center justify-between'}>
                        <span dangerouslySetInnerHTML={{ __html: `${ans.label}` }} />

                        <i
                          dangerouslySetInnerHTML={{ __html: `${isSubmit ? `${ans.key}` : ''}` }}
                        />
                      </div>

                      {isSubmit && ans.typeId && (
                        <i>{`(${getTypeOfItem(ans.typeId).origin.toLowerCase()})`}</i>
                      )}
                      {/* {isSubmit && ans.id !== item.id && (
                        <Button
                          type={'link'}
                          size={'small'}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(ans.id as number)
                          }}
                        >
                          <EditOutlined
                            style={{ color: appStyleConfig.color.yellow[6], fontSize: 18 }}
                          />
                        </Button>
                      )} */}
                    </Flex>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!isDone && item?.quiz.type === EQuiz.FILL_IN_BLANK && (
          <div className={classes.fib}>
            <div className={classes.fibWrapper}>
              <Input
                value={respond as string}
                className={clsx(
                  item?.quiz.answer === respond && isSubmit ? 'correct' : '',
                  item?.quiz.answer !== respond && isSubmit ? 'incorrect' : '',
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

      <div className={classes.studySetFooter}>
        {!inProgress && (
          <div className={classes.btnAction}>
            <Button
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
          <div className={classes.btnAction}>
            {!isSubmit && (
              <Button type='primary' onClick={() => onSubmit(item?.quiz.type as EQuiz)}>
                Confirm
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
          <div className={classes.resultReference}>
            <Item data={item as IItem} onEdit={() => onEdit(item?.id as number)} />
          </div>
        )}

        {isSubmit && !isDone && isSubmit && currentIndex + 1 <= list.length && (
          <div className={classes.btnAction}>
            <Button type='default' onClick={() => onNext()}>
              {isDone ? 'Finish' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
