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
import { appStyleConfig } from './style/appStyle'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { appConfig, EAppType } from './app/config/appConfig'
import { PopupExt } from './extension/popupExt'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'
import { AppContext } from './app/context/app.context'
import { store } from '@/store/store'

if (import.meta.env.VITE_APP_TYPE === EAppType.EXTENSION) {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
  root.render(
    <JssProvider classNamePrefix={`${appStyleConfig.prefixClassCss}-`}>
      <Provider store={store}>
        <AppContext>
          <GoogleOAuthProvider clientId={appConfig.googleAuth.client_id as string}>
            <ConfigProvider
              popupMatchSelectWidth={true}
              componentSize='middle'
              theme={appTheme}
              prefixCls={appStyleConfig.prefixClassCss}
            >
              <StyleProvider hashPriority='high'>
                <AntdApp>
                  <PersistGate loading={null} persistor={persistStore(store)}>
                    <BrowserRouter data-testid='browser-router-element'>
                      <PopupExt />
                    </BrowserRouter>
                  </PersistGate>
                </AntdApp>
              </StyleProvider>
            </ConfigProvider>
          </GoogleOAuthProvider>
        </AppContext>
      </Provider>
    </JssProvider>,
  )
} else {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
  root.render(
    <React.StrictMode>
      <JssProvider classNamePrefix={`${appStyleConfig.prefixClassCss}-`}>
        <Provider store={store}>
          <AppContext>
            <GoogleOAuthProvider clientId={appConfig.googleAuth.client_id as string}>
              <ConfigProvider
                popupMatchSelectWidth={true}
                componentSize='middle'
                theme={appTheme}
                prefixCls={appStyleConfig.prefixClassCss}
              >
                <StyleProvider hashPriority='high'>
                  <AntdApp>
                    <PersistGate loading={null} persistor={persistStore(store)}>
                      <App />
                    </PersistGate>
                  </AntdApp>
                </StyleProvider>
              </ConfigProvider>
            </GoogleOAuthProvider>
          </AppContext>
        </Provider>
      </JssProvider>
    </React.StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log);
