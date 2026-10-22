export type TSentenceListeningSource = 'sentence' | 'example'

export interface ISentenceListeningItem {
  id: string
  origin: string
  translation?: string
  sourceType: TSentenceListeningSource
  sourceItemOrigin?: string
  itemId?: string
}
