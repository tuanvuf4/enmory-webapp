import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { Modal } from 'antd'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { itemApi } from '@/services/api/item.api'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  title?: string
  content?: string
}

export const DeleteItemModal: React.FC = () => {
  const { currentItem } = useAppSelector((state) => state.setting)
  const { isShowDeleteItemModal } = useAppSelector((state) => state.setting)

  const dispatch = useAppDispatch()

  const [modal, modalContextHolder] = Modal.useModal()

  useEffect(() => {
    if (isShowDeleteItemModal && currentItem) {
      modal.confirm({
        type: 'warning',
        title: 'Deleting...!',
        content: 'Are you sure you want to delete this item?',
        okText: 'Delete',
        maskClosable: false,
        closable: true,
        onOk: () => {
          itemApi
            .deleteItem(currentItem.id as number)
            .then(() => {
              dispatch(itemAction.removeItem(currentItem.id as number))
              dispatch(settingAction.toggleDeleteItemModal())
            })
            .catch(() => {
              dispatch(settingAction.toggleDeleteItemModal())
            })
        },
        onCancel: () => {
          dispatch(settingAction.toggleDeleteItemModal())
        },
      })
    }
  }, [isShowDeleteItemModal, currentItem])

  return <>{modalContextHolder}</>
}
