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
      items: 'id, uid, catId, origin_lowercase, level, created_date, last_update, *tags_lowercase',
      examples: 'id, uid, origin_lowercase, created_date, last_update',
      syncMeta: 'key',
    })
  }
}

export const localDb = new EnmoryDatabase()
