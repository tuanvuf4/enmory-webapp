export interface IArticleItem {
  id?: string
  uid?: string
  title: string
  title_lowercase?: string
  keywords?: string[]
  description: string
  category_id?: string
  created_date?: number
  last_update?: number
}
