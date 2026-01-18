import React from 'react'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { Modal } from 'antd'
import { styleConfig } from '@/style/appStyle'
import { CloseSquareOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { ExampleForm } from '../../exampleOverview/ExampleFormAdd'
import { IExample } from '@/models/item.model'
import { exampleAction } from '@/store/reducers/example.reducer'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  content?: string
}

export const ExampleModal: React.FC<IProps> = ({ open }) => {
  const { selectedExample } = useSelector((state) => state.example)

  const dispatch = useDispatch()

  const onSubmit = (content: IExample) => {
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
      width={styleConfig.modal.medium}
      footer={null}
      maskClosable={true}
    >
      <ExampleForm data={selectedExample as IExample} themeMode={'light'} onSuccess={onSubmit} />
    </Modal>
  )
}
