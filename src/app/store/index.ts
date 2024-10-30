import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { PersistConfig, PersistedState, createMigrate, persistReducer } from 'redux-persist'
import autoMergeLevel2 from 'redux-persist/es/stateReconciler/autoMergeLevel2'
import localStorage from 'redux-persist/lib/storage'
import thunk from 'redux-thunk'
import { appConfig } from 'src/app/config/appConfig'
import { authReducer, IAuthState, initialState as initialAuthState } from './reducers/auth.reducer'
import {
  configReducer,
  IConfigState,
  initialState as initialConfigState,
} from './reducers/config.reducer'
import {
  itemsReducer,
  IItemsState,
  initialState as initialItemsState,
} from './reducers/items.reducer'
import {
  IStudySet,
  studySetReducer,
  initialState as initialStudySet,
} from './reducers/studySet.reducer'
import {
  settingReducer,
  ISettingState,
  initialState as initialSettingState,
} from './reducers/setting.reducer'
import { iotdReducer, IIotdState, initialState as initialIotdState } from './reducers/iotd.reducer'
import {
  mediaReducer,
  IMediaState,
  initialState as initialMediaState,
} from './reducers/media.reducer'
import {
  IExampleState,
  exampleReducer,
  initialState as initialExampleState,
} from './reducers/example.reducer'

export interface IAppState {
  auth: IAuthState
  items: IItemsState
  config: IConfigState
  setting: ISettingState
  studySet: IStudySet
  iotd: IIotdState
  media: IMediaState
  example: IExampleState
}

const initialState: IAppState = {
  auth: initialAuthState,
  items: initialItemsState,
  config: initialConfigState,
  setting: initialSettingState,
  studySet: initialStudySet,
  iotd: initialIotdState,
  media: initialMediaState,
  example: initialExampleState,
}

const persistConfig: PersistConfig<IAppState> = {
  version: 6,
  key: 'root',
  storage: localStorage,
  blacklist: ['items', 'setting', 'media', 'example', 'iotd'],
  stateReconciler: autoMergeLevel2,
  // transforms: [{ in: (es) => es, out: (es) => es }],
  migrate: createMigrate({
    2: (state: PersistedState) => ({
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
  config: configReducer.reducer,
  items: itemsReducer.reducer,
  setting: settingReducer.reducer,
  studySet: studySetReducer.reducer,
  iotd: iotdReducer.reducer,
  media: mediaReducer.reducer,
  example: exampleReducer.reducer,
})

export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducers),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(thunk),
})

export type AppDispatch = typeof store.dispatch
