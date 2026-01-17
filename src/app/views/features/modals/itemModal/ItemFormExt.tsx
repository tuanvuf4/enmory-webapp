import { msgErrors } from '@/constant/index'
import { chromeStorage } from '@/extension/storageService'
import globalStyle from '@/style/appStyle'
import { Loading3QuartersOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { defaultSetting, appConfig, EAppType } from '@/config/appConfig'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { transformItemModelToServer, transformItemModelToClient } from '@/helpers/item'
import { isGroupWord } from '@/helpers/validate'
import { ELoading } from '@/models/app.model'
import { IPair, ECategory, EType, IItem } from '@/models/item.model'
import { apiFactory } from '@/services/api/apiFactory'
import { itemAsync } from '@/store/async/item.async'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { InputTag } from '@/views/components/inputTag/inputTag'
import { Level } from '@/views/components/level/level'
import { Reference } from '@/views/features/references/references'
import { theme, Row, Space, Col, Select, AutoComplete, Input, Checkbox, Button } from 'antd'
import _ from 'lodash'
import { useState, useEffect, Suspense } from 'react'
import { useFormContext, useWatch, Controller } from 'react-hook-form'
import { initItem, meaningItem } from '.'
import MeaningItem from './meaningItem'
import styles from './style'
import { useAppDispatch, useAppSelector } from '@/core/hooks'
import clsx from 'clsx'

interface ItemFormProps {
  categories: IPair<string, ECategory>[]
  types: IPair<string, EType>[]
}

export const ItemFormExt: React.FC<ItemFormProps> = ({ categories, types }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const { openNotification } = usePrompt()

  const dispatch = useAppDispatch()

  const [origin, setOrigin] = useState<IItem | null>(null)

  const { user } = useAppSelector((state) => state.auth)

  const { pagination, formSearchValue } = useAppSelector((state) => state.items)
  const { currentItem, onEditEvent, isShowItemModal } = useAppSelector((state) => state.setting)
  const { list } = useAppSelector((state) => state.studySet)

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

  const original = useWatch({ control, name: 'original' })

  const { options, isSearching } = useAutoComplete(original, 'item', false)

  const prepareDataSubmit = (payload: IItem<string[]>): IItem<string> => ({
    userId: user.id,
    ...transformItemModelToServer({ ...payload }),
  })

  const getBatchItem = (data: IItem) => {
    const quickAdd = (data.quickAdd as string[]).map((word) => {
      const itemBase = { ...initItem, original: word }
      return isGroupWord(word)
        ? { ...itemBase, catId: ECategory.PHRASE }
        : { ...itemBase, catId: ECategory.WORD }
    })

    const synonyms = data.meanings.map((meaning) => {
      return meaning.synonyms.map((synonym) => {
        const itemBase = {
          ...initItem,
          original: synonym.trim(),
          catId: isGroupWord(synonym.trim()) ? ECategory.PHRASE : ECategory.WORD,
          meanings: [
            {
              ...meaningItem,
              typeId: isGroupWord(synonym) ? EType.NOUN : meaning.typeId,
              synonyms: [data.original.trim()].concat(
                meaning.synonyms.filter((item) => item.trim() !== synonym.trim()),
              ),
              antonyms: meaning.antonyms,
            },
          ],
        }
        return isGroupWord(synonym)
          ? { ...itemBase, catId: ECategory.PHRASE }
          : { ...itemBase, catId: ECategory.WORD }
      })
    })

    const antonyms = data.meanings.map((meaning) => {
      return meaning.antonyms.map((antonym) => {
        const itemBase = {
          ...initItem,
          original: antonym.trim(),
          catId: isGroupWord(antonym.trim()) ? ECategory.PHRASE : ECategory.WORD,
          meanings: [
            {
              ...meaningItem,
              typeId: isGroupWord(antonym) ? EType.NOUN : meaning.typeId,
              antonyms: [data.original.trim()],
            },
          ],
        }
        return isGroupWord(antonym)
          ? { ...itemBase, catId: ECategory.PHRASE }
          : { ...itemBase, catId: ECategory.WORD }
      })
    })

    return [...quickAdd, ..._.flattenDeep(synonyms), ..._.flattenDeep(antonyms)]
  }

  const handleOk = async () => {
    if (isValid) {
      handleSubmit(async (data: IItem) => {
        const dataSubmit = prepareDataSubmit(data)
        const batch = getBatchItem(data)
        if (onEditEvent) {
          try {
            const updatedItem = await apiFactory.item.updateItem(
              currentItem?.id as number,
              dataSubmit,
            )
            const pr =
              batch.length > 0
                ? [
                    updatedItem,
                    await apiFactory.item.createItems(batch.map((item) => prepareDataSubmit(item))),
                  ]
                : [updatedItem]
            const [{ content }] = await Promise.all(pr)
            const itemUpdated = transformItemModelToClient(content)
            if (list.find((item) => item.id === itemUpdated.id)) {
              dispatch(studySetAction.update(itemUpdated))
            }
            dispatch(itemAction.replace(itemUpdated))
            dispatch(iotdAction.update(itemUpdated))
            dispatch(settingAction.toggleItemModal())
            dispatch(settingAction.setOnEditItem(false))
            reset(initItem)
            openNotification({ type: 'success', message: 'Update item successful!' })
            await dispatch(
              itemAsync.fetchItems({
                ...formSearchValue,
                page: pagination.page,
                size: pagination.size,
              }),
            ).catch(() => {
              openNotification({ type: 'error', message: 'Cannot get item!' })
            })
          } catch (error) {
            openNotification({ type: 'error', message: JSON.stringify(error) })
            dispatch(settingAction.toggleItemModal())
            dispatch(settingAction.setOnEditItem(false))
          } finally {
            reset(initItem)
            setOrigin(null)
            dispatch(settingAction.setCurrentItem(null))
          }
        } else {
          try {
            const createItem = await apiFactory.item.createItem(dataSubmit)
            const pr =
              batch.length > 0
                ? [
                    createItem,
                    await apiFactory.item.createItems(batch.map((item) => prepareDataSubmit(item))),
                  ]
                : [createItem]
            const [{ isSuccess }] = await Promise.all(pr)

            if (isSuccess) {
              dispatch(settingAction.toggleItemModal())
              reset(initItem)
              openNotification({ type: 'success', message: 'Create a item successful!' })
              await dispatch(
                itemAsync.fetchItems({
                  ...formSearchValue,
                  page: pagination.page,
                  size: pagination.size,
                }),
              ).catch((error: unknown) => {
                openNotification({ type: 'error', message: JSON.stringify(error) })
              })
            }
          } catch (error) {
            openNotification({ type: 'error', message: JSON.stringify(error) })
            dispatch(settingAction.toggleItemModal())
          } finally {
            reset({ ...initItem })
            setOrigin(null)
            dispatch(settingAction.setCurrentItem(null))
          }
        }
      })()
    }
  }

  const handleCancel = () => {
    reset(initItem)
    setOrigin(null)
    dispatch(settingAction.toggleItemModal())
    dispatch(settingAction.setOnEditItem(false))
    dispatch(settingAction.setCurrentItem(null))
  }

  const loadItem = (value: string) => {
    const params = {
      keyword: value,
      page: 0,
      size: defaultSetting.numberItemOfAutoComplete * 2,
      exact: true,
    }
    apiFactory.item
      .getItemAutoComplete(params, { headers: { loading: ELoading.YES } })
      .then((response) => {
        dispatch(settingAction.setOnEditItem(true))
        dispatch(
          settingAction.setCurrentItem({
            ...transformItemModelToClient(response.content.data[0]),
          }),
        )
      })
  }

  useEffect(() => {
    trigger()
  }, [])

  useEffect(() => {
    if (!original) {
      setError('original', { type: 'required', message: msgErrors.required })
    } else if (
      onEditEvent &&
      options.length > 0 &&
      original !== origin?.original &&
      options.findIndex((option) => option.value === original) > -1
    ) {
      setError('original', { type: 'existed', message: msgErrors.existed })
    } else clearErrors('original')
  }, [options, original])

  useEffect(() => {
    if (currentItem) {
      setOrigin(currentItem as IItem<string[]>)
      reset(currentItem)
    } else {
      if (appConfig.appType === EAppType.EXTENSION)
        chromeStorage.get(['original']).then((resp) => {
          reset({ ...initItem, original: resp.original || '' })
        })
    }
  }, [currentItem, origin])

  useEffect(() => {
    if (isShowItemModal && !original && !onEditEvent) {
      reset({ ...initItem })
      setError('original', { type: 'required', message: msgErrors.required })
    }

    return () => {
      reset({ ...initItem })
    }
  }, [isShowItemModal, onEditEvent])

  return (
    <form onSubmit={handleSubmit(handleOk)}>
      <Row>
        <Space
          direction='vertical'
          size={[token.size / 2, token.size / 2]}
          className={gClasses.fulWidth}
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
                    className={gClasses.fulWidth}
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
              <label htmlFor=''>Original:</label>
            </Col>

            <Col md={20} xs={24}>
              <Controller
                control={control}
                name={`original`}
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
                      className={clsx(gClasses.fulWidth)}
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
                      onSelect={loadItem}
                      onClear={() => setValue('original', '')}
                    />

                    {invalid && errors.original?.type === 'required' && (
                      <p className={clsx(gClasses.errorMsg, gClasses.textLeft)}>
                        {errors.original?.message as string}
                      </p>
                    )}

                    {invalid && errors.original?.type === 'existed' && (
                      <p className={clsx(gClasses.errorMsg, gClasses.textLeft)}>
                        {errors.original?.message as string}
                      </p>
                    )}
                  </>
                )}
              />

              {original && <Reference original={original} />}
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
                  Forms:
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

              {/* <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
                    <Col md={4} xs={24}>
                      Collocations:
                    </Col>
                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`collocations`}
                        render={() => (
                          <InputTag
                            tags={getValues('collocations')}
                            onChange={(value: string[]) => {
                              setValue('collocations', value)
                            }}
                          />
                        )}
                      />
                    </Col>
                  </Row> */}

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

          <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
            <Col md={4} xs={6}>
              Quick add:
            </Col>

            <Col md={20} xs={18}>
              <Controller
                control={control}
                name={`quickAdd`}
                render={() => (
                  <InputTag
                    tags={getValues('quickAdd') as string[]}
                    onChange={(value: string[]) => setValue('quickAdd', value)}
                    allowSpace={true}
                  />
                )}
              />
            </Col>
          </Row>

          <Suspense fallback={<div>Loading...</div>}>
            <MeaningItem
              origin={original}
              catType={catType as ECategory}
              types={types}
              onSubmit={handleOk}
            />
          </Suspense>
        </Space>
      </Row>

      <Row gutter={[token.size / 2, token.size / 2]}>
        <Col xs={24}>
          <div className={classes.action}>
            <Button htmlType='button' onClick={handleCancel}>
              Cancel
            </Button>

            <Button htmlType='submit' type={'primary'} disabled={!isValid}>
              Save
            </Button>
          </div>
        </Col>
      </Row>
    </form>
  )
}
