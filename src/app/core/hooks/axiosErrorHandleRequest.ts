import { chromeStorage } from "@/extension/storageService"
import { appConfig } from "@/config/appConfig"
import { NotificationContext, TConfigNotification } from "@/context/notification.context"
import { axiosInstance } from "@/core/http/httpCore"
import { initNotification } from "@/services/index"
import { authAction } from "@/store/reducers/auth.reducer"
import { iotdAction } from "@/store/reducers/iotd.reducer"
import { mediaAction } from "@/store/reducers/media.reducer"
import { settingAction } from "@/store/reducers/setting.reducer"
import { studySetAction } from "@/store/reducers/studySet.reducer"
import _ from "lodash"
import { useContext, useEffect } from "react"
import { useAppDispatch } from "./redux"

const useErrorHandlerRequest = () => {
  const dispatch = useAppDispatch()
  const { openNotification } = useContext(NotificationContext) as TConfigNotification

  const errorInterceptor = axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
      console.log(`error: `, error)
      const status = _.get(error, 'response.status')

      if (status === 401) {
        dispatch(authAction.logOut())
        dispatch(studySetAction.resetStudySet())
        dispatch(iotdAction.resetIotd())
        dispatch(settingAction.setNotification(initNotification))
        dispatch(mediaAction.reset())
        openNotification({ type: 'error', message: 'Token is expired!' })
        if (appConfig.appType === 'EXT') chromeStorage.clear()
      } else if (status === 500) {
        openNotification({ type: 'error', message: 'Something went wrong!' })
      } else {
        openNotification({ type: 'error', message: 'Something went wrong!' })
      }
    },
  )

  useEffect(() => {
    return () => {
      axiosInstance.interceptors.response.eject(errorInterceptor)
    }
  })
}

export default useErrorHandlerRequest
