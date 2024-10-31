import { defaultSetting } from '../config/appConfig'
import { EListeningTypes } from '../models/dictation.model'
import { IUserConfig } from '../models/user.model'

export const initSettingForm: IUserConfig<number[]> = {
  numberOfWordsInStudySet: defaultSetting.studySet.numberOfWordsInStudySet,
  numberOfPhraseInStudySet: defaultSetting.studySet.numberOfPhraseInStudySet,
  numberOfIdiomInStudySet: defaultSetting.studySet.numberOfIdiomInStudySet,
  numberOfSlangInStudySet: defaultSetting.studySet.numberOfSlangInStudySet,
  numberOfCollocationsInStudySet: defaultSetting.studySet.numberOfSentencesInStudySet,
  numberOfSentencesInStudySet: defaultSetting.studySet.numberOfCollocationsInStudySet,
  numberOfExampleReview: defaultSetting.studySet.numberOfExampleReview,
  numberOfDictationItem: defaultSetting.listening.exerciseItemOptions.default,
  references: [],
  community: false,
  listeningType: EListeningTypes.Exercise,
  player: false,
}
