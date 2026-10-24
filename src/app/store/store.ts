import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { PersistConfig, createMigrate, createTransform, persistReducer } from 'redux-persist'
import autoMergeLevel2 from 'redux-persist/es/stateReconciler/autoMergeLevel2'
import localStorage from 'redux-persist/lib/storage'
import { authReducer, IAuthState, initialState as initialAuthState } from './reducers/auth.reducer'
import {
  settingReducer,
  ISettingState,
  initialState as initialSettingState,
} from './reducers/setting.reducer'
import {
  IStudySet,
  studySetReducer,
  initialState as initialStudySet,
} from './reducers/studySet.reducer'
import { iotdReducer, IIotdState, initialState as initialIotdState } from './reducers/iotd.reducer'
import {
  IExampleState,
  exampleReducer,
  initialState as initialExampleState,
} from './reducers/example.reducer'
import {
  IListeningState,
  listeningReducer,
  initialState as initialListeningState,
} from './reducers/listening.reducer'

export interface IAppState {
  auth: IAuthState
  setting: ISettingState
  studySet: IStudySet
  iotd: IIotdState
  example: IExampleState
  listening: IListeningState
}

const initialState: IAppState = {
  auth: initialAuthState,
  setting: initialSettingState,
  studySet: initialStudySet,
  iotd: initialIotdState,
  example: initialExampleState,
  listening: initialListeningState,
}

const listeningTransform = createTransform(
  (inboundState: any) => {
    if (!inboundState) return inboundState
    return {
      ...inboundState,
      player: {
        ...inboundState.player,
        playing: false,
        seeking: false,
        seekTo: null,
      },
    }
  },
  (outboundState: any) => {
    if (!outboundState) return outboundState
    return {
      ...outboundState,
      player: {
        ...outboundState.player,
        playing: false,
        seeking: false,
        seekTo: null,
      },
    }
  },
  { whitelist: ['listening'] },
)

const persistConfig: PersistConfig<IAppState> = {
  version: 6,
  key: 'root',
  storage: localStorage,
  blacklist: [],
  stateReconciler: autoMergeLevel2,
  transforms: [listeningTransform],
  // transforms: [{ in: (es) => es, out: (es) => es }],
  migrate: createMigrate({
    2: () => ({
      ...initialState,
      _persist: {
        version: 3,
        rehydrated: true,
      },
    }),
  }),
  // transforms: [
  //   encryptTransform({
  //     secretKey: appConfig.localKeyEncode as string,
  //     onError: (error) => console.log('error: ', error),
  //   }),
  // ],
}

const rootReducers = combineReducers({
  auth: authReducer.reducer,
  setting: settingReducer.reducer,
  studySet: studySetReducer.reducer,
  iotd: iotdReducer.reducer,
  example: exampleReducer.reducer,
  listening: listeningReducer.reducer,
})

export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducers),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in the state
        ignoredActionPaths: ['payload.err', 'err'],
        ignoredPaths: ['err'],
      },
    }),
})

export type AppDispatch = typeof store.dispatch
