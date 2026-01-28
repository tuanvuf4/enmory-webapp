import { useDispatch } from '@/core/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'

export const useLoading = () => {
  const dispatch = useDispatch()

  const showLoading = () => {
    dispatch(settingAction.showLoading())
  }

  const hideLoading = () => {
    dispatch(settingAction.hideLoading())
  }

  return { showLoading, hideLoading }
}
