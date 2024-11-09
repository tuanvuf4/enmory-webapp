import { AppOrderByQuery, AppOrderQuery } from './app.model'

export interface IExampleQuery {
  keyword: string
  page: number
  size: number
  orderBy?: AppOrderByQuery
  order?: AppOrderQuery
}

export type ITypeExample = Record<keyof IExampleQuery, number | string>

export enum Mode {
  Translation = 'Translation',
  Default = 'Default',
}
