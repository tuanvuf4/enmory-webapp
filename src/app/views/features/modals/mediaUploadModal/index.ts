export enum TExternalSource {
  IFRAME,
  EMBED,
}

export type IMediaForm = {
  id?: number
  title: string
  description?: string
  transcript?: string
  translation?: string
  externalUrl?: string
  externalSource?: TExternalSource
  file?: File | string
}

export const initMediaForm: IMediaForm = {
  title: '',
  description: '',
  transcript: '',
  translation: '',
  externalUrl: '',
  externalSource: TExternalSource.IFRAME,
  file: '',
}
