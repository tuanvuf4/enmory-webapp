import { PropsWithChildren } from 'react'
import { LoadingProvider } from './loading.context'
import { ModalProvider } from './modal.context'

export const AppContext: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <LoadingProvider>
      <ModalProvider>{children}</ModalProvider>
    </LoadingProvider>
  )
}
