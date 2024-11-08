/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react'
import { axiosInstance } from '../http/httpCore'
import { useAppSelector } from './redux'

const useHandleAuthRequest = () => {
  const { token_type, access_token } = useAppSelector((state) => state.auth.authorization)

  const requestInterceptor = axiosInstance.interceptors.request.use(async (request: any) => {
    if (access_token && !request.url.includes('token') && !request.url.includes('login')) {
      request.headers = {
        ...request.headers,
        Authorization: `${token_type} ${access_token}`,
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
