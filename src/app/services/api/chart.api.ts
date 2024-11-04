import { httpConfig } from '@/config/httpConfig'
import { http } from '@/core/http'
import { IHttpResponse } from '@/models/http.model'
import { IOverviewChartData, IQueryPeriods, IProgressChartData } from '@/models/item.model'

const getOverviewItems = async () =>
  http
    .get<
      IHttpResponse<IOverviewChartData[]>
    >(httpConfig.apiEndPoint.item.root + httpConfig.apiEndPoint.item.children.chart.overview)
    .then((resp) => resp.data)

const getNewAddedItemByPeriod = async (body: IQueryPeriods[]) =>
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
