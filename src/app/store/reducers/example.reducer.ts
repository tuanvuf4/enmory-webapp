import { IExample } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface IExampleState {
  list: IExample[]
}

export const initialState: IExampleState = {
  list: [],
}

export const exampleReducer = createSlice({
  name: 'example',
  initialState,
  reducers: {
    update(state: IExampleState, action: PayloadAction<IExample[]>) {
      state.list = action.payload
    },
    clear(state: IExampleState) {
      state.list = []
    },
  },
})

export const exampleAction = exampleReducer.actions
