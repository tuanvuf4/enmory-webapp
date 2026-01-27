import { App, MessageArgsProps, ModalFuncProps, theme } from 'antd'
import { ArgsProps } from 'antd/es/notification'

export const usePrompt = () => {
  const { modal, notification, message } = App.useApp()

  const { token } = theme.useToken()

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

  const openNotification = ({ type = 'success', message, ...props }: ArgsProps) => {
    notification.open({
      type,
      duration: 2.5,
      message: <h4 style={{ color: token.colorText }}>{message}</h4>,
      ...props,
    })
  }

  const openMessage = ({ type = 'success', content, ...props }: MessageArgsProps) => {
    message.open({
      type,
      duration: 5,
      content: <h4 style={{ color: token.colorText }}>{content}</h4>,
      ...props,
    })
  }

  return { confirmDeleteModal, openNotification, openMessage }
}
