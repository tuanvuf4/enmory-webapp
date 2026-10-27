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
  TagsOutlined,
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
    localTagCount,
    serverTagCount,
    isLoadingServerTagCount,
    refreshServerTagCount,
    pendingTagCleanupsCount,
    syncNow,
    clearLocalData,
  } = useManualSync()

  const hasItemDiff =
    serverItemCount !== null && !isLoadingServerCount && serverItemCount !== localItemCount
  const diffItemCount = serverItemCount !== null ? serverItemCount - localItemCount : 0

  const hasTagDiff =
    serverTagCount !== null && !isLoadingServerTagCount && serverTagCount !== localTagCount
  const diffTagCount = serverTagCount !== null ? serverTagCount - localTagCount : 0

  const hasDiff = hasItemDiff || hasTagDiff
  const totalNewCount =
    (diffItemCount > 0 ? diffItemCount : 0) + (diffTagCount > 0 ? diffTagCount : 0)

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
    if (pendingTagCleanupsCount > 0) {
      return (
        <Tag color='processing' icon={<ExclamationCircleOutlined />}>
          Tag Sync Pending ({pendingTagCleanupsCount})
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

        {/* Row 2: Tag Items info + Status */}
        <Col xs={24} sm={8}>
          <Space align='center' size={4}>
            <TagsOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
            <Text type='secondary'>Tag Items in Local DB:</Text>
          </Space>
          <div style={{ marginTop: 4 }}>
            <Tag color='cyan' style={{ fontSize: 14, padding: '2px 10px' }}>
              {localTagCount} tags
            </Tag>
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <Space align='center' size={4}>
            <TagsOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
            <Text type='secondary'>Tag Items on Server:</Text>
            <Tooltip title='Refresh server tags count'>
              <Button
                type='text'
                size='small'
                shape='circle'
                icon={<ReloadOutlined spin={isLoadingServerTagCount} style={{ fontSize: 11 }} />}
                onClick={refreshServerTagCount}
                disabled={isLoadingServerTagCount || isSyncing}
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
            {isLoadingServerTagCount ? (
              <Tag color='default' style={{ fontSize: 14, padding: '2px 10px' }}>
                <SyncOutlined spin /> Checking...
              </Tag>
            ) : serverTagCount !== null ? (
              <>
                <Tag
                  color={serverTagCount === localTagCount ? 'green' : 'orange'}
                  style={{ fontSize: 14, padding: '2px 10px' }}
                >
                  {serverTagCount} tags
                </Tag>
                {hasTagDiff && (
                  <Tag color={diffTagCount > 0 ? 'warning' : 'default'} style={{ fontSize: 12 }}>
                    {diffTagCount > 0 ? `+${diffTagCount} new` : `${diffTagCount}`}
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
              {hasTagDiff && (
                <div>
                  {diffTagCount > 0 ? (
                    <>
                      Server has <strong>{diffTagCount}</strong> tag item(s) not synced to this
                      device.
                    </>
                  ) : (
                    <>
                      Local database has <strong>{Math.abs(diffTagCount)}</strong> tag item(s)
                      difference compared to server.
                    </>
                  )}
                </div>
              )}
              <div>Sync is recommended to keep your items and tag items up to date.</div>
            </div>
          }
        />
      )}

      {pendingTagCleanupsCount > 0 && !isSyncing && (
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: token.size }}
          message={
            <span>
              Có <strong>{pendingTagCleanupsCount}</strong> tag đã xóa ở local đang chờ đồng bộ vào
              items trên server. Bấm <strong>Sync</strong> để đồng bộ lên cloud.
            </span>
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

          {(localItemCount > 0 || localTagCount > 0) && (
            <Popconfirm
              title='Clear local database?'
              description='This will clear the cached items and tag items from this device. Your data in the cloud will not be affected.'
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
