export enum ECategory {
  ALL,
  WORD,
  PHRASE,
  IDIOM,
  SLANG,
  COLLOCATION,
  SENTENCE,
}

export interface IItemType<T> {
  value: T
  label: string
}

export interface ILabelValue<T> {
  id?: number
  value: T
  label: string
}

export interface IPronouns {
  id?: number
  us?: string
  uk?: string
  common?: string
}

export interface IExample {
  id?: number
  auto?: boolean
  original: string
  translation: string
  created_date?: number
  last_update?: number
  note?: string
}

export interface IType {
  id: number
  label?: string
  value?: string
}

export enum EType {
  ALL,
  NOUN,
  VERB,
  ADJECTIVE,
  ADVERB,
  PREPOSITION,
  CONJUNCTION,
  PRONOUN,
  ARTICLE,
  DETERMINER,
  INTERJECTION,
}

export interface IMeaning<S> {
  id?: number
  itemId?: number
  typeId: EType
  common: boolean
  enable: boolean
  pronunciation: IPronouns
  note: string
  definition: string
  translation: string
  grammar: string
  collocations: string
  synonyms: S
  antonyms: S
  last_update?: number
  examples: IExample[]
}

export interface IItem<M = string[]> {
  id?: number
  userId?: number
  catId?: ECategory
  original: string
  favorite?: boolean
  level: number
  last_update?: number
  created_date?: number
  deleted_date?: number
  is_deleted?: boolean
  archive: boolean
  user?: {
    username: string
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
  }
  practiceCount?: number
  forms: M
  collocations: M
  word_family: M
  relation: M
  quickAdd?: M
  meanings: IMeaning<M>[]
}

export interface IIotd<M = string[]> {
  id: number
  itemId: number
  userId: number
  first_of_date: number
  last_of_date: number
  item: IItem<M>
}

export interface IPair<K, V> {
  id: number
  label: K
  value: V
  key?: string
}

export interface IAnswer<K, V> {
  id: number
  label: K
  value: V
  typeId: number
  key?: string
}

export type TItem = 'full' | 'brief'

export enum EQuiz {
  MULTI_CHOICE,
  FILL_IN_BLANK,
}

export interface IQuiz<A> {
  title: string
  question: string
  answer: A
  type: EQuiz
  hint: string
  result?: boolean
}

export type TQuiz = string | Partial<IPair<string, boolean>>[]

export interface IItemQuiz<A = TQuiz, S = string> extends IItem<S> {
  quiz: IQuiz<A>
}

export interface IOverviewChartData {
  id: number
  label: string
  total: number
  percent: number
}

export interface IProgressChartData {
  id: number
  label: string
  data: IItem[]
}

export interface IQueryPeriods {
  id: number
  label: string
  from: number
  to: number
}
