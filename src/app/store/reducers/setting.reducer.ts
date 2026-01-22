import { EViewMode, EViewPort } from '@/models/app.model'
import { IOption, ECategory, EType } from '@/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ISettingState {
  isSidebarOpened: boolean
  isShowSearchFormItem: boolean
  drawer: boolean
  viewMode: EViewMode
  viewPort: EViewPort
  categories: IOption<string, ECategory>[]
  types: IOption<{ origin: string; abbr: string }, EType>[]
}

export const initialState: ISettingState = {
  isSidebarOpened: false,
  isShowSearchFormItem: false,
  drawer: true,
  viewMode: EViewMode.GRID,
  viewPort: EViewPort.XS,
  categories: [],
  types: [],
}

export const settingReducer = createSlice({
  name: 'setting',
  initialState,
  reducers: {
    toggleSidebar(state: ISettingState) {
      state.isSidebarOpened = !state.isSidebarOpened
    },
    toggleDrawer(state: ISettingState) {
      state.drawer = !state.drawer
    },
    toggleSearchFormItem(state: ISettingState) {
      state.isShowSearchFormItem = !state.isShowSearchFormItem
    },
    setViewPort(state: ISettingState, action: PayloadAction<EViewPort>) {
      state.viewPort = action.payload
    },
    setViewMode(state: ISettingState, action: PayloadAction<EViewMode>) {
      state.viewMode = action.payload
    },
    setCategories(state: ISettingState, action: PayloadAction<IOption<string, ECategory>[]>) {
      state.categories = action.payload
    },
    setTypes(
      state: ISettingState,
      action: PayloadAction<IOption<{ origin: string; abbr: string }, EType>[]>,
    ) {
      state.types = action.payload
    },
    reset() {
      return initialState
    },
  },
})

export const settingAction = settingReducer.actions
