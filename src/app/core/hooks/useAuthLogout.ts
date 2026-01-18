/**
 * useAuthLogout Hook
 * Handles complete logout from both Firebase and app state
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from './redux'
import { firebaseAuthService } from '@/services/firebase/authService'
import { authAction } from '@/store/reducers/auth.reducer'

export const useAuthLogout = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const logout = useCallback(async () => {
    try {
      // Sign out from Firebase
      if (firebaseAuthService.isAuthenticated()) {
        await firebaseAuthService.signOut()
      }

      // Clear app state
      dispatch(authAction.logOut())

      // Clear any stored auth data
      localStorage.removeItem('auth')
      localStorage.removeItem('user')

      // Redirect to login
      navigate('/Login')
    } catch (error) {
      console.error('[Auth Logout] Error during logout:', error)
      // Still redirect to login even if logout fails
      dispatch(authAction.logOut())
      navigate('/Login')
    }
  }, [dispatch, navigate])

  return { logout }
}
