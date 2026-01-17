/**
 * Firebase Configuration for Migration Modules
 * Shared configuration exported to all migration modules
 */

import admin from 'firebase-admin'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load service account key
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json')
let serviceAccount

try {
  const serviceAccountJson = readFileSync(serviceAccountPath, 'utf8')
  serviceAccount = JSON.parse(serviceAccountJson)
} catch (error) {
  console.error('❌ Error loading serviceAccountKey.json:')
  console.error('   Make sure serviceAccountKey.json exists in the migration folder')
  console.error('   Download it from: https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk')
  process.exit(1)
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

// Get Firestore instance
const db = admin.firestore()

// Enable offline persistence for better reliability
try {
  db.settings({
    persistence: true,
  })
} catch (e) {
  // Offline persistence already enabled or not supported
}

export {
  admin,
  db,
  serviceAccount,
}
