import { setting } from '../config/appConfig'
import { EListeningTypes } from '../models/dictation.model'
import { IUserConfig } from '../models/user.model'

export const initSettingForm: IUserConfig<number[]> = {
  numberOfWordsInStudySet: setting.studySet.numberOfWordsInStudySet,
  numberOfPhraseInStudySet: setting.studySet.numberOfPhraseInStudySet,
  numberOfIdiomInStudySet: setting.studySet.numberOfIdiomInStudySet,
  numberOfSlangInStudySet: setting.studySet.numberOfSlangInStudySet,
  numberOfCollocationsInStudySet: setting.studySet.numberOfSentencesInStudySet,
  numberOfSentencesInStudySet: setting.studySet.numberOfCollocationsInStudySet,
  numberOfExampleReview: setting.studySet.numberOfExampleReview,
  numberOfDictationItem: setting.listening.exerciseItemOptions.default,
  references: [],
  community: false,
  listeningType: EListeningTypes.Exercise,
  player: false,
}
