import { INotification } from '@/app/models/app.model'
import { EListeningTypes } from '@/app/models/dictation.model'
import { initNotification } from '@/app/services'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ISettingState {
  isShowSearchFormItem: boolean
  notification: INotification
  player: boolean
  listeningType: EListeningTypes
}

export const initialState: ISettingState = {
  isShowSearchFormItem: false,
  notification: initNotification,
  player: true,
  listeningType: EListeningTypes.Exercise,
}

export const settingReducer = createSlice({
  name: 'setting',
  initialState,
  reducers: {
    toggleSearchFormItem(state: ISettingState) {
      state.isShowSearchFormItem = !state.isShowSearchFormItem
    },
    setNotification(state: ISettingState, action: PayloadAction<INotification>) {
      state.notification = action.payload
    },
    togglePlayer(state: ISettingState, action: PayloadAction<boolean>) {
      state.player = action.payload
    },
    closeNotification(state: ISettingState) {
      state.notification = initNotification
    },
  },
})

export const settingAction = settingReducer.actions
