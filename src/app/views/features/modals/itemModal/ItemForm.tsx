import { msgErrors } from '@/constant/validation'
import { chromeStorage } from '@/extension/storageService'
import globalStyle from '@/style/appStyle'
import { appConfig, EAppType } from '@/config/appConfig'
import { useAutoComplete } from '@/helpers/hooks/autoComplete'
import { isGroupWord } from '@/helpers/validate'
import { ECategory, IItem, IExample, IMeaning } from '@/models/item.model'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { InputTag } from '@/views/components'
import { Level } from '@/views/components'
import { Reference } from '@/views/features/references/References'
import { theme, Row, Space, Col, Select, AutoComplete, Input, Checkbox, Button } from 'antd'
import clsx from 'clsx'
import { useState, useEffect, Suspense } from 'react'
import { useFormContext, useWatch, Controller } from 'react-hook-form'
import { initItem } from './data'
import { MeaningItemForm } from './MeaningItemForm'
import styles from './style'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { CloseCircleOutlined, Loading3QuartersOutlined } from '@ant-design/icons'
import { usePrompt } from '@/helpers/hooks'
import { exampleApi } from '@/services/firebase'
import { Timestamp } from 'firebase/firestore'
import { itemKeys, useCreateItem, useUpdateItem } from '@/core/hooks/useItems'
import { useModal } from '@/context/modal.context'
import { useQueryClient } from '@tanstack/react-query'
import { getMeaningsWithExamples } from '@/helpers/item'

interface ItemFormProps {
  mode: 'add' | 'edit'
  item: IItem
}

