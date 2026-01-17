import { appConfig } from '@/config/appConfig'
import { httpConfig } from '@/config/httpConfig'
import { EMediaSrc } from '@/models/dictation.model'
import { createAsyncThunk } from '@reduxjs/toolkit'
// TODO: Media API not implemented in Firebase yet
// import { mediaApi } from '@/services/firebase/api/media.api'

const fetchMedias = createAsyncThunk('media/fetchAllMedia', async (src: EMediaSrc) => {
  appConfig
  // TODO: Implement media API
  throw new Error('Media API not implemented in Firebase')
  // const media = await mediaApi.getMedias(src)
  if (media.isSuccess)
    return {
      ...media,
      content: media.content.map((media) => ({
        ...media,
        externalUrl: media.externalUrl
          ? decodeURIComponent(media.externalUrl.replaceAll(`\\/`, '/'))
          : '',
        internalUrl: media.internalUrl
          ? decodeURIComponent(httpConfig.baseUrl + '/' + media.internalUrl.replaceAll('/', '/'))
          : '',
      })),
    }
  return media
})

const deleteMedia = createAsyncThunk('media/fetchAllMedia', async (id: number) => {
  // TODO: Implement media API
  throw new Error('Media API not implemented in Firebase')
  // const media = await mediaApi.removeMedia(id)
  // console.log(`media: `, media)
  // if (media.isSuccess) return media
})

export const actionAsyncMedia = {
  fetchMedias,
  deleteMedia,
}
