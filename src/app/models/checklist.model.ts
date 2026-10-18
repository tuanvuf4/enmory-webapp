import { IItem } from './item.model'

export interface IChecklistDoc {
  id?: string
  checklistId?: string
  uid: string
  itemId: string
  isCompleted: boolean
  added_date: number
  last_update?: number
}

export interface IChecklistItem extends IItem {
  checklistId?: string
  itemId: string
  isCompleted: boolean
  added_date: number
}
