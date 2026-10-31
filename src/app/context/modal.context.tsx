import React, { createContext, useContext, useState, PropsWithChildren, ReactNode } from 'react'
import { Modal, ModalProps, FloatButton, Flex, theme } from 'antd'
import {
  CloseSquareOutlined,
  CloseOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FormOutlined,
} from '@ant-design/icons'
import { styleConfig } from '@/style/appStyle'

export interface ModalMinimizeInfo {
  icon?: ReactNode
  title?: ReactNode
  tooltip?: ReactNode
  status?: 'default' | 'processing' | 'success' | 'error' | 'warning'
}

export interface ModalConfig extends Omit<ModalProps, 'open' | 'onCancel' | 'onOk'> {
  id?: string
  content: ReactNode
  onConfirm?: () => void | Promise<void>
  onClose?: () => void
  allowMinimize?: boolean
  isMinimized?: boolean
  minimizeInfo?: ModalMinimizeInfo
  onMinimizeChange?: (minimized: boolean) => void
  tag?: ReactNode
}

export interface CurrentModalContextType {
  modalId: string
  isMinimized: boolean
  minimize: (info?: ModalMinimizeInfo) => void
  restore: () => void
  updateMinimizeInfo: (info: Partial<ModalMinimizeInfo>) => void
  close: () => void
}

export interface ModalContextType {
  openModal: (config: ModalConfig) => string
  closeModal: (id?: string) => void
  updateModal: (config: Partial<ModalConfig>, id?: string) => void
  minimizeModal: (id?: string, minimizeInfo?: ModalMinimizeInfo) => void
  restoreModal: (id?: string) => void
  isModalMinimized: (id?: string) => boolean
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)
export const CurrentModalContext = createContext<CurrentModalContextType | undefined>(undefined)

