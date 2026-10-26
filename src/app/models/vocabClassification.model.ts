export type TCEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export const CEFR_LEVELS: readonly TCEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type TVocabCategory =
  | 'word'
  | 'phrase'
  | 'collocation'
  | 'idiom'
  | 'phrasal_verb'
  | 'slang'
  | 'other'

export interface IClassifiedVocabItem {
  id: string
  text: string
  category: TVocabCategory
  level: TCEFRLevel
  type?: string
  phonetic?: string
  meaning: string
  vietnamese: string
  context?: string
  notes?: string
}

export interface ITranscriptClassificationData {
  trackId?: string | number
  transcriptSnippet?: string
  summary?: string
  items: IClassifiedVocabItem[]
  updatedAt: number
}
