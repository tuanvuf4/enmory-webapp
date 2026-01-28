import React, { createContext, useContext, useState, PropsWithChildren, ReactNode } from 'react'
import { Modal, ModalProps } from 'antd'
import { CloseSquareOutlined } from '@ant-design/icons'
import { styleConfig } from '@/style/appStyle'

interface ModalConfig extends Omit<ModalProps, 'open' | 'onCancel' | 'onOk'> {
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
  const [isOpen, setIsOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null)
  const [loading, setLoading] = useState(false)

  const openModal = (config: ModalConfig) => {
    setModalConfig(config)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setLoading(false)
    // Clear config after animation completes
    setTimeout(() => setModalConfig(null), 300)
  }

  const updateModal = (config: Partial<ModalConfig>) => {
    setModalConfig((prev) => (prev ? { ...prev, ...config } : null))
  }

  const handleOk = async () => {
    if (modalConfig?.onConfirm) {
      try {
        setLoading(true)
        await modalConfig.onConfirm()
        closeModal()
      } catch (error) {
        console.error('Modal confirm error:', error)
      } finally {
        setLoading(false)
      }
    } else {
      closeModal()
    }
  }

  const handleCancel = () => {
    modalConfig?.onClose?.()
    closeModal()
  }

  return (
    <ModalContext.Provider value={{ openModal, closeModal, updateModal }}>
      {children}
      {modalConfig && (
        <Modal
          open={isOpen}
          onOk={handleOk}
          onCancel={handleCancel}
          confirmLoading={loading}
          closeIcon={<CloseSquareOutlined />}
          destroyOnHidden
          getContainer={`.${styleConfig.prefixClassCss}-layout`}
          {...modalConfig}
        >
          {modalConfig.content}
        </Modal>
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
