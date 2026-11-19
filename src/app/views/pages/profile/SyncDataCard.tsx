import React, { useState, useMemo } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Popconfirm,
  Alert,
  Tooltip,
  Table,
  Input,
  Flex,
  Grid,
  theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CloudSyncOutlined,
  SyncOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  ReadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons'
import { useManualSync, IUnsyncedRecord } from '@/services/localDb'
import moment from 'moment'

const { Text } = Typography
const { useBreakpoint } = Grid

interface ISyncSummary {
  key: string
  type: 'item' | 'blog' | 'dictation'
  title: string
  description: string
  icon: React.ReactNode
  tagColor: string
  unit: string
  localCount: number
  isLoadingLocal: boolean
  refreshLocal: () => void
  serverCount: number | null
  isLoadingServer: boolean
  diffCount: number
  hasDiff: boolean
  refreshServer: () => void
}

export const SyncDataCard: React.FC = () => {
  const { token } = theme.useToken()
  const screens = useBreakpoint()

  const {
    isSyncing,
    progressText,
    lastSyncTime,
    localItemCount,
    isLoadingLocalCount,
    refreshLocalItemCount,
    serverItemCount,
    isLoadingServerCount,
    refreshServerItemCount,
    localBlogCount,
    isLoadingLocalBlogCount,
    refreshLocalBlogCount,
    serverBlogCount,
    isLoadingServerBlogCount,
    refreshServerBlogCount,
    localDictationCount,
    isLoadingLocalDictationCount,
    refreshLocalDictationCount,
    serverDictationCount,
    isLoadingServerDictationCount,
    refreshServerDictationCount,
    refreshAllCounts,
    syncNow,
    clearLocalData,
    unsyncedRecords = [],
    lastSyncResult,
  } = useManualSync({ autoFetchServerCounts: true })

  const [searchText, setSearchText] = useState('')

  const hasItemDiff =
    serverItemCount !== null && !isLoadingServerCount && serverItemCount !== localItemCount
  const diffItemCount = serverItemCount !== null ? serverItemCount - localItemCount : 0

  const hasBlogDiff =
    serverBlogCount !== null && !isLoadingServerBlogCount && serverBlogCount !== localBlogCount
  const diffBlogCount = serverBlogCount !== null ? serverBlogCount - localBlogCount : 0

  const hasDictationDiff =
    serverDictationCount !== null &&
    !isLoadingServerDictationCount &&
    serverDictationCount !== localDictationCount
  const diffDictationCount =
    serverDictationCount !== null ? serverDictationCount - localDictationCount : 0

  const hasDiff = hasItemDiff || hasBlogDiff || hasDictationDiff

  const summaryData = useMemo<ISyncSummary[]>(
    () => [
      {
        key: 'items',
        type: 'item',
        title: 'Items',
        description: 'Vocabulary',
        icon: <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />,
        tagColor: 'blue',
        unit: 'items',
        localCount: localItemCount,
        isLoadingLocal: isLoadingLocalCount,
        refreshLocal: refreshLocalItemCount,
        serverCount: serverItemCount,
        isLoadingServer: isLoadingServerCount,
        diffCount: diffItemCount,
        hasDiff: hasItemDiff,
        refreshServer: () => refreshServerItemCount(true),
      },
      {
        key: 'blogs',
        type: 'blog',
        title: 'Articles',
        description: 'Blog',
        icon: <ReadOutlined style={{ color: '#722ed1', fontSize: 16 }} />,
        tagColor: 'purple',
        unit: 'articles',
        localCount: localBlogCount,
        isLoadingLocal: isLoadingLocalBlogCount,
        refreshLocal: refreshLocalBlogCount,
        serverCount: serverBlogCount,
        isLoadingServer: isLoadingServerBlogCount,
        diffCount: diffBlogCount,
        hasDiff: hasBlogDiff,
        refreshServer: () => refreshServerBlogCount(true),
      },
      {
        key: 'dictations',
        type: 'dictation',
        title: 'Dictation',
        description: 'Listening Practice',
        icon: <CustomerServiceOutlined style={{ color: '#10b981', fontSize: 16 }} />,
        tagColor: 'green',
        unit: 'records',
        localCount: localDictationCount,
        isLoadingLocal: isLoadingLocalDictationCount,
        refreshLocal: refreshLocalDictationCount,
        serverCount: serverDictationCount,
        isLoadingServer: isLoadingServerDictationCount,
        diffCount: diffDictationCount,
        hasDiff: hasDictationDiff,
        refreshServer: () => refreshServerDictationCount(true),
      },
    ],
    [
      token.colorPrimary,
      localItemCount,
      isLoadingLocalCount,
      refreshLocalItemCount,
      serverItemCount,
      isLoadingServerCount,
      diffItemCount,
      hasItemDiff,
      refreshServerItemCount,
      localBlogCount,
      isLoadingLocalBlogCount,
      refreshLocalBlogCount,
      serverBlogCount,
      isLoadingServerBlogCount,
      diffBlogCount,
      hasBlogDiff,
      refreshServerBlogCount,
      localDictationCount,
      isLoadingLocalDictationCount,
      refreshLocalDictationCount,
      serverDictationCount,
      isLoadingServerDictationCount,
      diffDictationCount,
      hasDictationDiff,
      refreshServerDictationCount,
    ],
  )

  const summaryColumns: ColumnsType<ISyncSummary> = [
    {
      title: 'Data Type',
      dataIndex: 'title',
      key: 'title',
      minWidth: 160,
      render: (_, record) => (
        <Space size={10} align='center'>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: token.borderRadiusSM,
              backgroundColor:
                record.type === 'item'
                  ? token.colorPrimaryBg
                  : record.type === 'blog'
                    ? '#f9f0ff'
                    : '#e6fffb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {record.icon}
          </div>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.3 }}>
              {record.title}
            </Text>
            <Text type='secondary' style={{ fontSize: 11 }}>
              {record.description}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Local',
      dataIndex: 'localCount',
      key: 'localCount',
      minWidth: 140,
      render: (count: number, record) => (
        <Space size={6} wrap align='center'>
          <Tag
            color={record.tagColor}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: token.borderRadiusSM,
              margin: 0,
            }}
          >
            {record.isLoadingLocal ? <SyncOutlined spin /> : count.toLocaleString()}
          </Tag>
          <Tooltip
            title={`Refresh local ${record.type === 'item' ? 'items' : record.type === 'blog' ? 'blogs' : 'dictation'} count`}
          >
            <Button
              size='small'
              shape='circle'
              icon={<ReloadOutlined spin={record.isLoadingLocal} style={{ fontSize: 13 }} />}
              onClick={record.refreshLocal}
              disabled={record.isLoadingLocal || isSyncing}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Cloud',
      dataIndex: 'serverCount',
      key: 'serverCount',
      minWidth: 150,
      render: (_, record) => {
        if (record.isLoadingServer) {
          return (
            <Tag color='default' style={{ padding: '3px 8px', margin: 0 }}>
              <SyncOutlined spin /> Checking...
            </Tag>
          )
        }
        if (record.serverCount !== null) {
          return (
            <Space size={6} wrap align='center'>
              <Tag
                color={record.serverCount === record.localCount ? 'green' : 'orange'}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: token.borderRadiusSM,
                  margin: 0,
                }}
              >
                {record.serverCount.toLocaleString()}
              </Tag>
              {record.hasDiff && (
                <Tag
                  color={record.diffCount > 0 ? 'warning' : 'default'}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '1px 6px',
                    margin: 0,
                  }}
                >
                  {record.diffCount > 0 ? `+${record.diffCount} new` : `${record.diffCount}`}
                </Tag>
              )}

              <Tooltip
                title={`Refresh server ${record.type === 'item' ? 'items' : record.type === 'blog' ? 'blogs' : 'dictation'} count`}
              >
                <Button
                  size='small'
                  shape='circle'
                  icon={<ReloadOutlined spin={record.isLoadingServer} style={{ fontSize: 13 }} />}
                  onClick={record.refreshServer}
                  disabled={record.isLoadingServer || isSyncing}
                />
              </Tooltip>
            </Space>
          )
        }
        return (
          <Space size={6} wrap align='center'>
            <Tag color='error' style={{ margin: 0 }}>
              Unavailable
            </Tag>
            <Tooltip
              title={`Retry fetching server ${record.type === 'item' ? 'items' : record.type === 'blog' ? 'blogs' : 'dictation'} count`}
            >
              <Button
                size='small'
                shape='circle'
                icon={<ReloadOutlined spin={record.isLoadingServer} style={{ fontSize: 13 }} />}
                onClick={record.refreshServer}
                disabled={record.isLoadingServer || isSyncing}
              />
            </Tooltip>
          </Space>
        )
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (isSyncing) {
          return (
            <Tag color='processing' icon={<SyncOutlined spin />}>
              Syncing...
            </Tag>
          )
        }
        if (record.hasDiff) {
          return (
            <Tag color='warning' icon={<ExclamationCircleOutlined />}>
              {record.diffCount > 0 ? `${record.diffCount} New Available` : 'Out of sync'}
            </Tag>
          )
        }
        if (record.serverCount === null) {
          return (
            <Tag color='default' icon={<ExclamationCircleOutlined />}>
              Unknown
            </Tag>
          )
        }
        if (lastSyncTime) {
          return (
            <Tag color='success' icon={<CheckCircleOutlined />}>
              Up to Date
            </Tag>
          )
        }
        return (
          <Tag color='default' icon={<ExclamationCircleOutlined />}>
            Not Synced
          </Tag>
        )
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 250,
      align: 'right',
      render: (_, record) => (
        <Space size={6} wrap align='center'>
          <Button
            size='small'
            type='primary'
            ghost
            icon={<CloudSyncOutlined />}
            onClick={() => syncNow('sync', record.type)}
            disabled={isSyncing}
          >
            Sync
          </Button>

          <Button
            size='small'
            type='primary'
            icon={<SyncOutlined />}
            onClick={() => syncNow('full-sync', record.type)}
            disabled={isSyncing}
          >
            Full Sync
          </Button>
        </Space>
      ),
    },
  ]

  const filteredRecords = useMemo(() => {
    if (!searchText.trim()) return unsyncedRecords
    const query = searchText.toLowerCase()
    return unsyncedRecords.filter(
      (r) =>
        r.title?.toLowerCase().includes(query) ||
        r.id?.toLowerCase().includes(query) ||
        r.reason?.toLowerCase().includes(query),
    )
  }, [unsyncedRecords, searchText])

  const columns: ColumnsType<IUnsyncedRecord> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      filters: [
        { text: 'Item', value: 'item' },
        { text: 'Blog', value: 'blog' },
        { text: 'Dictation', value: 'dictation' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (type: 'item' | 'blog' | 'dictation') => (
        <Tag
          color={type === 'item' ? 'blue' : type === 'blog' ? 'purple' : 'green'}
          icon={
            type === 'item' ? (
              <DatabaseOutlined />
            ) : type === 'blog' ? (
              <ReadOutlined />
            ) : (
              <CustomerServiceOutlined />
            )
          }
          style={{ textTransform: 'capitalize', fontWeight: 500 }}
        >
          {type === 'item' ? 'Item' : type === 'blog' ? 'Blog' : 'Dictation'}
        </Tag>
      ),
    },
    {
      title: 'Title / Origin',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Space direction='vertical' size={2} style={{ maxWidth: '100%' }}>
          <Text strong style={{ wordBreak: 'break-word' }}>
            {title ||
              (record.type === 'item'
                ? '(Empty origin)'
                : record.type === 'blog'
                  ? '(Untitled blog)'
                  : '(Dictation record)')}
          </Text>
          <Text type='secondary' copyable={{ text: record.id }} style={{ fontSize: 11 }}>
            ID: {record.id}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Reason Cannot Sync',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <Tag
          color='error'
          icon={<CloseCircleOutlined />}
          style={{
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            padding: '3px 8px',
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {reason}
        </Tag>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      sorter: (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
      render: (updatedAt?: number) =>
        updatedAt ? (
          <Text type='secondary' style={{ fontSize: 12 }}>
            {moment(updatedAt).format('MMM D, YYYY h:mm A')}
          </Text>
        ) : (
          <Text type='secondary' style={{ fontSize: 12 }}>
            —
          </Text>
        ),
    },
  ]

  const getSyncTag = () => {
    if (isSyncing) {
      return (
        <Tag color='processing' icon={<SyncOutlined spin />}>
          Syncing...
        </Tag>
      )
    }
    if (hasDiff) {
      return (
        <Tag color='warning' icon={<ExclamationCircleOutlined />}>
          Sync Recommended
        </Tag>
      )
    }
    if (lastSyncTime) {
      return (
        <Text italic style={{ fontSize: 12 }}>
          {screens.xs
            ? moment(lastSyncTime).fromNow()
            : `${moment(lastSyncTime).format('MMM D, YYYY h:mm A')} (${moment(lastSyncTime).fromNow()})`}
        </Text>
      )
    }
    return (
      <Tag color='warning' icon={<ExclamationCircleOutlined />}>
        Not Synced
      </Tag>
    )
  }

  return (
    <Card
      title={
        <Space align='center' size={8}>
          <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
          <span>Database Sync</span>
          <span>{getSyncTag()}</span>
        </Space>
      }
      extra={
        <Space size={screens.xs ? 4 : 8} wrap align='center'>
          <Tooltip title='Refresh server and local counts'>
            <Button
              type='text'
              size='small'
              icon={
                <ReloadOutlined
                  spin={
                    isLoadingServerCount ||
                    isLoadingServerBlogCount ||
                    isLoadingLocalCount ||
                    isLoadingLocalBlogCount
                  }
                />
              }
              onClick={() => refreshAllCounts(true)}
              disabled={
                isLoadingServerCount ||
                isLoadingServerBlogCount ||
                isLoadingLocalCount ||
                isLoadingLocalBlogCount ||
                isSyncing
              }
            >
              {!screens.xs && 'Check Updates'}
            </Button>
          </Tooltip>
        </Space>
      }
    >
      {/* Overview Table comparing Local DB and Cloud Server */}
      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
          marginBottom: token.size,
          backgroundColor: token.colorBgContainer,
        }}
      >
        <Table<ISyncSummary>
          dataSource={summaryData}
          columns={summaryColumns}
          pagination={false}
          size={screens.xs ? 'small' : 'middle'}
          rowKey='key'
          scroll={{ x: 780 }}
        />
      </div>

      {hasDiff && !isSyncing && (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: token.size, borderRadius: token.borderRadiusSM }}
          message={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {hasItemDiff && (
                <div>
                  {diffItemCount > 0 ? (
                    <>
                      Server has <strong>{diffItemCount}</strong> item(s) not synced to this device.
                    </>
                  ) : (
                    <>
                      Local database has <strong>{Math.abs(diffItemCount)}</strong> item(s)
                      difference compared to server.
                    </>
                  )}
                </div>
              )}
              {hasBlogDiff && (
                <div>
                  {diffBlogCount > 0 ? (
                    <>
                      Server has <strong>{diffBlogCount}</strong> blog(s) not synced to this device.
                    </>
                  ) : (
                    <>
                      Local database has <strong>{Math.abs(diffBlogCount)}</strong> blog(s)
                      difference compared to server.
                    </>
                  )}
                </div>
              )}
              <Text type='secondary' style={{ fontSize: 12 }}>
                Sync is recommended to keep your items and blogs up to date.
              </Text>
            </div>
          }
        />
      )}

      {isSyncing && progressText && (
        <Alert
          type='info'
          showIcon
          icon={<SyncOutlined spin />}
          message={progressText}
          style={{ marginBottom: token.size, borderRadius: token.borderRadiusSM }}
        />
      )}

      {/* Action buttons with responsive wrapping */}
      <Flex
        wrap='wrap'
        gap={token.size / 2}
        justify='space-between'
        align='center'
        style={{ width: '100%' }}
      >
        <Flex wrap='wrap' gap={token.size / 2} style={{ width: screens.xs ? '100%' : 'auto' }}>
          <Button
            type='primary'
            icon={<CloudSyncOutlined spin={isSyncing} />}
            loading={isSyncing}
            onClick={() => syncNow('sync')}
            style={{ flex: screens.xs ? 1 : 'initial' }}
          >
            Sync
          </Button>

          <Button
            type='default'
            icon={<SyncOutlined />}
            loading={isSyncing}
            onClick={() => syncNow('full-sync')}
            style={{ flex: screens.xs ? 1 : 'initial' }}
          >
            Full Sync
          </Button>
        </Flex>

        <Flex
          wrap='wrap'
          gap={token.size / 2}
          align='center'
          justify={screens.xs ? 'space-between' : 'flex-end'}
          style={{ width: screens.xs ? '100%' : 'auto' }}
        >
          {(localItemCount > 0 || localBlogCount > 0) && (
            <Popconfirm
              title='Clear local database?'
              description='This will clear the cached items and blogs from this device. Your data in the cloud will not be affected.'
              okText='Yes, clear'
              cancelText='Cancel'
              onConfirm={clearLocalData}
            >
              <Button danger icon={<DeleteOutlined />} style={{ flex: screens.xs ? 1 : 'initial' }}>
                Clear
              </Button>
            </Popconfirm>
          )}
        </Flex>
      </Flex>

      {/* Table of items and blogs that cannot sync */}
      {(lastSyncResult || unsyncedRecords.length > 0) && (
        <div style={{ marginTop: token.size }}>
          {unsyncedRecords.length > 0 ? (
            <Card
              size='small'
              type='inner'
              title={
                <Space align='center' size={6}>
                  <ExclamationCircleOutlined style={{ color: token.colorError, fontSize: 16 }} />
                  <span>
                    Cannot Sync Records (
                    <Text strong type='danger'>
                      {unsyncedRecords.length}
                    </Text>
                    )
                  </span>
                </Space>
              }
              extra={
                <Space size={6} wrap>
                  <Tag color='blue'>
                    {unsyncedRecords.filter((r) => r.type === 'item').length} Items
                  </Tag>
                  <Tag color='purple'>
                    {unsyncedRecords.filter((r) => r.type === 'blog').length} Blogs
                  </Tag>
                </Space>
              }
              style={{
                borderColor: token.colorErrorBorder,
                backgroundColor: token.colorErrorBg,
                borderRadius: token.borderRadiusLG,
              }}
            >
              <Alert
                type='warning'
                showIcon
                message='The following items and blogs could not be synced into the local database'
                description='Review the records below. These items or blogs may have missing required fields, schema issues, or storage restrictions. You can run a Full Sync to retry.'
                style={{ marginBottom: token.size / 2 }}
              />

              {unsyncedRecords.length > 5 && (
                <div style={{ marginBottom: token.size / 2 }}>
                  <Input
                    prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                    placeholder='Filter unsynced records by title, ID, or reason...'
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    size='small'
                    style={{ width: screens.xs ? '100%' : 320 }}
                  />
                </div>
              )}

              <Table<IUnsyncedRecord>
                dataSource={filteredRecords}
                columns={columns}
                rowKey={(record) => `${record.type}_${record.id}`}
                size='small'
                pagination={{
                  pageSize: 5,
                  size: 'small',
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20'],
                  showTotal: (total) => `Total ${total} unsynced record${total > 1 ? 's' : ''}`,
                }}
                scroll={{ x: 600 }}
              />
            </Card>
          ) : (
            <Alert
              type='success'
              showIcon
              message='Sync successful'
              description='All items and blogs are up to date in your local database with 0 sync errors.'
              closable
            />
          )}
        </div>
      )}
    </Card>
  )
}
