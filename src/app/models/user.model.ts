import { EListeningTypes } from './dictation.model'

export interface ILoginResponse {
  access_token: string
  expired_in: number
  refresh_token: string
  token_type: string
}

export interface IUserConfig<R = number[]> {
  numberOfWordsInStudySet: number
  numberOfPhraseInStudySet: number
  numberOfIdiomInStudySet: number
  numberOfSlangInStudySet: number
  numberOfDictationItem: number
  numberOfCollocationsInStudySet: number
  numberOfSentencesInStudySet: number
  numberOfExampleReview: number
  references: R
  community: boolean
  player: boolean
  listeningType: EListeningTypes
}

export interface IUser<R = number[]> {
  uid?: string
  displayName: string
  photoURL: string
  email: string
  password: string
  cpassword?: string
  firstName: string
  lastName: string
  provider: string
  createdAt?: number
  updatedAt?: number
  configuration: IUserConfig<R>
}

export interface ILogin {
  email: string
  password: string
}
