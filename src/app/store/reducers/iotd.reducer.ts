import { IItem, IIotd, ECategory } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface IIotdState {
  word: IIotd<string[]> | null
  phrase: IIotd<string[]> | null
  idiom: IIotd<string[]> | null
  slang: IIotd<string[]> | null
  collocation: IIotd<string[]> | null
  sentence: IIotd<string[]> | null
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
    setIotd(state: IIotdState, action: PayloadAction<IIotd<string[]>>) {
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
})

export const iotdAction = iotdReducer.actions
