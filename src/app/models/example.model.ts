import { AppOrderByQuery, AppOrderQuery } from './app.model'

export interface IExampleQuery {
  keyword: string
  page: number
  size: number
  itemId?: number
  orderBy?: AppOrderByQuery
  order?: AppOrderQuery
}

export type ITypeExample = Record<keyof IExampleQuery, number | string>

export enum ExampleMode {
  Default,
  Translation,
}
