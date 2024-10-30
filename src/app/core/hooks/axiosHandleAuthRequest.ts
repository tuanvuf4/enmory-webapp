/* eslint-disable @typescript-eslint/no-explicit-any */
import { appConfig } from '@/config/appConfig'
import { chromeStorage } from '@/extension/storageService'
import { useEffect } from 'react'
import { axiosInstance } from '../http/httpCore'
import { useAppSelector } from './redux'

const useHandleAuthRequest = () => {
  const { token_type, access_token } = useAppSelector((state) => state.auth.authorization)

  const requestInterceptor = axiosInstance.interceptors.request.use(async (request: any) => {
    let token_type_local,
      access_token_local = ''
    if (appConfig.appType === 'EXT') {
      token_type_local = (await chromeStorage.get(['token_type'])).token_type
      access_token_local = (await chromeStorage.get(['access_token'])).access_token
    }

    if (access_token && !request.url.includes('token') && !request.url.includes('login')) {
      request.headers = {
        ...request.headers,
        Authorization: `${appConfig.appType === 'EXT' ? access_token_local : token_type} ${
          appConfig.appType === 'EXT' ? access_token_local : access_token
        }`,
      }
    }
    return request
  })

  useEffect(() => {
    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor)
    }
  })
}

export default useHandleAuthRequest
