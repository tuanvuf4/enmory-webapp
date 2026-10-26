import { IExample } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const getPinnedStorageKey = (uid?: string) => `enmory_pinned_example_ids${uid ? `_${uid}` : ''}`

const getInitialPinnedIds = (uid?: string): string[] => {
  try {
    const raw = localStorage.getItem(getPinnedStorageKey(uid))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

export interface ITranslationPracticeState {
  history: IExample[]
  currentIndex: number
  direction?: 'vi-en' | 'en-vi'
}

export interface IExampleState {
  list: IExample[]
  translate: IExample | null
  pinnedIds: string[]
  translationPractice: ITranslationPracticeState
}

export const initialState: IExampleState = {
  list: [],
  translate: null,
  pinnedIds: getInitialPinnedIds(),
  translationPractice: {
    history: [],
    currentIndex: 0,
    direction: 'vi-en',
  },
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

      // Also update matching examples in translationPractice.history if present
      if (state.translationPractice?.history?.length) {
        const updateMap = new Map(action.payload.map((ex) => [ex.id, ex]))
        state.translationPractice.history = state.translationPractice.history.map((ex) =>
          updateMap.has(ex.id) ? { ...ex, ...updateMap.get(ex.id)! } : ex,
        )
      }
    },
    remove(state: IExampleState, action: PayloadAction<string>) {
      state.list = state.list.filter((ex) => ex.id !== action.payload)
      if (state.translationPractice?.history?.length) {
        state.translationPractice.history = state.translationPractice.history.filter(
          (ex) => ex.id !== action.payload,
        )
        if (state.translationPractice.currentIndex >= state.translationPractice.history.length) {
          state.translationPractice.currentIndex = Math.max(
            0,
            state.translationPractice.history.length - 1,
          )
        }
      }
    },
    setTranslate(state: IExampleState, action: PayloadAction<IExample | null>) {
      state.translate = action.payload
    },
    loadPinnedIds(state: IExampleState, action: PayloadAction<string | undefined>) {
      state.pinnedIds = getInitialPinnedIds(action.payload)
    },
    togglePin(state: IExampleState, action: PayloadAction<{ id: string; uid?: string } | string>) {
      const id = typeof action.payload === 'string' ? action.payload : action.payload.id
      const uid = typeof action.payload === 'string' ? undefined : action.payload.uid
      if (!id) return

      if (state.pinnedIds.includes(id)) {
        state.pinnedIds = state.pinnedIds.filter((item) => item !== id)
      } else {
        state.pinnedIds = [id, ...state.pinnedIds]
      }

      try {
        localStorage.setItem(getPinnedStorageKey(uid), JSON.stringify(state.pinnedIds))
      } catch {}
    },
    unpinAll(state: IExampleState, action: PayloadAction<string | undefined>) {
      state.pinnedIds = []
      try {
        localStorage.setItem(getPinnedStorageKey(action.payload), JSON.stringify([]))
      } catch {}
    },
    setPracticeHistory(state: IExampleState, action: PayloadAction<IExample[]>) {
      if (!state.translationPractice) {
        state.translationPractice = { history: [], currentIndex: 0, direction: 'vi-en' }
      }
      state.translationPractice.history = action.payload
      state.translationPractice.currentIndex = Math.max(0, action.payload.length - 1)
    },
    addPracticeExample(state: IExampleState, action: PayloadAction<IExample>) {
      if (!state.translationPractice) {
        state.translationPractice = { history: [], currentIndex: 0, direction: 'vi-en' }
      }
      const newHistory = [...state.translationPractice.history, action.payload]
      // Limit to 50 items to keep storage lightweight
      state.translationPractice.history =
        newHistory.length > 50 ? newHistory.slice(newHistory.length - 50) : newHistory
      state.translationPractice.currentIndex = state.translationPractice.history.length - 1
    },
    setPracticeIndex(state: IExampleState, action: PayloadAction<number>) {
      if (!state.translationPractice) {
        state.translationPractice = { history: [], currentIndex: 0, direction: 'vi-en' }
      }
      const maxIdx = Math.max(0, state.translationPractice.history.length - 1)
      state.translationPractice.currentIndex = Math.max(0, Math.min(action.payload, maxIdx))
    },
    setPracticeDirection(state: IExampleState, action: PayloadAction<'vi-en' | 'en-vi'>) {
      if (!state.translationPractice) {
        state.translationPractice = { history: [], currentIndex: 0, direction: 'vi-en' }
      }
      state.translationPractice.direction = action.payload
    },
    resetPractice(state: IExampleState) {
      state.translationPractice = {
        history: [],
        currentIndex: 0,
        direction: 'vi-en',
      }
    },
    clear(state: IExampleState) {
      state.list = []
      state.translate = null
      state.translationPractice = {
        history: [],
        currentIndex: 0,
        direction: 'vi-en',
      }
    },
    reset(state: IExampleState) {
      state.list = []
      state.translate = null
      state.translationPractice = {
        history: [],
        currentIndex: 0,
        direction: 'vi-en',
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      const persistedPractice = action?.payload?.example?.translationPractice
      if (!persistedPractice && !state.translationPractice) {
        state.translationPractice = {
          history: [],
          currentIndex: 0,
          direction: 'vi-en',
        }
      }
    })
  },
})

export const exampleAction = exampleReducer.actions
