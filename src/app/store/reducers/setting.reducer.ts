import { INotification } from "@/app/models/app.model"
import { EListeningTypes } from "@/app/models/dictation.model"
import { IItem } from "@/app/models/item.model"
import { initNotification } from "@/app/services"
import { createSlice, PayloadAction } from "@reduxjs/toolkit"


export interface ISettingState {
  onEditEvent: boolean
  currentItem: IItem | null
  isShowSearchFormItem: boolean
  isShowItemModal: boolean
  isShowExModal: boolean
  isShowDeleteExModal: boolean
  isShowViewItemModal: boolean
  isShowDeleteItemModal: boolean
  isShowSearchForm: boolean
  isShowMediaUploadForm: boolean
  notification: INotification
  player: boolean
  listeningType: EListeningTypes
}

export const initialState: ISettingState = {
  onEditEvent: false,
  currentItem: null,
  isShowSearchFormItem: false,
  isShowItemModal: false,
  isShowExModal: false,
  isShowDeleteExModal: false,
  isShowViewItemModal: false,
  isShowDeleteItemModal: false,
  isShowSearchForm: true,
  isShowMediaUploadForm: false,
  notification: initNotification,
  player: true,
  listeningType: EListeningTypes.Exercise,
}

export const settingReducer = createSlice({
  name: 'setting',
  initialState,
  reducers: {
    setOnEditItem(state: ISettingState, action: PayloadAction<boolean>) {
      state.onEditEvent = action.payload
    },
    toggleSearchFormItem(state: ISettingState) {
      state.isShowSearchFormItem = !state.isShowSearchFormItem
    },
    toggleSearchForm(state: ISettingState) {
      state.isShowSearchForm = !state.isShowSearchForm
    },
    toggleItemModal(state: ISettingState) {
      state.isShowItemModal = !state.isShowItemModal
    },
    toggleExModal(state: ISettingState) {
      state.isShowExModal = !state.isShowExModal
    },
    toggleViewItemModal(state: ISettingState) {
      state.isShowViewItemModal = !state.isShowViewItemModal
    },
    showViewItemModal(state: ISettingState, action: PayloadAction<boolean>) {
      state.isShowViewItemModal = action.payload
    },
    updateViewItemModal(state: ISettingState, action: PayloadAction<boolean>) {
      state.isShowViewItemModal = action.payload
    },
    toggleDeleteItemModal(state: ISettingState) {
      state.isShowDeleteItemModal = !state.isShowDeleteItemModal
    },
    toggleDeleteExModal(state: ISettingState) {
      state.isShowDeleteExModal = !state.isShowDeleteExModal
    },
    toggleMediaModal(state: ISettingState) {
      state.isShowMediaUploadForm = !state.isShowMediaUploadForm
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
    setCurrentItem(state: ISettingState, action: PayloadAction<IItem | null>) {
      state.currentItem = action.payload
    },
    updateCurrentItem(state: ISettingState, action: PayloadAction<Partial<IItem>>) {
      state.currentItem = {
        ...(state.currentItem as IItem),
        ...action.payload,
      }
    },
  },
})

export const settingAction = settingReducer.actions
