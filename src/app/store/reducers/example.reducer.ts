import { IExample } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const getPinnedStorageKey = (uid?: string) =>
  `enmory_pinned_example_ids${uid ? `_${uid}` : ''}`

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

export interface IExampleState {
  list: IExample[]
  translate: IExample | null
  pinnedIds: string[]
}

export const initialState: IExampleState = {
  list: [],
  translate: null,
  pinnedIds: getInitialPinnedIds(),
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
    remove(state: IExampleState, action: PayloadAction<string>) {
      state.list = state.list.filter((ex) => ex.id !== action.payload)
    },
    setTranslate(state: IExampleState, action: PayloadAction<IExample | null>) {
      state.translate = action.payload
    },
    loadPinnedIds(state: IExampleState, action: PayloadAction<string | undefined>) {
      state.pinnedIds = getInitialPinnedIds(action.payload)
    },
    togglePin(
      state: IExampleState,
      action: PayloadAction<{ id: string; uid?: string } | string>,
    ) {
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
    clear(state: IExampleState) {
      state.list = []
      state.translate = null
    },
    reset(state: IExampleState) {
      state.list = []
      state.translate = null
    },
  },
})

export const exampleAction = exampleReducer.actions
