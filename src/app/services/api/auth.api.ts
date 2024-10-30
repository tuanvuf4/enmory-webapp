import { http } from 'src/app/core/http'
import { httpConfig } from 'src/app/config/httpConfig'
import { IHttpResponse } from 'src/app/models/http.model'
import { ILogin, ILoginResponse, IUser } from 'src/app/models/user.model'

const getGoogleUserInfo = (access_token: string) => {
  return http.get(
    `https://www.googleapis.com/oauth2/v3/userinfo`,
    {},
    {
      baseURL: httpConfig.baseUrl,
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  )
}
const login = async (user: ILogin) => {
  return http
    .post<IHttpResponse<ILoginResponse>>(httpConfig.apiEndPoint.auth + '/login', user)
    .then((resp) => resp.data)
}

const register = async (user: IUser) => {
  return http
    .post<IHttpResponse<boolean>>(httpConfig.apiEndPoint.auth + '/register', user)
    .then((resp) => resp.data)
}

const getUserInfo = async () => {
  return http
    .get<IHttpResponse<IUser<string>>>(httpConfig.apiEndPoint.auth + '/me')
    .then((resp) => resp.data)
}

export const apiAuth = {
  getUserInfo,
  getGoogleUserInfo,
  login,
  register,
}
