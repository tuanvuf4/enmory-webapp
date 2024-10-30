import React from 'react'
import { useAppDispatch, useAppSelector } from 'src/app/core/hooks/redux'
import { Modal, theme } from 'antd'
import { appStyleConfig } from 'src/style/appStyle'
import { CloseSquareOutlined } from '@ant-design/icons'
import { settingAction } from 'src/app/store/reducers/setting.reducer'
import { ExampleFormAdd } from '../../exampleOverview/exampleFormAdd'
import { IExample } from 'src/app/models/item.model'
import { exampleAction } from 'src/app/store/reducers/example.reducer'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  content?: string
}

export const ExModal: React.FC<IProps> = ({ open }) => {
  const { token } = theme.useToken()

  const { selectedExample } = useAppSelector((state) => state.example)

  const dispatch = useAppDispatch()

  const onSucces = (content: IExample) => {
    dispatch(settingAction.toggleExModal())
    dispatch(exampleAction.updateExamples(content))
    dispatch(exampleAction.updateRandomExamples(content))
  }

  return (
    <Modal
      title={selectedExample ? 'Edit new Example' : 'Add new Example'}
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
      <ExampleFormAdd data={selectedExample as IExample} mode={'light'} onSucces={onSucces} />
    </Modal>
  )
}
