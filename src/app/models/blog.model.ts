export interface IBlogItem {
  id?: string
  uid?: string
  title: string
  keywords?: string[]
  description: string
  /** @deprecated use tags instead */
  category_id?: string
  relation?: string[]
  tags: string[]
  created_date?: number
  last_update?: number
}

export type IArticleItem = IBlogItem
