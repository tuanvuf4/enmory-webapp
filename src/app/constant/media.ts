import { IMediaForm } from '../models'

export enum TSourceTypes {
  IFRAME,
  EMBED,
  LINK,
}

export const initMediaForm: IMediaForm = {
  title: '',
  description: '',
  transcript: '',
  translation: '',
  tags: [],
  relation: [],
  srcUrl: '',
  srcType: TSourceTypes.LINK,
}
