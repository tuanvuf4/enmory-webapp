/**
 * useAuthInit Hook
 * Initializes authentication state and loads user configuration on app load using Firebase
 */

import { useEffect } from 'react'
import { useDispatch } from '@/core/hooks/redux'
import { checkAuthState } from '@/store/reducers/auth.reducer'
import { firebaseAuthService } from '@/services/firebase/authService'

export const useAuthInit = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    // Fetch user profile and configuration on initial load to reduce synchronization requests
    dispatch(checkAuthState() as any)

    // Listen to Firebase auth changes to keep configuration up to date
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      if (user) {
        dispatch(checkAuthState() as any)
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.set({ enmory_uid: user.uid, enmory_email: user.email })
        }
      } else {
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.remove(['enmory_uid', 'enmory_email'])
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [dispatch])
}
