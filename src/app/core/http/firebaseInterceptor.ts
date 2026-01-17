/**
 * Firebase Token Interceptor
 * Automatically attaches Firebase ID token to API requests
 */

import { axiosInstance } from './httpCore'
import { firebaseAuthService } from '@/services/firebase/authService'

/**
 * Initialize Firebase interceptor for automatic token injection
 */
export const initializeFirebaseInterceptor = () => {
  // Request interceptor to add Firebase token
  axiosInstance.interceptors.request.use(
    async (config) => {
      try {
        // Get current Firebase ID token
        const token = await firebaseAuthService.getIdToken()

        if (token) {
          // Add token to Authorization header
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.warn('[Firebase Interceptor] Failed to get Firebase token:', error)
      }

      return config
    },
    (error) => Promise.reject(error),
  )

  // Response interceptor to handle 401 unauthorized
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        console.warn('[Firebase Interceptor] Unauthorized - token may be expired')
        // Token might be expired, Firebase should auto-refresh
        // If we get here, user should re-authenticate
      }
      return Promise.reject(error)
    },
  )
}
