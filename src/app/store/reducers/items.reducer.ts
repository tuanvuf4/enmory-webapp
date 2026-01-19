import { IHttpResponse } from '@/app/models/http.model'
import { IItem } from '@/app/models/item.model'
import { initSearchFormItem } from '@/app/services'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { itemAsync } from '../asyncActions/item.async'

export interface IItemsState {
  listItem: IItem[]
}

export const initialState: IItemsState = {
  listItem: [],
}

export const itemsReducer = createSlice({
  name: 'items',
  initialState,
  reducers: {
    setListItem(state: IItemsState, action: PayloadAction<IItem[]>) {
      state.listItem = [...action.payload]
    },
    push(state: IItemsState, action: PayloadAction<IItem>) {
      state.listItem = [...state.listItem, action.payload]
    },
    slice(state: IItemsState) {
      state.listItem = state.listItem.slice(0, -1) // remove last item
    },
    unShift(state: IItemsState, action: PayloadAction<IItem>) {
      state.listItem = [action.payload, ...state.listItem]
    },
    update(state: IItemsState, action: PayloadAction<Partial<IItem>>) {
      state.listItem = state.listItem.map((item) => {
        if (item.id === action.payload.id) {
          return {
            ...item,
            ...action.payload,
          }
        }
        return item
      })
    },
    replace(state: IItemsState, action: PayloadAction<IItem>) {
      state.listItem = state.listItem.map((item) => {
        if (item.id === action.payload.id) {
          return action.payload
        }
        return item
      })
    },
    addItems(state: IItemsState, action: PayloadAction<IItem[]>) {
      state.listItem = [...state.listItem, ...action.payload]
    },
    removeItem(state: IItemsState, action: PayloadAction<string>) {
      state.listItem = state.listItem.filter((item) => item.id !== action.payload)
    },
    resetQuery(state: IItemsState) {
      return {
        ...state,
        formSearchValue: {
          ...initSearchFormItem,
        },
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        itemAsync.fetchItems.fulfilled,
        (state: IItemsState, action: PayloadAction<IHttpResponse<IItem[]>>) => {
          state.listItem = action.payload.content || []
        },
      )
      .addCase(itemAsync.fetchItems.rejected, (state: IItemsState) => {
        state.listItem = []
      })
  },
})

export const itemAction = itemsReducer.actions
