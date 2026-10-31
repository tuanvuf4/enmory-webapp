import React from 'react'
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
  theme,
} from 'antd'
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
} from '@ant-design/icons'
import { useManualSync } from '@/services/localDb'
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
  } = useManualSync()

  const hasItemDiff =
    serverItemCount !== null && !isLoadingServerCount && serverItemCount !== localItemCount
  const diffItemCount = serverItemCount !== null ? serverItemCount - localItemCount : 0

  const hasBlogDiff =
    serverBlogCount !== null && !isLoadingServerBlogCount && serverBlogCount !== localBlogCount
  const diffBlogCount = serverBlogCount !== null ? serverBlogCount - localBlogCount : 0

  const hasDiff = hasItemDiff || hasBlogDiff
  const totalNewCount =
    (diffItemCount > 0 ? diffItemCount : 0) + (diffBlogCount > 0 ? diffBlogCount : 0)

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
            <Tag color='success' icon={<CheckCircleOutlined />}>
              All Up to Date
            </Tag>
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
    </Card>
  )
}
