import { TExternalSource } from '../views/features/modals/mediaUploadModal'

export interface ITracks {
  id?: number
  title: string
  description?: string
  transcript: string
  translation: string
  internalUrl?: string
  externalUrl?: string
  externalSource?: TExternalSource
  created_date?: number
  last_update?: number
  is_deleted?: number
  user: {
    username: string
    firstName: string
    lastName: string
  }
}
