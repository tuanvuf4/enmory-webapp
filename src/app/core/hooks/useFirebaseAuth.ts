import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from '@/core/hooks'
import { signInWithEmail, signInWithGoogle, registerWithEmail } from '@/store/reducers/auth.reducer'
import { authAction } from '@/store/reducers/auth.reducer'
import { ILogin, IUser } from '@/models/user.model'

interface UseFirebaseAuthOptions {
  onRegisterSuccess?: () => void
  onLoginSuccess?: (user: IUser) => void
  redirectAfterSuccess?: boolean
}

export const useFirebaseAuth = (options: UseFirebaseAuthOptions = {}) => {
  const { onRegisterSuccess, onLoginSuccess, redirectAfterSuccess = true } = options

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading: firebaseLoading, error: authError } = useSelector((state) => state.auth)

  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false)
  const [registerMsg, setRegisterMsg] = useState<string>('')

  /**
   * Login with email and password using Firebase
   */
  const loginWithEmail = async ({ email, password }: ILogin) => {
    setErrorMsg('')
    try {
      const result = await dispatch(signInWithEmail({ email, password }) as any)

      if (!result.error) {
        dispatch(authAction.setGoogleAuth(result.payload))
        if (redirectAfterSuccess) navigate('/')
        return { success: true, user: result.payload }
      } else {
        const message = result.error.message || 'Login failed. Please check your credentials.'
        if (result.payload.includes('auth/invalid-credential')) {
          const message =
            'Your account has already been registered. Please log in with your Google account. You can link your email account to your Google account in your profile settings.'
          setErrorMsg(message)
          return { success: false, message }
        }
        setErrorMsg(message)
        return { success: false, message }
      }
    } catch (error: any) {
      console.error('Firebase email login error:', error)
      const errorMessage = error.message || 'Login failed. Please try again.'
      setErrorMsg(errorMessage)
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

      if (result.payload?.uid) {
        dispatch(authAction.setGoogleAuth(result.payload.uid))
        onLoginSuccess?.(result.payload)

        // Firebase authentication successful
        if (redirectAfterSuccess) {
          navigate('/')
        }
        return { success: true, user: result.payload }
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
      displayName: data.displayName,
      photoURL: data.photoURL,
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
    loginWithEmail,
    loginWithGoogle,
    register,
    registerWithEmailAndPassword,
    clearError,

    // State
    errorMsg,
    isLoading: firebaseLoading,
    // firebaseError,
    authError,
    isRegistered,
    registerSuccess,
    registerMsg,
    setIsRegistered,
    setRegisterSuccess,
    setRegisterMsg,
  }
}
