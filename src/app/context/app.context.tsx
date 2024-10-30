import { PropsWithChildren } from 'react'
import { MessageProvider } from './message..context'
import { LoadingProvider } from './loading.context'
import { NotificationProvider } from './notification.context'

export const AppContext: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <MessageProvider>
      <LoadingProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </LoadingProvider>
    </MessageProvider>
  )
}
