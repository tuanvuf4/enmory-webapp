import { EViewMode, EViewPort } from '@/models/app.model'
import { IOption, ECategory, EType } from '@/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ISettingState {
  isSidebarOpened: boolean
  isShowSearchFormItem: boolean
  drawer: boolean
  loading: boolean
  viewMode: EViewMode
  viewPort: EViewPort
  trackIndex: number
  themeMode: 'light' | 'dark'
  categories: IOption<string, ECategory>[]
  types: IOption<{ origin: string; abbr: string }, EType>[]
}

export const initialState: ISettingState = {
  isSidebarOpened: false,
  isShowSearchFormItem: true,
  drawer: true,
  loading: false,
  viewMode: EViewMode.GRID,
  viewPort: EViewPort.XS,
  trackIndex: 0,
  themeMode: 'light',
  categories: [],
  types: [],
}

export const settingReducer = createSlice({
  name: 'setting',
  initialState,
  reducers: {
    showLoading(state: ISettingState) {
      state.loading = true
    },
    hideLoading(state: ISettingState) {
      state.loading = false
    },
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
    setTrackIndex(state: ISettingState, action: PayloadAction<number>) {
      state.trackIndex = action.payload
    },
    toggleTheme(state: ISettingState) {
      state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark'
    },
    reset() {
      return initialState
    },
  },
})

export const settingAction = settingReducer.actions
