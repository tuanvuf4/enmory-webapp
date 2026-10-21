import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Card,
  Tabs,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Spin,
  message,
  Statistic,
  Select,
  theme,
  Alert,
  Tooltip,
  Table,
} from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  DatabaseOutlined,
  CheckOutlined,
  CodeOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  ApiOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { useSelector } from '@/core/hooks'
import { localDb } from '@/services/localDb'
import { IItem, IExample } from '@/models/item.model'
import { ISyncMeta } from '@/services/localDb/db'

const { Text, Paragraph } = Typography

type TableType = 'all' | 'items' | 'examples' | 'syncMeta'

export const Developer: React.FC = () => {
  const { token } = theme.useToken()

  // Guard: Dev mode only
  if (!import.meta.env.DEV) {
    return <Navigate to='/page_not_found' replace />
  }

  const { user } = useSelector((state) => state.auth)

  // Main page tab: 'local-db' | 'firebase-tools'
  const [mainTab, setMainTab] = useState<string>('local-db')

  // ================= Local DB State =================
  const [loading, setLoading] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<TableType>('all')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [limit, setLimit] = useState<number | 'all'>(50)
  const [page, setPage] = useState<number>(1)

  const [items, setItems] = useState<IItem[]>([])
  const [examples, setExamples] = useState<IExample[]>([])
  const [syncMeta, setSyncMeta] = useState<ISyncMeta[]>([])

  // ================= Firebase Integration State =================
  const [isDeduplicating, setIsDeduplicating] = useState<boolean>(false)
  const [deduplicateStatus, setDeduplicateStatus] = useState<string>('')
  const [deletedExamples, setDeletedExamples] = useState<
    { id: string; origin: string; translation: string }[]
  >([])

  const [isIntegrating, setIsIntegrating] = useState<boolean>(false)
  const [integrationStatus, setIntegrationStatus] = useState<string>('')

  const [isRemovingLegacyFields, setIsRemovingLegacyFields] = useState<boolean>(false)
  const [removeLegacyFieldsStatus, setRemoveLegacyFieldsStatus] = useState<string>('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [loadedItems, loadedExamples, loadedSyncMeta] = await Promise.all([
        localDb.items.toArray(),
        localDb.examples.toArray(),
        localDb.syncMeta.toArray(),
      ])

      setItems(loadedItems)
      setExamples(loadedExamples)
      setSyncMeta(loadedSyncMeta)
    } catch (err) {
      console.error('Failed to load local database:', err)
      message.error(
        'Failed to load local database: ' + (err instanceof Error ? err.message : String(err)),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter items by search keyword
  const filteredItems = useMemo(() => {
    if (!searchKeyword.trim()) return items
    const kw = searchKeyword.toLowerCase()
    return items.filter((item) => {
      const originMatch = (item.origin || '').toLowerCase().includes(kw)
      const tagsMatch = (item.tags || []).some((t) => (t || '').toLowerCase().includes(kw))
      const meaningMatch = (item.meanings || []).some(
        (m) =>
          (m.definition || '').toLowerCase().includes(kw) ||
          (m.translation || '').toLowerCase().includes(kw),
      )
      return originMatch || tagsMatch || meaningMatch
    })
  }, [items, searchKeyword])

  // Filter examples by search keyword
  const filteredExamples = useMemo(() => {
    if (!searchKeyword.trim()) return examples
    const kw = searchKeyword.toLowerCase()
    return examples.filter(
      (ex) =>
        (ex.origin || '').toLowerCase().includes(kw) ||
        (ex.translation || '').toLowerCase().includes(kw),
    )
  }, [examples, searchKeyword])

  // Filter syncMeta by search keyword
  const filteredSyncMeta = useMemo(() => {
    if (!searchKeyword.trim()) return syncMeta
    const kw = searchKeyword.toLowerCase()
    return syncMeta.filter((meta) => (meta.key || '').toLowerCase().includes(kw))
  }, [syncMeta, searchKeyword])

  // Get active dataset
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'items':
        return filteredItems
      case 'examples':
        return filteredExamples
      case 'syncMeta':
        return filteredSyncMeta
      case 'all':
      default:
        return {
          _database: 'EnmoryLocalDB',
          _version: 1,
          _exported_at: new Date().toISOString(),
          _counts: {
            items: filteredItems.length,
            examples: filteredExamples.length,
            syncMeta: filteredSyncMeta.length,
          },
          items: filteredItems,
          examples: filteredExamples,
          syncMeta: filteredSyncMeta,
        }
    }
  }, [activeTab, filteredItems, filteredExamples, filteredSyncMeta])

  // Apply pagination / slice if an array
  const paginatedDataset = useMemo(() => {
    if (activeTab === 'all' || !Array.isArray(activeDataset)) {
      return activeDataset
    }
    if (limit === 'all') {
      return activeDataset
    }
    const start = (page - 1) * limit
    return activeDataset.slice(start, start + limit)
  }, [activeTab, activeDataset, limit, page])

  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(paginatedDataset, null, 2)
    } catch (err) {
      return 'Error serializing to JSON: ' + String(err)
    }
  }, [paginatedDataset])

  const totalCount = useMemo(() => {
    switch (activeTab) {
      case 'items':
        return filteredItems.length
      case 'examples':
        return filteredExamples.length
      case 'syncMeta':
        return filteredSyncMeta.length
      default:
        return filteredItems.length + filteredExamples.length + filteredSyncMeta.length
    }
  }, [activeTab, filteredItems.length, filteredExamples.length, filteredSyncMeta.length])

  const totalPages = useMemo(() => {
    if (limit === 'all' || activeTab === 'all') return 1
    return Math.max(1, Math.ceil(totalCount / limit))
  }, [limit, activeTab, totalCount])

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    message.success('JSON copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const filename = `local-db-${activeTab}-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`Downloaded ${filename}`)
  }

  // ================= Firebase Integration Handlers =================
  const handleIntegrateExamples = async () => {
    setIsIntegrating(true)
    setIntegrationStatus('Starting Firebase DB integration...')
    try {
      const currentUser = user
      if (!currentUser) {
        throw new Error('You must be logged in to migrate data.')
      }

      const { integrateFirebaseDbExamples } = await import('@/services/firebase/dbIntegration')
      const result = await integrateFirebaseDbExamples({
        uid: currentUser.uid,
        onProgress: (status) => setIntegrationStatus(status),
      })

      if (result.isSuccess) {
        message.success(result.message)
        setIntegrationStatus(result.message)
      } else {
        message.error(result.message)
        setIntegrationStatus(result.message)
      }
    } catch (error) {
      console.error('Integration error:', error)
      message.error(error instanceof Error ? error.message : 'Integration failed')
      setIntegrationStatus('Integration failed. Check console for details.')
    } finally {
      setIsIntegrating(false)
    }
  }

  const handleRemoveLegacyFields = async () => {
    setIsRemovingLegacyFields(true)
    setRemoveLegacyFieldsStatus('Starting legacy fields (keywords & origin_lowercase) removal...')
    try {
      const currentUser = user
      if (!currentUser) {
        throw new Error('You must be logged in to modify data.')
      }

      const { removeLegacyFieldsFromFirebaseDb } = await import('@/services/firebase/dbIntegration')
      const result = await removeLegacyFieldsFromFirebaseDb({
        uid: currentUser.uid,
        onProgress: (status) => setRemoveLegacyFieldsStatus(status),
      })

      if (result.isSuccess) {
        message.success(result.message)
        setRemoveLegacyFieldsStatus(result.message)
      } else {
        message.error(result.message)
        setRemoveLegacyFieldsStatus(result.message)
      }
    } catch (error) {
      console.error('Remove legacy fields error:', error)
      message.error(error instanceof Error ? error.message : 'Failed to remove legacy fields')
      setRemoveLegacyFieldsStatus('Failed to remove legacy fields. Check console for details.')
    } finally {
      setIsRemovingLegacyFields(false)
    }
  }

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
      message.success(
        `Deduplication complete! Deleted ${deletedCount} duplicate examples, updated references in ${itemsUpdatedCount} items.`,
      )
      setDeduplicateStatus(
        `Deduplication complete! Deleted ${deletedCount} duplicate examples, updated references in ${itemsUpdatedCount} items.`,
      )
    } catch (error) {
      console.error('Deduplication error:', error)
      message.error(error instanceof Error ? error.message : 'Deduplication failed')
      setDeduplicateStatus('Deduplication failed. Check console for details.')
    } finally {
      setIsDeduplicating(false)
    }
  }

  return (
    <div
      className={appStyle.container}
      style={{ maxWidth: '100%', margin: '0 auto', paddingBottom: 40 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space align='center' wrap>
          <PageTitle content='Developer Console' />
          <Tag color='gold'>DEV ONLY</Tag>
          <Tag color='blue'>Enmory LocalDB & Firebase</Tag>
          {user?.email && <Tag color='geekblue'>User: {user.email}</Tag>}
        </Space>

        {mainTab === 'local-db' && (
          <Space wrap>
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData}>
              Refresh
            </Button>
            <Button icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            <Button type='primary' icon={<DownloadOutlined />} onClick={handleDownload}>
              Download JSON
            </Button>
          </Space>
        )}
      </div>

      <Tabs
        activeKey={mainTab}
        onChange={setMainTab}
        type='card'
        items={[
          {
            key: 'local-db',
            label: (
              <Space>
                <DatabaseOutlined />
                <span>Local Database (JSON)</span>
              </Space>
            ),
            children: (
              <>
                <Alert
                  message='IndexedDB / Dexie Local Database'
                  description='This tab reflects the current state of localDb stored in IndexedDB in your browser. Changes made in the app are persisted here immediately.'
                  type='info'
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                {/* Summary Statistics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => {
                        setActiveTab('items')
                        setPage(1)
                      }}
                    >
                      <Statistic
                        title='Items'
                        value={items.length}
                        prefix={<DatabaseOutlined style={{ color: token.colorPrimary }} />}
                        suffix={
                          searchKeyword && filteredItems.length !== items.length
                            ? `(${filteredItems.length} filtered)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => {
                        setActiveTab('examples')
                        setPage(1)
                      }}
                    >
                      <Statistic
                        title='Examples'
                        value={examples.length}
                        prefix={<CodeOutlined style={{ color: token.colorSuccess }} />}
                        suffix={
                          searchKeyword && filteredExamples.length !== examples.length
                            ? `(${filteredExamples.length} filtered)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => {
                        setActiveTab('syncMeta')
                        setPage(1)
                      }}
                    >
                      <Statistic
                        title='Sync Meta'
                        value={syncMeta.length}
                        prefix={<DatabaseOutlined style={{ color: token.colorWarning }} />}
                        suffix={
                          searchKeyword && filteredSyncMeta.length !== syncMeta.length
                            ? `(${filteredSyncMeta.length} filtered)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={24} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => {
                        setActiveTab('all')
                        setPage(1)
                      }}
                    >
                      <Statistic
                        title='Total Records'
                        value={items.length + examples.length + syncMeta.length}
                        prefix={<DatabaseOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Controls & Filter */}
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 16]} align='middle' justify='space-between'>
                    <Col xs={24} md={12}>
                      <Tabs
                        activeKey={activeTab}
                        onChange={(key) => {
                          setActiveTab(key as TableType)
                          setPage(1)
                        }}
                        items={[
                          {
                            key: 'all',
                            label: `All DB (${items.length + examples.length + syncMeta.length})`,
                          },
                          { key: 'items', label: `items (${items.length})` },
                          { key: 'examples', label: `examples (${examples.length})` },
                          { key: 'syncMeta', label: `syncMeta (${syncMeta.length})` },
                        ]}
                        style={{ marginBottom: 0 }}
                      />
                    </Col>

                    <Col xs={24} md={12}>
                      <Space
                        direction='horizontal'
                        style={{ width: '100%', justifyContent: 'flex-end' }}
                        wrap
                      >
                        <Input
                          placeholder='Search in local DB...'
                          prefix={<SearchOutlined />}
                          allowClear
                          value={searchKeyword}
                          onChange={(e) => {
                            setSearchKeyword(e.target.value)
                            setPage(1)
                          }}
                          style={{ width: 220 }}
                        />

                        {activeTab !== 'all' && (
                          <>
                            <Select
                              value={limit}
                              onChange={(val) => {
                                setLimit(val)
                                setPage(1)
                              }}
                              options={[
                                { value: 20, label: '20 per page' },
                                { value: 50, label: '50 per page' },
                                { value: 100, label: '100 per page' },
                                { value: 500, label: '500 per page' },
                                { value: 'all', label: 'Show All' },
                              ]}
                              style={{ width: 130 }}
                            />

                            {limit !== 'all' && (
                              <Space>
                                <Button
                                  size='small'
                                  disabled={page <= 1}
                                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                  Prev
                                </Button>
                                <Text style={{ fontSize: 13 }}>
                                  {page} / {totalPages}
                                </Text>
                                <Button
                                  size='small'
                                  disabled={page >= totalPages}
                                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                  Next
                                </Button>
                              </Space>
                            )}
                          </>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* JSON Viewer */}
                <Card
                  title={
                    <Space wrap>
                      <span>JSON Output</span>
                      <Tag color='cyan'>
                        {activeTab === 'all'
                          ? `Full DB (${items.length} items, ${examples.length} examples, ${syncMeta.length} meta)`
                          : `${totalCount} records${limit !== 'all' ? ` (showing page ${page} of ${totalPages})` : ''}`}
                      </Tag>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        Approx size: {(new Blob([jsonString]).size / 1024).toFixed(1)} KB
                      </Text>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Tooltip title='Copy formatted JSON'>
                        <Button size='small' icon={<CopyOutlined />} onClick={handleCopy}>
                          Copy
                        </Button>
                      </Tooltip>
                      <Tooltip title='Save JSON to file'>
                        <Button size='small' icon={<DownloadOutlined />} onClick={handleDownload}>
                          Save
                        </Button>
                      </Tooltip>
                    </Space>
                  }
                >
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <Spin size='large' tip='Loading Local Database from IndexedDB...' />
                    </div>
                  ) : (
                    <pre
                      style={{
                        maxHeight: 650,
                        overflow: 'auto',
                        backgroundColor: token.colorBgContainerDisabled || '#1f1f1f',
                        color: token.colorText,
                        padding: 16,
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
                        border: `1px solid ${token.colorBorderSecondary}`,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {jsonString}
                    </pre>
                  )}
                </Card>
              </>
            ),
          },
          {
            key: 'firebase-tools',
            label: (
              <Space>
                <ApiOutlined />
                <span>Firebase DB Integration & Migrations</span>
              </Space>
            ),
            children: (
              <Space direction='vertical' style={{ width: '100%' }} size={16}>
                <Alert
                  message='Firebase Firestore Database Management'
                  description='Run data migrations, cleanup scripts, and deduplication tasks on your remote Firebase Firestore collections.'
                  type='warning'
                  showIcon
                />

                {!user && (
                  <Alert
                    message='Authentication Required'
                    description='You must be logged in to execute Firebase Firestore migration tasks.'
                    type='error'
                    showIcon
                  />
                )}

                {/* 1. Integrate Examples */}
                <Card
                  title={
                    <Space>
                      <CloudUploadOutlined style={{ color: token.colorPrimary }} />
                      <span>Integrate Examples into Items</span>
                    </Space>
                  }
                  size='small'
                >
                  <Paragraph type='secondary'>
                    Embeds referenced examples from the Firestore <code>examples</code> collection
                    directly into item documents (under <code>meanings.examples</code>). This
                    enables fully offline-capable local synchronization and avoids separate example
                    queries.
                  </Paragraph>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Button
                      type='primary'
                      icon={<CloudUploadOutlined />}
                      onClick={handleIntegrateExamples}
                      loading={isIntegrating}
                      disabled={!user}
                    >
                      Integrate Examples into Items (Firebase DB)
                    </Button>
                    {integrationStatus && (
                      <Alert
                        message={integrationStatus}
                        type={
                          integrationStatus.includes('failed') ||
                          integrationStatus.includes('Error')
                            ? 'error'
                            : 'info'
                        }
                        showIcon
                      />
                    )}
                  </Space>
                </Card>

                {/* 2. Remove Legacy Fields */}
                <Card
                  title={
                    <Space>
                      <DeleteOutlined style={{ color: token.colorError }} />
                      <span>Remove Legacy Fields from Items</span>
                    </Space>
                  }
                  size='small'
                >
                  <Paragraph type='secondary'>
                    Removes obsolete fields (such as <code>keywords</code> and{' '}
                    <code>origin_lowercase</code>) from all items in Firestore to keep documents
                    lean and adhere to current schema standards.
                  </Paragraph>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Button
                      type='default'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleRemoveLegacyFields}
                      loading={isRemovingLegacyFields}
                      disabled={!user}
                    >
                      Remove Legacy Fields (keywords & origin_lowercase)
                    </Button>
                    {removeLegacyFieldsStatus && (
                      <Alert
                        message={removeLegacyFieldsStatus}
                        type={removeLegacyFieldsStatus.includes('Failed') ? 'error' : 'info'}
                        showIcon
                      />
                    )}
                  </Space>
                </Card>

                {/* 3. Deduplicate Examples */}
                <Card
                  title={
                    <Space>
                      <ToolOutlined style={{ color: token.colorWarning }} />
                      <span>Deduplicate Examples</span>
                    </Space>
                  }
                  size='small'
                >
                  <Paragraph type='secondary'>
                    Scans the Firestore <code>examples</code> collection for identical sentences
                    (case-insensitive origin), keeps 1 canonical example, updates all item
                    references to point to the canonical ID, and removes redundant duplicate example
                    documents.
                  </Paragraph>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Button
                      type='dashed'
                      danger
                      icon={<ToolOutlined />}
                      onClick={handleDeduplicateExamples}
                      loading={isDeduplicating}
                      disabled={!user}
                    >
                      Deduplicate Examples (Delete duplicates, keep 1)
                    </Button>
                    {deduplicateStatus && (
                      <Alert
                        message={deduplicateStatus}
                        type={deduplicateStatus.includes('failed') ? 'error' : 'info'}
                        showIcon
                      />
                    )}

                    {deletedExamples.length > 0 && (
                      <div style={{ marginTop: 12, width: '100%' }}>
                        <h4 style={{ marginBottom: 8, color: token.colorText }}>
                          Deleted Duplicate Examples ({deletedExamples.length}):
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
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </div>
  )
}

export default Developer
