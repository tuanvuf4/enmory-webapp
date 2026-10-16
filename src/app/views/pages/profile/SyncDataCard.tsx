import React from 'react'
import { Card, Button, Space, Typography, Tag, Row, Col, Popconfirm, theme } from 'antd'
import {
  CloudSyncOutlined,
  SyncOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  MobileOutlined,
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
    localExampleCount,
    syncNow,
    clearLocalData,
  } = useManualSync()

  return (
    <Card
      title={
        <Space align='center'>
          <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
          <span>Local Database & Search Synchronization</span>
        </Space>
      }
      extra={
        isSyncing ? (
          <Tag color='processing' icon={<SyncOutlined spin />}>
            Syncing...
          </Tag>
        ) : lastSyncTime ? (
          <Tag color='success' icon={<CheckCircleOutlined />}>
            Synced
          </Tag>
        ) : (
          <Tag color='warning' icon={<ExclamationCircleOutlined />}>
            Not Synced
          </Tag>
        )
      }
      style={{
        width: '100%',
        borderRadius: token.borderRadiusLG,
        marginTop: token.size,
      }}
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
          <Text type='secondary'>Examples in Local DB:</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color='purple' style={{ fontSize: 14, padding: '2px 10px' }}>
              {localExampleCount} examples
            </Tag>
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
            Sync Data
          </Button>

          <Button
            type='default'
            icon={<SyncOutlined />}
            loading={isSyncing}
            onClick={() => syncNow(true)}
          >
            Full Re-sync
          </Button>
        </Space>

        <Space wrap size={token.size / 2}>
          <Tag icon={<MobileOutlined />} color='default'>
            Mobile Ready
          </Tag>

          {localItemCount > 0 && (
            <Popconfirm
              title='Clear local database?'
              description='This will clear the cached items and examples from this device. Your data in Firebase cloud will not be affected.'
              okText='Yes, clear'
              cancelText='Cancel'
              onConfirm={clearLocalData}
            >
              <Button danger type='text' icon={<DeleteOutlined />}>
                Clear Local DB
              </Button>
            </Popconfirm>
          )}
        </Space>
      </Space>
    </Card>
  )
}
