import { notification } from 'antd'
import { NotificationType } from '@/models/app.model'

type NotificationPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'

/**
 * Custom hook for showing notifications
 * Uses Ant Design's notification API directly
 */
export const useNotification = () => {
  const [api, contextHolder] = notification.useNotification()

  /**
   * Show a notification
   * @param type - Type of notification (success, error, warning, info)
   * @param message - Main message/title
   * @param description - Additional description (optional)
   * @param duration - Duration in seconds (default: 4.5)
   * @param placement - Position of notification (default: 'topRight')
   */
  const showNotification = (
    type: NotificationType,
    message: string,
    description: string = '',
    duration: number = 4.5,
    placement: NotificationPlacement = 'topRight',
  ) => {
    api[type]({
      message,
      description,
      duration,
      placement,
    })
  }

  /**
   * Show a success notification
   */
  const success = (message: string, description: string = '') => {
    showNotification('success', message, description)
  }

  /**
   * Show an error notification
   */
  const error = (message: string, description: string = '') => {
    showNotification('error', message, description)
  }

  /**
   * Show a warning notification
   */
  const warning = (message: string, description: string = '') => {
    showNotification('warning', message, description)
  }

  /**
   * Show an info notification
   */
  const info = (message: string, description: string = '') => {
    showNotification('info', message, description)
  }

  /**
   * Destroy all notifications
   */
  const destroy = () => {
    api.destroy()
  }

  return {
    contextHolder,
    showNotification,
    success,
    error,
    warning,
    info,
    destroy,
  }
}
