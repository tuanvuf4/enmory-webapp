import { IItem, IIotd, IIotdDoc, ECategory } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { actionAsyncApp } from '../asyncActions'

export interface IIotdState {
  word: IIotdDoc | null
  phrase: IIotdDoc | null
  idiom: IIotdDoc | null
  slang: IIotdDoc | null
  collocation: IIotdDoc | null
  sentence: IIotdDoc | null
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
      const updatedItem = action.payload
      if (!updatedItem || !updatedItem.id) return

      const categoryKeys: (keyof IIotdState)[] = [
        'word',
        'phrase',
        'idiom',
        'slang',
        'collocation',
        'sentence',
      ]

      for (const key of categoryKeys) {
        const iotd = state[key]
        if (iotd) {
          const currentItemId = iotd.itemId || (iotd as any).item?.id
          if (currentItemId === updatedItem.id) {
            if (
              updatedItem.catId &&
              iotd.catId &&
              Number(updatedItem.catId) !== Number(iotd.catId)
            ) {
              state[key] = null
            } else {
              iotd.item = updatedItem
              iotd.itemId = updatedItem.id
              if (updatedItem.catId) iotd.catId = updatedItem.catId
            }
          }
        }
      }
    },
    removeItem(state: IIotdState, action: PayloadAction<string>) {
      const id = action.payload
      if (!id) return

      const categoryKeys: (keyof IIotdState)[] = [
        'word',
        'phrase',
        'idiom',
        'slang',
        'collocation',
        'sentence',
      ]

      for (const key of categoryKeys) {
        const iotd = state[key]
        if (iotd) {
          const currentItemId = iotd.itemId || (iotd as any).item?.id
          if (currentItemId === id) {
            state[key] = null
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
    setIotd(state: IIotdState, action: PayloadAction<IIotdDoc | IIotd>) {
      const payload = action.payload
      const targetCatId = payload.catId ?? (payload as any).item?.catId
      const targetItemId = payload.itemId ?? (payload as any).item?.id
      const iotdDoc: IIotdDoc = {
        id: payload.id,
        itemId: targetItemId,
        uid: payload.uid,
        catId: targetCatId,
        first_of_date: payload.first_of_date,
        last_of_date: payload.last_of_date,
        created_date: payload.created_date,
        item: (payload as any).item,
      }

      switch (targetCatId) {
        case ECategory.WORD:
          state.word = iotdDoc
          break

        case ECategory.PHRASE:
          state.phrase = iotdDoc
          break

        case ECategory.IDIOM:
          state.idiom = iotdDoc
          break

        case ECategory.SLANG:
          state.slang = iotdDoc
          break

        case ECategory.COLLOCATION:
          state.collocation = iotdDoc
          break

        case ECategory.SENTENCE:
          state.sentence = iotdDoc
          break

        default:
          state.word = iotdDoc
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
        const targetCatId = iotd.catId ?? iotd.item?.catId
        const targetItemId = iotd.itemId ?? iotd.item?.id
        const iotdDoc: IIotdDoc = {
          id: iotd.id,
          itemId: targetItemId,
          uid: iotd.uid,
          catId: targetCatId,
          first_of_date: iotd.first_of_date,
          last_of_date: iotd.last_of_date,
          created_date: iotd.created_date,
          item: iotd.item,
        }

        switch (targetCatId) {
          case ECategory.WORD:
            state.word = iotdDoc
            break

          case ECategory.PHRASE:
            state.phrase = iotdDoc
            break

          case ECategory.IDIOM:
            state.idiom = iotdDoc
            break

          case ECategory.SLANG:
            state.slang = iotdDoc
            break

          case ECategory.COLLOCATION:
            state.collocation = iotdDoc
            break

          case ECategory.SENTENCE:
            state.sentence = iotdDoc
            break

          default:
            state.word = iotdDoc
            break
        }
      }
    })
  },
})

export const iotdAction = iotdReducer.actions
