import { EMediaSrc } from "@/app/models/dictation.model"
import { IHttpResponse } from "@/app/models/http.model"
import { ITracks } from "@/app/models/media.model"
import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { actionAsyncMedia } from "@/store/async/media.async"

export interface IMediaState {
  list: ITracks[]
  current: number
  currentUpdating: number
  isPlaying: boolean
  mediaSrc: EMediaSrc
  isUpdating: boolean
}

export const initialState: IMediaState = {
  list: [],
  current: -1,
  currentUpdating: -1,
  isPlaying: false,
  mediaSrc: EMediaSrc.EXTERNAL,
  isUpdating: false,
}

export const mediaReducer = createSlice({
  name: 'media',
  initialState,
  reducers: {
    reset() {
      return initialState
    },
    setCurrent(state: IMediaState, action: PayloadAction<number>) {
      state.current = action.payload
    },
    add(state: IMediaState, action: PayloadAction<ITracks>) {
      state.list = [...state.list, { ...action.payload }]
    },
    remove(state: IMediaState, action: PayloadAction<number>) {
      const rmIdx = state.list.findIndex((item) => item.id === action.payload)
      if (rmIdx === 0) {
        state.current = 0
      } else if (rmIdx <= state.current) {
        state.current = state.current - 1
      }
      state.list = [...state.list.filter((item) => item.id !== action.payload)]
    },
    update(state: IMediaState, action: PayloadAction<ITracks>) {
      state.list = [
        ...state.list.map((item) => {
          if (item.id !== action.payload.id) return action.payload
          return item
        }),
      ]
    },
    play(state: IMediaState, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload
    },
    setMeadiaSrc(state: IMediaState, action: PayloadAction<EMediaSrc>) {
      state.mediaSrc = action.payload
    },
    setUpdating(state: IMediaState, action: PayloadAction<boolean>) {
      state.isUpdating = action.payload
    },
    setCurrentUpdating(state: IMediaState, action: PayloadAction<number>) {
      state.currentUpdating = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        actionAsyncMedia.fetchMedias.fulfilled,
        (state: IMediaState, action: PayloadAction<IHttpResponse<ITracks[]>>) => {
          state.list = action.payload.content
          action.payload.content.length === 0 ? (state.current = -1) : (state.current = 0)
        },
      )
      .addCase(actionAsyncMedia.fetchMedias.rejected, (state: IMediaState) => {
        state.list = []
      })
  },
})

export const mediaAction = mediaReducer.actions
