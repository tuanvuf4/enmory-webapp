import { httpConfig } from "@/config/httpConfig"
import { http } from "@/core/http"
import { IHttpResponse } from "@/models/http.model"
import { IPair, ECategory, EType, IIotd } from "@/models/item.model"

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
