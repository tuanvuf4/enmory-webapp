import React from 'react'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { Modal } from 'antd'
import { appStyleConfig } from '@/style/appStyle'
import { CloseSquareOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { ExampleFormAdd } from '../../exampleOverview/exampleFormAdd'
import { IExample } from '@/models/item.model'
import { exampleAction } from '@/store/reducers/example.reducer'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  content?: string
}

export const ExModal: React.FC<IProps> = ({ open }) => {
  const { selectedExample } = useAppSelector((state) => state.example)

  const dispatch = useAppDispatch()

  const onSuccess = (content: IExample) => {
    dispatch(settingAction.toggleExModal())
    dispatch(exampleAction.updateExamples(content))
    dispatch(exampleAction.updateRandomExamples(content))
  }

  return (
    <Modal
      title={selectedExample ? 'Edit Example' : 'Add Example'}
      closeIcon={<CloseSquareOutlined />}
      open={open}
      onCancel={() => {
        dispatch(settingAction.toggleExModal())
        dispatch(exampleAction.setSelectedExample(null))
      }}
      onOk={() => dispatch(settingAction.toggleExModal())}
      okText={'Close'}
      width={appStyleConfig.modal.large}
      footer={null}
      maskClosable={true}
    >
      <ExampleFormAdd data={selectedExample as IExample} mode={'light'} onSuccess={onSuccess} />
    </Modal>
  )
}
