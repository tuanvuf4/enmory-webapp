import { IPagination } from './pagination.model'

export interface IHttpResponse<T> {
  isSuccess: boolean
  message: string
  content: T | null
  statusCode: number
  paging?: IPagination
}
