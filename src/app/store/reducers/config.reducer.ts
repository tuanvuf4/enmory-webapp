import { EViewMode, EViewPort } from '@/models/app.model'
import { IOption, ECategory, EType } from '@/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface IConfigState {
  isSidebarOpened: boolean
  drawer: boolean
  viewMode: EViewMode
  viewPort: EViewPort
  categories: IOption<string, ECategory>[]
  types: IOption<{ origin: string; abbr: string }, EType>[]
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
    setCategories(state: IConfigState, action: PayloadAction<IOption<string, ECategory>[]>) {
      state.categories = action.payload
    },
    setTypes(
      state: IConfigState,
      action: PayloadAction<IOption<{ origin: string; abbr: string }, EType>[]>,
    ) {
      state.types = action.payload
    },
    reset() {
      return initialState
    },
  },
})

export const configAction = configReducer.actions
