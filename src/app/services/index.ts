import { defaultSetting } from '../config/appConfig'
import { INotification } from '../models/app.model'
import { EListeningTypes } from '../models/dictation.model'
import { IFormSearchEx, IFormSearchItem } from '../models/formSearch.model'
import { ECategory, EType, IItem, IPair } from '../models/item.model'
import { ILoginResponse, IUser } from '../models/user.model'

export const initAuth: ILoginResponse = {
  access_token: '',
  refresh_token: '',
  expired_in: -1,
  token_type: '',
}

export const initUser: IUser<number[]> = {
  username: '',
  password: '',
  email: '',
  firstName: '',
  lastName: '',
  avatar: '',
  phoneNumber: '',
  status: true,
  sex: false,
  is_active: false,
  actived_date: 0,
  last_active: 0,
  configuration: {
    community: false,
    numberOfWordsInStudySet: defaultSetting.studySet.numberOfWordsInStudySet,
    numberOfPhraseInStudySet: defaultSetting.studySet.numberOfPhraseInStudySet,
    numberOfIdiomInStudySet: defaultSetting.studySet.numberOfIdiomInStudySet,
    numberOfSlangInStudySet: defaultSetting.studySet.numberOfSlangInStudySet,
    numberOfCollocationsInStudySet: defaultSetting.studySet.numberOfCollocationsInStudySet,
    numberOfSentencesInStudySet: defaultSetting.studySet.numberOfSentencesInStudySet,
    numberOfExampleReview: defaultSetting.studySet.numberOfExampleReview,
    numberOfDictationItem: defaultSetting.listening.type.default,
    references: [],
    player: false,
    listeningType: EListeningTypes.Exercise,
  },
}

export const initNotification: INotification = {
  type: 'error',
  show: false,
  message: '',
  description: '',
}

export const allSelect: IPair<string, ECategory> = {
  id: ECategory.ALL,
  label: 'All',
  value: ECategory.ALL,
}

export const itemDefault: IItem = {
  original: '',
  favorite: false,
  archive: false,
  is_deleted: false,
  level: 0,
  practiceCount: 0,
  meanings: [],
  forms: [],
  collocations: [],
  word_family: [],
  relation: [],
}

export const initSearchFormEx: IFormSearchEx = {
  keyword: '',
  orderBy: 'created_date',
  order: 'DESC',
}

export const initSearchFormItem: IFormSearchItem = {
  keyword: '',
  cat: ECategory.ALL,
  type: EType.ALL,
  archive: false,
  defect: false,
  orderBy: 'created_date',
  order: 'DESC',
}

export const defauValueFormSearchEx = {
  keyword: '',
}
