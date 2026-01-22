import React from 'react'
import { useDispatch } from '@/core/hooks/redux'
import { Modal } from 'antd'
import { styleConfig } from '@/style/appStyle'
import { CloseSquareOutlined } from '@ant-design/icons'
import { IExample } from '@/models/item.model'
import { ExampleForm } from '@/views/features/exampleOverview/ExampleForm'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  content?: string
}

export const ExampleModal: React.FC<IProps> = ({ open }) => {
  const dispatch = useDispatch()

  const onSubmit = () => {}

  return (
    <Modal
      title={'Add Example'}
      closeIcon={<CloseSquareOutlined />}
      open={open}
      onCancel={() => {}}
      okText={'Close'}
      width={styleConfig.modal.medium}
      footer={null}
      maskClosable={true}
    >
      <ExampleForm data={{} as IExample} themeMode={'light'} onSuccess={onSubmit} />
    </Modal>
  )
}
