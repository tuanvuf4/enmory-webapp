import axios, { AxiosRequestConfig } from 'axios'
import { defaultsDeep } from 'lodash'
import { ELoading } from '@/models/app.model'
import { httpConfig } from '@/config/httpConfig'

export const defaultHttpConfig: AxiosRequestConfig = {
  baseURL: `${httpConfig.baseUrl}/${httpConfig.apiVersion}/${httpConfig.apiUrl}/`,
  headers: {
    'Content-Type': 'application/json',
    loading: ELoading.YES,
    TzOffset: new Date().getTimezoneOffset(),
  },
}

export const getHttpConfig = (
  custom: AxiosRequestConfig = {},
  config = defaultHttpConfig,
): AxiosRequestConfig => {
  return defaultsDeep(custom, config)
}

export const axiosInstance = axios.create(getHttpConfig())
