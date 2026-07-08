import ReactDOM from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import 'antd/dist/reset.css'
import './style/index.css'
import './style/appStyle.module.scss'

import { Provider, useSelector } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import persistStore from 'redux-persist/es/persistStore'
import { ConfigProvider } from 'antd'
import { App as AntdApp } from 'antd'
import { appTheme, appDarkTheme } from './style/theme'
import { useEffect } from 'react'
import { App } from './app/app'
import { EAppType } from './config/appConfig'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'
import { AppContext } from './app/context/app.context'
import { store } from '@/store/store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PopupExtension } from './extension/PopupExtension'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

interface IAppTypeProps {
  type: EAppType
}

const ThemeConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  return (
    <ConfigProvider
      popupMatchSelectWidth={true}
      componentSize='middle'
      theme={themeMode === 'dark' ? appDarkTheme : appTheme}
    >
      <StyleProvider hashPriority='high'>
        <AntdApp>{children}</AntdApp>
      </StyleProvider>
    </ConfigProvider>
  )
}

const AppWrapper: React.FC<IAppTypeProps> = ({ type }) => (
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter data-testid='browser-router-element'>
        <QueryClientProvider client={queryClient}>
          <ThemeConfigProvider>
            <AppContext>
              <PersistGate loading={null} persistor={persistStore(store)}>
                {type === EAppType.EXTENSION ? <PopupExtension /> : <App />}
              </PersistGate>
            </AppContext>
          </ThemeConfigProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<AppWrapper type={import.meta.env.VITE_APP_TYPE as EAppType} />)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log);
