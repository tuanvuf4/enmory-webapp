import React, { useContext } from 'react'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { Modal } from 'antd'
import { appStyleConfig } from '@/style/appStyle'
import { IItem } from '@/models/item.model'
import { CloseSquareOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Item } from '../../item/Item'
import { transformItemModelToClient } from '@/helpers/item'
import { itemApi } from '@/services/api'
import { NotificationContext, TConfigNotification } from '@/context/notification.context'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  title?: string
  content?: string
}

export const ViewItemModal: React.FC<IProps> = ({ open, title }) => {
  const { currentItem } = useAppSelector((state) => state.setting)

  const { openNotification } = useContext(NotificationContext) as TConfigNotification

  const dispatch = useAppDispatch()

  const onEdit = async (id: number) => {
    try {
      const { content } = await itemApi.getItemById(id)
      dispatch(settingAction.setOnEditItem(true))
      dispatch(settingAction.toggleItemModal())
      dispatch(settingAction.toggleViewItemModal())
      dispatch(
        settingAction.setCurrentItem({
          ...transformItemModelToClient(content),
        }),
      )
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  return (
    <Modal
      title={title || ''}
      closeIcon={<CloseSquareOutlined />}
      closable={false}
      open={open}
      onCancel={() => {
        dispatch(settingAction.toggleViewItemModal())
        dispatch(settingAction.setCurrentItem(null))
      }}
      onOk={() => dispatch(settingAction.toggleViewItemModal())}
      okText={'Close'}
      width={appStyleConfig.modal.large}
      footer={null}
      maskClosable={true}
    >
      <Item data={currentItem as IItem} type='full' onEdit={() => onEdit(currentItem?.id ?? 0)} />
    </Modal>
  )
}
