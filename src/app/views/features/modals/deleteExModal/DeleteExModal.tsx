import { useSelector, useDispatch } from '@/core/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Modal } from 'antd'
import { useEffect } from 'react'
import { useDeleteExample } from '@/core/hooks/useExamples'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  title?: string
  content?: string
}

export const DeleteExModal: React.FC = () => {
  const { isShowDeleteExModal } = useSelector((state) => state.setting)

  const dispatch = useDispatch()
  const deleteMutation = useDeleteExample()

  const [modal, modalContextHolder] = Modal.useModal()

  useEffect(() => {
    if (isShowDeleteExModal) {
      modal.confirm({
        type: 'warning',
        title: 'Deleting...!',
        content: 'Are you sure you want to delete this example?',
        okText: 'Delete',
        maskClosable: false,
        closable: true,
        onOk: async () => {
          try {
            // await deleteMutation.mutateAsync()
            dispatch(settingAction.toggleDeleteExModal())
          } catch (error) {
            dispatch(settingAction.toggleDeleteExModal())
          }
        },
        onCancel: () => {
          dispatch(settingAction.toggleDeleteExModal())
        },
      })
    }
  }, [isShowDeleteExModal])

  return <>{modalContextHolder}</>
}
