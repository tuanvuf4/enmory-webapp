import { http } from 'src/app/core/http'
import { httpConfig } from 'src/app/config/httpConfig'
import { IUserConfig, IUser } from 'src/app/models/user.model'
import { IHttpResponse } from 'src/app/models/http.model'

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
