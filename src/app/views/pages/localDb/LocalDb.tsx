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
} from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  DatabaseOutlined,
  CheckOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { localDb } from '@/services/localDb'
import { IItem, IExample } from '@/models/item.model'
import { ISyncMeta } from '@/services/localDb/db'

const { Text } = Typography

type TableType = 'all' | 'items' | 'examples' | 'syncMeta'

export const LocalDb: React.FC = () => {
  const { token } = theme.useToken()

  // Guard: Dev mode only
  if (!import.meta.env.DEV) {
    return <Navigate to='/page_not_found' replace />
  }

  const [loading, setLoading] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<TableType>('all')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [limit, setLimit] = useState<number | 'all'>(50)
  const [page, setPage] = useState<number>(1)

  const [items, setItems] = useState<IItem[]>([])
  const [examples, setExamples] = useState<IExample[]>([])
  const [syncMeta, setSyncMeta] = useState<ISyncMeta[]>([])

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
        }}
      >
        <Space align='center'>
          <PageTitle content='Local Database Viewer' />
          <Tag color='gold'>DEV ONLY</Tag>
          <Tag color='blue'>EnmoryLocalDB (Dexie)</Tag>
        </Space>

        <Space>
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
      </div>

      <Alert
        message='Developer Tool: IndexedDB / Dexie Viewer'
        description='This page reflects the current state of localDb stored in IndexedDB in your browser. Changes made in the app are persisted here immediately.'
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
          <Space>
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
    </div>
  )
}

export default LocalDb
