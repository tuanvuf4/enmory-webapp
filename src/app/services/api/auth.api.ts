import { firebaseAuthService } from '@/services/firebase/authService'

/**
 * Sign in with Google using Firebase
 */
const signInWithGoogle = async () => {
  try {
    // Authenticate with Firebase
    const firebaseResult = await firebaseAuthService.signInWithGoogle()
    const firebaseUser = firebaseResult.user
    const idToken = await firebaseUser.getIdToken()

    // Return Firebase authentication result
    return {
      status: 200,
      message: 'Google authentication successful',
      data: {
        token: idToken,
        user: {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          picture: firebaseUser.photoURL,
        },
      },
    }
  } catch (error: any) {
    console.error('Google sign in error:', error)
    throw error
  }
}

/**
 * Sign out user from Firebase
 */
const signOut = async () => {
  try {
    // Sign out from Firebase
    await firebaseAuthService.signOut()
  } catch (error: any) {
    console.error('Sign out error:', error)
    throw error
  }
}

/**
 * Get current authentication token
 */
const getAuthToken = async () => {
  try {
    return await firebaseAuthService.getIdToken()
  } catch (error) {
    console.error('Get auth token error:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
const isAuthenticated = () => {
  return firebaseAuthService.isAuthenticated()
}

export const apiAuth = {
  signInWithGoogle,
  signOut,
  getAuthToken,
  isAuthenticated,
}
