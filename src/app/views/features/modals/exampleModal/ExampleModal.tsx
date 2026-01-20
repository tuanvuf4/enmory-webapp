import React from 'react'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { Modal } from 'antd'
import { styleConfig } from '@/style/appStyle'
import { CloseSquareOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { ExampleForm } from '../../exampleOverview/ExampleFormAdd'
import { IExample } from '@/models/item.model'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  content?: string
}

export const ExampleModal: React.FC<IProps> = ({ open }) => {
  const dispatch = useDispatch()

  const onSubmit = () => {
    dispatch(settingAction.toggleExModal())
  }

  return (
    <Modal
      title={'Add Example'}
      closeIcon={<CloseSquareOutlined />}
      open={open}
      onCancel={() => {
        dispatch(settingAction.toggleExModal())
      }}
      onOk={() => dispatch(settingAction.toggleExModal())}
      okText={'Close'}
      width={styleConfig.modal.medium}
      footer={null}
      maskClosable={true}
    >
      <ExampleForm data={selectedExample as IExample} themeMode={'light'} onSuccess={onSubmit} />
    </Modal>
  )
}
