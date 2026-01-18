import React from 'react'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { Modal } from 'antd'
import { appStyleConfig } from '@/style/appStyle'
import { IItem } from '@/models/item.model'
import { CloseSquareOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Item } from '../../item/Item'
import { usePrompt } from '@/helpers/hooks'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  title?: string
  content?: string
}

export const ViewItemModal: React.FC<IProps> = ({ open, title }) => {
  const { currentItem } = useSelector((state) => state.setting)

  const { openNotification } = usePrompt()

  const dispatch = useDispatch()

  const onEdit = async () => {
    try {
      dispatch(settingAction.setOnEditItem(true))
      dispatch(settingAction.toggleItemModal())
      dispatch(settingAction.toggleViewItemModal())
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
      <Item active data={currentItem as IItem} onEdit={() => onEdit()} />
    </Modal>
  )
}
