/**
 * useAuthInit Hook
 * Initializes authentication state and loads user configuration on app load using Firebase
 */

import { useEffect } from 'react'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { checkAuthState } from '@/store/reducers/auth.reducer'
import { firebaseAuthService } from '@/services/firebase/authService'
import { useQueryClient } from '@tanstack/react-query'
import { checklistKeys } from './useChecklist'
import {
  setUserDefaultAiModel,
  setUserDefaultTtsModel,
  setUserDefaultTtsVoice,
  TGeminiModel,
  TGeminiTtsModel,
  TGeminiVoice,
} from '@/services/gemini'

export const useAuthInit = () => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const userConfig = useSelector((state) => state.auth.user?.configuration)

  useEffect(() => {
    if (!userConfig) return
    if (userConfig.defaultAiModel) {
      setUserDefaultAiModel(userConfig.defaultAiModel as TGeminiModel)
    }
    if (userConfig.defaultTtsModel) {
      setUserDefaultTtsModel(userConfig.defaultTtsModel as TGeminiTtsModel)
    }
    if (userConfig.defaultTtsVoice) {
      setUserDefaultTtsVoice(userConfig.defaultTtsVoice as TGeminiVoice)
    }
  }, [userConfig?.defaultAiModel, userConfig?.defaultTtsModel, userConfig?.defaultTtsVoice])

  useEffect(() => {
    // Fetch user profile and configuration on initial load to reduce synchronization requests
    dispatch(checkAuthState() as any)

    // Listen to Firebase auth changes to keep configuration up to date
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      if (user) {
        dispatch(checkAuthState() as any)
        queryClient.invalidateQueries({ queryKey: checklistKeys.all })
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.set({ enmory_uid: user.uid, enmory_email: user.email })
        }
      } else {
        queryClient.setQueryData(checklistKeys.all, [])
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.remove(['enmory_uid', 'enmory_email'])
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [dispatch, queryClient])
}
