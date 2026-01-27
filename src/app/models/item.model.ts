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
  id?: string
  uid?: string
  origin: string
  translation: string
  created_date?: number
  last_update?: number
  note: string
  randomIndex?: number
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

export interface IMeaning<S = string[]> {
  id?: string
  uid?: string
  itemId?: string
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
  created_date?: number
  last_update?: number
  examples: IExample[] | S
}

export interface IItem<M = string[]> {
  id?: string
  uid?: string
  catId?: ECategory
  origin: string
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
  count?: number
  forms: M
  collocations: M
  word_family: M
  relation: M
  meanings?: IMeaning<M>[]
}

export interface IIotd<M = string[]> {
  id: string
  itemId: string
  uid: string
  catId: number
  first_of_date: number
  last_of_date: number
  created_date?: number
  item: IItem<M>
}

export interface IIotdRequest {
  catId: number
  generate?: boolean
}

export interface IOption<L, V> {
  id: string | number
  label: L
  value: V
}

export interface IAnswer<K, V> {
  id: string
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

export type TQuiz = string | Partial<IOption<string, boolean>>[]

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
