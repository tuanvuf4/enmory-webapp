import axios, { AxiosRequestConfig } from 'axios'
import { defaultsDeep } from 'lodash'
import { ELoading } from '@/models/app.model'
import { httpConfig } from '@/config/httpConfig'
import { errorApiRequestsService } from '@/services/localDb/errorApiRequests.service'

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

// Intercept errors and record them to localDb for debugging and replay
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      if (!error?.config?.__skipErrorLog) {
        errorApiRequestsService.recordAxiosError(error).catch((err) => {
          console.warn('Failed to record axios error in localDb:', err)
        })
      }
    } catch (e) {
      console.warn('Error in axios response interceptor:', e)
    }
    return Promise.reject(error)
  },
)
