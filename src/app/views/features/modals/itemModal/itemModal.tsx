import { Modal } from 'antd'
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { settingAction } from '@/store/reducers/setting.reducer'
import { appStyleConfig } from '@/style/appStyle'
import { CloseSquareOutlined } from '@ant-design/icons'
import { ItemForm } from './ItemForm'

export const ItemModal: React.FC = () => {
  const dispatch = useAppDispatch()

  const { onEditEvent, isShowItemModal } = useAppSelector((state) => state.setting)
  const { categories, types } = useAppSelector((state) => state.config)

  const onCancel = () => {
    dispatch(settingAction.toggleItemModal())
    dispatch(settingAction.setCurrentItem(null))
  }

  return (
    <Modal
      title={`${onEditEvent ? 'Edit' : 'Add'} item`}
      closeIcon={<CloseSquareOutlined />}
      open={isShowItemModal}
      okText={'Save'}
      onCancel={onCancel}
      width={appStyleConfig.modal.large}
      maskClosable={false}
      footer={false}
      keyboard={false}
    >
      <ItemForm categories={categories} types={types} />
    </Modal>
  )
}
