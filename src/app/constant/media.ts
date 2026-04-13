import { IMediaForm } from '../models'

export enum TSourceTypes {
  IFRAME,
  EMBED,
}

export const initMediaForm: IMediaForm = {
  title: '',
  description: '',
  transcript: '',
  translation: '',
  srcUrl: '',
  srcType: TSourceTypes.IFRAME,
}
