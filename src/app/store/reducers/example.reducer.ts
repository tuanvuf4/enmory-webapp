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
    batchUpdate(state: IExampleState, action: PayloadAction<IExample[]>) {
      // Create a map of existing examples by ID for fast lookup
      const existingMap = new Map(state.list.map((ex) => [ex.id, ex]))

      // Update or add examples from the payload
      for (const example of action.payload) {
        existingMap.set(example.id, example)
      }

      // Convert back to array, preserving examples not in the payload
      state.list = Array.from(existingMap.values())
    },
    clear(state: IExampleState) {
      state.list = []
    },
  },
})

export const exampleAction = exampleReducer.actions
