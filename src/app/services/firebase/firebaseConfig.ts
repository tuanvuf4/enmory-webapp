/**
 * Firebase Configuration
 * Initializes Firebase app with client-side configuration
 */

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { appConfig } from '@/config/appConfig'

// Get Firebase config from environment variables or appConfig
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appConfig.firebase?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appConfig.firebase?.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appConfig.firebase?.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appConfig.firebase?.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appConfig.firebase?.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appConfig.firebase?.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appConfig.firebase?.measurementId,
}

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ]
  const missingFields = requiredFields.filter(
    (field) => !firebaseConfig[field as keyof typeof firebaseConfig],
  )

  if (missingFields.length > 0) {
    console.warn(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`)
  }
}

validateFirebaseConfig()

// Initialize Firebase
export const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)

// Enable offline persistence
try {
  // Firestore offline persistence is enabled by default in browser
  console.log('Firebase initialized successfully')
} catch (error) {
  console.error('Error initializing Firebase:', error)
}

export default app
