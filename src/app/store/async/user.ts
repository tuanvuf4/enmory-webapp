import { createAsyncThunk } from '@reduxjs/toolkit'
import { authAction } from '../reducers/auth.reducer'
import { ILogin, IUser } from '@/models/user.model'
import { apiAuth } from '@/services/api/auth.api'
import { httpConfig } from '@/config/httpConfig'

export const logoutUser = createAsyncThunk(httpConfig.apiEndPoint.auth + '/logout', async () => {
  return authAction.logOut()
})

const login = createAsyncThunk(
  httpConfig.apiEndPoint.auth + '/login',
  async (user: ILogin) => await apiAuth.login(user),
)

const register = createAsyncThunk(
  httpConfig.apiEndPoint.auth + '/register',
  async (user: IUser) => {
    return await apiAuth.register(user)
  },
)

const getUserInfo = createAsyncThunk('users/info', async () => {
  const result = await apiAuth.getUserInfo()
  return {
    ...result,
    content: {
      ...result.content,
      configuration: {
        ...result.content.configuration,
        references: result.content.configuration.references
          .replaceAll(' ', '')
          .split(',')
          .map((item) => parseInt(item)),
      },
    },
  }
})

const refreshToken = createAsyncThunk(
  httpConfig.apiEndPoint.auth + '/refresh',
  async (refreshToken: string) => await apiAuth.refreshToken(refreshToken),
)

export const actionAsyncUser = {
  getUserInfo,
  login,
  register,
  refreshToken,
}
