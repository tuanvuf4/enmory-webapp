/**
 * Firebase Authentication Service
 * Handles user authentication with Firebase and Google Sign-In
 */

import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
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
import { appSetting } from '@/config/appConfig'

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
    this.googleProvider.setCustomParameters({
      prompt: 'select_account',
    })
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
          ...appSetting.meta,
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
            ...appSetting.meta,
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
   *
   * In a normal web app we use Firebase's signInWithPopup. In a Chrome MV3
   * extension popup that flow breaks (the popup closes when the OAuth window
   * opens and Firebase's auth iframe is also blocked by the MV3 CSP), so we
   * instead obtain a Google access token via chrome.identity.getAuthToken and
   * exchange it for a Firebase credential with signInWithCredential.
   *
   * Requires the manifest to declare the "identity" permission and an
   * "oauth2" block with the OAuth client_id of type "Chrome Extension".
   *
   * @returns Promise with user credentials
   */
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      // Branch on the runtime context, not on appConfig.appType. The latter
      // is driven by an env var which is easy to set wrong (e.g. a typo that
      // doesn't match the EAppType enum). chrome.runtime?.id is defined if
      // and only if the page is loaded from a chrome-extension:// origin
      // with a valid manifest, so this check is impossible to misconfigure.
      const isExtensionRuntime =
        typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.identity

      const result = isExtensionRuntime
        ? await this.signInWithGoogleExtension()
        : await signInWithPopup(this.auth, this.googleProvider)
      const user = result.user

      // Check if this is a new user
      const userDocRef = doc(this.db, dbCollections.users, user.uid)
      const userDoc = await getDoc(userDocRef)

      // If new user, create user profile in Firestore
      // if (!userDoc.exists()) {
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
          ...appSetting.meta,
        },
      }

      await setDoc(userDocRef, userProfile)
      // }

      return result
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  /**
   * Chrome-extension-only Google sign-in flow.
   *
   * Why this is different from the web flow:
   *   - signInWithPopup is blocked by the MV3 CSP (apis.google.com iframe).
   *   - chrome.identity.getAuthToken returns an *access token* tied to the
   *     Chrome Extension OAuth client. Firebase only trusts id_tokens minted
   *     for the project's Web OAuth client, so it rejects those access tokens
   *     with `auth/invalid-credential` ("Invalid Value").
   *
   * The Firebase-recommended pattern is therefore:
   *   1. Run the OAuth 2.0 implicit flow ourselves via launchWebAuthFlow,
   *      asking Google for an id_token signed by the Firebase Web client.
   *   2. Hand the id_token to Firebase via signInWithCredential.
   *
   * Required Google Cloud config on the Web OAuth client whose id is in
   * VITE_GOOGLE_WEB_CLIENT_ID:
   *   - Authorized redirect URIs must include:
   *       https://<extension-id>.chromiumapp.org/
   *     (chrome.identity.getRedirectURL() returns exactly that URL.)
   */
  private async signInWithGoogleExtension(): Promise<UserCredential> {
    // Visible marker so we can tell from the popup devtools whether the
    // currently-loaded extension build is the new launchWebAuthFlow flow.
    // If you do NOT see this log, the extension was not reloaded after
    // rebuilding. Go to chrome://extensions and click the reload icon.
    console.info('[auth] signInWithGoogleExtension: launchWebAuthFlow build v2')

    if (typeof chrome === 'undefined' || !chrome.identity?.launchWebAuthFlow) {
      throw new Error(
        'chrome.identity.launchWebAuthFlow is not available. Make sure the extension manifest declares the "identity" permission.',
      )
    }

    const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!webClientId || webClientId.startsWith('REPLACE_')) {
      throw new Error(
        "VITE_GOOGLE_CLIENT_ID is not configured. Set it to the Firebase project's Web OAuth client id.",
      )
    }

    const redirectUri = chrome.identity.getRedirectURL()
    const nonce = crypto.randomUUID().replace(/-/g, '')

    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: webClientId,
        response_type: 'id_token',
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        nonce,
        prompt: 'select_account',
      }).toString()

    console.info('[auth] launching webAuthFlow', {
      redirectUri,
      clientIdSuffix: webClientId.slice(-12),
    })

    let responseUrl: string | undefined
    try {
      responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      })
    } catch (err) {
      const message =
        chrome.runtime?.lastError?.message ||
        (err instanceof Error ? err.message : 'Google sign-in was cancelled')
      throw new Error(message)
    }

    if (!responseUrl) {
      throw new Error('Google sign-in was cancelled')
    }

    // The id_token is returned in the URL fragment (implicit flow).
    const fragment = new URL(responseUrl).hash.replace(/^#/, '')
    const params = new URLSearchParams(fragment)
    const idToken = params.get('id_token')
    const oauthError = params.get('error')

    if (oauthError) {
      throw new Error(`Google OAuth error: ${oauthError}`)
    }
    if (!idToken) {
      throw new Error('No id_token returned from Google')
    }

    // Decode (don't verify) the id_token so we can log the audience and issuer.
    // Helps diagnose auth/invalid-credential: Firebase only trusts id_tokens
    // whose `aud` is an OAuth client in the same Cloud project as the Firebase
    // project. If `aud` here is the Chrome Extension client id instead of the
    // Firebase Web client id, Firebase will reject with "Invalid Value".
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      console.info('[auth] id_token payload', {
        aud: payload.aud,
        iss: payload.iss,
        email: payload.email,
        exp: payload.exp,
      })
    } catch (e) {
      console.warn('[auth] failed to decode id_token for diagnostics', e)
    }

    const credential = GoogleAuthProvider.credential(idToken)
    return await signInWithCredential(this.auth, credential)
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
   * Link email/password credentials to the current signed-in user
   * @param email User email
   * @param password User password
   */
  async linkEmailPasswordToCurrentUser(email: string, password: string): Promise<UserCredential> {
    const currentUser = this.auth.currentUser
    if (!currentUser) {
      throw new Error('Please sign in with Google first before enabling email/password login.')
    }

    if (!currentUser.email) {
      throw new Error('Unable to determine your email address. Please sign in again.')
    }

    if (currentUser.email !== email) {
      throw new Error('The email does not match your signed-in Google account.')
    }

    const credential = EmailAuthProvider.credential(email, password)
    const result = await linkWithCredential(currentUser, credential)

    return result
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
