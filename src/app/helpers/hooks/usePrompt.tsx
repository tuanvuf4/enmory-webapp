import { App, MessageArgsProps, ModalFuncProps, theme } from 'antd'
import { ArgsProps } from 'antd/es/notification'

export const usePrompt = () => {
  const { modal: modalRef, notification: notificationRef, message: messageRef } = App.useApp()

  const { token } = theme.useToken()

  const confirm = ({
    type = 'warning',
    title = 'Deleting...!',
    content = 'Are you sure you want to delete this item?',
    okText = 'Delete',
    onOk,
    onCancel,
  }: ModalFuncProps) => {
    modalRef.confirm({
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

  const notification = ({ type = 'success', message, ...props }: ArgsProps) => {
    notificationRef.open({
      type,
      duration: 2.5,
      message: <h4 style={{ color: token.colorText }}>{message}</h4>,
      ...props,
    })
  }

  const message = ({ type = 'success', content, ...props }: MessageArgsProps) => {
    messageRef.open({
      type,
      duration: 5,
      content: <h4 style={{ color: token.colorText }}>{content}</h4>,
      ...props,
    })
  }

  return { confirm, notification, message }
}
