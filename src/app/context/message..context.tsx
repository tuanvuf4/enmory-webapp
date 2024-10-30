import { message } from 'antd'
import { ArgsProps } from 'antd/es/message'
import { createContext, PropsWithChildren } from 'react'

export interface IMessageContext {
  showMessage: (config: ArgsProps) => void
}

const MessageContext = createContext<IMessageContext | null>(null)

const MessageProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [messageApi, contextHolder] = message.useMessage()

  const showMessage = (config: ArgsProps) => {
    messageApi.open(config)
    setTimeout(messageApi.destroy, 1500)
  }

  return (
    <MessageContext.Provider value={{ showMessage }}>
      {children}
      {contextHolder}
    </MessageContext.Provider>
  )
}

export { MessageContext, MessageProvider }
