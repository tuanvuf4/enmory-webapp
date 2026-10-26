import { TSourceTypes } from '../constant'
import { IClassifiedVocabItem } from './vocabClassification.model'

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
  voice?: string
  vocabClassification?: IClassifiedVocabItem[]
}

export interface ITracks extends IMediaForm {
  created_date?: number
  last_update?: number
  uid?: string
}
