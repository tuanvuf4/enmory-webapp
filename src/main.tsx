import ReactDOM from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import 'antd/dist/reset.css'
import './style/index.css'

import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import persistStore from 'redux-persist/es/persistStore'
import { ConfigProvider } from 'antd'
import { App as AntdApp } from 'antd'
import { appTheme } from './style/theme'
import { JssProvider } from 'react-jss'
import { App } from './app/app'
import { styleConfig } from './style/appStyle'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { appConfig, EAppType } from './app/config/appConfig'
import { PopupExt } from './extension/popupExt'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'
import { AppContext } from './app/context/app.context'
import { store } from '@/store/store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

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

const AppWrapper: React.FC<IAppTypeProps> = ({ type }) => (
  <React.StrictMode>
    <JssProvider classNamePrefix={`${styleConfig.prefixClassCss}-`}>
      <Provider store={store}>
        <BrowserRouter data-testid='browser-router-element'>
          <QueryClientProvider client={queryClient}>
            <AppContext>
              <GoogleOAuthProvider clientId={appConfig.googleAuth.client_id as string}>
                <ConfigProvider
                  popupMatchSelectWidth={true}
                  componentSize='middle'
                  theme={appTheme}
                  prefixCls={styleConfig.prefixClassCss}
                >
                  <AntdApp>
                    <StyleProvider hashPriority='high'>
                      <PersistGate loading={null} persistor={persistStore(store)}>
                        {type === EAppType.EXTENSION ? <PopupExt /> : <App />}
                      </PersistGate>
                    </StyleProvider>
                  </AntdApp>
                </ConfigProvider>
              </GoogleOAuthProvider>
            </AppContext>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </BrowserRouter>
      </Provider>
    </JssProvider>
  </React.StrictMode>
)

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<AppWrapper type={import.meta.env.VITE_APP_TYPE as EAppType} />)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log);
