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
  theme,
  Alert,
  Tooltip,
  Table,
  Modal,
  Checkbox,
  Descriptions,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  DatabaseOutlined,
  CheckOutlined,
  CodeOutlined,
  DeleteOutlined,
  ApiOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  StarFilled,
} from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { useSelector } from '@/core/hooks'
import { localDb } from '@/services/localDb'
import { extractExamplesFromItems } from '@/services/firebase/dbIntegration'
import { IItem, IExample, IMeaning, ECategory } from '@/models/item.model'
import { ISyncMeta } from '@/services/localDb/db'
import { getCategory, getType } from '@/helpers/item'
import styles from './developer.module.scss'

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
  const [activeTab, setActiveTab] = useState<TableType>('items')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<IItem | null>(null)
  const [selectedRecordJson, setSelectedRecordJson] = useState<{ title: string; data: any } | null>(
    null,
  )

  const [items, setItems] = useState<IItem[]>([])
  const [examples, setExamples] = useState<IExample[]>([])
  const [syncMeta, setSyncMeta] = useState<ISyncMeta[]>([])

  // ================= Firebase Maintenance State =================

  const [isRemovingLegacyFields, setIsRemovingLegacyFields] = useState<boolean>(false)
  const [removeLegacyFieldsStatus, setRemoveLegacyFieldsStatus] = useState<string>('')
  const [isPurging, setIsPurging] = useState<boolean>(false)
  const [purgeStatus, setPurgeStatus] = useState<string>('')
  const [purgeOnlyCurrentUser, setPurgeOnlyCurrentUser] = useState<boolean>(true)
  const [purgedItems, setPurgedItems] = useState<
    { id: string; origin: string; uid?: string; deleted_date?: number }[]
  >([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [loadedItems, loadedSyncMeta] = await Promise.all([
        localDb.items.toArray(),
        localDb.syncMeta.toArray(),
      ])
      const loadedExamples = extractExamplesFromItems(loadedItems)

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

  // Active dataset for JSON export / copy
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

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(activeDataset, null, 2))
    setCopied(true)
    message.success('JSON copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const filename = `local-db-${activeTab}-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([JSON.stringify(activeDataset, null, 2)], { type: 'application/json' })
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

  const getMeaningTypeLabel = (m: IMeaning) => {
    if (m.typeId !== undefined) {
      return getType(m.typeId).abbr || getType(m.typeId).origin
    }
    return (m as any).type || ''
  }

  // ================= Table Column Definitions =================
  const itemColumns = useMemo<TableColumnsType<IItem>>(
    () => [
      {
        title: '#',
        key: 'index',
        width: 55,
        align: 'center',
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Origin / Từ vựng',
        dataIndex: 'origin',
        key: 'origin',
        width: 200,
        sorter: (a, b) => (a.origin || '').localeCompare(b.origin || ''),
        render: (text: string, record: IItem) => (
          <Space direction='vertical' size={2}>
            <Space>
              <Text strong style={{ fontSize: 14, color: token.colorPrimary }}>
                {text}
              </Text>
              {record.favorite && <StarFilled style={{ color: '#faad14' }} />}
            </Space>
            <Space size={4} wrap>
              {record.catId !== undefined && (
                <Tag color='blue' style={{ margin: 0, fontSize: 11 }}>
                  {getCategory(record.catId as ECategory)}
                </Tag>
              )}
              {record.archive && (
                <Tag color='default' style={{ margin: 0, fontSize: 11 }}>
                  Archived
                </Tag>
              )}
            </Space>
          </Space>
        ),
      },
      {
        title: 'Level',
        dataIndex: 'level',
        key: 'level',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.level || 0) - (b.level || 0),
        render: (level: number) => {
          const colors = ['default', 'blue', 'cyan', 'green', 'gold', 'purple']
          const color = colors[level] || 'blue'
          return <Tag color={color}>Lv {level ?? 0}</Tag>
        },
      },
      {
        title: 'Định nghĩa / Dịch nghĩa',
        key: 'meanings',
        ellipsis: true,
        render: (_: any, record: IItem) => {
          const meanings = record.meanings || []
          if (meanings.length === 0)
            return (
              <Text type='secondary' italic>
                Chưa có nghĩa
              </Text>
            )
          const first = meanings[0]
          const text = first.definition || first.translation || ''
          const typeLabel = getMeaningTypeLabel(first)
          return (
            <Space direction='vertical' size={2} style={{ maxWidth: '100%' }}>
              <Text ellipsis={{ tooltip: text }}>
                {typeLabel ? <b>({typeLabel}) </b> : null}
                {text}
              </Text>
              {meanings.length > 1 && (
                <Text type='secondary' style={{ fontSize: 11 }}>
                  +{meanings.length - 1} nghĩa khác
                </Text>
              )}
            </Space>
          )
        },
      },
      {
        title: 'Tags',
        dataIndex: 'tags',
        key: 'tags',
        width: 150,
        render: (tags: string[]) => {
          if (!tags || tags.length === 0) return '-'
          return (
            <Space size={[0, 4]} wrap>
              {tags.slice(0, 3).map((t) => (
                <Tag key={t} style={{ fontSize: 11 }}>
                  {t}
                </Tag>
              ))}
              {tags.length > 3 && <Tag style={{ fontSize: 11 }}>+{tags.length - 3}</Tag>}
            </Space>
          )
        },
      },
      {
        title: 'Trạng thái SRS',
        key: 'srs',
        width: 140,
        render: (_: any, record: IItem) => {
          if (!record.next_review_date) {
            return (
              <Text type='secondary' style={{ fontSize: 11 }}>
                Chưa lên lịch
              </Text>
            )
          }
          const isDue = record.next_review_date <= Date.now()
          return (
            <Space direction='vertical' size={0}>
              <Tag color={isDue ? 'warning' : 'success'} style={{ fontSize: 11 }}>
                {isDue ? 'Cần ôn hôm nay' : new Date(record.next_review_date).toLocaleDateString()}
              </Tag>
              {record.interval_days !== undefined && (
                <Text type='secondary' style={{ fontSize: 10 }}>
                  Khoảng: {record.interval_days}d | EF: {record.ease_factor?.toFixed(1) ?? '2.5'}
                </Text>
              )}
            </Space>
          )
        },
      },
      {
        title: 'Cập nhật',
        dataIndex: 'last_update',
        key: 'last_update',
        width: 120,
        sorter: (a, b) => (b.last_update || 0) - (a.last_update || 0),
        render: (ts?: number) =>
          ts ? <span style={{ fontSize: 12 }}>{new Date(ts).toLocaleDateString()}</span> : '-',
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 110,
        align: 'center',
        render: (_: any, record: IItem) => (
          <Space size={6}>
            <Tooltip title='Xem chi tiết'>
              <Button size='small' icon={<EyeOutlined />} onClick={() => setSelectedItem(record)} />
            </Tooltip>
            <Tooltip title='Xem raw JSON'>
              <Button
                size='small'
                icon={<CodeOutlined />}
                onClick={() => setSelectedRecordJson({ title: record.origin, data: record })}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [token],
  )

  const renderItemExpanded = (record: IItem) => {
    return (
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: token.colorBgContainerDisabled || '#fafafa',
          borderRadius: 6,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Row gutter={[16, 12]}>
          <Col span={24}>
            <Text strong>Tất cả nghĩa ({record.meanings?.length || 0}):</Text>
            {(record.meanings || []).map((m, idx) => (
              <div
                key={idx}
                className={styles.noTextEditor}
                style={{
                  marginTop: 6,
                  paddingLeft: 8,
                  borderLeft: `2px solid ${token.colorPrimary}`,
                }}
              >
                <Space size={8} wrap>
                  {getMeaningTypeLabel(m) ? (
                    <Tag color='purple'>{getMeaningTypeLabel(m)}</Tag>
                  ) : null}

                  {m.definition && <div dangerouslySetInnerHTML={{ __html: m.definition }} />}

                  {m.translation && <div dangerouslySetInnerHTML={{ __html: m.translation }} />}
                </Space>

                {m.examples && m.examples.length > 0 && (
                  <div style={{ marginTop: 4, paddingLeft: 8 }}>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Ví dụ:
                    </Text>
                    {m.examples.map((ex, eIdx) => (
                      <div key={eIdx} style={{ fontSize: 12, color: token.colorTextSecondary }}>
                        •{' '}
                        {typeof ex === 'string'
                          ? ex
                          : `${ex.origin}${ex.translation ? ` — ${ex.translation}` : ''}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Col>

          {((record.forms && record.forms.length > 0) ||
            (record.collocations && record.collocations.length > 0) ||
            (record.word_family && record.word_family.length > 0)) && (
            <Col span={24}>
              <Space wrap size={16}>
                {record.forms && record.forms.length > 0 && (
                  <div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Forms:{' '}
                    </Text>
                    {record.forms.map((f) => (
                      <Tag key={f}>{f}</Tag>
                    ))}
                  </div>
                )}
                {record.collocations && record.collocations.length > 0 && (
                  <div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Collocations:{' '}
                    </Text>
                    {record.collocations.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </div>
                )}
                {record.word_family && record.word_family.length > 0 && (
                  <div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Word Family:{' '}
                    </Text>
                    {record.word_family.map((wf) => (
                      <Tag key={wf}>{wf}</Tag>
                    ))}
                  </div>
                )}
              </Space>
            </Col>
          )}

          <Col span={24}>
            <Text type='secondary' style={{ fontSize: 11 }}>
              ID: <code>{record.id}</code> | UID: <code>{record.uid || 'N/A'}</code>
            </Text>
          </Col>
        </Row>
      </div>
    )
  }

  const exampleColumns = useMemo<TableColumnsType<IExample>>(
    () => [
      {
        title: '#',
        key: 'index',
        width: 55,
        align: 'center',
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Mục từ (Item)',
        dataIndex: 'itemOrigin',
        key: 'itemOrigin',
        width: 140,
        render: (text: string) => (text ? <Tag color='blue'>{text}</Tag> : '-'),
      },
      {
        title: 'Ví dụ (Origin)',
        dataIndex: 'origin',
        key: 'origin',
        render: (text: string) => <Text strong>{text || '-'}</Text>,
      },
      {
        title: 'Dịch nghĩa',
        dataIndex: 'translation',
        key: 'translation',
        render: (text: string) => <Text>{text || '-'}</Text>,
      },
      {
        title: 'Ghi chú',
        dataIndex: 'note',
        key: 'note',
        width: 200,
        render: (text: string) => (text ? <Text type='secondary'>{text}</Text> : '-'),
      },
      {
        title: 'Cập nhật',
        key: 'dates',
        width: 140,
        sorter: (a, b) =>
          (b.last_update || b.created_date || 0) - (a.last_update || a.created_date || 0),
        render: (_: any, record: IExample) => {
          const ts = record.last_update || record.created_date
          return ts ? (
            <span style={{ fontSize: 12 }}>{new Date(ts).toLocaleDateString()}</span>
          ) : (
            '-'
          )
        },
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 80,
        align: 'center',
        render: (_: any, record: IExample) => (
          <Tooltip title='Xem raw JSON'>
            <Button
              size='small'
              icon={<CodeOutlined />}
              onClick={() =>
                setSelectedRecordJson({
                  title: record.origin || record.id || 'Example',
                  data: record,
                })
              }
            />
          </Tooltip>
        ),
      },
    ],
    [],
  )

  const syncMetaColumns = useMemo<TableColumnsType<ISyncMeta>>(
    () => [
      {
        title: 'Khóa (Key)',
        dataIndex: 'key',
        key: 'key',
        width: 280,
        render: (key: string) => <Text code>{key}</Text>,
      },
      {
        title: 'Giá trị (Value)',
        dataIndex: 'value',
        key: 'value',
        render: (val: any, record: ISyncMeta) => {
          if (record.key.startsWith('last_sync_time_') && typeof val === 'number') {
            return (
              <Space>
                <Text strong>{new Date(val).toLocaleString()}</Text>
                <Text type='secondary'>({val})</Text>
              </Space>
            )
          }
          return typeof val === 'object' ? JSON.stringify(val) : String(val)
        },
      },
      {
        title: 'Kiểu dữ liệu',
        key: 'type',
        width: 120,
        render: (_: any, record: ISyncMeta) => <Tag>{typeof record.value}</Tag>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 80,
        align: 'center',
        render: (_: any, record: ISyncMeta) => (
          <Tooltip title='Xem raw JSON'>
            <Button
              size='small'
              icon={<CodeOutlined />}
              onClick={() => setSelectedRecordJson({ title: record.key, data: record })}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  )

  // ================= Firebase Maintenance Handlers =================
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

  const handlePurgeDeletedItems = async () => {
    setIsPurging(true)
    setPurgeStatus('Starting purge of soft-deleted items...')
    setPurgedItems([])
    try {
      const currentUser = user
      if (!currentUser) {
        throw new Error('You must be logged in to modify data.')
      }

      const { purgeDeletedItemsFromFirebaseDb } = await import('@/services/firebase/dbIntegration')
      const result = await purgeDeletedItemsFromFirebaseDb({
        uid: purgeOnlyCurrentUser ? currentUser.uid : undefined,
        onProgress: (status) => setPurgeStatus(status),
      })

      if (result.isSuccess) {
        message.success(result.message)
        setPurgeStatus(result.message)
        if (result.deletedItems && result.deletedItems.length > 0) {
          setPurgedItems(result.deletedItems)
          await loadData()
        }
      } else {
        message.error(result.message)
        setPurgeStatus(result.message)
      }
    } catch (error) {
      console.error('Purge deleted items error:', error)
      message.error(error instanceof Error ? error.message : 'Failed to purge soft-deleted items')
      setPurgeStatus('Failed to purge soft-deleted items. Check console for details.')
    } finally {
      setIsPurging(false)
    }
  }

  const confirmPurgeDeletedItems = () => {
    Modal.confirm({
      title: 'Permanently Delete Soft-Deleted Items (is_deleted = true)?',
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: (
        <div>
          <p>
            This action will permanently delete all items from Firebase Firestore where{' '}
            <code>is_deleted = true</code>
            {purgeOnlyCurrentUser ? ' for your account' : ' for ALL users'}.
          </p>
          <p style={{ color: token.colorError, margin: 0, fontWeight: 500 }}>
            This operation cannot be undone!
          </p>
        </div>
      ),
      okText: 'Yes, Purge Items',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handlePurgeDeletedItems(),
    })
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
                <span>Local Database</span>
              </Space>
            ),
            children: (
              <>
                <Alert
                  message='IndexedDB / Dexie Local Database'
                  description='Dữ liệu hiển thị trực tiếp từ IndexedDB trong trình duyệt của bạn dưới dạng bảng tương tác. Mọi thay đổi trong ứng dụng được đồng bộ tại đây ngay lập tức.'
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
                      onClick={() => setActiveTab('items')}
                      style={{
                        borderColor: activeTab === 'items' ? token.colorPrimary : undefined,
                      }}
                    >
                      <Statistic
                        title='Items (Bảng từ vựng)'
                        value={items.length}
                        prefix={<DatabaseOutlined style={{ color: token.colorPrimary }} />}
                        suffix={
                          searchKeyword && filteredItems.length !== items.length
                            ? `(${filteredItems.length} tìm thấy)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => setActiveTab('examples')}
                      style={{
                        borderColor: activeTab === 'examples' ? token.colorSuccess : undefined,
                      }}
                    >
                      <Statistic
                        title='Examples (Câu ví dụ)'
                        value={examples.length}
                        prefix={<CodeOutlined style={{ color: token.colorSuccess }} />}
                        suffix={
                          searchKeyword && filteredExamples.length !== examples.length
                            ? `(${filteredExamples.length} tìm thấy)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => setActiveTab('syncMeta')}
                      style={{
                        borderColor: activeTab === 'syncMeta' ? token.colorWarning : undefined,
                      }}
                    >
                      <Statistic
                        title='Sync Meta (Đồng bộ)'
                        value={syncMeta.length}
                        prefix={<DatabaseOutlined style={{ color: token.colorWarning }} />}
                        suffix={
                          searchKeyword && filteredSyncMeta.length !== syncMeta.length
                            ? `(${filteredSyncMeta.length} tìm thấy)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={24} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => setActiveTab('all')}
                      style={{
                        borderColor: activeTab === 'all' ? token.colorInfo : undefined,
                      }}
                    >
                      <Statistic
                        title='Tổng số bản ghi'
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
                        onChange={(key) => setActiveTab(key as TableType)}
                        items={[
                          { key: 'items', label: `items (${items.length})` },
                          { key: 'examples', label: `examples (${examples.length})` },
                          { key: 'syncMeta', label: `syncMeta (${syncMeta.length})` },
                          {
                            key: 'all',
                            label: `Tất cả bảng (${items.length + examples.length + syncMeta.length})`,
                          },
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
                          placeholder='Tìm kiếm trong Local DB...'
                          prefix={<SearchOutlined />}
                          allowClear
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          style={{ width: 260 }}
                        />
                        <Tooltip title='Copy JSON bảng hiện tại'>
                          <Button size='middle' icon={<CopyOutlined />} onClick={handleCopy}>
                            Copy JSON
                          </Button>
                        </Tooltip>
                        <Tooltip title='Tải xuống JSON'>
                          <Button
                            size='middle'
                            icon={<DownloadOutlined />}
                            onClick={handleDownload}
                          >
                            Tải JSON
                          </Button>
                        </Tooltip>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Table Viewer */}
                {loading ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <Spin size='large' tip='Đang đọc dữ liệu từ IndexedDB...' />
                    </div>
                  </Card>
                ) : (
                  <>
                    {(activeTab === 'items' || activeTab === 'all') && (
                      <Card
                        title={
                          <Space>
                            <DatabaseOutlined style={{ color: token.colorPrimary }} />
                            <span>Table Items</span>
                            <Tag color='blue'>{filteredItems.length} từ vựng</Tag>
                          </Space>
                        }
                        style={{ marginBottom: activeTab === 'all' ? 24 : 0 }}
                        size='small'
                      >
                        <Table<IItem>
                          dataSource={filteredItems}
                          columns={itemColumns}
                          rowKey='id'
                          expandable={{
                            expandedRowRender: renderItemExpanded,
                            rowExpandable: () => true,
                          }}
                          pagination={{
                            pageSize: 15,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '15', '30', '50', '100'],
                            showTotal: (total, range) =>
                              `${range[0]}-${range[1]} trên tổng số ${total} items`,
                          }}
                          size='small'
                          bordered
                          scroll={{ x: 1000 }}
                        />
                      </Card>
                    )}

                    {(activeTab === 'examples' || activeTab === 'all') && (
                      <Card
                        title={
                          <Space>
                            <CodeOutlined style={{ color: token.colorSuccess }} />
                            <span>Bảng Examples</span>
                            <Tag color='green'>{filteredExamples.length} câu ví dụ</Tag>
                          </Space>
                        }
                        style={{ marginBottom: activeTab === 'all' ? 24 : 0 }}
                        size='small'
                      >
                        <Table<IExample>
                          dataSource={filteredExamples}
                          columns={exampleColumns}
                          rowKey='id'
                          pagination={{
                            pageSize: 15,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '15', '30', '50', '100'],
                            showTotal: (total, range) =>
                              `${range[0]}-${range[1]} trên tổng số ${total} examples`,
                          }}
                          size='small'
                          bordered
                          scroll={{ x: 800 }}
                        />
                      </Card>
                    )}

                    {(activeTab === 'syncMeta' || activeTab === 'all') && (
                      <Card
                        title={
                          <Space>
                            <DatabaseOutlined style={{ color: token.colorWarning }} />
                            <span>Bảng Sync Meta</span>
                            <Tag color='orange'>{filteredSyncMeta.length} bản ghi cấu hình</Tag>
                          </Space>
                        }
                        size='small'
                      >
                        <Table<ISyncMeta>
                          dataSource={filteredSyncMeta}
                          columns={syncMetaColumns}
                          rowKey='key'
                          pagination={{
                            pageSize: 15,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '15', '30', '50'],
                            showTotal: (total, range) =>
                              `${range[0]}-${range[1]} trên tổng số ${total} meta`,
                          }}
                          size='small'
                          bordered
                        />
                      </Card>
                    )}
                  </>
                )}

                {/* Modal Chi tiết Item */}
                <Modal
                  title={
                    <Space wrap>
                      <EyeOutlined style={{ color: token.colorPrimary }} />
                      <span>
                        Chi tiết Item: <b>{selectedItem?.origin}</b>
                      </span>
                      {selectedItem?.catId !== undefined && (
                        <Tag color='blue'>{getCategory(selectedItem.catId as ECategory)}</Tag>
                      )}
                      {selectedItem?.level !== undefined && (
                        <Tag color='cyan'>Lv {selectedItem.level}</Tag>
                      )}
                      {selectedItem?.favorite && <StarFilled style={{ color: '#faad14' }} />}
                    </Space>
                  }
                  open={!!selectedItem}
                  onCancel={() => setSelectedItem(null)}
                  width={750}
                  footer={[
                    <Button
                      key='copy'
                      icon={<CopyOutlined />}
                      onClick={() => {
                        if (selectedItem) {
                          navigator.clipboard.writeText(JSON.stringify(selectedItem, null, 2))
                          message.success('Đã sao chép JSON của Item!')
                        }
                      }}
                    >
                      Copy JSON
                    </Button>,
                    <Button key='close' type='primary' onClick={() => setSelectedItem(null)}>
                      Đóng
                    </Button>,
                  ]}
                >
                  {selectedItem && (
                    <Tabs
                      defaultActiveKey='formatted'
                      items={[
                        {
                          key: 'formatted',
                          label: 'Thông tin chi tiết',
                          children: (
                            <Space direction='vertical' style={{ width: '100%' }} size={16}>
                              <Descriptions size='small' bordered column={2}>
                                <Descriptions.Item label='ID'>
                                  {selectedItem.id || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='UID'>
                                  {selectedItem.uid || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Loại'>
                                  {selectedItem.catId !== undefined
                                    ? getCategory(selectedItem.catId as ECategory)
                                    : 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Level'>
                                  Level {selectedItem.level ?? 0}
                                </Descriptions.Item>
                                <Descriptions.Item label='Tags' span={2}>
                                  {selectedItem.tags && selectedItem.tags.length > 0
                                    ? selectedItem.tags.map((t) => <Tag key={t}>{t}</Tag>)
                                    : 'None'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Archived'>
                                  {selectedItem.archive ? 'Có' : 'Không'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Yêu thích'>
                                  {selectedItem.favorite ? 'Có' : 'Không'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Ngày tạo'>
                                  {selectedItem.created_date
                                    ? new Date(selectedItem.created_date).toLocaleString()
                                    : 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Cập nhật cuối'>
                                  {selectedItem.last_update
                                    ? new Date(selectedItem.last_update).toLocaleString()
                                    : 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Lịch ôn (SRS)'>
                                  {selectedItem.next_review_date
                                    ? new Date(selectedItem.next_review_date).toLocaleString()
                                    : 'Chưa lên lịch'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Khoảng cách / EF'>
                                  {selectedItem.interval_days ?? 0} ngày | EF:{' '}
                                  {selectedItem.ease_factor?.toFixed(1) ?? '2.5'}
                                </Descriptions.Item>
                              </Descriptions>

                              <div>
                                <h4 style={{ marginBottom: 8 }}>
                                  Nghĩa & Định nghĩa ({selectedItem.meanings?.length || 0}):
                                </h4>
                                {(selectedItem.meanings || []).map((m, idx) => (
                                  <Card key={idx} size='small' style={{ marginBottom: 8 }}>
                                    <Space direction='vertical' style={{ width: '100%' }} size={4}>
                                      <Space wrap>
                                        {getMeaningTypeLabel(m) ? (
                                          <Tag color='purple'>{getMeaningTypeLabel(m)}</Tag>
                                        ) : null}
                                        {m.definition && <Text strong>{m.definition}</Text>}
                                      </Space>
                                      {m.translation && (
                                        <Text type='secondary'>Dịch: {m.translation}</Text>
                                      )}
                                      {m.grammar && (
                                        <Text type='secondary' style={{ fontSize: 12 }}>
                                          Ngữ pháp: {m.grammar}
                                        </Text>
                                      )}
                                      {m.examples && m.examples.length > 0 && (
                                        <div
                                          style={{
                                            marginTop: 6,
                                            paddingLeft: 8,
                                            borderLeft: `2px solid ${token.colorPrimary}`,
                                          }}
                                        >
                                          <Text style={{ fontSize: 12 }} strong>
                                            Ví dụ:
                                          </Text>
                                          {m.examples.map((ex, eIdx) => (
                                            <div key={eIdx} style={{ fontSize: 12, marginTop: 2 }}>
                                              •{' '}
                                              {typeof ex === 'string'
                                                ? ex
                                                : `${ex.origin}${ex.translation ? ` — ${ex.translation}` : ''}`}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </Space>
                                  </Card>
                                ))}
                              </div>
                            </Space>
                          ),
                        },
                        {
                          key: 'json',
                          label: 'Raw JSON',
                          children: (
                            <pre
                              style={{
                                maxHeight: 450,
                                overflow: 'auto',
                                backgroundColor: token.colorBgContainerDisabled || '#1f1f1f',
                                color: token.colorText,
                                padding: 12,
                                borderRadius: 6,
                                fontSize: 12,
                              }}
                            >
                              {JSON.stringify(selectedItem, null, 2)}
                            </pre>
                          ),
                        },
                      ]}
                    />
                  )}
                </Modal>

                {/* Modal Raw JSON cho Record bất kỳ */}
                <Modal
                  title={`Dữ liệu JSON: ${selectedRecordJson?.title}`}
                  open={!!selectedRecordJson}
                  onCancel={() => setSelectedRecordJson(null)}
                  width={650}
                  footer={[
                    <Button
                      key='copy'
                      icon={<CopyOutlined />}
                      onClick={() => {
                        if (selectedRecordJson) {
                          navigator.clipboard.writeText(
                            JSON.stringify(selectedRecordJson.data, null, 2),
                          )
                          message.success('Đã sao chép JSON!')
                        }
                      }}
                    >
                      Copy JSON
                    </Button>,
                    <Button key='close' type='primary' onClick={() => setSelectedRecordJson(null)}>
                      Đóng
                    </Button>,
                  ]}
                >
                  <pre
                    style={{
                      maxHeight: 500,
                      overflow: 'auto',
                      backgroundColor: token.colorBgContainerDisabled || '#1f1f1f',
                      color: token.colorText,
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(selectedRecordJson?.data, null, 2)}
                  </pre>
                </Modal>
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

                {/* 1. Remove Legacy Fields */}
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

                {/* 2. Purge Soft-Deleted Items (is_deleted = true) */}
                <Card
                  title={
                    <Space>
                      <ClearOutlined style={{ color: token.colorError }} />
                      <span>Permanently Delete Soft-Deleted Items (is_deleted = true)</span>
                    </Space>
                  }
                  size='small'
                >
                  <Paragraph type='secondary'>
                    Scans the Firestore <code>items</code> collection for documents marked as{' '}
                    <code>is_deleted = true</code>, permanently deletes them from Firestore to clean
                    up storage, purges them from local IndexedDB cache, and removes corresponding
                    checklist entries.
                  </Paragraph>
                  <Space direction='vertical' style={{ width: '100%' }} size={12}>
                    <Checkbox
                      checked={purgeOnlyCurrentUser}
                      onChange={(e) => setPurgeOnlyCurrentUser(e.target.checked)}
                    >
                      Only delete items belonging to current user ({user?.email || 'N/A'})
                    </Checkbox>

                    <Button
                      type='primary'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={confirmPurgeDeletedItems}
                      loading={isPurging}
                      disabled={!user}
                    >
                      Purge Soft-Deleted Items (is_deleted = true)
                    </Button>

                    {purgeStatus && (
                      <Alert
                        message={purgeStatus}
                        type={
                          purgeStatus.includes('failed') ||
                          purgeStatus.includes('Error') ||
                          purgeStatus.includes('Failed')
                            ? 'error'
                            : 'info'
                        }
                        showIcon
                      />
                    )}

                    {purgedItems.length > 0 && (
                      <div style={{ marginTop: 12, width: '100%' }}>
                        <h4 style={{ marginBottom: 8, color: token.colorText }}>
                          Permanently Deleted Items ({purgedItems.length}):
                        </h4>
                        <Table
                          dataSource={purgedItems}
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
                              width: '35%',
                            },
                            {
                              title: 'Deleted Date',
                              dataIndex: 'deleted_date',
                              key: 'deleted_date',
                              width: '25%',
                              render: (val?: number) =>
                                val ? new Date(val).toLocaleString() : 'N/A',
                            },
                            {
                              title: 'UID',
                              dataIndex: 'uid',
                              key: 'uid',
                              width: '15%',
                              render: (val?: string) => (val ? `${val.slice(0, 8)}...` : 'N/A'),
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
