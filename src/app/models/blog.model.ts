export interface IBlogItem {
  id?: string
  uid?: string
  title: string
  title_lowercase?: string
  keywords?: string[]
  description: string
  category_id?: string
  relation?: string[]
  tags?: string[]
  created_date?: number
  last_update?: number
}

export type IArticleItem = IBlogItem
