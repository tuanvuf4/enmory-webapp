export enum EViewMode {
  LIST,
  GRID,
}

export enum EViewPort {
  XS,
  SM,
  MD,
  LG,
  XL,
}

export enum EPageExt {
  LOGIN,
  REGISTER,
  SEARCH,
  ADD,
  ADD_EX,
}

export enum ELoading {
  YES = 'YES',
  NO = 'NO',
}

export type NotificationType = 'success' | 'info' | 'warning' | 'error'

export type AppOrderQuery = 'ASC' | 'DESC'

export type AppOrderByQuery = 'last_update' | 'created_date'

export const orderOptions = [
  {
    label: 'ASC',
    value: 'ASC',
  },
  {
    label: 'DESC',
    value: 'DESC',
  },
]

export const orderByOptions = [
  {
    label: 'Created Date',
    value: 'created_date',
  },
  {
    label: 'Last Update',
    value: 'last_update',
  },
]

export interface INotification {
  type: NotificationType
  show: boolean
  message: string
  description: string
}

export interface IAutoCompleteItem {
  value: string
}
