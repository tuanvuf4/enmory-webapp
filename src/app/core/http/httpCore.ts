import axios, { AxiosRequestConfig } from 'axios'
import _ from 'lodash'
import { ELoading } from '@/models/app.model'
import { httpConfig } from '@/config/httpConfig'

export const defaultHttpConfig: AxiosRequestConfig = {
  baseURL: `${httpConfig.baseUrl}/${httpConfig.apiVersion}/${httpConfig.apiUrl}/`,
  headers: {
    'Content-Type': 'application/json',
    loading: ELoading.YES,
  },
}

export const getHttpConfig = (
  custom: AxiosRequestConfig = {},
  config = defaultHttpConfig,
): AxiosRequestConfig => {
  return _.defaultsDeep(custom, config)
}

export const axiosInstance = axios.create(getHttpConfig())
