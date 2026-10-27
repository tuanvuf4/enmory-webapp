export interface ITagEntity {
  id?: string
  uid: string
  value: string
  value_lowercase: string
  created_date: number
  last_update: number
}

export interface ITagDto {
  id: string
  value: string
  value_lowercase: string
}
