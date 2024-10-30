import { IPagination } from './pagination.model'

export interface IHttpResponseArray<T> {
  paging?: IPagination
  data: T[]
}

export interface IHttpResponse<T> {
  isSuccess: boolean
  message: string
  content: T
  statusCode: number
}
