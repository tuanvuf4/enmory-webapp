import appStyle from '@/style/appStyle.module.scss'
import { appConfig, appSetting } from '@/config/appConfig'
import { useSelector, useDispatch } from '@/core/hooks'
import { IUserConfig } from '@/models/user.model'
import { apiUser } from '@/services/firebase/api/user.api'
import { authAction } from '@/store/reducers/auth.reducer'
import { theme, CheckboxOptionType, Row, Col, Space, Select, Checkbox, Button, Table } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { usePrompt } from '@/helpers/hooks'

const Setting = () => {
  const { token } = theme.useToken()
  const { message } = usePrompt()

  // User info comes from Firebase auth state
  const { user } = useSelector((state) => state.auth)

  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<string>('')

  const handleMigrateKeywords = async () => {
    setIsMigrating(true)
    setMigrationStatus('Starting migration...')
    try {
      const currentUser = user
      if (!currentUser) {
        throw new Error('You must be logged in to migrate data.')
      }

      const { collection, getDocs, writeBatch } = await import('firebase/firestore')
      const { db } = await import('@/config/firebaseConfig')
      const { extractKeywords } = await import('@/helpers/item')

      // 1. Migrate items
      setMigrationStatus('Migrating items...')
      const itemsSnapshot = await getDocs(collection(db, 'items'))
      let itemsBatch = writeBatch(db)
      let itemsCount = 0
      let itemsProcessed = 0

      for (const document of itemsSnapshot.docs) {
        const itemData = document.data()
        const text = itemData.origin || ''
        const keywords = extractKeywords(text)
        const lowercase = text.toLowerCase()

        itemsBatch.update(document.ref, {
          keywords,
          origin_lowercase: lowercase,
        })
        itemsCount++
        itemsProcessed++

        if (itemsProcessed === 400) {
          await itemsBatch.commit()
          itemsBatch = writeBatch(db)
          itemsProcessed = 0
        }
      }
      if (itemsProcessed > 0) {
        await itemsBatch.commit()
      }
      setMigrationStatus(`Successfully migrated ${itemsCount} items.`)

      // 2. Migrate examples
      setMigrationStatus('Migrating examples...')
      const examplesSnapshot = await getDocs(collection(db, 'examples'))
      let examplesBatch = writeBatch(db)
      let examplesCount = 0
      let examplesProcessed = 0

      for (const document of examplesSnapshot.docs) {
        const exampleData = document.data()
        const text = exampleData.origin || ''
        const keywords = extractKeywords(text)
        const lowercase = text.toLowerCase()

        examplesBatch.update(document.ref, {
          keywords,
          origin_lowercase: lowercase,
        })
        examplesCount++
        examplesProcessed++

        if (examplesProcessed === 400) {
          await examplesBatch.commit()
          examplesBatch = writeBatch(db)
          examplesProcessed = 0
        }
      }
      if (examplesProcessed > 0) {
        await examplesBatch.commit()
      }
      setMigrationStatus(`Successfully migrated ${examplesCount} examples.`)

      // 3. Migrate articles
      setMigrationStatus('Migrating articles...')
      const articlesSnapshot = await getDocs(collection(db, 'articles'))
      let articlesBatch = writeBatch(db)
      let articlesCount = 0
      let articlesProcessed = 0

      for (const document of articlesSnapshot.docs) {
        const articleData = document.data()
        const text = articleData.title || ''
        const keywords = extractKeywords(text)
        const lowercase = text.toLowerCase()

        articlesBatch.update(document.ref, {
          keywords,
          title_lowercase: lowercase,
        })
        articlesCount++
        articlesProcessed++

        if (articlesProcessed === 400) {
          await articlesBatch.commit()
          articlesBatch = writeBatch(db)
          articlesProcessed = 0
        }
      }
      if (articlesProcessed > 0) {
        await articlesBatch.commit()
      }

      message({
        type: 'success',
        content: `Migration complete! Updated ${itemsCount} items, ${examplesCount} examples, ${articlesCount} articles.`,
      })
      setMigrationStatus(
        `Migration complete! Updated ${itemsCount} items, ${examplesCount} examples, ${articlesCount} articles.`,
      )
    } catch (error) {
      console.error('Migration error:', error)
      message({
        type: 'error',
        content: error instanceof Error ? error.message : 'Migration failed',
      })
      setMigrationStatus('Migration failed. Check console for details.')
    } finally {
      setIsMigrating(false)
    }
  }

  const [isDeduplicating, setIsDeduplicating] = useState(false)
  const [deduplicateStatus, setDeduplicateStatus] = useState<string>('')
  const [deletedExamples, setDeletedExamples] = useState<
    { id: string; origin: string; translation: string }[]
  >([])

  const handleDeduplicateExamples = async () => {
    setIsDeduplicating(true)
    setDeduplicateStatus('Starting deduplication...')
    setDeletedExamples([])
    try {
      const currentUser = user
      if (!currentUser) {
        throw new Error('You must be logged in to migrate data.')
      }

      const { collection, getDocs, writeBatch } = await import('firebase/firestore')
      const { db } = await import('@/config/firebaseConfig')

      // 1. Fetch all examples and find duplicates by origin text
      setDeduplicateStatus('Fetching examples...')
      const examplesSnapshot = await getDocs(collection(db, 'examples'))

      const examplesMap: Record<
        string,
        { id: string; ref: any; origin: string; translation: string }[]
      > = {}
      for (const document of examplesSnapshot.docs) {
        const data = document.data()
        const origin = (data.origin || '').trim()
        const originLower = origin.toLowerCase()
        if (!originLower) continue

        if (!examplesMap[originLower]) {
          examplesMap[originLower] = []
        }
        examplesMap[originLower].push({
          id: document.id,
          ref: document.ref,
          origin: data.origin || '',
          translation: data.translation || '',
        })
      }

      // Identify duplicate IDs and map them to the kept ID
      const duplicateIdMap: Record<string, string> = {}
      const docsToDelete: any[] = []
      const deletedList: { id: string; origin: string; translation: string }[] = []
      let duplicateDocsCount = 0

      for (const originLower in examplesMap) {
        const group = examplesMap[originLower]
        if (group.length > 1) {
          const keepDoc = group[0]
          for (let i = 1; i < group.length; i++) {
            duplicateIdMap[group[i].id] = keepDoc.id
            docsToDelete.push(group[i].ref)
            deletedList.push({
              id: group[i].id,
              origin: group[i].origin,
              translation: group[i].translation,
            })
            duplicateDocsCount++
          }
        }
      }

      setDeduplicateStatus(
        `Found ${duplicateDocsCount} duplicate examples. Fetching items to update references...`,
      )

      // 2. Fetch all items to clean up their referenced example IDs
      const itemsSnapshot = await getDocs(collection(db, 'items'))
      let itemsBatch = writeBatch(db)
      let itemsUpdatedCount = 0
      let itemsProcessed = 0

      for (const document of itemsSnapshot.docs) {
        const itemData = document.data()
        const meanings = itemData.meanings || []
        let itemChanged = false

        const updatedMeanings = meanings.map((meaning: any) => {
          const examples = meaning.examples || []
          if (examples.length === 0) return meaning

          // Replace duplicate IDs with kept IDs and deduplicate list
          const mappedIds = examples.map((id: string) => duplicateIdMap[id] || id)
          const uniqueIds = Array.from(new Set(mappedIds)) as string[]

          if (JSON.stringify(examples) !== JSON.stringify(uniqueIds)) {
            itemChanged = true
            return {
              ...meaning,
              examples: uniqueIds,
            }
          }
          return meaning
        })

        if (itemChanged) {
          itemsBatch.update(document.ref, { meanings: updatedMeanings })
          itemsUpdatedCount++
          itemsProcessed++

          if (itemsProcessed === 400) {
            await itemsBatch.commit()
            itemsBatch = writeBatch(db)
            itemsProcessed = 0
          }
        }
      }

      if (itemsProcessed > 0) {
        await itemsBatch.commit()
      }

      // 3. Delete duplicate example documents from Firestore
      setDeduplicateStatus(
        `Updated ${itemsUpdatedCount} items. Deleting duplicate example documents...`,
      )

      let deleteBatch = writeBatch(db)
      let deletedCount = 0
      let deleteProcessed = 0

      for (const docRef of docsToDelete) {
        deleteBatch.delete(docRef)
        deletedCount++
        deleteProcessed++

        if (deleteProcessed === 400) {
          await deleteBatch.commit()
          deleteBatch = writeBatch(db)
          deleteProcessed = 0
        }
      }

      if (deleteProcessed > 0) {
        await deleteBatch.commit()
      }

      setDeletedExamples(deletedList)
      message({
        type: 'success',
        content: `Deduplication complete! Deleted ${deletedCount} duplicate examples, updated references in ${itemsUpdatedCount} items.`,
      })
      setDeduplicateStatus(
        `Deduplication complete! Deleted ${deletedCount} duplicate examples, updated references in ${itemsUpdatedCount} items.`,
      )
    } catch (error) {
      console.error('Deduplication error:', error)
      message({
        type: 'error',
        content: error instanceof Error ? error.message : 'Deduplication failed',
      })
      setDeduplicateStatus('Deduplication failed. Check console for details.')
    } finally {
      setIsDeduplicating(false)
    }
  }

  const { control, handleSubmit, reset } = useForm<IUserConfig>({
    defaultValues: user?.configuration || appSetting.meta,
  })

  useEffect(() => {
    if (user?.configuration) {
      reset(user.configuration)
    }
  }, [user?.configuration, reset])

  const onSubmit = async (data: IUserConfig) => {
    setIsLoading(true)
    try {
      const result = await apiUser.updateUserConfig(data)

      if (result.isSuccess) {
        message({
          type: 'success',
          content: 'Settings saved successfully!',
        })

        // Update user configuration in Redux store
        dispatch(authAction.updateUserConfig(data))
      } else {
        message({
          type: 'error',
          content: result.message || 'Failed to save settings',
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      message({
        type: 'error',
        content: 'Failed to save settings. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const plainOptions: CheckboxOptionType[] = appConfig.references.map((refs) => {
    return {
      label: refs.src,
      value: refs.id,
    }
  })

  return (
    <div className={appStyle.container}>
      <h2 className={appStyle.pageTitle}>Settings</h2>

      <div className={clsx(appStyle.bodyContent)}>
        <Row className={appStyle.innerContainer}>
          <Col xs={24}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Space direction='vertical' style={{ display: 'flex' }} size={token.size}>
                <Row align={'top'} gutter={[token.size, token.size]}>
                  <Col xs={24} md={8}>
                    <h3>Study Set</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4>Number Of Words:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfWordsInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfWordsInStudySet}
                                onChange={onChange}
                                options={appSetting.options}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4>Number Of Phrases:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfPhraseInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfPhraseInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4>Number Of Idioms:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfIdiomInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfIdiomInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4>Number Of Slang:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfSlangInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfSlangInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4>Number Of Collocations:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfCollocationsInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfCollocationsInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4>Number Of Sentences:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfSentencesInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfSentencesInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4>Number Of Example:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfExampleReview`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfExampleReview}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <Row align={'middle'} gutter={[token.size, token.size]}>
                  <Col xs={24} md={8}>
                    <h3>Community</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4>Enable Community:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`community`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Checkbox
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                              >
                                {value ? 'Yes' : 'No'}
                              </Checkbox>
                            )
                          }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <Row align={'middle'} gutter={[token.size, token.size]}>
                  <Col xs={24} md={8}>
                    <h3>Player</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4>Show Player:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`showPlayer`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Checkbox
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                              >
                                {value ? 'Yes' : 'No'}
                              </Checkbox>
                            )
                          }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <Row align={'top'} gutter={[token.size, token.size]}>
                  <Col xs={24} md={8}>
                    <h3>References</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'top'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4>References:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`references`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Checkbox.Group
                                options={plainOptions}
                                value={value}
                                onChange={(e) => onChange(e)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: token.size * 0.5,
                                }}
                              >
                                Active
                              </Checkbox.Group>
                            )
                          }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {import.meta.env.DEV && (
                  <>
                    <hr
                      style={{
                        border: '0',
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        margin: '20px 0',
                      }}
                    />
                    <Row align={'top'} gutter={[token.size, token.size]}>
                      <Col xs={24} md={8}>
                        <h3>Developer Tools</h3>
                      </Col>

                      <Col xs={24} md={16}>
                        <Space direction='vertical' style={{ width: '100%' }} size={token.size / 2}>
                          <Button
                            type='dashed'
                            danger
                            onClick={handleMigrateKeywords}
                            loading={isMigrating}
                          >
                            Migrate Keywords Array (items, examples, articles)
                          </Button>
                          {migrationStatus && (
                            <div
                              style={{
                                fontSize: '13px',
                                color: token.colorTextDescription,
                              }}
                            >
                              {migrationStatus}
                            </div>
                          )}

                          <Button
                            type='dashed'
                            danger
                            onClick={handleDeduplicateExamples}
                            loading={isDeduplicating}
                          >
                            Deduplicate Examples (Delete duplicates, keep 1)
                          </Button>
                          {deduplicateStatus && (
                            <div
                              style={{
                                fontSize: '13px',
                                color: token.colorTextDescription,
                              }}
                            >
                              {deduplicateStatus}
                            </div>
                          )}

                          {deletedExamples.length > 0 && (
                            <div style={{ marginTop: 12, width: '100%' }}>
                              <h4 style={{ marginBottom: 8, color: token.colorText }}>
                                Deleted Duplicates:
                              </h4>
                              <Table
                                dataSource={deletedExamples}
                                columns={[
                                  {
                                    title: 'ID',
                                    dataIndex: 'id',
                                    key: 'id',
                                    width: '25%',
                                  },
                                  {
                                    title: 'Origin',
                                    dataIndex: 'origin',
                                    key: 'origin',
                                    width: '45%',
                                  },
                                  {
                                    title: 'Translation',
                                    dataIndex: 'translation',
                                    key: 'translation',
                                    width: '30%',
                                  },
                                ]}
                                rowKey='id'
                                pagination={{ pageSize: 5 }}
                                size='small'
                                bordered
                              />
                            </div>
                          )}
                        </Space>
                      </Col>
                    </Row>
                  </>
                )}

                <div className={'text-center'} style={{ marginTop: token.size }}>
                  <Button
                    type='primary'
                    htmlType='submit'
                    loading={isLoading}
                    style={{
                      minWidth: 250,
                    }}
                  >
                    Save
                  </Button>
                </div>
              </Space>
            </form>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Setting
