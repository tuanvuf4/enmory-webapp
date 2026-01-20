import { IItem, IIotd, ECategory } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

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
    setIotd(state: IIotdState, action: PayloadAction<IIotd<string[]>>) {
      const { item } = action.payload
      switch (item.catId) {
        case ECategory.WORD:
          state.word = { ...state.word, ...item }
          break
        case ECategory.PHRASE:
          state.phrase = { ...state.phrase, ...item }
          break
        case ECategory.IDIOM:
          state.idiom = { ...state.idiom, ...item }
          break
        case ECategory.SLANG:
          state.slang = { ...state.slang, ...item }
          break
        case ECategory.COLLOCATION:
          state.collocation = { ...state.collocation, ...item }
          break
        case ECategory.SENTENCE:
          state.sentence = { ...state.sentence, ...item }
          break
        default:
          state.word = { ...state.word, ...item }
          break
      }
    },
    resetIotd() {
      return initialState
    },
  },
})

export const iotdAction = iotdReducer.actions
