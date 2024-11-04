/* eslint-disable no-prototype-builtins */
/*eslint @typescript-eslint/no-explicit-any: ["off"]*/

import { axiosInstance } from '@/core/http/httpCore'
import { ELoading } from '@/models/app.model'
import { useState, useMemo, useEffect } from 'react'

export const useAxiosLoader = () => {
  const [counter, setCounter] = useState(0)

  const interceptors = useMemo(() => {
    const inc = () => setCounter((preState) => preState + 1)
    const dec = () => setCounter((preState) => preState - 1)

    return {
      request: (request: any) => {
        return request.headers.loading === ELoading.NO ? request : (inc(), request)
      },
      response: (response: any) => {
        return response && response.headers && response.headers.loading === ELoading.NO
          ? response
          : (dec(), response)
      },
      error: (error: any) => (dec(), Promise.reject(error)),
    }
  }, [])

  useEffect(() => {
    const reqInterceptor = axiosInstance.interceptors.request.use(
      interceptors.request,
      interceptors.error,
    )
    const resInterceptor = axiosInstance.interceptors.response.use(
      interceptors.response,
      interceptors.error,
    )

    return () => {
      axiosInstance.interceptors.request.eject(reqInterceptor)
      axiosInstance.interceptors.response.eject(resInterceptor)
    }
  }, [interceptors])

  useEffect(() => {
    if (counter < 0) setCounter(0)
  }, [counter])

  return [counter > 0]
}
