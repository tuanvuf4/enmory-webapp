import { IHttpResponse } from '@/models/http.model'
import { ILogin, ILoginResponse, IUser } from '@/models/user.model'
import { firebaseAuthService } from '@/services/firebase/firebaseAuth.service'
import { db } from '@/config/firebaseConfig'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'

/**
 * Get Google user info from Firebase Auth user
 * Note: Firebase handles OAuth tokens automatically
 */
const getGoogleUserInfo = async (accessToken: string) => {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await response.json()
  } catch (error) {
    console.error('Error getting Google user info:', error)
    throw error
  }
}

/**
 * Login with email and password
 */
const login = async (user: ILogin): Promise<IHttpResponse<ILoginResponse>> => {
  try {
    const userCredential = await firebaseAuthService.login(user.username, user.password)
    const idToken = await userCredential.user.getIdToken()

    return {
      isSuccess: true,
      message: 'Login successful',
      content: {
        access_token: idToken,
        expired_in: 3600,
        refresh_token: userCredential.user.refreshToken || '',
        token_type: 'Bearer',
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

/**
 * Register a new user
 */
const register = async (user: IUser): Promise<IHttpResponse<boolean>> => {
  try {
    // Create auth user
    const userCredential = await firebaseAuthService.register(user.email, user.password)

    // Create user document in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid)
    const userData: Partial<IUser> = {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      sex: user.sex,
      avatar: user.avatar,
      phoneNumber: user.phoneNumber,
      status: true,
      is_active: true,
      created_date: Timestamp.now().toMillis(),
      last_active: Timestamp.now().toMillis(),
      configuration: user.configuration,
    }

    await setDoc(userDocRef, userData)

    return {
      isSuccess: true,
      message: 'Registration successful',
      content: true,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

/**
 * Refresh token
 * Note: Firebase handles token refresh automatically
 */
const refreshToken = async (refreshToken: string): Promise<IHttpResponse<ILoginResponse>> => {
  try {
    const user = firebaseAuthService.getCurrentUser()
    if (!user) {
      throw new Error('No user logged in')
    }

    const idToken = await user.getIdToken(true)

    return {
      isSuccess: true,
      message: 'Token refreshed successfully',
      content: {
        access_token: idToken,
        expired_in: 3600,
        refresh_token: user.refreshToken || refreshToken,
        token_type: 'Bearer',
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    throw error
  }
}

/**
 * Get current user info from Firestore
 */
const getUserInfo = async (): Promise<IHttpResponse<IUser<string>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('No user logged in')
    }

    const userDocRef = doc(db, 'users', currentUser.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      throw new Error('User document not found')
    }

    const userData = userDoc.data() as IUser<string>
    userData.id = currentUser.uid as any

    return {
      isSuccess: true,
      message: 'User info fetched successfully',
      content: userData,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error getting user info:', error)
    throw error
  }
}

export const apiAuth = {
  getUserInfo,
  getGoogleUserInfo,
  login,
  register,
  refreshToken,
}
