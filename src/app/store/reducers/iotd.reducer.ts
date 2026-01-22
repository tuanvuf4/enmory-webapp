import { IItem, IIotd, ECategory } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { actionAsyncApp } from '../asyncActions'

export interface IIotdState {
  word: IIotd | null
  phrase: IIotd | null
  idiom: IIotd | null
  slang: IIotd | null
  collocation: IIotd | null
  sentence: IIotd | null
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
          if (iotd?.item?.id === action.payload.id) {
            state[key as keyof typeof state] = { ...iotd, item: action.payload } as IIotd<string[]>
          }
        }
      }
    },
    clearIotd(state: IIotdState, action: PayloadAction<ECategory>) {
      switch (action.payload) {
        case ECategory.WORD:
          state.word = null
          break

        case ECategory.PHRASE:
          state.phrase = null
          break

        case ECategory.IDIOM:
          state.idiom = null
          break

        case ECategory.SLANG:
          state.slang = null
          break

        case ECategory.COLLOCATION:
          state.collocation = null
          break

        case ECategory.SENTENCE:
          state.sentence = null
          break

        default:
          state.word = null
          break
      }
    },
    setIotd(state: IIotdState, action: PayloadAction<IIotd>) {
      const iotd = action.payload
      switch (iotd.item.catId) {
        case ECategory.WORD:
          state.word = iotd
          break

        case ECategory.PHRASE:
          state.phrase = iotd
          break

        case ECategory.IDIOM:
          state.idiom = iotd
          break

        case ECategory.SLANG:
          state.slang = iotd
          break

        case ECategory.COLLOCATION:
          state.collocation = iotd
          break

        case ECategory.SENTENCE:
          state.sentence = iotd
          break

        default:
          state.word = iotd
          break
      }
    },
    resetIotd() {
      return initialState
    },
  },
  extraReducers(builder) {
    builder.addCase(actionAsyncApp.fetchIotd.fulfilled, (state, action) => {
      if (action.payload.isSuccess && action.payload.content) {
        const iotd = action.payload.content
        switch (iotd.item?.catId) {
          case ECategory.WORD:
            state.word = iotd
            break

          case ECategory.PHRASE:
            state.phrase = iotd
            break

          case ECategory.IDIOM:
            state.idiom = iotd
            break

          case ECategory.SLANG:
            state.slang = iotd
            break

          case ECategory.COLLOCATION:
            state.collocation = iotd
            break

          case ECategory.SENTENCE:
            state.sentence = iotd
            break

          default:
            state.word = iotd
            break
        }
      }
    })
  },
})

export const iotdAction = iotdReducer.actions
