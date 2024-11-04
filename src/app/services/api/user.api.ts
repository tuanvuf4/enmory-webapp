import { httpConfig } from '@/config/httpConfig'
import { http } from '@/core/http'
import { IHttpResponse } from '@/models/http.model'
import { IUser, IUserConfig } from '@/models/user.model'

const getUsers = () => {
  return http.get(httpConfig.apiEndPoint.user)
}

const createUser = (item: IUser) => {
  return http.post(httpConfig.apiEndPoint.user, item)
}

const userConfig = async (item: IUserConfig<string>) => {
  return http
    .post<IHttpResponse<IUserConfig<string>>>(httpConfig.apiEndPoint.config, item)
    .then((response) => response.data)
}

export const apiUser = {
  getUsers,
  createUser,
  userConfig,
}
