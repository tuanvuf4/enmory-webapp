import { http } from 'src/app/core/http'
import { httpConfig } from 'src/app/config/httpConfig'
import { IHttpResponse } from 'src/app/models/http.model'
import { ECategory, EType, IIotd, IPair } from 'src/app/models/item.model'

const getCategories = async () =>
  http
    .get<IHttpResponse<IPair<string, ECategory>[]>>(httpConfig.apiEndPoint.category)
    .then((resp) => resp.data)

const getTypes = async () =>
  http
    .get<IHttpResponse<IPair<string, EType>[]>>(httpConfig.apiEndPoint.type)
    .then((resp) => resp.data)

const getItemOfTheDayByCatId = async (catId: number) =>
  http
    .get<IHttpResponse<IIotd<string>>>(`${httpConfig.apiEndPoint.iotd}/${catId}`)
    .then((resp) => resp.data)

export const appApi = {
  getCategories,
  getTypes,
  getItemOfTheDayByCatId,
}
