import { useModal } from '@/context/modal.context'
import { AudioOutlined } from '@ant-design/icons'
import { Shadowing, TShadowingItem } from '@/views/features/shadowing/Shadowing'
import React, { useRef, useCallback, useEffect } from 'react'

export interface IShadowingModalProps {
  /** Array or single item, example, or checklist item */
  items?: TShadowingItem[] | TShadowingItem
  title?: React.ReactNode
  /** Custom reload handler called when reload is triggered */
  onReload?: () => void | Promise<void>
  /** Callback prop to expose reload function to caller */
  exposeReload?: (reloadFn: () => void) => void
  onClose?: () => void
}

/**
 * Hook to open/close and manage the Shadowing practice modal.
 */
export const useShadowingModal = (props?: IShadowingModalProps) => {
  const { openModal, closeModal } = useModal()
  const reloadFnRef = useRef<(() => void) | null>(null)

  const reload = useCallback(() => {
    reloadFnRef.current?.()
  }, [])

  useEffect(() => {
    if (props?.exposeReload) {
      props.exposeReload(reload)
    }
  }, [props?.exposeReload, reload])

  const openShadowingModal = useCallback(
    (targetItems?: TShadowingItem | TShadowingItem[] | IShadowingModalProps) => {
      let options: IShadowingModalProps

      if (Array.isArray(targetItems)) {
        options = { items: targetItems }
      } else if (targetItems && ('origin' in targetItems || 'translation' in targetItems)) {
        options = { items: [targetItems as TShadowingItem] }
      } else if (targetItems && typeof targetItems === 'object') {
        options = targetItems as IShadowingModalProps
      } else {
        options = props || {}
      }

      const rawItems = options.items || props?.items
      const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : undefined
      const onReload = options.onReload || props?.onReload
      const modalId = 'shadowing-practice-modal'

      // Ensure any existing shadowing modal is closed first
      closeModal(modalId)

      openModal({
        id: modalId,
        title: options.title || (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AudioOutlined style={{ color: '#1677ff', fontSize: 16 }} />
            <span>Speak Aloud</span>
          </div>
        ),
        width: 860,
        footer: null,
        maskClosable: true,
        style: { top: 32 },
        styles: {
          body: {
            maxHeight: '82vh',
            overflowY: 'auto',
            padding: '12px 16px',
          },
        },
        content: (
          <Shadowing
            items={items}
            exposeReload={(fn) => {
              reloadFnRef.current = fn
              options.exposeReload?.(fn)
            }}
            onReload={onReload}
          />
        ),
        onClose: () => {
          reloadFnRef.current = null
          options.onClose?.()
          props?.onClose?.()
        },
      })
    },
    [openModal, closeModal, props, reload],
  )

  const closeShadowingModal = useCallback(() => {
    closeModal('shadowing-practice-modal')
  }, [closeModal])

  return {
    openShadowingModal,
    closeShadowingModal,
    reload,
    open: openShadowingModal,
    close: closeShadowingModal,
  }
}
