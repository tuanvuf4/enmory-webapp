import { msgErrors } from '@/constant/validation'
import { chromeStorage } from '@/extension/storageService'
import appStyle from '@/style/appStyle.module.scss'
import { appConfig, EAppType } from '@/config/appConfig'
import { useAutoComplete } from '@/helpers/hooks/autoComplete'
import { isGroupWord } from '@/helpers/validate'
import { ECategory, IItem, IExample, IMeaning } from '@/models/item.model'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { InputTag, Level, ReviewableTextArea, TagManagerModal } from '@/views/components'
import { Reference } from '@/views/features/references/References'
import { theme, Row, Space, Col, Select, Checkbox, Button, Flex } from 'antd'
import clsx from 'clsx'
import { useEffect, Suspense, useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { initItem } from './data'
import { MeaningItemForm } from './MeaningItemForm'
import styles from './itemModal.module.scss'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { usePrompt } from '@/helpers/hooks'
import { exampleApi, itemApi, tagApi } from '@/services/firebase'
import { Timestamp } from 'firebase/firestore'
import { itemKeys, useCreateItem, useUpdateItem } from '@/core/hooks/useItems'
import { useModal } from '@/context/modal.context'
import { useQueryClient } from '@tanstack/react-query'
import { getMeaningsWithExamples } from '@/helpers/item'
import { validateAndCreateRelatedItems } from './itemValidation'
import { UnorderedListOutlined } from '@ant-design/icons'

interface ItemFormProps {
  item: IItem
}

export const ItemForm: React.FC<ItemFormProps> = ({ item = initItem }) => {
  const { token } = theme.useToken()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)

  const { openNotification } = usePrompt()

  const dispatch = useDispatch()

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
    setValue,
    getValues,
    trigger,
    watch,
    formState: { isValid, errors },
  } = useFormContext<IItem>()

  const catType = watch('catId')

  const origin = getValues('origin')

  const { options, isSearching } = useAutoComplete(
    {
      keyword: origin || '',
    },
    'item',
    false,
  )

  const { closeModal } = useModal()

  const createExample = async (meanings: IMeaning) => {
    const examplePromises = meanings.examples.map(async (example) => ({
      ...(await exampleApi.createExample(example as IExample)).content,
    }))
    return await Promise.all(examplePromises)
  }

  const normalizeUniqueWords = (words: string[] = []) => {
    const map = new Map<string, string>()

    words
      .map((word) => String(word || '').trim())
      .filter(Boolean)
      .forEach((word) => {
        const key = word.toLowerCase()
        if (!map.has(key)) {
          map.set(key, word)
        }
      })

    return Array.from(map.values())
  }

  const isSameWordFamily = (left: string[] = [], right: string[] = []) => {
    const normalize = (values: string[]) =>
      Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))).sort()

    const leftNormalized = normalize(left)
    const rightNormalized = normalize(right)

    if (leftNormalized.length !== rightNormalized.length) return false

    return leftNormalized.every((value, index) => value === rightNormalized[index])
  }

  const syncWordFamilyNetwork = async (savedItem: IItem) => {
    const baseOrigin = String(savedItem.origin || '').trim()
    if (!baseOrigin) return

    const initialFamily = normalizeUniqueWords(savedItem.word_family || []).filter(
      (word) => word.toLowerCase() !== baseOrigin.toLowerCase(),
    )

    if (initialFamily.length === 0) return

    const networkWords = normalizeUniqueWords([baseOrigin, ...initialFamily])

    const fetchedItems = await Promise.all(
      networkWords.map(async (word) => {
        const response = await itemApi.getItems(
          {
            keyword: word,
            page: 0,
            size: 1,
            exact: true,
          },
          undefined,
        )

        if (response.isSuccess && response.content && response.content.length > 0) {
          return response.content[0]
        }

        return null
      }),
    )

    const existingItems = fetchedItems.filter((item): item is IItem => !!item && !!item.id)

    await Promise.all(
      existingItems.map(async (networkItem) => {
        const currentOrigin = String(networkItem.origin || '').trim()
        if (!currentOrigin) return

        const expectedFamily = networkWords.filter(
          (word) => word.toLowerCase() !== currentOrigin.toLowerCase(),
        )

        if (isSameWordFamily(networkItem.word_family || [], expectedFamily)) return

        await itemApi.updateItem(String(networkItem.id), {
          word_family: expectedFamily,
        })
      }),
    )
  }

  const onSubmit = async (data: IItem) => {
    setIsSubmitting(true)

    try {
      try {
        // Validate and auto-create missing related items before API call
        await validateAndCreateRelatedItems(data, user?.uid)

        // Sync latest tags and remove non-existing tags from item before saving
        const tagsResponse = await tagApi.getTags('')
        if (!tagsResponse.isSuccess) {
          throw new Error(tagsResponse.message || 'Failed to validate tags')
        }

        const latestTags = tagsResponse.content || []
        dispatch(
          settingAction.setTags(
            latestTags.map((tag) => ({
              id: tag.id,
              label: tag.value,
              value: tag.value,
            })),
          ),
        )

        const tagLookup = new Map(latestTags.map((tag) => [tag.value_lowercase, tag.value]))
        const normalizedTags = Array.from(
          new Set((data.tags || []).map((tag) => String(tag || '').trim()).filter(Boolean)),
        )

        const validTags = Array.from(
          new Set(
            normalizedTags
              .map((tag) => tagLookup.get(tag.toLowerCase()))
              .filter((tag): tag is string => !!tag),
          ),
        )

        const removedTags = normalizedTags.filter((tag) => !tagLookup.has(tag.toLowerCase()))

        data.tags = validTags
        setValue('tags', validTags)

        if (removedTags.length > 0) {
          openNotification({
            type: 'warning',
            message: `Removed non-existing tags: ${removedTags.join(', ')}`,
          })
        }
      } catch (error) {
        console.error('Error validating related items or syncing tags:', error)
        openNotification({
          type: 'error',
          message: 'Failed to validate related items or sync tags. Please try again.',
        })
        return
      }

      const meanings: Promise<IMeaning>[] =
        data.meanings && data.meanings.length > 0
          ? data.meanings.map(async (meaning) => ({
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
              pronunciation: meaning.pronunciation || { common: '', uk: '', us: '' },
              common: meaning.common || false,
              enable: meaning.enable || false,
              antonyms: meaning.antonyms || [],
              synonyms: meaning.synonyms || [],
              examples:
                ((await createExample(meaning)).map((example) => example.id) as string[]) ?? [],
            }))
          : []

      const dataSubmit: IItem = {
        ...data,
        tags: data.tags || [],
        collocations: data.collocations || [],
        forms: data.forms || [],
        word_family: data.word_family || [],
        relation: data.relation || [],
        meanings: [...(await Promise.all(meanings))],
      }
      if (item?.id) {
        try {
          const { isSuccess, content } = await updateMutation({
            id: String(item?.id),
            data: dataSubmit,
          })

          if (isSuccess && content) {
            try {
              await syncWordFamilyNetwork(content)
            } catch (error: any) {
              openNotification({
                type: 'warning',
                message: error?.message || 'Failed to sync word family network',
              })
            }

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

            closeModal()
            openNotification({ type: 'success', message: 'Update item successful!' })
            // refresh list in library
            await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          }
        } catch (error) {
          openNotification({ type: 'error', message: JSON.stringify(error) })
        }
      } else {
        try {
          const { isSuccess, content } = await createMutation(dataSubmit)
          if (isSuccess) {
            if (content) {
              try {
                await syncWordFamilyNetwork(content)
              } catch (error: any) {
                openNotification({
                  type: 'warning',
                  message: error?.message || 'Failed to sync word family network',
                })
              }
            }

            // refresh list in library
            await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

            closeModal()
            openNotification({ type: 'success', message: 'Create a item successful!' })
          }
        } catch (error) {
          openNotification({ type: 'error', message: JSON.stringify(error) })
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => closeModal()

  const handleOpenTagModal = () => {
    setShowTagModal(true)
  }

  const handleTagUpdated = (previousValue: string, nextValue: string) => {
    const currentTags = getValues('tags') || []
    const nextTags = Array.from(
      new Set(currentTags.map((tag) => (tag === previousValue ? nextValue : tag))),
    )
    setValue('tags', nextTags)
  }

  const handleTagDeleted = (deletedValue: string) => {
    const currentTags = getValues('tags') || []
    setValue(
      'tags',
      currentTags.filter((tag) => tag !== deletedValue),
    )
  }

  const getDefaultCategoryFromOrigin = (value: string) =>
    isGroupWord(value) ? ECategory.PHRASE : ECategory.WORD

  useEffect(() => {
    if (!item?.id && appConfig.appType === EAppType.EXTENSION) {
      chromeStorage.get(['origin', 'catId']).then((resp) => {
        const origin = typeof resp.origin === 'string' ? resp.origin.trim() : ''
        const catId =
          typeof resp.catId === 'number'
            ? (resp.catId as ECategory)
            : getDefaultCategoryFromOrigin(origin)

        reset({ ...initItem, origin, catId })
      })
    }
  }, [item?.id, reset])

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Row>
          <Space
            direction='vertical'
            size={[token.size / 2, token.size / 2]}
            className={appStyle.fulWidth}
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
                      className={appStyle.fulWidth}
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
                    validate: {
                      existed: (value) => {
                        if (!value) return true
                        if (value.trim() === item.origin.trim()) return true

                        const existsInOptions =
                          options.findIndex((opt) => opt.value === value) > -1 &&
                          item.origin !== value

                        if (!existsInOptions) return true

                        return msgErrors.existed
                      },
                    },
                  }}
                  render={({ field: { onChange, value }, fieldState: { invalid } }) => {
                    return (
                      <>
                        <ReviewableTextArea
                          className={clsx(appStyle.fulWidth)}
                          value={value}
                          placeholder='Original'
                          autoSize={{ minRows: 1, maxRows: 3 }}
                          onChange={(nextValue) => {
                            onChange(nextValue)

                            if (isGroupWord(nextValue) && catType === ECategory.WORD)
                              setValue('catId', ECategory.PHRASE)

                            if (!isGroupWord(nextValue)) setValue('catId', ECategory.WORD)

                            trigger('origin')
                          }}
                          onBlur={() => trigger('origin')}
                          language='en'
                          enableReview={true}
                        />

                        {invalid && errors.origin?.type === 'required' && (
                          <p className={clsx(appStyle.errorMsg, appStyle.textLeft)}>
                            {errors.origin?.message as string}
                          </p>
                        )}

                        {invalid && errors.origin?.type === 'existed' && (
                          <p className={clsx(appStyle.errorMsg, appStyle.textLeft)}>
                            {errors.origin?.message as string}
                          </p>
                        )}
                      </>
                    )
                  }}
                />

                {origin && <Reference style={{ marginTop: token.size / 2 }} origin={origin} />}
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

            <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
              <Col md={4} xs={6}>
                <Flex align={'center'} gap={token.size / 2}>
                  <span>Tags:</span>
                  <Button
                    size={'small'}
                    icon={<UnorderedListOutlined />}
                    onClick={handleOpenTagModal}
                  />
                </Flex>
              </Col>

              <Col md={20} xs={18}>
                <Controller
                  control={control}
                  name={`tags`}
                  render={() => (
                    <InputTag
                      suggestType='tag'
                      tags={getValues('tags') || []}
                      onChange={(value: string[]) => {
                        setValue('tags', value)
                      }}
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
                          tags={getValues('forms') || []}
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
                          tags={getValues('word_family') || []}
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
                      tags={getValues('relation') || []}
                      onChange={(value: string[]) => {
                        setValue('relation', value)
                      }}
                    />
                  )}
                />
              </Col>
            </Row>

            <Suspense fallback={<div>Loading...</div>}>
              <MeaningItemForm
                loading={!isValid || isSubmitting || isCreating || isUpdating}
                origin={origin}
                catType={catType as ECategory}
                onSubmit={() => handleSubmit(onSubmit)()}
              />
            </Suspense>
          </Space>
        </Row>

        <Row gutter={[token.size / 2, token.size / 2]}>
          <Col xs={24}>
            <div className={styles.action}>
              <Button htmlType='button' onClick={handleCancel}>
                Cancel
              </Button>

              <Button
                loading={isSubmitting || isCreating || isUpdating}
                disabled={!isValid || isSubmitting || isCreating || isUpdating || isSearching}
                type={'primary'}
                onClick={() => handleSubmit(onSubmit)()}
              >
                Save
              </Button>
            </div>
          </Col>
        </Row>
      </form>

      <TagManagerModal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        onTagUpdated={handleTagUpdated}
        onTagDeleted={handleTagDeleted}
      />
    </>
  )
}
