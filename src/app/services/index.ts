import { appSetting } from '../../config/appConfig'
import { INotification } from '../models/app.model'
import { IFormSearchEx } from '../models/formSearch.model'
import { ECategory, IItem, IOption } from '../models/item.model'
import { IUser } from '../models/user.model'

export const initUser: IUser<number[]> = {
  displayName: '',
  photoURL: '',
  provider: '',
  uid: '',
  createdAt: 0,
  updatedAt: 0,
  password: '',
  email: '',
  firstName: '',
  lastName: '',
  configuration: {
    ...appSetting.meta,
  },
}

export const initNotification: INotification = {
  type: 'error',
  show: false,
  message: '',
  description: '',
}

export const allSelect: IOption<string, ECategory> = {
  id: ECategory.ALL,
  label: 'All',
  value: ECategory.ALL,
}

export const itemDefault: IItem = {
  origin: '',
  favorite: false,
  archive: false,
  is_deleted: false,
  level: 0,
  count: 0,
  meanings: [],
  forms: [],
  collocations: [],
  word_family: [],
  relation: [],
}

export const initSearchFormEx: IFormSearchEx = {
  keyword: '',
  orderBy: 'created_date',
  order: 'DESC',
}
