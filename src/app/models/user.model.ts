import { EListeningTypes } from './dictation.model'

export interface ILoginResponse {
  access_token: string
  expired_in: number
  refresh_token: string
  token_type: string
}

export interface IUserConfig<R = number[]> {
  userId?: number
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
  id?: number
  username: string
  email: string
  password: string
  cpassword?: string
  firstName: string
  lastName: string
  avatar?: string
  phoneNumber?: string
  status?: boolean
  sex: boolean
  is_active?: boolean
  actived_date?: number
  created_date?: number
  last_active?: number
  last_update?: number
  deletedDate?: number
  usertypeId?: number
  configuration: IUserConfig<R>
}

export interface ILogin {
  username: string
  password: string
}
