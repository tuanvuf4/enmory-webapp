/**
 * useAuthInit Hook
 * Initializes authentication state on app load using Firebase
 */

import { useEffect } from 'react'
import { firebaseAuthService } from '@/services/firebase/authService'

export const useAuthInit = () => {
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check Firebase authentication state
        const firebaseUser = firebaseAuthService.getCurrentAuthUser()
        if (firebaseUser) {
          // console.log('[Auth Init] Firebase user found:', firebaseUser.email)
          // User is logged in via Firebase
          // The auth state will be set through Firebase auth listener
        }
      } catch (error) {
        console.error('[Auth Init] Error during initialization:', error)
      }
    }

    initAuth()
  }, [])
}
