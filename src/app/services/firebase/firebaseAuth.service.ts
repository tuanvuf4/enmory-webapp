import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
  UserCredential,
} from 'firebase/auth'
import { auth } from '@/config/firebaseConfig'

export interface IFirebaseUser extends User {
  customClaims?: Record<string, any>
}

class FirebaseAuthService {
  private auth: Auth

  constructor() {
    this.auth = auth
  }

  /**
   * Register a new user with email and password
   */
  async register(email: string, password: string): Promise<UserCredential> {
    try {
      return await createUserWithEmailAndPassword(this.auth, email, password)
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<UserCredential> {
    try {
      return await signInWithEmailAndPassword(this.auth, email, password)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * Login with Google
   */
  async loginWithGoogle(): Promise<UserCredential> {
    try {
      const provider = new GoogleAuthProvider()
      return await signInWithPopup(this.auth, provider)
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser
  }

  /**
   * Get ID token for API calls
   */
  async getIdToken(): Promise<string | null> {
    try {
      const user = this.auth.currentUser
      return user ? await user.getIdToken() : null
    } catch (error) {
      console.error('Error getting ID token:', error)
      return null
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback)
  }

  /**
   * Get current user's ID token with refresh
   */
  async getIdTokenWithRefresh(forceRefresh?: boolean): Promise<string | null> {
    try {
      const user = this.auth.currentUser
      return user ? await user.getIdToken(forceRefresh) : null
    } catch (error) {
      console.error('Error getting ID token:', error)
      return null
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService()
