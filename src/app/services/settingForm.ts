import { appSetting } from '../../config/appConfig'
import { IUserConfig } from '../models/user.model'

export const initSettingForm: IUserConfig<number[]> = {
  ...appSetting.meta,
}
