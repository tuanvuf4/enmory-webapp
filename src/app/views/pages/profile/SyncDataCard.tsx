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
    syncNow,
    clearLocalData,
  } = useManualSync()

  const hasDiff =
    serverItemCount !== null && !isLoadingServerCount && serverItemCount !== localItemCount

  const diffCount = serverItemCount !== null ? serverItemCount - localItemCount : 0

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
        <Tag color='success' icon={<CheckCircleOutlined />}>
          Synced
        </Tag>
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
          <span>Database Sync</span>
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
            <Tooltip title='Refresh server count'>
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
                {hasDiff && (
                  <Tag color={diffCount > 0 ? 'warning' : 'default'} style={{ fontSize: 12 }}>
                    {diffCount > 0 ? `+${diffCount} new` : `${diffCount}`}
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
          <Text type='secondary'>Last Synced:</Text>
          <div style={{ marginTop: 4 }}>
            <Text strong>
              {lastSyncTime
                ? `${moment(lastSyncTime).format('MMM D, YYYY h:mm A')} (${moment(lastSyncTime).fromNow()})`
                : 'Never'}
            </Text>
          </div>
        </Col>
      </Row>

      {hasDiff && !isSyncing && (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: token.size }}
          message={
            <span>
              {diffCount > 0 ? (
                <>
                  Server has <strong>{diffCount}</strong> item(s) not synced to this device.
                </>
              ) : (
                <>
                  Local database has <strong>{Math.abs(diffCount)}</strong> item(s) difference
                  compared to server.
                </>
              )}{' '}
              Sync is recommended to keep your data up to date.
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
            Sync {diffCount > 0 ? `(${diffCount} new)` : ''}
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

          {localItemCount > 0 && (
            <Popconfirm
              title='Clear local database?'
              description='This will clear the cached items from this device. Your data in the cloud will not be affected.'
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
