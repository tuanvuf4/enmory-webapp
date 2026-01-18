import { setting } from '@/config/appConfig'
import { EListeningTypes } from '@/models/dictation.model'
import { IUserConfig } from '@/models/user.model'

export const initSettingForm: IUserConfig<number[]> = {
  ...setting.meta,
}
