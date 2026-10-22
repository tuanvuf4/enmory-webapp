import Dexie, { Table } from 'dexie'
import { IItem, IExample } from '@/models/item.model'

export interface ISyncMeta {
  key: string
  value: any
}

export class EnmoryDatabase extends Dexie {
  items!: Table<IItem, string>
  examples!: Table<IExample, string>
  syncMeta!: Table<ISyncMeta, string>

  constructor() {
    super('EnmoryLocalDB')
    this.version(1).stores({
      items: 'id, uid, catId, level, created_date, last_update, *tags_lowercase',
      examples: 'id, uid, created_date, last_update',
      syncMeta: 'key',
    })
    this.version(2).stores({
      items: 'id, uid, catId, level, created_date, last_update, next_review_date, *tags_lowercase',
    })
  }
}

export const localDb = new EnmoryDatabase()
