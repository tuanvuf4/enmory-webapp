export interface IBlogItem {
  id?: string
  uid?: string
  title: string
  keywords?: string[]
  description: string
  relation?: string[]
  tags: string[]
  created_date?: number
  last_update?: number
}

export type IArticleItem = IBlogItem
