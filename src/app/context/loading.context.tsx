import { useState, createContext, PropsWithChildren } from 'react'

const LoadingContext = createContext({})

const LoadingProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(false)

  const setAppLoading = (status: boolean) => {
    setLoading(status)
  }

  return (
    <LoadingContext.Provider value={{ loading, setAppLoading }}>{children}</LoadingContext.Provider>
  )
}

export { LoadingContext, LoadingProvider }
