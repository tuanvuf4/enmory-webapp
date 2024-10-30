import { useDispatch as useReduxDispatch, useSelector as useReduxSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import { AppDispatch, IAppState } from '@/store/store'

// Use throughout your app instead of plain `useAppDispatch` and `useAppSelector`
export const useAppDispatch: () => AppDispatch = useReduxDispatch
export const useAppSelector: TypedUseSelectorHook<IAppState> = useReduxSelector
