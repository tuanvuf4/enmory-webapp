import { appConfig } from '../config'
import { EListeningTypes } from '../../models/dictation.model'
import { IUserConfig, IUser } from '../../models/user.model'
import { defaultConfig } from '../default'

export const initSettingForm: IUserConfig<number[]> = {
  numberOfWordsInStudySet: defaultConfig.studySet.numberOfWordsInStudySet,
  numberOfPhraseInStudySet: defaultConfig.studySet.numberOfPhraseInStudySet,
  numberOfIdiomInStudySet: defaultConfig.studySet.numberOfIdiomInStudySet,
  numberOfSlangInStudySet: defaultConfig.studySet.numberOfSlangInStudySet,
  numberOfCollocationsInStudySet: defaultConfig.studySet.numberOfSentencesInStudySet,
  numberOfSentencesInStudySet: defaultConfig.studySet.numberOfCollocationsInStudySet,
  numberOfExampleReview: defaultConfig.studySet.numberOfExampleReview,
  numberOfDictationItem: defaultConfig.listening.exerciseItemOptions.default,
  references: [],
  community: false,
  listeningType: EListeningTypes.Exercise,
  player: false,
}
