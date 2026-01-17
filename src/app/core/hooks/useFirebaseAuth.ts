import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from '@/core/hooks'
import { signInWithEmail, signInWithGoogle, registerWithEmail } from '@/store/reducers/auth.reducer'
import { authAction } from '@/store/reducers/auth.reducer'
import { ILogin, IUser } from '@/models/user.model'

interface UseFirebaseAuthOptions {
  onRegisterSuccess?: () => void
  redirectAfterSuccess?: boolean
}

export const useFirebaseAuth = (options: UseFirebaseAuthOptions = {}) => {
  const { onRegisterSuccess, redirectAfterSuccess = true } = options

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading: firebaseLoading, error: firebaseError } = useSelector((state) => state.auth)

  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false)
  const [registerMsg, setRegisterMsg] = useState<string>('')

  /**
   * Login with email and password using Firebase
   */
  const loginWithEmail = async (email: string, password: string) => {
    setErrorMsg('')
    try {
      const result = await dispatch(signInWithEmail({ email, password }) as any)

      if (result.payload?.user) {
        dispatch(authAction.setGoogleAuth(result.payload.user))
        if (redirectAfterSuccess) {
          navigate('/')
        }
        return { success: true, user: result.payload.user }
      } else if (result.error) {
        const error = result.error.message || 'Login failed. Please check your credentials.'
        setErrorMsg(error)
        return { success: false, error }
      }
    } catch (error: any) {
      console.error('Firebase email login error:', error)
      const errorMessage = error.message || 'Login failed. Please try again.'
      setErrorMsg(errorMessage)
      return { success: false, error: errorMessage }
    }
    return { success: false, error: 'Unknown error occurred' }
  }

  /**
   * Login with Google using Firebase
   */
  const loginWithGoogle = async () => {
    setErrorMsg('')
    try {
      const result = await dispatch(signInWithGoogle() as any)

      if (result.payload?.user) {
        dispatch(authAction.setGoogleAuth(result.payload.user))

        // Firebase authentication successful
        if (redirectAfterSuccess) {
          navigate('/')
        }
        return { success: true, user: result.payload.user }
      } else if (result.payload?.error) {
        const error = result.payload.error
        setErrorMsg(error)
        return { success: false, error }
      }
    } catch (error: any) {
      console.error('Google login error:', error)
      const errorMessage = error.message || 'Google login failed. Please try again.'
      setErrorMsg(errorMessage)
      return { success: false, error: errorMessage }
    }
    return { success: false, error: 'Unknown error occurred' }
  }

  /**
   * Login with Firebase email authentication
   */
  const login = async (data: ILogin) => {
    // Use Firebase email authentication
    return await loginWithEmail(data.username, data.password)
  }

  /**
   * Register with email and password using Firebase
   */
  const registerWithEmailAndPassword = async (
    email: string,
    password: string,
    userData?: {
      firstName?: string
      lastName?: string
      displayName?: string
      photoURL?: string
      username?: string
    },
  ) => {
    setErrorMsg('')

    try {
      const result = await dispatch(
        registerWithEmail({
          email,
          password,
          userData: {
            firstName: userData?.firstName || '',
            lastName: userData?.lastName || '',
            displayName:
              userData?.displayName ||
              `${userData?.firstName} ${userData?.lastName}`.trim() ||
              userData?.username ||
              '',
            photoURL: userData?.photoURL || '',
          },
        }) as any,
      )

      if (result.payload?.user) {
        setIsRegistered(true)
        setRegisterSuccess(true)
        setRegisterMsg('Registration successful! Redirecting to home...')

        if (onRegisterSuccess) {
          onRegisterSuccess()
        }

        // Redirect after a short delay
        if (redirectAfterSuccess) {
          setTimeout(() => {
            navigate('/')
          }, 2000)
        }

        return { success: true, user: result.payload.user }
      } else if (result.error) {
        const error = result.error.message || 'Registration failed. Please try again.'
        setErrorMsg(error)
        return { success: false, error }
      } else {
        const error = 'Registration failed. Please try again.'
        setErrorMsg(error)
        return { success: false, error }
      }
    } catch (error: any) {
      console.error('Firebase registration error:', error)
      const errorMessage = error.message || 'Registration failed. Please try again.'
      setErrorMsg(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Register with Firebase email and password
   */
  const register = async (data: IUser) => {
    setErrorMsg('')

    // Validate password match
    if (data.password !== data.cpassword) {
      const error = 'Passwords do not match'
      setErrorMsg(error)
      return { success: false, error }
    }

    // Validate email
    if (!data.email || !data.email.includes('@')) {
      const error = 'Please enter a valid email address'
      setErrorMsg(error)
      return { success: false, error }
    }

    // Validate password length
    if (!data.password || data.password.length < 6) {
      const error = 'Password must be at least 6 characters'
      setErrorMsg(error)
      return { success: false, error }
    }

    // Use Firebase registration
    return await registerWithEmailAndPassword(data.email, data.password, {
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      photoURL: data.avatar,
    })
  }

  /**
   * Clear error message
   */
  const clearError = () => {
    setErrorMsg('')
  }

  return {
    // Methods
    login,
    loginWithEmail,
    loginWithGoogle,
    register,
    registerWithEmailAndPassword,
    clearError,

    // State
    errorMsg,
    isLoading: firebaseLoading,
    firebaseError,
    isRegistered,
    registerSuccess,
    registerMsg,
    setIsRegistered,
    setRegisterSuccess,
    setRegisterMsg,
  }
}
