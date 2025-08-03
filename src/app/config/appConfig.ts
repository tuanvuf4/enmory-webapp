import { EListeningTypes } from '../models/dictation.model'

export enum EVN {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
  LOCAL = 'local',
}

export enum EAppType {
  WEB_APP = 'WEB_APP',
  EXTENSION = 'EXTENSION',
}

export const appConfig = {
  appName: 'Enmory',
  appType: import.meta.env.VITE_APP_TYPE as EAppType,
  env: import.meta.env.MODE, // development | production
  localKeyEncode: import.meta.env.LOCAL_KEY_TRANSFORM,
  googleAuth: {
    client_id: import.meta.env.GOOGLE_CLIENT_ID,
    project_id: 'enmory',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: import.meta.env.GOOGLE_AUTH_CLIENT_SECRET,
    redirect_uris: ['http://localhost:3000'],
  },
  references: [
    {
      id: 1,
      src: 'Tracau',
      url: 'https://tracau.vn/index.html?s=',
      target: '_blank',
    },
    {
      id: 2,
      src: 'Google',
      url: 'https://www.google.com/search?q=',
      target: '_blank',
    },
    {
      id: 3,
      src: 'Translate',
      url: 'https://translate.google.com/details?sl=en&tl=vi&text=',
      target: '_blank',
    },
    {
      id: 9,
      src: 'Vocabulary',
      url: 'https://www.vocabulary.com/dictionary/',
      target: '_blank',
    },
    {
      id: 4,
      src: 'Oxford',
      url: 'https://www.oxfordlearnersdictionaries.com/definition/english/',
      target: '_blank',
    },
    {
      id: 5,
      src: 'Cambridge',
      url: 'https://dictionary.cambridge.org/dictionary/english/',
      target: '_blank',
    },
    {
      id: 6,
      src: 'Merriam',
      url: 'https://www.merriam-webster.com/dictionary/',
      target: '_blank',
    },
    {
      id: 7,
      src: 'Dictionary',
      url: 'https://www.dictionary.com/browse/',
      target: '_blank',
    },
    {
      id: 8,
      src: 'Longman',
      url: 'https://www.ldoceonline.com/dictionary/',
      target: '_blank',
    },
    {
      id: 10,
      src: 'Thesaurus',
      url: 'https://www.thesaurus.com/browse/',
      target: '_blank',
    },
    {
      id: 11,
      src: 'Youglish',
      url: 'https://youglish.com/pronounce/',
      target: '_blank',
    },
    {
      id: 12,
      src: 'Sentence',
      url: 'https://sentencestack.com/q/',
      target: '_blank',
    },
    {
      id: 13,
      src: 'Fraze',
      url: 'https://fraze.it/n_search.jsp?q=',
      target: '_blank',
    },
  ],
}

export const defaultSetting = {
  debounceTime: 1200,
  numberItemOfAutoComplete: 10,
  dateFormat: 'MM-DD-YYYY',
  dateTimeFormat: 'MM-DD-YYYY | HH:mm',
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  shortDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  millisecondsInHour: 60 * 60 * 1000,
  pagination: {
    page: 0,
    size: 20,
    total: 0,
    totalPage: 0,
    options: [
      { value: 10, label: 10 },
      { value: 20, label: 20 },
      { value: 30, label: 30 },
      { value: 40, label: 40 },
      { value: 50, label: 50 },
    ],
  },
  studySet: {
    numberOfWordsInStudySet: 20,
    numberOfPhraseInStudySet: 20,
    numberOfIdiomInStudySet: 3,
    numberOfSlangInStudySet: 3,
    numberOfCollocationsInStudySet: 3,
    numberOfSentencesInStudySet: 3,
    numberOfExampleReview: 10,
    options: [
      { value: 0, label: 0 },
      appConfig.env === 'development' ? { value: 5, label: 5 } : { value: 10, label: 10 },
      { value: 20, label: 20 },
      { value: 30, label: 30 },
      { value: 40, label: 40 },
      { value: 50, label: 50 },
    ],
    stOptions: [
      { value: 0, label: 0 },
      { value: 1, label: 1 },
      { value: 2, label: 2 },
      { value: 3, label: 3 },
      { value: 4, label: 4 },
      { value: 5, label: 5 },
    ],
    ndOptions: [
      { value: 0, label: 0 },
      { value: 2, label: 2 },
      { value: 4, label: 4 },
      { value: 6, label: 6 },
      { value: 8, label: 8 },
      { value: 10, label: 10 },
    ],
    rdOptions: [
      { value: 0, label: 0 },
      { value: 5, label: 5 },
      { value: 10, label: 10 },
      { value: 15, label: 15 },
      { value: 20, label: 20 },
      { value: 25, label: 25 },
    ],
  },
  listening: {
    maxMediaItem: 5,
    threshold: 50,
    maxLengthShortInput: 250,
    maxLengthInput: 500,
    maxMediaSize: 75, // MB
    maxLengthTranscript: 50000,
    exerciseItemOptions: {
      default: 20,
      options: [
        { value: 10, label: 10 },
        { value: 20, label: 20 },
        { value: 30, label: 30 },
        { value: 40, label: 40 },
        { value: 50, label: 50 },
        { value: 60, label: 60 },
        { value: 70, label: 70 },
      ],
    },
    player: {
      default: true,
      options: [
        { value: false, label: 'No' },
        { value: true, label: 'Yes' },
      ],
    },
    type: {
      default: EListeningTypes.Exercise,
      options: [
        {
          value: EListeningTypes.Exercise,
          label: 'Exercise',
        },
        {
          value: EListeningTypes.Dictation,
          label: 'Dictation',
        },
      ],
    },
  },
}
