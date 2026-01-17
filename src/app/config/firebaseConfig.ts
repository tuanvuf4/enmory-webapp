import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { appConfig } from './appConfig'

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

// Initialize Firebase
export const app = initializeApp(firebaseConfig)

// Get Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
