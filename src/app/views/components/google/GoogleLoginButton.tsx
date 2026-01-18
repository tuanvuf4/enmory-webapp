/**
 * Google Login Component
 * Handles Google Sign-In button and authentication flow
 */

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { signInWithGoogle, checkAuthState } from '../../../store/reducers/auth.reducer'
import { appConfig } from '../../../config'
import { IAppState } from '../../../store'

interface GoogleLoginButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  size?: 'large' | 'medium' | 'small'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  width?: string | number
  locale?: string
  className?: string
}

/**
 * Google Login Button Component
 * Renders a Google Sign-In button using @react-oauth/google
 */
export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  size = 'medium',
  theme = 'outline',
  text = 'signin_with',
  width = '100%',
  locale = 'en',
  className = '',
}) => {
  const dispatch = useDispatch()
  const { isLoading, error } = useSelector((state: IAppState) => state.auth)

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    try {
      // Dispatch sign in with Google
      const result = await dispatch(signInWithGoogle() as any)

      if (result.payload) {
        onSuccess?.()
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in with Google'
      onError?.(errorMessage)
    }
  }

  const handleGoogleLoginError = () => {
    const errorMessage = 'Failed to sign in with Google'
    onError?.(errorMessage)
  }

  if (!appConfig.googleAuth?.client_id) {
    return (
      <div className={`text-red-500 text-sm p-4 rounded bg-red-50 ${className}`}>
        Google authentication is not configured. Please check your environment variables.
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={appConfig.googleAuth.client_id}>
      <div className={`flex justify-center ${className}`}>
        <div
          style={{
            width,
            opacity: isLoading ? 0.6 : 1,
            pointerEvents: isLoading ? 'none' : 'auto',
          }}
        >
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
            size={size}
            theme={theme}
            text={text}
            width={width}
            locale={locale}
          />
        </div>
      </div>
      {error && <div className={`text-red-500 text-sm mt-2 text-center ${className}`}>{error}</div>}
    </GoogleOAuthProvider>
  )
}

/**
 * Auth State Listener Hook
 * Listens for authentication state changes on app startup
 */
export const useAuthStateListener = () => {
  const dispatch = useDispatch()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check auth state on mount
    dispatch(checkAuthState() as any).finally(() => {
      setIsInitialized(true)
    })
  }, [dispatch])

  return { isInitialized }
}

/**
 * Protected Route Component
 * Wraps components that require authentication
 */
interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredRole?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback = <LoginPage />,
  requiredRole,
}) => {
  const { user, isLoading } = useSelector((state: IAppState) => state.auth)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    )
  }

  if (!user) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Login Page Component
 * Full page login interface with Google Sign-In
 */
export const LoginPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-2xl p-8 w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Enmory</h1>
          <p className='text-gray-600'>Learn and remember with ease</p>
        </div>

        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-gray-900 mb-4 text-center'>
            Sign In to Your Account
          </h2>

          <GoogleLoginButton
            onSuccess={() => {
              // Redirect to dashboard on success
              window.location.href = '/dashboard'
            }}
            onError={(error) => {
              console.error('Login error:', error)
            }}
            size='large'
            theme='filled_blue'
            text='signin_with'
            width='100%'
          />
        </div>

        <div className='text-center'>
          <p className='text-sm text-gray-500'>
            By signing in, you agree to our{' '}
            <a href='/terms' className='text-blue-600 hover:underline'>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href='/privacy' className='text-blue-600 hover:underline'>
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * User Profile Menu Component
 * Shows user info and logout option
 */
interface UserProfileMenuProps {
  className?: string
  onLogout?: () => void
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ className = '', onLogout }) => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: IAppState) => state.auth)
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    const { signOutUser } = await import('../../../store/reducers/auth.reducer')
    await dispatch(signOutUser() as any)
    onLogout?.()
  }

  if (!user) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition'
      >
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className='w-8 h-8 rounded-full'
          />
        )}
        <div className='text-left hidden sm:block'>
          <p className='text-sm font-medium text-gray-900'>{user.displayName || 'User'}</p>
          <p className='text-xs text-gray-500'>{user.email}</p>
        </div>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50'>
          <a href='/Profile' className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'>
            View Profile
          </a>
          <a href='/settings' className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'>
            Settings
          </a>
          <hr className='my-2' />
          <button
            onClick={handleLogout}
            className='w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50'
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default GoogleLoginButton
