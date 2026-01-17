/*eslint @typescript-eslint/no-explicit-any: ["off"]*/

import { AxiosResponse, AxiosRequestConfig } from 'axios'
import { axiosInstance, defaultHttpConfig, getHttpConfig } from './httpCore'
export { initializeFirebaseInterceptor } from './firebaseInterceptor'

const get = <T = any>(
  url: string,
  params = {},
  httpConfig: AxiosRequestConfig = defaultHttpConfig,
): Promise<AxiosResponse<T>> =>
  new Promise((resolve, reject) => {
    const query = new URLSearchParams(params).toString()
    axiosInstance.get(url + `${query ? '?' + query : ''}`, getHttpConfig(httpConfig)).then(
      (data: AxiosResponse<T>) => resolve(data),
      (err: AxiosResponse<T>) => reject(err),
    )
  })

const post = <T = any>(
  url: string,
  data: { [key: string]: any } = {},
  httpConfig: AxiosRequestConfig = defaultHttpConfig,
): Promise<AxiosResponse<T>> =>
  new Promise((resolve, reject) => {
    axiosInstance.post(url, data, getHttpConfig(httpConfig)).then(
      (data: AxiosResponse<T>) => resolve(data),
      (err: AxiosResponse<T>) => reject(err),
    )
  })

const put = <T = any>(
  url: string,
  data: { [key: string]: any },
  httpConfig: AxiosRequestConfig = defaultHttpConfig,
): Promise<AxiosResponse<T>> =>
  new Promise((resolve, reject) => {
    return axiosInstance.put(url, data, getHttpConfig(httpConfig)).then(
      (data: AxiosResponse<T>) => resolve(data),
      (err: AxiosResponse<T>) => reject(err),
    )
  })

const patch = <T = any>(
  url: string,
  data: { [key: string]: any },
  httpConfig: AxiosRequestConfig = defaultHttpConfig,
): Promise<AxiosResponse<T>> =>
  new Promise((resolve, reject) => {
    return axiosInstance.patch(url, data, getHttpConfig(httpConfig)).then(
      (data: AxiosResponse<T>) => resolve(data),
      (err: AxiosResponse<T>) => reject(err),
    )
  })

const deleteApi = <T = any>(
  url: string,
  httpConfig: AxiosRequestConfig = defaultHttpConfig,
): Promise<any> =>
  new Promise((resolve, reject) => {
    return axiosInstance.delete(url, getHttpConfig(httpConfig)).then(
      (data: AxiosResponse<T>) => resolve(data),
      (err: AxiosResponse<T>) => reject(err),
    )
  })

export const http = {
  get,
  post,
  put,
  patch,
  delete: deleteApi,
}
