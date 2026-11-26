import React, { useState, useEffect, useRef } from 'react'
import { Modal, Button, Typography, Space, Tag, Flex, Alert, theme } from 'antd'
import {
  CloudSyncOutlined,
  DatabaseOutlined,
  ReadOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  FormOutlined,
} from '@ant-design/icons'
import { useSelector } from '@/core/hooks/redux'
import { syncService, IDataChanges, useManualSync, SyncMode, SyncType } from '@/services/localDb'
import moment from 'moment'

const { Text, Title } = Typography

export interface SyncChangeModalProps {
  open?: boolean
  onClose?: () => void
}

export const SyncChangeModal: React.FC<SyncChangeModalProps> = ({
  open: controlledOpen,
  onClose: controlledOnClose,
}) => {
  const { token } = theme.useToken()
  const { user, isAuth } = useSelector((state) => state.auth)

  const [internalOpen, setInternalOpen] = useState(false)
  const [changes, setChanges] = useState<IDataChanges | null>(null)
  const [syncingType, setSyncingType] = useState<SyncType | null>(null)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const hasCheckedInitialRef = useRef(false)
  const isCheckingRef = useRef(false)

  const { isSyncing, progressText, syncNow, syncFeedback, clearSyncFeedback } = useManualSync({
    showMessages: false,
  })

  // Detect data changes on initial page load / reload
  useEffect(() => {
    if (!isAuth || !user?.uid) return
    if (hasCheckedInitialRef.current || isCheckingRef.current) {
      return
    }

    const runDetection = async () => {
      isCheckingRef.current = true
      try {
        const detected = await syncService.detectDataChanges(user.uid, true)
        hasCheckedInitialRef.current = true

        if (detected.hasChanges) {
          setChanges(detected)
          setInternalOpen(true)
        } else {
          setChanges(null)
          setInternalOpen(false)
        }
      } catch (err) {
        console.warn('Initial data changes detection error:', err)
      } finally {
        isCheckingRef.current = false
      }
    }

    // Delay slightly so initial rendering and local IndexedDB are completely ready
    const timer = setTimeout(runDetection, 1200)
    return () => clearTimeout(timer)
  }, [isAuth, user?.uid])

  // When controlled open is passed, verify changes and auto-close if none
  useEffect(() => {
    if (isControlled && controlledOpen && user?.uid) {
      syncService.detectDataChanges(user.uid, true).then((detected) => {
        if (detected.hasChanges) {
          setChanges(detected)
        } else {
          setChanges(null)
          controlledOnClose?.()
        }
      })
    }
  }, [isControlled, controlledOpen, user?.uid, controlledOnClose])

  const handleClose = () => {
    if (isSyncing) return
    if (isControlled) {
      controlledOnClose?.()
    } else {
      setInternalOpen(false)
    }
    setChanges(null)
    clearSyncFeedback()
  }

  const handleSync = async (mode: SyncMode = 'sync', type: SyncType = 'all') => {
    if (isSyncing) return
    setSyncingType(type)
    clearSyncFeedback()
    try {
      const result = await syncNow(mode, type)
      if (result && result.isSuccess) {
        if (user?.uid) {
          const detected = await syncService.detectDataChanges(user.uid, true)
          setChanges(detected)
        }
      }
    } catch (err) {
      console.error('Modal sync execution error:', err)
    } finally {
      setSyncingType(null)
    }
  }

  // Không có trạng thái mở thì không render modal
  if (!isOpen) {
    return null
  }

  const lastSyncLabel = changes?.lastSyncTime
    ? moment(changes.lastSyncTime).fromNow()
    : 'Never synced on this device'

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      closable={!isSyncing}
      centered
      width={520}
      footer={
        <Flex justify='flex-end' gap={8} style={{ paddingTop: 8 }} wrap='wrap'>
          <Button onClick={handleClose} disabled={isSyncing}>
            {syncFeedback?.type === 'success' ||
            syncFeedback?.type === 'warning' ||
            !changes?.hasChanges
              ? 'Đóng'
              : 'Để sau'}
          </Button>
          <Button
            type='default'
            icon={<SyncOutlined />}
            loading={isSyncing && syncingType === 'all'}
            disabled={isSyncing}
            onClick={() => handleSync('full-sync', 'all')}
          >
            Full Sync
          </Button>
          <Button
            type='primary'
            icon={
              isSyncing && syncingType === 'all' ? <SyncOutlined spin /> : <CloudSyncOutlined />
            }
            loading={isSyncing && syncingType === 'all'}
            disabled={isSyncing}
            onClick={() => handleSync('sync', 'all')}
          >
            {isSyncing && syncingType === 'all' ? 'Syncing...' : 'Sync'}
          </Button>
        </Flex>
      }
      title={
        <Flex align='center' gap={10}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: token.borderRadiusLG,
              backgroundColor: token.colorPrimaryBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CloudSyncOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
          </div>
          <Flex vertical gap={2}>
            <Title level={5} style={{ margin: 0, lineHeight: 1.3 }}>
              Data Updates Available
            </Title>
            <Text type='secondary' style={{ fontSize: 12, fontWeight: 'normal' }}>
              Updates detected in your cloud database
            </Text>
          </Flex>
        </Flex>
      }
    >
      <div style={{ marginTop: 16 }}>
        {!isSyncing && syncFeedback && (
          <Alert
            type={syncFeedback.type}
            showIcon
            closable
            onClose={clearSyncFeedback}
            message={syncFeedback.message}
            description={syncFeedback.description}
            style={{ marginBottom: 16 }}
          />
        )}

        <Text type='secondary' style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
          New or updated vocabulary cards and blogs were found in the cloud. Sync now to update your
          local library.
        </Text>

        <Flex vertical gap={12}>
          {/* Vocabulary Items Section */}
          <div
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              padding: '12px 16px',
              backgroundColor: token.colorFillAlter,
            }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
              <Space size={10} align='center'>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: token.borderRadiusSM,
                    backgroundColor: token.colorPrimaryBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    Vocabulary
                  </Text>
                  <Text type='secondary' style={{ fontSize: 11 }}>
                    {changes?.items.localCount ?? 0} items
                  </Text>
                </div>
              </Space>

              <Space size={8} wrap align='center'>
                {changes?.items.hasChanges ? (
                  <Tag color='blue' style={{ margin: 0, fontWeight: 500 }}>
                    Updates available
                  </Tag>
                ) : (
                  <Tag
                    color='success'
                    icon={<CheckCircleOutlined />}
                    style={{ margin: 0, fontWeight: 500 }}
                  >
                    Up to date
                  </Tag>
                )}
                <Button
                  size='small'
                  type={changes?.items.hasChanges ? 'primary' : 'default'}
                  ghost={Boolean(changes?.items.hasChanges)}
                  icon={
                    isSyncing && syncingType === 'item' ? (
                      <SyncOutlined spin />
                    ) : (
                      <CloudSyncOutlined />
                    )
                  }
                  loading={isSyncing && syncingType === 'item'}
                  disabled={isSyncing}
                  onClick={() => handleSync('sync', 'item')}
                >
                  Sync
                </Button>
              </Space>
            </Flex>
          </div>

          {/* Blogs & Articles Section */}
          <div
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              padding: '12px 16px',
              backgroundColor: token.colorFillAlter,
            }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
              <Space size={10} align='center'>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: token.borderRadiusSM,
                    backgroundColor: '#f9f0ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ReadOutlined style={{ color: '#722ed1', fontSize: 16 }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    Articles
                  </Text>
                  <Text type='secondary' style={{ fontSize: 11 }}>
                    {changes?.blogs.localCount ?? 0} articles
                  </Text>
                </div>
              </Space>

              <Space size={8} wrap align='center'>
                {changes?.blogs.hasChanges ? (
                  <Tag color='purple' style={{ margin: 0, fontWeight: 500 }}>
                    Updates available
                  </Tag>
                ) : (
                  <Tag
                    color='success'
                    icon={<CheckCircleOutlined />}
                    style={{ margin: 0, fontWeight: 500 }}
                  >
                    Up to date
                  </Tag>
                )}
                <Button
                  size='small'
                  type={changes?.blogs.hasChanges ? 'primary' : 'default'}
                  ghost={Boolean(changes?.blogs.hasChanges)}
                  icon={
                    isSyncing && syncingType === 'blog' ? (
                      <SyncOutlined spin />
                    ) : (
                      <CloudSyncOutlined />
                    )
                  }
                  loading={isSyncing && syncingType === 'blog'}
                  disabled={isSyncing}
                  onClick={() => handleSync('sync', 'blog')}
                >
                  Sync
                </Button>
              </Space>
            </Flex>
          </div>

          {/* Dictation Practice Section */}
          <div
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              padding: '12px 16px',
              backgroundColor: token.colorFillAlter,
            }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
              <Space size={10} align='center'>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: token.borderRadiusSM,
                    backgroundColor: '#e6fffb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CustomerServiceOutlined style={{ color: '#10b981', fontSize: 16 }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    Dictation
                  </Text>
                  <Text type='secondary' style={{ fontSize: 11 }}>
                    {changes?.dictations.localCount ?? 0} records
                  </Text>
                </div>
              </Space>

              <Space size={8} wrap align='center'>
                {changes?.dictations.hasChanges ? (
                  <Tag color='blue' style={{ margin: 0, fontWeight: 500 }}>
                    Updates available
                  </Tag>
                ) : (
                  <Tag
                    color='success'
                    icon={<CheckCircleOutlined />}
                    style={{ margin: 0, fontWeight: 500 }}
                  >
                    Up to date
                  </Tag>
                )}
                <Button
                  size='small'
                  type={changes?.dictations.hasChanges ? 'primary' : 'default'}
                  ghost={Boolean(changes?.dictations.hasChanges)}
                  icon={
                    isSyncing && syncingType === 'dictation' ? (
                      <SyncOutlined spin />
                    ) : (
                      <CloudSyncOutlined />
                    )
                  }
                  loading={isSyncing && syncingType === 'dictation'}
                  disabled={isSyncing}
                  onClick={() => handleSync('sync', 'dictation')}
                >
                  Sync
                </Button>
              </Space>
            </Flex>
          </div>

          {/* TOEIC Exams & History Section */}
          <div
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              padding: '12px 16px',
              backgroundColor: token.colorFillAlter,
            }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
              <Space size={10} align='center'>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: token.borderRadiusSM,
                    backgroundColor: '#eef2ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FormOutlined style={{ color: '#4f46e5', fontSize: 16 }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    TOEIC Exams
                  </Text>
                  <Text type='secondary' style={{ fontSize: 11 }}>
                    {changes?.toeic?.localCount ?? 0} exams
                  </Text>
                </div>
              </Space>

              <Space size={8} wrap align='center'>
                {changes?.toeic?.hasChanges ? (
                  <Tag color='blue' style={{ margin: 0, fontWeight: 500 }}>
                    Updates available
                  </Tag>
                ) : (
                  <Tag
                    color='success'
                    icon={<CheckCircleOutlined />}
                    style={{ margin: 0, fontWeight: 500 }}
                  >
                    Up to date
                  </Tag>
                )}
                <Button
                  size='small'
                  type={changes?.toeic?.hasChanges ? 'primary' : 'default'}
                  ghost={Boolean(changes?.toeic?.hasChanges)}
                  icon={
                    isSyncing && syncingType === 'toeic' ? (
                      <SyncOutlined spin />
                    ) : (
                      <CloudSyncOutlined />
                    )
                  }
                  loading={isSyncing && syncingType === 'toeic'}
                  disabled={isSyncing}
                  onClick={() => handleSync('sync', 'toeic')}
                >
                  Sync
                </Button>
              </Space>
            </Flex>
          </div>
        </Flex>

        {/* Last Sync Info */}
        <Flex align='center' gap={6} style={{ marginTop: 14 }}>
          <ClockCircleOutlined style={{ color: token.colorTextTertiary, fontSize: 12 }} />
          <Text type='secondary' style={{ fontSize: 12 }}>
            Last synced: <Text style={{ fontSize: 12, fontWeight: 500 }}>{lastSyncLabel}</Text>
          </Text>
        </Flex>

        {/* In-progress alert */}
        {isSyncing && (
          <Alert
            type='info'
            showIcon
            icon={<SyncOutlined spin />}
            message='Synchronizing...'
            description={progressText || 'Fetching data and updating local database...'}
            style={{ marginTop: 14 }}
          />
        )}
      </div>
    </Modal>
  )
}
