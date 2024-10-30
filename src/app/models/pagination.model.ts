import { BaseOptionType } from 'antd/es/cascader'

export interface IPagination {
  page: number
  size: number
  total: number
  totalPage: number
  options?: BaseOptionType[]
}
