/**
 * useAuthLogout Hook
 * Handles complete logout from both Firebase and app state
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from './redux'
import { firebaseAuthService } from '@/services/firebase/authService'
import { authAction } from '@/store/reducers/auth.reducer'
import { invalidateSearchIndex } from '@/services/localDb'

export const useAuthLogout = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const logout = useCallback(async () => {
    try {
      invalidateSearchIndex()

      // Sign out from Firebase
      if (firebaseAuthService.isAuthenticated()) {
        await firebaseAuthService.signOut()
      }

      // Clear app state
      dispatch(authAction.logOut())

      // Redirect to login
      navigate('/login')
    } catch (error) {
      console.error('[Auth Logout] Error during logout:', error)
      invalidateSearchIndex()
      // Still redirect to login even if logout fails
      dispatch(authAction.logOut())
      navigate('/login')
    }
  }, [dispatch, navigate])

  return { logout }
}
