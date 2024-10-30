import { http } from 'src/app/core/http'
import { httpConfig } from 'src/app/config/httpConfig'
import { IHttpResponse } from 'src/app/models/http.model'
import {
  ECategory,
  IOverviewChartData,
  IPair,
  IProgressChartData,
  IqueryPeriods,
} from 'src/app/models/item.model'

const getOverviewItems = async () =>
  http
    .get<
      IHttpResponse<IOverviewChartData[]>
    >(httpConfig.apiEndPoint.item.root + httpConfig.apiEndPoint.item.children.chart.overview)
    .then((resp) => resp.data)

const getNewAddedItemByPeriod = async (body: IqueryPeriods[]) =>
  http
    .post<
      IHttpResponse<IProgressChartData[]>
    >(httpConfig.apiEndPoint.item.root + httpConfig.apiEndPoint.item.children.chart.new, body)
    .then((resp) => resp.data)

const getProgressChart = async () =>
  http
    .get<
      IHttpResponse<IProgressChartData[]>
    >(httpConfig.apiEndPoint.item.root + httpConfig.apiEndPoint.item.children.chart.progress)
    .then((resp) => resp.data)

export const chartApi = {
  getOverviewItems,
  getNewAddedItemByPeriod,
  getProgressChart,
}
