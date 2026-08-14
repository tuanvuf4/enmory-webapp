import { EViewMode, EViewPort } from '@/models/app.model'
import { IOption, ECategory, EType } from '@/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { actionAsyncApp } from '../asyncActions'

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
  tags: IOption<string, string>[]
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
  tags: [],
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
    setTags(state: ISettingState, action: PayloadAction<IOption<string, string>[]>) {
      state.tags = action.payload
    },
    addTags(state: ISettingState, action: PayloadAction<string[]>) {
      const normalizedCurrent = new Map(
        state.tags.map((tag) => [String(tag.value).toLowerCase(), tag]),
      )

      action.payload
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => {
          const key = tag.toLowerCase()
          if (!normalizedCurrent.has(key)) {
            normalizedCurrent.set(key, {
              id: tag,
              label: tag,
              value: tag,
            })
          }
        })

      state.tags = Array.from(normalizedCurrent.values()).sort((a, b) =>
        String(a.value).localeCompare(String(b.value)),
      )
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
  extraReducers(builder) {
    builder.addCase(actionAsyncApp.fetchTags.fulfilled, (state, action) => {
      if (action.payload.isSuccess && action.payload.content) {
        state.tags = action.payload.content
      }
    })
  },
})

export const settingAction = settingReducer.actions
