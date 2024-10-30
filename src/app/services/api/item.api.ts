import { httpConfig } from "@config/httpConfig"
import { http } from "@core/http"
import { AppOrderQuery, AppOrderByQuery } from "@models/app.model"
import { IHttpResponse, IHttpResponseArray } from "@models/http.model"
import { IItem, IItemQuiz } from "@models/item.model"
import { GetStudySetByCatId } from "@models/studySet.model"

export interface IItemRequestData {
  keyword: string
  page: number
  size: number
  cat?: number | ''
  type?: number | ''
  defect?: boolean | ''
  archive?: boolean | ''
  exact?: boolean
  order?: AppOrderQuery
  orderBy?: AppOrderByQuery
}

const getItems = async (params: IItemRequestData, config = {}) => {
  return http
    .get<
      IHttpResponse<IHttpResponseArray<IItem<string>>>
    >(httpConfig.apiEndPoint.item.root, params, config)
    .then((resp) => resp.data)
}

const getItemAutoComplete = async (params: IItemRequestData, config = {}) => {
  return http
    .get<
      IHttpResponse<IHttpResponseArray<IItem<string>>>
    >(httpConfig.apiEndPoint.item.root + httpConfig.apiEndPoint.item.children.autoComplete, params, config)
    .then((resp) => resp.data)
}

const getItemById = async (itemId: number) =>
  http
    .get<IHttpResponse<IItem<string>>>(httpConfig.apiEndPoint.item.root + '/' + itemId)
    .then((resp) => resp.data)

const getStudySet = async (studySet: GetStudySetByCatId[]) =>
  http
    .post<IHttpResponse<IItemQuiz[]>>(httpConfig.apiEndPoint.item.root + '/study-set', studySet)
    .then((resp) => resp.data)

const createItem = (item: IItem<string>) =>
  http
    .post<IHttpResponse<IItem<string>>>(httpConfig.apiEndPoint.item.root, item)
    .then((resp) => resp.data)

const createItems = (item: IItem<string>[]) =>
  http
    .post<
      IHttpResponse<IItem<string>>
    >(httpConfig.apiEndPoint.item.root + httpConfig.apiEndPoint.item.children.batch, item)
    .then((resp) => resp.data)

const updateItem = (id: number, item: Partial<IItem<string>>, config = {}) =>
  http
    .put<IHttpResponse<IItem<string>>>(httpConfig.apiEndPoint.item.root + '/' + id, item, config)
    .then((resp) => resp.data)

const deleteItem = (id: number) =>
  http
    .delete<IHttpResponse<boolean>>(httpConfig.apiEndPoint.item.root + '/' + id)
    .then((resp) => resp.data)

export const itemApi = {
  getItems,
  getItemAutoComplete,
  getItemById,
  createItem,
  createItems,
  updateItem,
  deleteItem,
  getStudySet,
}
