import { httpConfig } from '@/config/httpConfig'
import { http } from '@/core/http'
import { IHttpResponse } from '@/models/http.model'
import {
  IPair,
  ECategory,
  EType,
  IIotd,
  IIotdRequest,
  MarkIotdRangeDateRequest,
  GetIIotdRangeDateRequest,
} from '@/models/item.model'

const getCategories = async () =>
  http
    .get<IHttpResponse<IPair<string, ECategory>[]>>(httpConfig.apiEndPoint.category)
    .then((resp) => resp.data)

const getTypes = async () =>
  http
    .get<IHttpResponse<IPair<string, EType>[]>>(httpConfig.apiEndPoint.type)
    .then((resp) => resp.data)

const getItemOfTheDayByCatId = async (body: IIotdRequest) =>
  http
    .post<IHttpResponse<IIotd<string>>>(`${httpConfig.apiEndPoint.iotd}`, body)
    .then((resp) => resp.data)

const markIotd = async (body: MarkIotdRangeDateRequest) =>
  http
    .post<IHttpResponse<IIotd<string>>>(`${httpConfig.apiEndPoint.iotd}/add`, body)
    .then((resp) => resp.data)

const deleteMarkIotd = async (id: number) =>
  http
    .delete<IHttpResponse<boolean>>(`${httpConfig.apiEndPoint.iotd}/${id}`)
    .then((resp) => resp.data)

const getIotdRange = async (body: GetIIotdRangeDateRequest) =>
  http
    .post<IHttpResponse<IIotd<string>[]>>(`${httpConfig.apiEndPoint.iotd}/range`, body)
    .then((resp) => resp.data)

export const appApi = {
  getCategories,
  getTypes,
  getItemOfTheDayByCatId,
  markIotd,
  getIotdRange,
  deleteMarkIotd,
}
