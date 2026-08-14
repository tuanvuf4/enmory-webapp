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
  tags: 'tags',
  examples: 'examples',
  iotd: 'iotd',
  articles: 'articles',
  article_categories: 'article_categories',
  tracks: 'tracks',
}

// Get Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
