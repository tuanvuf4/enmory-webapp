import React from 'react'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { Modal, theme } from 'antd'
import { appStyleConfig } from '@/style/appStyle'
import { IItem } from '@/models/item.model'
import { CloseSquareOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Item } from '../../item/Item'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  title?: string
  content?: string
}

export const ViewItemModal: React.FC<IProps> = ({ open, title }) => {
  const { token } = theme.useToken()

  const { currentItem } = useAppSelector((state) => state.setting)

  const dispatch = useAppDispatch()

  return (
    <Modal
      title={title || ''}
      closeIcon={<CloseSquareOutlined />}
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
      <Item groupAction={false} data={currentItem as IItem} type='full' />
    </Modal>
  )
}
