import React, { createContext, useContext, useState, PropsWithChildren, ReactNode } from 'react'
import { Modal, ModalProps, FloatButton, Flex, theme, FloatButtonProps } from 'antd'
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
  isModalOpen: (id?: string) => boolean
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)
export const CurrentModalContext = createContext<CurrentModalContextType | undefined>(undefined)

export const ModalProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [modals, setModals] = useState<ModalConfig[]>([])
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  const { token } = theme.useToken()
  // const { notification } = usePrompt()

  const openModal = (config: ModalConfig): string => {
    const id = config.id || Math.random().toString(36).substring(7)

    const existingIndex = modals.findIndex((m) => m.id === id)
    if (existingIndex >= 0) {
      const existing = modals[existingIndex]
      if (existing.isMinimized) {
        restoreModal(id)
      }

      // const formTitle =
      //   existing.minimizeInfo?.title ||
      //   (typeof existing.title === 'string' ? existing.title : undefined) ||
      //   (typeof config.title === 'string' ? config.title : undefined) ||
      //   'Biểu mẫu'

      // notification({
      //   type: 'warning',
      //   message: `${formTitle} đang được mở!`,
      //   description: existing.isMinimized
      //     ? 'Biểu mẫu đã được khôi phục từ trạng thái thu nhỏ.'
      //     : undefined,
      // })
      return id
    }

    setModals((prev) => {
      if (prev.some((m) => m.id === id)) {
        return prev
      }

      // If new modal is not minimized, minimize any currently active modals
      // so the new modal takes focus cleanly without stacking modal masks
      const updatedPrev: ModalConfig[] = config.isMinimized
        ? prev
        : prev.map((m) => {
            if (!m.isMinimized) {
              m.onMinimizeChange?.(true)
              return { ...m, isMinimized: true }
            }
            return m
          })

      const newModal: ModalConfig = { ...config, id, isMinimized: !!config.isMinimized }
      return [...updatedPrev, newModal]
    })
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
        // Prioritize closing the topmost active (non-minimized) modal
        let targetIndex = -1
        for (let i = prev.length - 1; i >= 0; i--) {
          if (!prev[i].isMinimized) {
            targetIndex = i
            break
          }
        }
        if (targetIndex === -1) {
          targetIndex = prev.length - 1
        }
        const target = prev[targetIndex]
        target?.onClose?.()
        return prev.filter((_, idx) => idx !== targetIndex)
      })
    }
  }

  const updateModal = (config: Partial<ModalConfig>, id?: string) => {
    setModals((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      let targetIndex = id ? next.findIndex((m) => m.id === id) : next.length - 1
      if (targetIndex < 0 && next.length > 0) {
        targetIndex = next.length - 1
      }
      if (targetIndex >= 0) {
        const mergedMinimizeInfo: ModalMinimizeInfo | undefined = config.minimizeInfo
          ? {
              ...(next[targetIndex].minimizeInfo || {}),
              ...config.minimizeInfo,
            }
          : next[targetIndex].minimizeInfo

        const updated: ModalConfig = {
          ...next[targetIndex],
          ...config,
          minimizeInfo: mergedMinimizeInfo,
        }
        next[targetIndex] = updated
      }
      return next
    })
  }

  const minimizeModal = (id?: string, minimizeInfo?: ModalMinimizeInfo) => {
    setModals((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      let targetIndex = id ? next.findIndex((m) => m.id === id) : next.length - 1
      if (targetIndex < 0 && next.length > 0) {
        targetIndex = next.length - 1
      }
      if (targetIndex >= 0) {
        const target = next[targetIndex]
        target.onMinimizeChange?.(true)
        const mergedMinimizeInfo: ModalMinimizeInfo | undefined =
          minimizeInfo || target.minimizeInfo
            ? {
                ...(target.minimizeInfo || {}),
                ...(minimizeInfo || {}),
              }
            : undefined

        const updated: ModalConfig = {
          ...target,
          isMinimized: true,
          minimizeInfo: mergedMinimizeInfo,
        }
        next[targetIndex] = updated
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
      }
      if (targetIndex < 0) {
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

        const restoredStatus =
          target.minimizeInfo?.status === 'processing' ? 'processing' : 'default'

        const restored: ModalConfig = {
          ...target,
          isMinimized: false,
          minimizeInfo: target.minimizeInfo
            ? {
                ...target.minimizeInfo,
                status: restoredStatus,
              }
            : undefined,
        }
        next.splice(targetIndex, 1)

        // Minimize any other currently active modal so only the restored modal is active
        const finalized: ModalConfig[] = next.map((m) => {
          if (!m.isMinimized) {
            m.onMinimizeChange?.(true)
            return { ...m, isMinimized: true }
          }
          return m
        })

        finalized.push(restored)
        return finalized
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

  const isModalOpen = (id?: string): boolean => {
    if (id) {
      return modals.some((m) => m.id === id)
    }
    return modals.length > 0
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

  const renderTitle = (config: ModalConfig): ReactNode => {
    if (!config.title && !config.tag && !config.minimizeInfo?.icon && !config.minimizeInfo?.status)
      return config.title

    const isProcessing = config.minimizeInfo?.status === 'processing'
    const isSuccess = config.minimizeInfo?.status === 'success'
    const isError = config.minimizeInfo?.status === 'error'

    let titleIcon: ReactNode = config.minimizeInfo?.icon
    if (isProcessing) {
      titleIcon = <LoadingOutlined style={{ color: '#1677ff', fontSize: 16 }} />
    } else if (isSuccess) {
      titleIcon = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
    } else if (isError) {
      titleIcon = <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
    }

    return (
      <Flex align={'center'} gap={8} style={{ overflow: 'hidden' }}>
        {titleIcon}
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
        isModalOpen,
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
            onOk={() => {
              void handleOk(config.id!)
            }}
            onCancel={() => {
              handleCancel(config.id!)
            }}
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
                      minimizeInfo: info,
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
              iconNode = <LoadingOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            } else if (isSuccess) {
              iconNode = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            } else if (isError) {
              iconNode = <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            }

            const badgeProps: FloatButtonProps['badge'] = isProcessing
              ? { dot: true, color: '#1677ff' }
              : isSuccess
                ? { dot: true, color: '#52c41a' }
                : isError
                  ? { dot: true, color: '#ff4d4f' }
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
                tooltip={{
                  placement: 'left',
                  title: tooltipContent,
                }}
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
