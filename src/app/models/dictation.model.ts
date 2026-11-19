export interface IDictationHistoryItem {
  id?: number
  docId?: string
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
  created_date?: number
  last_update?: number
}

export enum EListeningTypes {
  Exercise,
  Dictation,
}

export enum EMediaSrc {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}
