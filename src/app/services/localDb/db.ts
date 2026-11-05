import Dexie, { Table } from 'dexie'
import { IItem } from '@/models/item.model'
import { IBlogItem } from '@/models/blog.model'

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

export interface IErrorApiRequest {
  id: string
  url: string
  baseURL?: string
  method: string // GET, POST, PUT, DELETE, PATCH, etc.
  headers?: Record<string, any>
  params?: any
  body?: any
  status?: number
  statusText?: string
  errorMessage: string
  errorDetails?: any
  responseBody?: any
  timestamp: number
  retryCount: number
  lastRetryAt?: number
  lastStatus: 'failed' | 'success' | 'pending' | 'retrying'
  source?: 'axios' | 'fetch' | 'manual' | 'simulation'
}

export class EnmoryDatabase extends Dexie {
  items!: Table<IItem, string>
  blogs!: Table<IBlogItem, string>
  syncMeta!: Table<ISyncMeta, string>
  audioCache!: Table<ICachedAudio, string>
  listeningHistory!: Table<IListeningHistoryItem, number>
  translationHistory!: Table<ITranslationHistoryItem, number>
  errorApiRequests!: Table<IErrorApiRequest, string>

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
    this.version(6).stores({
      tags: null,
      blogs: 'id, uid, created_date, last_update, *tags',
    })
    this.version(7).stores({
      examples: null,
    })
    this.version(8).stores({
      errorApiRequests: 'id, url, method, status, timestamp, lastStatus, source',
    })
  }
}

export const localDb = new EnmoryDatabase()
