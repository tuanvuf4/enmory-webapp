import { TSourceTypes } from '../constant'

export interface IMediaForm {
  id?: number
  title: string
  description?: string
  transcript?: string
  translation?: string
  tags?: string[]
  relation?: string[]
  srcUrl?: string
  srcType?: TSourceTypes
}

export interface ITracks extends IMediaForm {
  created_date?: number
  last_update?: number
  uid?: string
  is_deleted?: never
}
