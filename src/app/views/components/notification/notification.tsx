import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { notification as noti, theme } from 'antd'
import styles from './style'
import { NotificationType } from '@/models/app.model'
import { settingAction } from '@/store/reducers/setting.reducer'

export const Notification: React.FC = () => {
  const classes = styles()

  const { notification } = useAppSelector((state) => state.setting)

  const dispatch = useAppDispatch()

  const [api, contextHolder] = noti.useNotification()

  const openNotificationWithIcon = (type: NotificationType = 'info') => {
    api[type]({
      message: notification.message,
      description: notification.description,
      onClose: () => {
        dispatch(settingAction.closeNotification())
      },
    })
  }

  useEffect(() => {
    if (notification.show) {
      console.log('notification: ', notification)
      openNotificationWithIcon(notification.type)
    }
  }, [notification.show])

  return <div className={classes.notification}>{contextHolder}</div>
}
