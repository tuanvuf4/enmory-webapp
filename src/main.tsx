import ReactDOM from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import 'antd/dist/reset.css'
import './style/index.scss'

import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import persistStore from 'redux-persist/es/persistStore'
import { ConfigProvider } from 'antd'
import { appTheme } from './style/theme'
import { JssProvider } from 'react-jss'
import { App } from './app/app'
import { appStyleConfig } from './style/appStyle'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { appConfig } from './app/config/appConfig'
import { PopupExt } from './extension/popupExt'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'
import { AppContext } from './app/context/app.context'
import { store } from '@/store/store'

if (import.meta.env.APP_TYPE === 'EXT') {
  const root = ReactDOM.createRoot(document.getElementById('popupExt') as HTMLElement)
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
                <PersistGate loading={null} persistor={persistStore(store)}>
                  <BrowserRouter data-testid='browser-router-element'>
                    <PopupExt />
                  </BrowserRouter>
                </PersistGate>
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
                  <PersistGate loading={null} persistor={persistStore(store)}>
                    <App />
                  </PersistGate>
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
