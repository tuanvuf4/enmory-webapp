import Dexie, { Table } from 'dexie'
import { IItem, IExample } from '@/models/item.model'
import { ITagEntity } from '@/models/tag.model'

export interface ISyncMeta {
  key: string
  value: any
}

export interface ICachedAudio {
  key: string // e.g. `${resolvedVoice}_${cleanText}`
  blob: Blob
  created_at: number
}

export interface IListeningHistoryItem {
  id?: number
  uid?: string
  date: string // YYYY-MM-DD
  timestamp: number
  sentenceId: string
  sentenceOrigin: string
  userText?: string
  accuracy: number
  isPerfect: boolean
  sourceType: string
  voice?: string
}

export interface ITranslationHistoryItem {
  id?: number
  uid?: string
  date: string // YYYY-MM-DD
  timestamp: number
  sentenceId?: string
  exampleId?: string
  sourceText?: string
  targetText?: string
  userText?: string
  accuracy: number
  isPerfect: boolean
  direction?: 'vi-en' | 'en-vi'
}

export class EnmoryDatabase extends Dexie {
  items!: Table<IItem, string>
  examples!: Table<IExample, string>
  tags!: Table<ITagEntity, string>
  syncMeta!: Table<ISyncMeta, string>
  audioCache!: Table<ICachedAudio, string>
  listeningHistory!: Table<IListeningHistoryItem, number>
  translationHistory!: Table<ITranslationHistoryItem, number>

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
    this.version(3).stores({
      audioCache: 'key, created_at',
      listeningHistory: '++id, date, timestamp, accuracy',
    })
    this.version(4).stores({
      tags: 'id, uid, value, value_lowercase, created_date, last_update',
    })
    this.version(5).stores({
      translationHistory: '++id, date, timestamp, accuracy, direction',
    })
  }
}

export const localDb = new EnmoryDatabase()
