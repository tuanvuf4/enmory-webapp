import { IFormSearchEx } from '@/models/formSearch.model'
import { IHttpResponse } from '@/models/http.model'
import { IExample } from '@/models/item.model'
import { IPagination } from '@/models/pagination.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { exampleAsync } from '@/store/async/example.async'
import { initSearchFormEx } from '@/services/index'

export interface IExampleState {
  selectedExample: IExample | null
  examples: IExample[]
  randomExamples: IExample[]
  formSearchQuery: IFormSearchEx
  pagination: IPagination
  currentEditting: IExample
}

export const initialState: IExampleState = {
  selectedExample: {
    original: '',
    translation: '',
  },
  examples: [],
  randomExamples: [],
  pagination: {
    page: 0,
    size: 20,
    total: 0,
    totalPage: 0,
  },
  formSearchQuery: initSearchFormEx,
  currentEditting: {
    id: -1,
    original: '',
    translation: '',
    note: '',
  },
}

export const exampleReducer = createSlice({
  name: 'example',
  initialState,
  reducers: {
    reset() {
      return initialState
    },
    setSelectedExample(state: IExampleState, action: PayloadAction<IExample | null>) {
      state.selectedExample = action.payload
    },
    setExample(state: IExampleState, action: PayloadAction<IExample[]>) {
      state.examples = action.payload
    },
    setCurrentEditting(state: IExampleState, action: PayloadAction<IExample>) {
      state.currentEditting = action.payload
    },
    updateCurrentEditting(state: IExampleState, action: PayloadAction<Partial<IExample>>) {
      state.currentEditting = {
        ...state.currentEditting,
        ...action.payload,
      }
    },
    updateRandomExamples(state: IExampleState, action: PayloadAction<IExample>) {
      state.randomExamples = [
        ...state.randomExamples.map((item) => {
          if (item.id === action.payload.id) return action.payload
          return item
        }),
      ]
    },
    updateExamples(state: IExampleState, action: PayloadAction<IExample>) {
      state.examples = [
        ...state.examples.map((item) => {
          if (item.id === action.payload.id) return action.payload
          return item
        }),
      ]
    },
    filterExamples(state: IExampleState, action: PayloadAction<IExample>) {
      state.examples = [...state.examples.filter((item) => item.id !== action.payload.id)]
    },
    filterRandomExamples(state: IExampleState, action: PayloadAction<IExample>) {
      state.randomExamples = [
        ...state.randomExamples.filter((item) => item.id !== action.payload.id),
      ]
    },
    updatePagination(state: IExampleState, action: PayloadAction<Partial<IPagination>>) {
      state.pagination = {
        ...state.pagination,
        ...action.payload,
      }
    },
    updateSearchFormValue(state: IExampleState, action: PayloadAction<Partial<IFormSearchEx>>) {
      state.formSearchQuery = {
        ...state.formSearchQuery,
        ...action.payload,
      }
    },
    resetQuery(state: IExampleState) {
      return {
        ...state,
        formSearchValue: {
          ...initSearchFormEx,
        },
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        exampleAsync.fetchRandomExample.fulfilled,
        (state: IExampleState, action: PayloadAction<IHttpResponse<IExample[]>>) => {
          state.randomExamples = action.payload.content
        },
      )
      .addCase(exampleAsync.fetchRandomExample.rejected, (state: IExampleState) => {
        state.randomExamples = []
      })
      .addCase(
        exampleAsync.fetchExamples.fulfilled,
        (state: IExampleState, action: PayloadAction<IHttpResponse<IExample[]>>) => {
          state.examples = action.payload.content
          state.pagination = {
            ...state.pagination,
            ...action.payload.paging,
          }
        },
      )
      .addCase(exampleAsync.fetchExamples.rejected, (state: IExampleState) => {
        state.examples = []
      })
  },
})

export const exampleAction = exampleReducer.actions
