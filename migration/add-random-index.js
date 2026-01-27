/**
 * Migration Script: Add randomIndex field to existing documents
 * This script adds a randomIndex field (0-1) to all documents in the items and examples collections
 * for efficient random sampling in queries.
 *
 * Usage: node add-random-index.js
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey_12345.json')

initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()

/**
 * Add randomIndex to all documents in a collection
 */
async function addRandomIndexToCollection(collectionName) {
  console.log(`\n🔄 Processing ${collectionName} collection...`)

  try {
    const collectionRef = db.collection(collectionName)
    const snapshot = await collectionRef.get()

    if (snapshot.empty) {
      console.log(`⚠️  No documents found in ${collectionName}`)
      return { success: 0, failed: 0, skipped: 0 }
    }

    console.log(`📊 Found ${snapshot.size} documents`)

    let successCount = 0
    let failedCount = 0
    let skippedCount = 0

    // Use batch for better performance (max 500 operations per batch)
    let batch = db.batch()
    let operationCount = 0
    const BATCH_SIZE = 500

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data()

        // Skip if randomIndex already exists
        if (data.randomIndex !== undefined) {
          skippedCount++
          continue
        }

        // Add randomIndex field
        batch.update(doc.ref, {
          randomIndex: Math.random(),
        })

        operationCount++
        successCount++

        // Commit batch if it reaches the size limit
        if (operationCount >= BATCH_SIZE) {
          await batch.commit()
          console.log(`✅ Committed batch of ${operationCount} operations`)
          batch = db.batch()
          operationCount = 0
        }
      } catch (error) {
        console.error(`❌ Error updating document ${doc.id}:`, error.message)
        failedCount++
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit()
      console.log(`✅ Committed final batch of ${operationCount} operations`)
    }

    console.log(`\n✨ ${collectionName} migration complete:`)
    console.log(`   - Updated: ${successCount}`)
    console.log(`   - Skipped: ${skippedCount}`)
    console.log(`   - Failed: ${failedCount}`)

    return { success: successCount, failed: failedCount, skipped: skippedCount }
  } catch (error) {
    console.error(`❌ Error processing ${collectionName}:`, error.message)
    throw error
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting randomIndex migration...')
  console.log('⏰ Start time:', new Date().toISOString())

  const startTime = Date.now()

  try {
    // Migrate examples collection
    const examplesResult = await addRandomIndexToCollection('examples')

    // Migrate items collection
    const itemsResult = await addRandomIndexToCollection('items')

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Migration completed successfully!')
    console.log('='.repeat(60))
    console.log('\n📊 Summary:')
    console.log(
      `   Examples - Updated: ${examplesResult.success}, Skipped: ${examplesResult.skipped}, Failed: ${examplesResult.failed}`,
    )
    console.log(
      `   Items    - Updated: ${itemsResult.success}, Skipped: ${itemsResult.skipped}, Failed: ${itemsResult.failed}`,
    )
    console.log(`\n⏱️  Total duration: ${duration}s`)
    console.log('⏰ End time:', new Date().toISOString())
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
