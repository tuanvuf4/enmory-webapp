import { IHttpResponse } from '@/models/http.model'
import { IUser, ILoginResponse, IUserConfig } from '@/models/user.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { initUser, initAuth } from '@/services/index'
import { actionAsyncUser } from '@/store/async/user'

export interface IAuthState {
  isAuth: boolean
  user: IUser<number[]>
  authorization: ILoginResponse
}

export const initialState: IAuthState = {
  isAuth: false,
  user: initUser,
  authorization: initAuth,
}

export const authReducer = createSlice({
  name: 'user',
  initialState,
  reducers: {
    logOut() {
      return initialState
    },
    updateUserConfig(state: IAuthState, action: PayloadAction<IUserConfig>) {
      state.user = {
        ...state.user,
        configuration: action.payload,
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      actionAsyncUser.login.fulfilled,
      (state: IAuthState, action: PayloadAction<IHttpResponse<ILoginResponse>>) => {
        state.isAuth = true
        state.authorization = action.payload.content
      },
    )
    builder.addCase(
      actionAsyncUser.getUserInfo.fulfilled,
      (state: IAuthState, action: PayloadAction<IHttpResponse<IUser>>) => {
        state.isAuth = true
        state.user = action.payload.content
      },
    )
    builder.addCase(
      actionAsyncUser.refreshToken.fulfilled,
      (state: IAuthState, action: PayloadAction<IHttpResponse<ILoginResponse>>) => {
        state.authorization = action.payload.content
      },
    )
  },
})

export const authAction = authReducer.actions
