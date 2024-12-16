import { App, ModalFuncProps } from 'antd'

export const usePrompt = () => {
  const { modal } = App.useApp()

  const confirmDeleteModal = ({
    type = 'warning',
    title = 'Deleting...!',
    content = 'Are you sure you want to delete this item?',
    okText = 'Delete',
    onOk,
    onCancel,
  }: ModalFuncProps) => {
    modal.confirm({
      type,
      title,
      content,
      okText,
      maskClosable: false,
      closable: true,
      onOk: () => onOk?.(),
      onCancel: () => onCancel?.(),
    })
  }

  return { confirmDeleteModal }
}