export const ModalProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [modals, setModals] = useState<ModalConfig[]>([])
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  const { token } = theme.useToken()

  const openModal = (config: ModalConfig): string => {
    const id = config.id || Math.random().toString(36).substring(7)
    setModals((prev) => [...prev, { ...config, id, isMinimized: !!config.isMinimized }])
    return id
  }

  const closeModal = (id?: string) => {
    if (id) {
      setModals((prev) => {
        const target = prev.find((m) => m.id === id)
        target?.onClose?.()
        return prev.filter((m) => m.id !== id)
      })
    } else {
      setModals((prev) => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]
        last?.onClose?.()
        return prev.slice(0, -1)
      })
    }
  }

  const updateModal = (config: Partial<ModalConfig>, id?: string) => {
    setModals((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const targetIndex = id ? next.findIndex((m) => m.id === id) : next.length - 1
      if (targetIndex >= 0) {
        next[targetIndex] = {
          ...next[targetIndex],
          ...config,
          minimizeInfo: {
            ...next[targetIndex].minimizeInfo,
            ...config.minimizeInfo,
          },
        }
      }
      return next
    })
  }

  const minimizeModal = (id?: string, minimizeInfo?: ModalMinimizeInfo) => {
    setModals((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const targetIndex = id ? next.findIndex((m) => m.id === id) : next.length - 1
      if (targetIndex >= 0) {
        const target = next[targetIndex]
        target.onMinimizeChange?.(true)
        next[targetIndex] = {
          ...target,
          isMinimized: true,
          minimizeInfo: {
            ...target.minimizeInfo,
            ...minimizeInfo,
          },
        }
      }
      return next
    })
  }

  const restoreModal = (id?: string) => {
    setModals((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      let targetIndex = -1
      if (id) {
        targetIndex = next.findIndex((m) => m.id === id)
      } else {
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].isMinimized) {
            targetIndex = i
            break
          }
        }
      }

      if (targetIndex >= 0) {
        const target = next[targetIndex]
        target.onMinimizeChange?.(false)
        next[targetIndex] = {
          ...target,
          isMinimized: false,
        }
      }
      return next
    })
  }

  const isModalMinimized = (id?: string): boolean => {
    if (id) {
      const modal = modals.find((m) => m.id === id)
      return !!modal?.isMinimized
    }
    return !!modals[modals.length - 1]?.isMinimized
  }

  const handleOk = async (id: string) => {
    const config = modals.find((m) => m.id === id)
    if (config?.onConfirm) {
      try {
        setLoadingMap((prev) => ({ ...prev, [id]: true }))
        await config.onConfirm()
        setModals((prev) => prev.filter((m) => m.id !== id))
      } catch (error) {
        console.error('Modal confirm error:', error)
      } finally {
        setLoadingMap((prev) => ({ ...prev, [id]: false }))
      }
    } else {
      setModals((prev) => prev.filter((m) => m.id !== id))
    }
  }

  const handleCancel = (id: string) => {
    const config = modals.find((m) => m.id === id)
    config?.onClose?.()
    setModals((prev) => prev.filter((m) => m.id !== id))
  }

  const renderTitle = (config: ModalConfig) => {
    if (!config.title && !config.tag && !config.minimizeInfo?.icon) return config.title

    return (
      <Flex align={'center'} gap={8} style={{ overflow: 'hidden' }}>
        {config.minimizeInfo?.icon}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {config.title}
        </span>
        {config.tag}
      </Flex>
    )
  }

  const minimizedModals = modals.filter((m) => m.isMinimized)

  return (
    <ModalContext.Provider
      value={{
        openModal,
        closeModal,
        updateModal,
        minimizeModal,
        restoreModal,
        isModalMinimized,
      }}
    >
      {children}
      {modals.map((config) => {
        const isHidden = !!config.isMinimized
        return (
          <Modal
            key={config.id}
            open={!isHidden}
            forceRender={true}
            destroyOnHidden={false}
            onOk={() => handleOk(config.id!)}
            onCancel={() => handleCancel(config.id!)}
            confirmLoading={loadingMap[config.id!] || false}
            closeIcon={<CloseSquareOutlined />}
            keyboard={false}
            getContainer={`.${styleConfig.prefixClassCss}-layout`}
            {...config}
            title={renderTitle(config)}
            styles={{
              ...config.styles,
              mask: {
                ...(config.styles?.mask || {}),
                ...(isHidden ? { display: 'none', pointerEvents: 'none' } : {}),
              },
              wrapper: {
                ...(config.styles?.wrapper || {}),
                ...(isHidden ? { display: 'none', pointerEvents: 'none' } : {}),
              },
            }}
          >
            <CurrentModalContext.Provider
              value={{
                modalId: config.id!,
                isMinimized: isHidden,
                minimize: (info) => minimizeModal(config.id, info),
                restore: () => restoreModal(config.id),
                updateMinimizeInfo: (info) =>
                  updateModal(
                    {
                      minimizeInfo: { ...config.minimizeInfo, ...info },
                    },
                    config.id,
                  ),
                close: () => handleCancel(config.id!),
              }}
            >
              {config.content}
            </CurrentModalContext.Provider>
          </Modal>
        )
      })}

      {minimizedModals.length > 0 && (
        <FloatButton.Group
          shape='circle'
          style={{
            right: 28,
            bottom: 96,
            zIndex: 1050,
          }}
        >
          {minimizedModals.map((m) => {
            const isProcessing = m.minimizeInfo?.status === 'processing'
            const isSuccess = m.minimizeInfo?.status === 'success'
            const isError = m.minimizeInfo?.status === 'error'

            let iconNode: ReactNode = m.minimizeInfo?.icon || <FormOutlined />
            if (isProcessing) {
              iconNode = <LoadingOutlined style={{ color: '#1677ff' }} />
            } else if (isSuccess) {
              iconNode = <CheckCircleOutlined style={{ color: '#52c41a' }} />
            } else if (isError) {
              iconNode = <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            }

            const badgeProps = isProcessing
              ? { dot: true, status: 'processing' as const }
              : isSuccess
                ? { dot: true, status: 'success' as const }
                : isError
                  ? { dot: true, status: 'error' as const }
                  : undefined

            const tooltipContent = (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 300 }}>
                <span style={{ fontSize: 13 }}>
                  {m.minimizeInfo?.tooltip ||
                    (typeof m.title === 'string'
                      ? `Mở lại: ${m.title}`
                      : 'Nhấn để mở lại biểu mẫu')}
                </span>
                <span
                  title='Đóng biểu mẫu'
                  style={{
                    cursor: 'pointer',
                    padding: '2px 4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    opacity: 0.8,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancel(m.id!)
                  }}
                >
                  <CloseOutlined style={{ fontSize: 11, color: '#fff' }} />
                </span>
              </div>
            )

            return (
              <FloatButton
                key={m.id}
                icon={iconNode}
                badge={badgeProps}
                type={isProcessing ? 'primary' : 'default'}
                style={{ borderColor: token.colorBorder }}
                tooltip={tooltipContent}
                onClick={() => restoreModal(m.id)}
              />
            )
          })}
        </FloatButton.Group>
      )}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

export const useCurrentModal = () => {
  return useContext(CurrentModalContext)
}
