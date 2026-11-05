import { IClassifiedVocabItem } from './vocabClassification.model'

export interface IBlogItem {
  id?: string
  uid?: string
  title: string
  keywords?: string[]
  description: string
  translation?: string
  relation?: string[]
  tags: string[]
  created_date?: number
  last_update?: number
  vocabClassification?: IClassifiedVocabItem[]
}

export type IArticleItem = IBlogItem
