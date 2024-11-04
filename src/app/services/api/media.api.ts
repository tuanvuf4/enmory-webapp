import { httpConfig } from '@/config/httpConfig'
import { http } from '@/core/http'
import { EMediaSrc } from '@/models/dictation.model'
import { IHttpResponse } from '@/models/http.model'
import { ITracks } from '@/models/media.model'
import { IMediaForm } from '@/views/features/modals/mediaUploadModal'

const removeMedia = async (id: number) => {
  return http
    .delete<IHttpResponse<boolean>>(httpConfig.apiEndPoint.media.root + `/${id}`)
    .then((resp) => resp.data)
}

const getMedias = async (src: EMediaSrc) => {
  return http
    .get<IHttpResponse<ITracks[]>>(httpConfig.apiEndPoint.media.root + '/' + src)
    .then((resp) => resp.data)
}

const uploadMedia = async (body: Record<string, unknown>) => {
  const form = new FormData()
  for (const key in body) form.append(key, body[key] as string)

  return http
    .post<IHttpResponse<IMediaForm>>(
      httpConfig.apiEndPoint.media.root + httpConfig.apiEndPoint.media.children.upload,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    .then((resp) => resp.data)
}

const updateMedia = async (body: Record<string, unknown>) => {
  const form = new FormData()
  for (const key in body) form.append(key, body[key] as string)

  return http
    .put<IHttpResponse<IMediaForm>>(
      httpConfig.apiEndPoint.media.root + httpConfig.apiEndPoint.media.children.upload,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    .then((resp) => resp.data)
}

export const mediaApi = {
  uploadMedia,
  getMedias,
  removeMedia,
  updateMedia,
}
