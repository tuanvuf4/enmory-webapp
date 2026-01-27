import { setting } from '@/config/appConfig'
import { INotification } from '../models/app.model'
import { IFormSearchEx, IFormSearchItem } from '../models/formSearch.model'
import { ECategory, EType, IItem, IOption } from '../models/item.model'
import { IUser } from '../models/user.model'
import { enumValues, getCategory, getType } from '../helpers'

export const categories = enumValues(ECategory).map((value) => ({
  id: value,
  label: getCategory(value as ECategory),
  value: value as ECategory,
}))

export const types = enumValues(EType).map((value) => ({
  id: value,
  label: getType(value as EType),
  value: value as EType,
}))

export const initUser: IUser<number[]> = {
  uid: '',
  password: '',
  email: '',
  firstName: '',
  lastName: '',
  updatedAt: 0,
  displayName: '',
  photoURL: '',
  provider: '',
  configuration: {
    ...setting.meta,
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

export const initSearchFormItem: IFormSearchItem = {
  keyword: '',
  cat: ECategory.ALL,
  archive: false,
  favorite: false,
  orderBy: 'created_date',
  order: 'DESC',
  page: 0,
  size: 20,
}

export const initFormSearchExtension = {
  keyword: '',
}
