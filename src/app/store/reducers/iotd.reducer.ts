import { IHttpResponse } from '@/app/models/http.model'
import { IItem, IIotd, ECategory } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { actionAsyncApp } from '../asyncActions/app.async'

export interface IIotdState {
  word: IItem | null
  phrase: IItem | null
  idiom: IItem | null
  slang: IItem | null
  collocation: IItem | null
  sentence: IItem | null
}

export const initialState: IIotdState = {
  word: null,
  phrase: null,
  idiom: null,
  slang: null,
  collocation: null,
  sentence: null,
}

export const iotdReducer = createSlice({
  name: 'iotd',
  initialState,
  reducers: {
    update(state: IIotdState, action: PayloadAction<IItem>) {
      for (const key in state) {
        if (Object.prototype.hasOwnProperty.call(state, key)) {
          const iotd = state[key as keyof typeof state]
          if (iotd?.id === action.payload.id) {
            state[key as keyof typeof state] = action.payload
          }
        }
      }
    },
    resetIotd() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      actionAsyncApp.fetchIotd.fulfilled,
      (state: IIotdState, action: PayloadAction<IHttpResponse<IIotd<string[]>>>) => {
        const { content } = action.payload
        switch (content.item.catId) {
          case ECategory.WORD:
            state.word = {
              ...state.word,
              ...content.item,
            }
            break

          case ECategory.PHRASE:
            state.phrase = {
              ...state.phrase,
              ...content.item,
            }

            break

          case ECategory.IDIOM:
            state.idiom = {
              ...state.idiom,
              ...content.item,
            }
            break

          case ECategory.SLANG:
            state.slang = {
              ...state.slang,
              ...content.item,
            }
            break

          case ECategory.COLLOCATION:
            state.collocation = {
              ...state.collocation,
              ...content.item,
            }
            break

          case ECategory.SENTENCE:
            state.sentence = {
              ...state.sentence,
              ...content.item,
            }
            break

          default:
            state.word = {
              ...state.word,
              ...content.item,
            }
            return
        }
      },
    )
  },
})

export const iotdAction = iotdReducer.actions
