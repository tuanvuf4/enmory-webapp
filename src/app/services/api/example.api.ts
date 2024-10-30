import { httpConfig } from "@/config/httpConfig"
import { http } from "@/core/http"
import { IExampleQuery } from "@/models/example.model"
import { IHttpResponse, IHttpResponseArray } from "@/models/http.model"
import { IExample } from "@/models/item.model"


const createExample = async (body: IExample) => {
  return http
    .post<IHttpResponse<IExample>>(httpConfig.apiEndPoint.example.root, body)
    .then((resp) => resp.data)
}

const getExampleById = async (id: number | string) => {
  return http
    .get<IHttpResponse<IExample>>(httpConfig.apiEndPoint.example.root + `/${id}`)
    .then((resp) => resp.data)
}

const getExamples = async (querySearch: IExampleQuery, config = {}) => {
  return http
    .get<
      IHttpResponse<IHttpResponseArray<IExample>>
    >(httpConfig.apiEndPoint.example.root, querySearch, config)
    .then((resp) => resp.data)
}

const getRandomExamples = async (querySearch: Omit<IExampleQuery, 'keyword'>) => {
  return http
    .get<
      IHttpResponse<IExample[]>
    >(httpConfig.apiEndPoint.example.root + httpConfig.apiEndPoint.example.children.random, querySearch)
    .then((resp) => resp.data)
}

const updateExample = async (body: Partial<IExample>) => {
  return http
    .patch<IHttpResponse<IExample>>(httpConfig.apiEndPoint.example.root + `/${body.id}`, body)
    .then((resp) => resp.data)
}

const deleteExample = async (id: number) => {
  return http
    .delete<IHttpResponse<IExample>>(httpConfig.apiEndPoint.example.root + `/${id}`)
    .then((resp) => resp.data)
}

export const exampleApi = {
  createExample,
  getExamples,
  getExampleById,
  getRandomExamples,
  updateExample,
  deleteExample,
}
