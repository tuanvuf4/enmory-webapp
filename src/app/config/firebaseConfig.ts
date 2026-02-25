import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { appConfig } from './appConfig'

// Initialize Firebase
export const app = initializeApp({ ...appConfig.firebase })

export const dbCollections = {
  users: 'users',
  items: 'items',
  examples: 'examples',
  iotd: 'iotd',
  articles: 'articles',
}

// Get Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
