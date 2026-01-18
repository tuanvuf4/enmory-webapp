import { setting } from '../config/appConfig'
import { IUserConfig } from '../models/user.model'

export const initSettingForm: IUserConfig<number[]> = {
  ...setting.meta,
}
