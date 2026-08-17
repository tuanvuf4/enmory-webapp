import { IMediaForm, ITracks } from '@/models/media.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface PlayerState {
  src?: string
  pip: boolean
  playing: boolean
  controls: boolean
  light: boolean
  volume: number
  muted: boolean
  played: number
  loaded: number
  duration: number
  playbackRate: number
  loop: boolean
  seeking: boolean
  loadedSeconds: number
  playedSeconds: number
  seekTo: number | null
}

export interface IListeningState {
  currentTrack: IMediaForm | null
  showPlayer: boolean
  tracks: ITracks[]
  player: PlayerState
}

export const initialState: IListeningState = {
  currentTrack: null,
  showPlayer: true,
  tracks: [],
  player: {
    src: undefined,
    pip: false,
    playing: false,
    controls: true,
    light: false,
    volume: 1,
    muted: false,
    played: 0,
    loaded: 0,
    duration: 0,
    playbackRate: 1.0,
    loop: false,
    seeking: false,
    loadedSeconds: 0,
    playedSeconds: 0,
    seekTo: null,
  },
}

export const listeningReducer = createSlice({
  name: 'listening',
  initialState,
  reducers: {
    setCurrentTrack(state: IListeningState, action: PayloadAction<IMediaForm>) {
      state.currentTrack = action.payload
    },
    clearCurrentTrack(state: IListeningState) {
      state.currentTrack = null
    },
    setTracks(state: IListeningState, action: PayloadAction<ITracks[]>) {
      state.tracks = action.payload
    },
    clearTracks(state: IListeningState) {
      state.tracks = []
    },
    addTrack(state: IListeningState, action: PayloadAction<ITracks>) {
      state.tracks = [action.payload, ...state.tracks]
    },
    updateTrack(state: IListeningState, action: PayloadAction<ITracks>) {
      state.tracks = state.tracks.map((t) => (t.id === action.payload.id ? action.payload : t))
    },
    removeTrack(state: IListeningState, action: PayloadAction<number>) {
      state.tracks = state.tracks.filter((t) => t.id !== action.payload)
    },
    updatePlayer(state: IListeningState, action: PayloadAction<Partial<PlayerState>>) {
      state.player = { ...state.player, ...action.payload }
    },
    resetPlayer: {
      reducer(state: IListeningState, action: PayloadAction<Partial<PlayerState> | undefined>) {
        state.player = { ...initialState.player, ...(action.payload || {}) }
      },
      prepare(payload?: Partial<PlayerState>) {
        return { payload }
      },
    },
    toggleShowPlayer(state: IListeningState) {
      state.showPlayer = !state.showPlayer
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state) => {
      if (state?.player) {
        state.player.playing = false
      }
    })
  },
})

export const listeningAction = listeningReducer.actions
