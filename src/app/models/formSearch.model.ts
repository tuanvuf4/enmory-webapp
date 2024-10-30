import { AppOrderByQuery, AppOrderQuery } from './app.model'
import { ECategory, EType } from './item.model'

export interface IFormSearchItem {
  keyword: string
  cat: ECategory | ''
  type: EType | ''
  defect: boolean
  archive: boolean
  orderBy: AppOrderByQuery
  order: AppOrderQuery
}

export interface IFormSearchEx {
  keyword: string
  orderBy: AppOrderByQuery
  order: AppOrderQuery
}
