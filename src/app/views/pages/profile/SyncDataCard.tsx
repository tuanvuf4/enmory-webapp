import React, { useState, useMemo } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Popconfirm,
  Alert,
  Tooltip,
  Table,
  Input,
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
  MobileOutlined,
  ReloadOutlined,
  ReadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useManualSync, IUnsyncedRecord } from '@/services/localDb'
import moment from 'moment'

const { Text } = Typography

export const SyncDataCard: React.FC = () => {
  const { token } = theme.useToken()
  const {
    isSyncing,
    progressText,
    lastSyncTime,
    localItemCount,
    serverItemCount,
    isLoadingServerCount,
    refreshServerItemCount,
    localBlogCount,
    serverBlogCount,
    isLoadingServerBlogCount,
    refreshServerBlogCount,
    syncNow,
    clearLocalData,
    unsyncedRecords = [],
    lastSyncResult,
  } = useManualSync()

  const [searchText, setSearchText] = useState('')

  const hasItemDiff =
    serverItemCount !== null && !isLoadingServerCount && serverItemCount !== localItemCount
  const diffItemCount = serverItemCount !== null ? serverItemCount - localItemCount : 0

  const hasBlogDiff =
    serverBlogCount !== null && !isLoadingServerBlogCount && serverBlogCount !== localBlogCount
  const diffBlogCount = serverBlogCount !== null ? serverBlogCount - localBlogCount : 0

  const hasDiff = hasItemDiff || hasBlogDiff
  const totalNewCount =
    (diffItemCount > 0 ? diffItemCount : 0) + (diffBlogCount > 0 ? diffBlogCount : 0)

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
      width: 100,
      filters: [
        { text: 'Item', value: 'item' },
        { text: 'Blog', value: 'blog' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (type: 'item' | 'blog') => (
        <Tag
          color={type === 'item' ? 'blue' : 'purple'}
          icon={type === 'item' ? <DatabaseOutlined /> : <ReadOutlined />}
          style={{ textTransform: 'capitalize', fontWeight: 500 }}
        >
          {type === 'item' ? 'Item' : 'Blog'}
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
            {title || (record.type === 'item' ? '(Empty origin)' : '(Untitled blog)')}
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
          {lastSyncTime
            ? `${moment(lastSyncTime).format('MMM D, YYYY h:mm A')} (${moment(lastSyncTime).fromNow()})`
            : 'Never'}
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
        <Space align='center'>
          <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
          <span>Database</span>
        </Space>
      }
      extra={getSyncTag()}
    >
      <Row
        gutter={[token.size, token.size]}
        style={{
          backgroundColor: token.colorFillAlter,
          padding: token.size,
          borderRadius: token.borderRadius,
          marginBottom: token.size,
        }}
      >
        {/* Row 1: Items info + Last Synced */}
        <Col xs={24} sm={8}>
          <Text type='secondary'>Items in Local DB:</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color='blue' style={{ fontSize: 14, padding: '2px 10px' }}>
              {localItemCount} items
            </Tag>
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <Space align='center' size={4}>
            <Text type='secondary'>Items on Server:</Text>
            <Tooltip title='Refresh server items count'>
              <Button
                type='text'
                size='small'
                shape='circle'
                icon={<ReloadOutlined spin={isLoadingServerCount} style={{ fontSize: 11 }} />}
                onClick={refreshServerItemCount}
                disabled={isLoadingServerCount || isSyncing}
                style={{
                  width: 20,
                  height: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Tooltip>
          </Space>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isLoadingServerCount ? (
              <Tag color='default' style={{ fontSize: 14, padding: '2px 10px' }}>
                <SyncOutlined spin /> Checking...
              </Tag>
            ) : serverItemCount !== null ? (
              <>
                <Tag
                  color={serverItemCount === localItemCount ? 'green' : 'orange'}
                  style={{ fontSize: 14, padding: '2px 10px' }}
                >
                  {serverItemCount} items
                </Tag>
                {hasItemDiff && (
                  <Tag color={diffItemCount > 0 ? 'warning' : 'default'} style={{ fontSize: 12 }}>
                    {diffItemCount > 0 ? `+${diffItemCount} new` : `${diffItemCount}`}
                  </Tag>
                )}
              </>
            ) : (
              <Tag color='error' style={{ fontSize: 14, padding: '2px 10px' }}>
                Unavailable
              </Tag>
            )}
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <Text type='secondary'>Sync Status:</Text>
          <div style={{ marginTop: 4 }}>
            {isSyncing ? (
              <Tag color='processing' icon={<SyncOutlined spin />}>
                Syncing...
              </Tag>
            ) : hasItemDiff ? (
              <Tag color='warning' icon={<ExclamationCircleOutlined />}>
                Updates Available
              </Tag>
            ) : lastSyncTime ? (
              <Tag color='success' icon={<CheckCircleOutlined />}>
                All Up to Date
              </Tag>
            ) : (
              <Tag color='warning' icon={<ExclamationCircleOutlined />}>
                Not Synced
              </Tag>
            )}
          </div>
        </Col>

        {/* Row 2: Blog info + Status */}
        <Col xs={24} sm={8}>
          <Space align='center' size={4}>
            <ReadOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
            <Text type='secondary'>Blogs in Local DB:</Text>
          </Space>
          <div style={{ marginTop: 4 }}>
            <Tag color='purple' style={{ fontSize: 14, padding: '2px 10px' }}>
              {localBlogCount} blogs
            </Tag>
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <Space align='center' size={4}>
            <ReadOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
            <Text type='secondary'>Blogs on Server:</Text>
            <Tooltip title='Refresh server blogs count'>
              <Button
                type='text'
                size='small'
                shape='circle'
                icon={<ReloadOutlined spin={isLoadingServerBlogCount} style={{ fontSize: 11 }} />}
                onClick={refreshServerBlogCount}
                disabled={isLoadingServerBlogCount || isSyncing}
                style={{
                  width: 20,
                  height: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Tooltip>
          </Space>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isLoadingServerBlogCount ? (
              <Tag color='default' style={{ fontSize: 14, padding: '2px 10px' }}>
                <SyncOutlined spin /> Checking...
              </Tag>
            ) : serverBlogCount !== null ? (
              <>
                <Tag
                  color={serverBlogCount === localBlogCount ? 'green' : 'orange'}
                  style={{ fontSize: 14, padding: '2px 10px' }}
                >
                  {serverBlogCount} blogs
                </Tag>
                {hasBlogDiff && (
                  <Tag color={diffBlogCount > 0 ? 'warning' : 'default'} style={{ fontSize: 12 }}>
                    {diffBlogCount > 0 ? `+${diffBlogCount} new` : `${diffBlogCount}`}
                  </Tag>
                )}
              </>
            ) : (
              <Tag color='error' style={{ fontSize: 14, padding: '2px 10px' }}>
                Unavailable
              </Tag>
            )}
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <Text type='secondary'>Sync Status:</Text>
          <div style={{ marginTop: 4 }}>
            {isSyncing ? (
              <Tag color='processing' icon={<SyncOutlined spin />}>
                Syncing...
              </Tag>
            ) : hasDiff ? (
              <Tag color='warning' icon={<ExclamationCircleOutlined />}>
                Updates Available
              </Tag>
            ) : lastSyncTime ? (
              <Tag color='success' icon={<CheckCircleOutlined />}>
                All Up to Date
              </Tag>
            ) : (
              <Tag color='warning' icon={<ExclamationCircleOutlined />}>
                Not Synced
              </Tag>
            )}
          </div>
        </Col>
      </Row>

      {hasDiff && !isSyncing && (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: token.size }}
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
              <div>Sync is recommended to keep your items and blogs up to date.</div>
            </div>
          }
        />
      )}

      {isSyncing && progressText && (
        <div style={{ marginBottom: token.size }}>
          <Space>
            <SyncOutlined spin style={{ color: token.colorPrimary }} />
            <Text style={{ color: token.colorPrimary }}>{progressText}</Text>
          </Space>
        </div>
      )}

      <Space wrap size={token.size / 2} style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap size={token.size / 2}>
          <Button
            type='primary'
            icon={<CloudSyncOutlined spin={isSyncing} />}
            loading={isSyncing}
            onClick={() => syncNow(false)}
          >
            Sync {totalNewCount > 0 ? `(${totalNewCount} new)` : ''}
          </Button>

          <Button
            type='default'
            icon={<SyncOutlined />}
            loading={isSyncing}
            onClick={() => syncNow(true)}
          >
            Full Sync
          </Button>
        </Space>

        <Space wrap size={token.size / 2}>
          <Tag icon={<MobileOutlined />} color='default'>
            Mobile Ready
          </Tag>

          {(localItemCount > 0 || localBlogCount > 0) && (
            <Popconfirm
              title='Clear local database?'
              description='This will clear the cached items and blogs from this device. Your data in the cloud will not be affected.'
              okText='Yes, clear'
              cancelText='Cancel'
              onConfirm={clearLocalData}
            >
              <Button danger type='text' icon={<DeleteOutlined />}>
                Clear
              </Button>
            </Popconfirm>
          )}
        </Space>
      </Space>

      {/* Table of items and blogs that cannot sync */}
      {(lastSyncResult || unsyncedRecords.length > 0) && (
        <div style={{ marginTop: token.size }}>
          {unsyncedRecords.length > 0 ? (
            <Card
              size='small'
              type='inner'
              title={
                <Space align='center'>
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
                <Space size={6}>
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
                    style={{ maxWidth: 350 }}
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
