import { createContext, PropsWithChildren } from 'react'
import { notification } from 'antd'
import { ArgsProps } from 'antd/es/notification'
import { NotificationType } from '@/models/app.model'

interface IConfigNofication extends ArgsProps {
  type: NotificationType
}

export type TConfigNotification = {
  openNotification: (config: IConfigNofication) => void
}

const NotificationContext = createContext<TConfigNotification | null>(null)

const NotificationProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification()

  const openNotification = (config: IConfigNofication) => {
    api[config.type]({
      message: config.message,
      description: config.description,
      duration: config.duration || 1.5,
    })
  }

  return (
    <NotificationContext.Provider value={{ openNotification }}>
      {contextHolder}

      {children}
    </NotificationContext.Provider>
  )
}

export { NotificationContext, NotificationProvider }
