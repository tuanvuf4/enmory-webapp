import { useSelector, useDispatch } from '@/core/hooks'
import { exampleApi } from '@/services/firebase/api/example.api'
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
  const { selectedExample } = useSelector((state) => state.example)
  const { isShowDeleteExModal } = useSelector((state) => state.setting)

  const dispatch = useDispatch()

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
