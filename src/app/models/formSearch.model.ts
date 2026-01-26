import { AppOrderByQuery, AppOrderQuery } from './app.model'
import { ECategory } from './item.model'

export interface IFormSearchItem {
  keyword: string
  cat: ECategory | ''
  archive: boolean
  favorite: boolean
  orderBy: AppOrderByQuery
  order: AppOrderQuery
}

export interface IFormSearchEx {
  keyword: string
  orderBy: AppOrderByQuery
  order: AppOrderQuery
}
