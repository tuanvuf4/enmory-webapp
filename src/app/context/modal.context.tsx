import React, { createContext, useContext, useState, PropsWithChildren, ReactNode } from 'react'
import { Modal, ModalProps } from 'antd'
import { CloseSquareOutlined } from '@ant-design/icons'
import { styleConfig } from '@/style/appStyle'

interface ModalConfig extends Omit<ModalProps, 'open' | 'onCancel' | 'onOk'> {
  id?: string
  content: ReactNode
  onConfirm?: () => void | Promise<void>
  onClose?: () => void
}

interface ModalContextType {
  openModal: (config: ModalConfig) => void
  closeModal: () => void
  updateModal: (config: Partial<ModalConfig>) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const ModalProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [modals, setModals] = useState<ModalConfig[]>([])
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  const openModal = (config: ModalConfig) => {
    const id = Math.random().toString(36).substring(7)
    setModals((prev) => [...prev, { ...config, id }])
  }

  const closeModal = () => {
    setModals((prev) => prev.slice(0, -1))
  }

  const updateModal = (config: Partial<ModalConfig>) => {
    setModals((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      next[next.length - 1] = { ...next[next.length - 1], ...config }
      return next
    })
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

  return (
    <ModalContext.Provider value={{ openModal, closeModal, updateModal }}>
      {children}
      {modals.map((config) => (
        <Modal
          key={config.id}
          open={true}
          onOk={() => handleOk(config.id!)}
          onCancel={() => handleCancel(config.id!)}
          confirmLoading={loadingMap[config.id!] || false}
          closeIcon={<CloseSquareOutlined />}
          destroyOnHidden
          keyboard={false}
          getContainer={`.${styleConfig.prefixClassCss}-layout`}
          {...config}
        >
          {config.content}
        </Modal>
      ))}
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
