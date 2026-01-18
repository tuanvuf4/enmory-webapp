import { EViewMode, EViewPort } from '@/models/app.model'
import { IHttpResponse } from '@/models/http.model'
import { IOption, ECategory, EType } from '@/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { actionAsyncApp } from '@/store/asyncActions/app.async'

export interface IConfigState {
  isSidebarOpened: boolean
  drawer: boolean
  viewMode: EViewMode
  viewPort: EViewPort
  categories: IOption<string, ECategory>[]
  types: IOption<string, EType>[]
}

export const initialState: IConfigState = {
  isSidebarOpened: false,
  drawer: true,
  viewMode: EViewMode.GRID,
  viewPort: EViewPort.XS,
  categories: [],
  types: [],
}

export const configReducer = createSlice({
  name: 'config',
  initialState,
  reducers: {
    toggleSidebar(state: IConfigState) {
      state.isSidebarOpened = !state.isSidebarOpened
    },
    toggleDrawer(state: IConfigState) {
      state.drawer = !state.drawer
    },
    setViewPort(state: IConfigState, action: PayloadAction<EViewPort>) {
      state.viewPort = action.payload
    },
    setViewMode(state: IConfigState, action: PayloadAction<EViewMode>) {
      state.viewMode = action.payload
    },
    reset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        actionAsyncApp.fetchCategories.fulfilled,
        (
          state: IConfigState,
          action: PayloadAction<IHttpResponse<IOption<string, ECategory>[]>>,
        ) => {
          state.categories = action.payload.content
        },
      )
      .addCase(actionAsyncApp.fetchCategories.rejected, (state: IConfigState) => {
        state.categories = []
      })
      .addCase(
        actionAsyncApp.fetchTypes.fulfilled,
        (state: IConfigState, action: PayloadAction<IHttpResponse<IOption<string, EType>[]>>) => {
          state.types = action.payload.content
        },
      )
      .addCase(actionAsyncApp.fetchTypes.rejected, (state: IConfigState) => {
        state.types = []
      })
  },
})

export const configAction = configReducer.actions
