import { appConfig } from "@config/appConfig"
import { httpConfig } from "@config/httpConfig"
import { EMediaSrc } from "@models/dictation.model"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { mediaApi } from "@services/api/media.api"

const fetchMedias = createAsyncThunk('media/fetchAllMedia', async (src: EMediaSrc) => {
  appConfig
  const media = await mediaApi.getMedias(src)
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
  const media = await mediaApi.removeMedia(id)
  console.log(`media: `, media)
  if (media.isSuccess) return media
})

export const actionAsyncMedia = {
  fetchMedias,
  deleteMedia,
}