export const ItemForm: React.FC<ItemFormProps> = ({ mode, item }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const globalClasses = globalStyle()

  const { openNotification } = usePrompt()

  const dispatch = useDispatch()

  const [origin, setOrigin] = useState<IItem | null>(null)

  const { user } = useSelector((state) => state.auth)
  const { categories } = useSelector((state) => state.setting)
  const { list } = useSelector((state) => state.studySet)

  // React Query mutations
  const { isPending: isCreating, mutateAsync: createMutation } = useCreateItem()
  const { isPending: isUpdating, mutateAsync: updateMutation } = useUpdateItem()

  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    reset,
    trigger,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { isValid, errors },
  } = useFormContext<IItem>()

  const catType = useWatch({
    control,
    name: 'catId',
    defaultValue: ECategory.WORD,
  })

  const original = useWatch({ control, name: 'origin' })

  const { options, isSearching } = useAutoComplete(original, 'item', false)

  const { closeModal } = useModal()

  const createExample = async (meanings: IMeaning) => {
    const examplePromises = meanings.examples.map(async (example) => ({
      ...(await exampleApi.createExample(example as IExample)).content,
    }))
    return await Promise.all(examplePromises)
  }

  const onSubmit = async () => {
    if (isValid) {
      handleSubmit(async (data: IItem) => {
        const meanings = []
        if (data.meanings && data.meanings.length > 0) {
          const meaningPromises: Promise<IMeaning>[] = data.meanings.map(async (meaning) => {
            return {
              ...meaning,
              itemId: data.id || '',
              uid: user?.uid || '',
              created_date: Timestamp.now().toMillis(),
              last_update: Timestamp.now().toMillis(),
              note: meaning.note || '',
              collocations: meaning.collocations || '',
              grammar: meaning.grammar || '',
              definition: meaning.definition || '',
              translation: meaning.translation || '',
              pronunciation: meaning.pronunciation || { audio: '', uk: '', us: '' },
              common: meaning.common || false,
              enable: meaning.enable || true,
              antonyms: meaning.antonyms || [],
              synonyms: meaning.synonyms || [],
              examples:
                ((await createExample(meaning)).map((example) => example.id) as string[]) ?? [],
            }
          })
          meanings.push(...(await Promise.all(meaningPromises)))
        }
        const dataSubmit: IItem<string[]> = {
          ...data,
          collocations: data.collocations || [],
          forms: data.forms || [],
          word_family: data.word_family || [],
          relation: data.relation || [],
          meanings: meanings,
        }

        if (mode === 'edit') {
          try {
            const { isSuccess, content } = await updateMutation({
              id: String(item?.id),
              data: dataSubmit,
            })

            if (isSuccess && content) {
              const meaningsWithExamples = await getMeaningsWithExamples(content.meanings || [])

              const itemUpdated = {
                ...content,
                meanings: meaningsWithExamples,
              }
              // update item in study set
              if (itemUpdated && list.find((item) => item.id === itemUpdated.id)) {
                dispatch(studySetAction.update(itemUpdated))
              }
              // update iotd item
              dispatch(iotdAction.update(itemUpdated))

              // refresh list in library
              await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

              closeModal()
              openNotification({ type: 'success', message: 'Update item successful!' })
            }
          } catch (error) {
            openNotification({ type: 'error', message: JSON.stringify(error) })
          } finally {
            setOrigin(null)
          }
        } else {
          try {
            const { isSuccess } = await createMutation(dataSubmit)
            if (isSuccess) {
              // refresh list in library
              await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

              closeModal()
              openNotification({ type: 'success', message: 'Create a item successful!' })
            }
          } catch (error) {
            openNotification({ type: 'error', message: JSON.stringify(error) })
          } finally {
            setOrigin(null)
          }
        }
      })()
    }
  }

  const handleCancel = () => {
    setOrigin(null)
    closeModal()
  }

  useEffect(() => {
    if (mode === 'edit' && item) setOrigin(item as IItem<string[]>)
    trigger()
  }, [])

  useEffect(() => {
    if (!original) {
      setError('origin', { type: 'required', message: msgErrors.required })
    } else if (
      mode === 'edit' &&
      options.length > 0 &&
      original !== origin?.origin &&
      options.findIndex((option) => option.value === original) > -1
    ) {
      setError('origin', { type: 'existed', message: msgErrors.existed })
    } else clearErrors('origin')
  }, [options, original])

  useEffect(() => {
    if (item) {
      setOrigin(item as IItem<string[]>)
      reset(item)
    } else {
      if (appConfig.appType === EAppType.EXTENSION)
        chromeStorage.get(['origin']).then((resp) => {
          reset({ ...initItem, origin: resp.origin || '' })
        })
    }
  }, [item, origin])

  useEffect(() => {
    if (!original && mode !== 'edit') {
      reset({ ...initItem })
      setError('origin', { type: 'required', message: msgErrors.required })
    }

    return () => {
      reset({ ...initItem })
    }
  }, [mode, item])

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ padding: token.size }}>
      <Row>
        <Space
          direction='vertical'
          size={[token.size / 2, token.size / 2]}
          className={globalClasses.fulWidth}
        >
          <Row align={'middle'}>
            <Col md={4} xs={12}>
              <label htmlFor=''>Type:</label>
            </Col>

            <Col md={4} xs={12}>
              <Controller
                control={control}
                name={`catId`}
                render={({ field: { onChange, value, ref } }) => (
                  <Select
                    ref={ref}
                    className={globalClasses.fulWidth}
                    onChange={onChange}
                    options={categories}
                    value={value}
                    defaultValue={ECategory.WORD}
                  />
                )}
              />
            </Col>
          </Row>

          <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
            <Col md={4} xs={24}>
              <label htmlFor=''>Origin:</label>
            </Col>

            <Col md={20} xs={24}>
              <Controller
                control={control}
                name={`origin`}
                rules={{
                  required: {
                    value: true,
                    message: msgErrors.required,
                  },
                }}
                render={({ field: { onChange, value }, fieldState: { invalid } }) => (
                  <>
                    <AutoComplete
                      value={value}
                      className={clsx(globalClasses.fulWidth)}
                      options={options}
                      children={
                        <Input
                          value={value}
                          placeholder='Original'
                          suffix={isSearching ? <Loading3QuartersOutlined spin /> : undefined}
                          allowClear={
                            isSearching
                              ? false
                              : {
                                  clearIcon: (
                                    <CloseCircleOutlined
                                      style={{
                                        background: token.colorWhite,
                                        padding: token.size / 4,
                                        borderRadius: '50%',
                                        color: token.colorBgLayout,
                                        fontSize: 14,
                                      }}
                                    />
                                  ),
                                }
                          }
                          onChange={(e) => {
                            onChange(e)
                            if (isGroupWord(e.target.value) && catType === ECategory.WORD)
                              setValue('catId', ECategory.PHRASE)

                            if (!isGroupWord(e.target.value)) setValue('catId', ECategory.WORD)
                          }}
                        />
                      }
                      onClear={() => setValue('origin', '')}
                    />

                    {invalid && errors.origin?.type === 'required' && (
                      <p className={clsx(globalClasses.errorMsg, globalClasses.textLeft)}>
                        {errors.origin?.message as string}
                      </p>
                    )}

                    {invalid && errors.origin?.type === 'existed' && (
                      <p className={clsx(globalClasses.errorMsg, globalClasses.textLeft)}>
                        {errors.origin?.message as string}
                      </p>
                    )}
                  </>
                )}
              />

              {original && <Reference origin={original} />}
            </Col>
          </Row>

          <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
            <Col md={{ span: 10, offset: 4 }} xs={{ span: 12 }}>
              <Row gutter={[token.size / 2, token.size / 2]}>
                <Col span={24}>
                  <Controller
                    control={control}
                    name={`archive`}
                    render={({ field: { onChange, value } }) => (
                      <Checkbox
                        checked={value}
                        onChange={(e) => {
                          onChange(e.target.checked)
                        }}
                      >
                        Archive
                      </Checkbox>
                    )}
                  />
                </Col>

                <Col span={24}>
                  <Controller
                    control={control}
                    name={`favorite`}
                    render={({ field: { onChange, value } }) => (
                      <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)}>
                        Favorite
                      </Checkbox>
                    )}
                  />
                </Col>
              </Row>
            </Col>

            <Col md={{ span: 10 }} xs={{ span: 12 }}>
              <Controller
                control={control}
                name={`level`}
                render={() => (
                  <Level
                    level={getValues('level')}
                    disabled={false}
                    size={18}
                    onChange={(rate) => setValue('level', rate)}
                  />
                )}
              />
            </Col>
          </Row>

          {catType === ECategory.WORD && (
            <>
              <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
                <Col md={4} xs={6}>
                  Form:
                </Col>

                <Col md={20} xs={18}>
                  <Controller
                    control={control}
                    name={`forms`}
                    render={() => (
                      <InputTag
                        tags={getValues('forms')}
                        onChange={(value: string[]) => {
                          setValue('forms', value)
                        }}
                      />
                    )}
                  />
                </Col>
              </Row>

              <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
                <Col md={4} xs={6}>
                  Family:
                </Col>

                <Col md={20} xs={18}>
                  <Controller
                    control={control}
                    name={`word_family`}
                    render={() => (
                      <InputTag
                        tags={getValues('word_family')}
                        allowSpace={false}
                        onChange={(value: string[]) => {
                          setValue('word_family', value)
                        }}
                      />
                    )}
                  />
                </Col>
              </Row>
            </>
          )}

          <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
            <Col md={4} xs={6}>
              Relation:
            </Col>

            <Col md={20} xs={18}>
              <Controller
                control={control}
                name={`relation`}
                render={() => (
                  <InputTag
                    tags={getValues('relation')}
                    onChange={(value: string[]) => {
                      setValue('relation', value)
                    }}
                  />
                )}
              />
            </Col>
          </Row>

          <Suspense fallback={<div>Loading...</div>}>
            <MeaningItemForm origin={original} catType={catType as ECategory} onSubmit={onSubmit} />
          </Suspense>
        </Space>
      </Row>

      <Row gutter={[token.size / 2, token.size / 2]}>
        <Col xs={24}>
          <div className={classes.action}>
            <Button htmlType='button' onClick={handleCancel}>
              Cancel
            </Button>

            <Button
              loading={isCreating || isUpdating}
              htmlType='submit'
              type={'primary'}
              disabled={!isValid || isCreating || isUpdating}
            >
              Save
            </Button>
          </div>
        </Col>
      </Row>
    </form>
  )
}
