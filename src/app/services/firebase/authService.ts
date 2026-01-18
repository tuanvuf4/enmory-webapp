/**
 * Firebase Authentication Service
 * Handles user authentication with Firebase and Google Sign-In
 */

import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
  UserCredential,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { dbCollections, app as firebaseApp } from '@/config/firebaseConfig'
import { IUserConfig } from '@/models/user.model'
import { commonApi } from './api'
import { appConfig, setting } from '@/config/appConfig'
import { config } from 'process'
import { EListeningTypes } from '@/models/dictation.model'

export interface IAuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  isNewUser: boolean
}

export interface IUserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  firstName: string
  lastName: string
  createdAt: number
  updatedAt: number
  provider: string
  configuration: IUserConfig | null // User configuration/preferences
}

/**
 * Firebase Auth Service
 * Provides authentication methods for the application
 */
export class FirebaseAuthService {
  private auth = getAuth(firebaseApp)
  private db = getFirestore(firebaseApp)
  private googleProvider = new GoogleAuthProvider()

  constructor() {
    // Enable offline persistence
    setPersistence(this.auth, browserLocalPersistence).catch((error) => {
      console.error('Error enabling persistence:', error)
    })

    // Configure Google provider
    this.googleProvider.addScope('profile')
    this.googleProvider.addScope('email')
  }

  /**
   * Register with email and password
   * @param email User email
   * @param password User password
   * @param userData Additional user data
   * @returns Promise with user credentials
   */
  async registerWithEmail(
    email: string,
    password: string,
    userData?: Partial<IUserProfile>,
  ): Promise<UserCredential> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password)
      const user = result.user

      // Create user profile in Firestore
      const userDocRef = doc(this.db, dbCollections.users, user.uid)

      const userProfile: IUserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: userData?.displayName || user.email?.split('@')[0] || '',
        photoURL: userData?.photoURL || '',
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        provider: 'email',
        configuration: {
          ...setting.meta,
        },
      }

      await setDoc(userDocRef, userProfile)

      return result
    } catch (error: any) {
      console.error('Error registering with email:', error)
      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered')
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address')
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters')
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email/password registration is not enabled')
      }
      throw error
    }
  }

  /**
   * Sign in with email and password
   * @param email User email
   * @param password User password
   * @returns Promise with user credentials
   */
  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password)
      const user = result.user

      // Check if user profile exists in Firestore
      const userDocRef = doc(this.db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)

      // If no profile exists, create one
      if (!userDoc.exists()) {
        const userProfile: IUserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || '',
          photoURL: user.photoURL || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          provider: 'email',
          configuration: {
            ...setting.meta,
          },
        }

        await setDoc(userDocRef, userProfile)
      }

      return result
    } catch (error: any) {
      console.error('Error signing in with email:', error)
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email')
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password')
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address')
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled')
      }
      throw error
    }
  }

  /**
   * Sign in with Google
   * @returns Promise with user credentials
   */
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider)
      const user = result.user

      // Check if this is a new user
      const userDocRef = doc(this.db, dbCollections.users, user.uid)
      const userDoc = await getDoc(userDocRef)

      // const configDocRef = doc(this.db, dbCollections.configuration, user.uid)
      // const configDoc = await getDoc(configDocRef)

      // If new user, create user profile in Firestore
      if (!userDoc.exists()) {
        const userProfile: IUserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          provider: 'google',
          configuration: {
            ...setting.meta,
          },
        }

        await setDoc(userDocRef, userProfile)
      }

      // if (!configDoc.exists()) {
      //   const response = await commonApi.createUserConfig(user.uid)
      //   console.log(`*** response *** `, response)
      // }

      return result
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  /**
   * Sign out current user
   * @returns Promise that resolves when sign out is complete
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  /**
   * Get current authenticated user
   * @returns Current user or null
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser
  }

  /**
   * Get current user as IAuthUser
   * @returns User data or null
   */
  getCurrentAuthUser(): IAuthUser | null {
    const user = this.auth.currentUser
    if (!user) return null

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      isNewUser:
        !user.metadata.lastSignInTime ||
        user.metadata.creationTime === user.metadata.lastSignInTime,
    }
  }

  /**
   * Get user profile from Firestore
   * @param uid User ID
   * @returns User profile data
   */
  async getUserProfile(uid: string): Promise<IUserProfile | null> {
    try {
      const userDocRef = doc(this.db, 'users', uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        return userDoc.data() as IUserProfile
      }
      return null
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  }

  /**
   * Update user profile
   * @param uid User ID
   * @param data Partial user profile data
   */
  async updateUserProfile(uid: string, data: Partial<IUserProfile>): Promise<void> {
    try {
      const userDocRef = doc(this.db, 'users', uid)
      await setDoc(userDocRef, { ...data, updatedAt: Date.now() }, { merge: true })
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  /**
   * Listen for authentication state changes
   * @param callback Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback)
  }

  /**
   * Get auth ID token
   * @returns ID token string
   */
  async getIdToken(): Promise<string | null> {
    try {
      return (await this.auth.currentUser?.getIdToken()) || null
    } catch (error) {
      console.error('Error getting ID token:', error)
      return null
    }
  }

  /**
   * Check if user is authenticated
   * @returns Boolean indicating if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.auth.currentUser
  }

  /**
   * Get authentication state
   * @returns Current auth user or null
   */
  getAuthState(): User | null {
    return this.auth.currentUser
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService()
