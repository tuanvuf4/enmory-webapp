import { ECategory, EType, IExample, IItem, IMeaning } from '@/app/models/item.model'
import { Timestamp } from 'firebase/firestore'

export const exampleItem: IExample = {
  uid: '',
  original: '',
  translation: '',
  note: '',
  created_date: Timestamp.now().toMillis(),
  last_update: Timestamp.now().toMillis(),
}

export const meaningItem: IMeaning<string[]> = {
  typeId: EType.NOUN,
  common: true,
  enable: true,
  pronunciation: {
    uk: '',
    us: '',
    common: '',
  },
  definition: '',
  translation: '',
  note: '',
  grammar: '',
  collocations: '',
  synonyms: [],
  antonyms: [],
  examples: [],
}

export const initItem: IItem = {
  catId: ECategory.WORD,
  original: '',
  archive: false,
  favorite: false,
  level: 0,
  forms: [],
  collocations: [],
  word_family: [],
  relation: [],
  meanings: [],
}

export type TItemLevel = 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5'

export enum EItemLevel {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
}
