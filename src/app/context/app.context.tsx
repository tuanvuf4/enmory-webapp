import { PropsWithChildren } from 'react'
import { LoadingProvider } from './loading.context'

export const AppContext: React.FC<PropsWithChildren> = ({ children }) => {
  return <LoadingProvider>{children}</LoadingProvider>
}
