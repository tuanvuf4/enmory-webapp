import { IUserConfig } from '@/models/user.model'
import { IUser } from '@/models/user.model'
import { ILoginResponse } from '@/models/user.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { initUser, initAuth } from '@/services/index'

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
    setGoogleAuth(state: IAuthState, action: PayloadAction<any>) {
      state.isAuth = true
      // Store Firebase user info if available
      if (action.payload && action.payload.email) {
        state.user = {
          ...state.user,
          email: action.payload.email,
          firstName: action.payload.displayName || '',
          avatar: action.payload.photoURL,
        }
      }
    },
  },
  // Firebase auth state is managed through Firebase auth listeners
  // No extraReducers needed for REST API calls
})

export const authAction = authReducer.actions
