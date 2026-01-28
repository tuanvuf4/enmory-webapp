/**
 * Migration Script: Add origin_lowercase field to items and examples
 * This script adds an origin_lowercase field (lowercase version of origin)
 * to all documents in the items and examples collections for efficient searching.
 *
 * Usage: node add-origin-lowercase.js
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
 * Add origin_lowercase to all documents in a collection
 */
async function addOriginLowercaseToCollection(collectionName) {
  console.log(`\n🔄 Processing ${collectionName} collection...`)

  try {
    const collectionRef = db.collection(collectionName)
    const snapshot = await collectionRef.get()

    if (snapshot.empty) {
      console.log(`⚠️  No documents found in ${collectionName}`)
      return { success: 0, failed: 0, skipped: 0, noOrigin: 0 }
    }

    console.log(`📊 Found ${snapshot.size} documents`)

    let successCount = 0
    let failedCount = 0
    let skippedCount = 0
    let noOriginCount = 0

    // Use batch for better performance (max 500 operations per batch)
    let batch = db.batch()
    let operationCount = 0
    const BATCH_SIZE = 500

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data()

        // Skip if origin_lowercase already exists
        if (data.origin_lowercase !== undefined) {
          skippedCount++
          continue
        }

        // Skip if origin field doesn't exist
        if (!data.origin) {
          console.warn(`⚠️  Document ${doc.id} has no origin field, skipping...`)
          noOriginCount++
          continue
        }

        // Add origin_lowercase field (lowercase version of origin)
        batch.update(doc.ref, {
          origin_lowercase: data.origin.toLowerCase(),
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
    console.log(`   - No origin field: ${noOriginCount}`)
    console.log(`   - Failed: ${failedCount}`)

    return {
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      noOrigin: noOriginCount,
    }
  } catch (error) {
    console.error(`❌ Error processing ${collectionName}:`, error.message)
    throw error
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting origin_lowercase migration...')
  console.log('⏰ Start time:', new Date().toISOString())

  const startTime = Date.now()

  try {
    // Migrate examples collection
    const examplesResult = await addOriginLowercaseToCollection('examples')

    // Migrate items collection
    const itemsResult = await addOriginLowercaseToCollection('items')

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Migration completed successfully!')
    console.log('='.repeat(60))
    console.log('\n📊 Summary:')
    console.log(
      `   Examples - Updated: ${examplesResult.success}, Skipped: ${examplesResult.skipped}, No origin: ${examplesResult.noOrigin}, Failed: ${examplesResult.failed}`,
    )
    console.log(
      `   Items    - Updated: ${itemsResult.success}, Skipped: ${itemsResult.skipped}, No origin: ${itemsResult.noOrigin}, Failed: ${itemsResult.failed}`,
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
