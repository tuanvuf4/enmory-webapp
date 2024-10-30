import { Modal, theme } from 'antd'
import React from 'react'
import { useAppDispatch, useAppSelector } from 'src/app/core/hooks/redux'
import { settingAction } from 'src/app/store/reducers/setting.reducer'
import gStyles, { appStyleConfig } from 'src/style/appStyle'
import styles from './style'
import { CloseSquareOutlined } from '@ant-design/icons'
import { CRUForm } from './ItemForm'

export const ItemModal: React.FC = () => {
  const { token } = theme.useToken()
  const classes = styles(token)
  const gClasses = gStyles(token)

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
    >
      <CRUForm categories={categories} types={types} />
    </Modal>
  )
}
