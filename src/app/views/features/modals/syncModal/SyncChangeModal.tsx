import React, { useState, useEffect, useRef } from 'react'
import { Modal, Button, Typography, Space, Tag, Flex, Alert, theme } from 'antd'
import {
  CloudSyncOutlined,
  DatabaseOutlined,
  ReadOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useSelector } from '@/core/hooks/redux'
import { syncService, IDataChanges, useManualSync } from '@/services/localDb'
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
  const [syncSuccess, setSyncSuccess] = useState(false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const hasCheckedInitialRef = useRef(false)
  const isCheckingRef = useRef(false)

  const { isSyncing, progressText, syncNow } = useManualSync()

  // Detect data changes on initial page load
  useEffect(() => {
    if (!isAuth || !user?.uid) return
    if (hasCheckedInitialRef.current || isCheckingRef.current) return

    const runDetection = async () => {
      isCheckingRef.current = true
      try {
        const detected = await syncService.detectDataChanges(user.uid)
        hasCheckedInitialRef.current = true

        if (detected.hasChanges) {
          setChanges(detected)
          setInternalOpen(true)
        }
      } catch (err) {
        console.warn('Initial data changes detection error:', err)
      } finally {
        isCheckingRef.current = false
      }
    }

    // Brief timeout so Redux, router, and Dexie DB are completely mounted and idle
    const timer = setTimeout(runDetection, 800)
    return () => clearTimeout(timer)
  }, [isAuth, user?.uid])

  const handleClose = () => {
    if (isSyncing) return
    if (isControlled) {
      controlledOnClose?.()
    } else {
      setInternalOpen(false)
    }
  }

  const handleSync = async () => {
    if (isSyncing) return
    try {
      const result = await syncNow()
      if (result && result.isSuccess) {
        setSyncSuccess(true)
        setTimeout(() => {
          handleClose()
          setSyncSuccess(false)
        }, 1500)
      }
    } catch (err) {
      console.error('Modal sync execution error:', err)
    }
  }

  if (!changes && !isControlled) {
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
      maskClosable={!isSyncing}
      centered
      width={520}
      destroyOnClose={false}
      footer={
        <Flex justify='flex-end' gap={8} style={{ paddingTop: 8 }}>
          <Button onClick={handleClose} disabled={isSyncing}>
            Later
          </Button>
          <Button
            type='primary'
            icon={isSyncing ? <SyncOutlined spin /> : <CloudSyncOutlined />}
            loading={isSyncing}
            disabled={syncSuccess}
            onClick={handleSync}
          >
            {isSyncing ? 'Syncing...' : 'Sync Data'}
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
              Changes detected between your local data and cloud
            </Text>
          </Flex>
        </Flex>
      }
    >
      <div style={{ marginTop: 16 }}>
        {syncSuccess ? (
          <Alert
            type='success'
            showIcon
            icon={<CheckCircleOutlined />}
            message='Data Synchronized Successfully'
            description='Your local vocabulary and blogs are now fully up to date.'
            style={{ marginBottom: 16 }}
          />
        ) : (
          <>
            <Text type='secondary' style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              We noticed newer or updated vocabulary cards and blogs in the cloud. Sync now to keep
              your study materials up to date.
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
                        Vocabulary Items
                      </Text>
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        Local: {changes?.items.localCount ?? 0} | Cloud:{' '}
                        {changes?.items.serverCount ?? 0}
                      </Text>
                    </div>
                  </Space>

                  <Space size={6} wrap>
                    {changes?.items.hasChanges ? (
                      <>
                        {changes.items.diffCount > 0 && (
                          <Tag color='blue' style={{ margin: 0, fontWeight: 500 }}>
                            +{changes.items.diffCount} new
                          </Tag>
                        )}
                        {changes.items.diffCount < 0 && (
                          <Tag color='orange' style={{ margin: 0, fontWeight: 500 }}>
                            {Math.abs(changes.items.diffCount)} removed
                          </Tag>
                        )}
                        {changes.items.updatedCount > 0 && (
                          <Tag color='cyan' style={{ margin: 0, fontWeight: 500 }}>
                            {changes.items.updatedCount} modified
                          </Tag>
                        )}
                        {changes.items.diffCount === 0 && changes.items.updatedCount === 0 && (
                          <Tag
                            color='warning'
                            icon={<ExclamationCircleOutlined />}
                            style={{ margin: 0, fontWeight: 500 }}
                          >
                            Out of sync
                          </Tag>
                        )}
                      </>
                    ) : (
                      <Tag
                        color='success'
                        icon={<CheckCircleOutlined />}
                        style={{ margin: 0, fontWeight: 500 }}
                      >
                        Up to date
                      </Tag>
                    )}
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
                        Blogs & Articles
                      </Text>
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        Local: {changes?.blogs.localCount ?? 0} | Cloud:{' '}
                        {changes?.blogs.serverCount ?? 0}
                      </Text>
                    </div>
                  </Space>

                  <Space size={6} wrap>
                    {changes?.blogs.hasChanges ? (
                      <>
                        {changes.blogs.diffCount > 0 && (
                          <Tag color='purple' style={{ margin: 0, fontWeight: 500 }}>
                            +{changes.blogs.diffCount} new
                          </Tag>
                        )}
                        {changes.blogs.diffCount < 0 && (
                          <Tag color='orange' style={{ margin: 0, fontWeight: 500 }}>
                            {Math.abs(changes.blogs.diffCount)} removed
                          </Tag>
                        )}
                        {changes.blogs.updatedCount > 0 && (
                          <Tag color='cyan' style={{ margin: 0, fontWeight: 500 }}>
                            {changes.blogs.updatedCount} modified
                          </Tag>
                        )}
                        {changes.blogs.diffCount === 0 && changes.blogs.updatedCount === 0 && (
                          <Tag
                            color='warning'
                            icon={<ExclamationCircleOutlined />}
                            style={{ margin: 0, fontWeight: 500 }}
                          >
                            Out of sync
                          </Tag>
                        )}
                      </>
                    ) : (
                      <Tag
                        color='success'
                        icon={<CheckCircleOutlined />}
                        style={{ margin: 0, fontWeight: 500 }}
                      >
                        Up to date
                      </Tag>
                    )}
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
          </>
        )}
      </div>
    </Modal>
  )
}
