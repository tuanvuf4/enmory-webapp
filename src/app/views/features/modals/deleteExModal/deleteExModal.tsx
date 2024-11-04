import { useAppSelector, useAppDispatch } from '@/core/hooks'
import { exampleApi } from '@/services/api'
import { exampleAction } from '@/store/reducers/example.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Modal } from 'antd'
import { useEffect } from 'react'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  title?: string
  content?: string
}

export const DeleteExModal: React.FC = () => {
  const { selectedExample } = useAppSelector((state) => state.example)
  const { isShowDeleteExModal } = useAppSelector((state) => state.setting)

  const dispatch = useAppDispatch()

  const [modal, modalContextHolder] = Modal.useModal()

  useEffect(() => {
    if (isShowDeleteExModal && selectedExample) {
      modal.confirm({
        type: 'warning',
        title: 'Deleting...!',
        content: 'Are you sure you want to delete this example?',
        okText: 'Delete',
        maskClosable: false,
        closable: true,
        onOk: () => {
          exampleApi
            .deleteExample(selectedExample.id as number)
            .then(() => {
              dispatch(exampleAction.filterExamples(selectedExample))
              dispatch(exampleAction.filterRandomExamples(selectedExample))
              dispatch(settingAction.toggleDeleteExModal())
            })
            .catch(() => {
              dispatch(settingAction.toggleDeleteExModal())
            })
        },
        onCancel: () => {
          dispatch(settingAction.toggleDeleteExModal())
        },
      })
    }
  }, [isShowDeleteExModal, selectedExample])

  return <>{modalContextHolder}</>
}
