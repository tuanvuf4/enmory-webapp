import admin from 'firebase-admin'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load parent .env
dotenv.config({ path: path.join(__dirname, '../.env') })

const projectId = process.env.VITE_FIREBASE_PROJECT_ID
console.log('Active project ID from .env:', projectId)

let serviceAccountPath
if (projectId === 'enmory-12345') {
  serviceAccountPath = path.join(__dirname, './serviceAccountKey_12345.json')
} else if (projectId === 'enmory-21593') {
  serviceAccountPath = path.join(__dirname, './serviceAccountKey_21593.json')
} else {
  // Default fallback
  serviceAccountPath = path.join(__dirname, './serviceAccountKey_12345.json')
  console.log('No matching project ID. Falling back to default service account:', serviceAccountPath)
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account key not found at: ${serviceAccountPath}`)
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

function extractKeywords(text) {
  if (!text || typeof text !== 'string') return []
  const cleanText = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
  const words = cleanText.split(/\s+/)
  return Array.from(new Set(words.filter(word => word.trim().length > 0)))
}

async function migrateCollection(collectionName, textField, lowercaseField) {
  console.log(`\nStarting migration for collection: "${collectionName}"...`)
  const snapshot = await db.collection(collectionName).get()
  
  if (snapshot.empty) {
    console.log(`No documents found in "${collectionName}".`)
    return
  }
  
  console.log(`Found ${snapshot.size} documents in "${collectionName}".`)
  let batch = db.batch()
  let count = 0;
  let totalMigrated = 0
  
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const textVal = data[textField] || ''
    const keywords = extractKeywords(textVal)
    const lowercaseVal = textVal.toLowerCase()
    
    // Check if update is needed
    const hasKeywords = data.keywords && Array.isArray(data.keywords)
    const keywordsMatch = hasKeywords && 
                          data.keywords.length === keywords.length && 
                          keywords.every(k => data.keywords.includes(k))
    
    const needsUpdate = !keywordsMatch || data[lowercaseField] !== lowercaseVal
      
    if (needsUpdate) {
      const updatePayload = {
        keywords: keywords,
        [lowercaseField]: lowercaseVal
      }
      
      batch.update(doc.ref, updatePayload)
      count++
      totalMigrated++
      
      if (count === 400) {
        await batch.commit()
        console.log(`Committed batch of 400 updates to "${collectionName}".`)
        batch = db.batch()
        count = 0
      }
    }
  }
  
  if (count > 0) {
    await batch.commit()
    console.log(`Committed remaining batch of ${count} updates to "${collectionName}".`)
  }
  
  console.log(`Finished migrating "${collectionName}". Total updated: ${totalMigrated}/${snapshot.size}`)
}

async function run() {
  try {
    // 1. Migrate items (origin -> origin_lowercase, keywords)
    await migrateCollection('items', 'origin', 'origin_lowercase')
    
    // 2. Migrate examples (origin -> origin_lowercase, keywords)
    await migrateCollection('examples', 'origin', 'origin_lowercase')
    
    // 3. Migrate articles (title -> title_lowercase, keywords)
    await migrateCollection('articles', 'title', 'title_lowercase')
    
    console.log('\nMigration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

run()
