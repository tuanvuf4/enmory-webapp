import { chromeStorage } from '@/extension/storageService'
import { appConfig, EAppType } from '@/config/appConfig'
import { axiosInstance } from '@/core/http/httpCore'
import { initNotification } from '@/services/index'
import { authAction } from '@/store/reducers/auth.reducer'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { mediaAction } from '@/store/reducers/media.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { actionAsyncUser } from '@/store/async/user'
import _ from 'lodash'
import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { usePrompt } from '@/helpers/hooks'

const useErrorHandlerRequest = () => {
  const dispatch = useAppDispatch()
  const { openNotification } = usePrompt()
  const { refresh_token } = useAppSelector((state) => state.auth.authorization)
  const isRefreshing = useRef(false)
  const failedQueue = useRef<any[]>([])

  const processQueue = (error: any, tokenData: { token: string; tokenType: string } | null = null) => {
    failedQueue.current.forEach((prom) => {
      if (error) {
        prom.reject(error)
      } else if (tokenData) {
        // Update the queued request with new token before resolving
        prom.request.headers = {
          ...prom.request.headers,
          Authorization: `${tokenData.tokenType} ${tokenData.token}`,
        }
        prom.resolve(axiosInstance(prom.request))
      }
    })

    failedQueue.current = []
  }

  const errorInterceptor = axiosInstance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config
      const status = _.get(error, 'response.status')

      if (status === 401 && !originalRequest._retry) {
        if (isRefreshing.current) {
          return new Promise((resolve, reject) => {
            failedQueue.current.push({ resolve, reject, request: originalRequest })
          })
        }

        originalRequest._retry = true
        isRefreshing.current = true

        if (refresh_token) {
          try {
            const result = await dispatch(actionAsyncUser.refreshToken(refresh_token))
            const newTokenResponse = (result.payload as any).content
            const newToken = newTokenResponse.access_token
            const newTokenType = newTokenResponse.token_type

            // Update the original request with the new token
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `${newTokenType} ${newToken}`,
            }

            processQueue(null, { token: newToken, tokenType: newTokenType })
            return axiosInstance(originalRequest)
          } catch (refreshError) {
            processQueue(refreshError, null)
            // Refresh failed, logout
            dispatch(authAction.logOut())
            dispatch(studySetAction.resetStudySet())
            dispatch(iotdAction.resetIotd())
            dispatch(settingAction.setNotification(initNotification))
            dispatch(mediaAction.reset())
            openNotification({ type: 'error', message: 'Session expired. Please login again.' })
            if (appConfig.appType === EAppType.EXTENSION) chromeStorage.clear()
            return Promise.reject(refreshError)
          } finally {
            isRefreshing.current = false
          }
        } else {
          // No refresh token, logout immediately
          dispatch(authAction.logOut())
          dispatch(studySetAction.resetStudySet())
          dispatch(iotdAction.resetIotd())
          dispatch(settingAction.setNotification(initNotification))
          dispatch(mediaAction.reset())
          openNotification({ type: 'error', message: 'Token is expired!' })
          if (appConfig.appType === EAppType.EXTENSION) chromeStorage.clear()
        }
      } else if (status === 500) {
        openNotification({ type: 'error', message: 'Something went wrong!' })
      } else if (status !== 401) {
        openNotification({ type: 'error', message: 'Something went wrong!' })
      }

      return Promise.reject(error)
    },
  )

  useEffect(() => {
    return () => {
      axiosInstance.interceptors.response.eject(errorInterceptor)
    }
  })
}

export default useErrorHandlerRequest
