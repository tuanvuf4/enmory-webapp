/**
 * Migration Script: Remove <p> and </p> tags from examples collection
 * This script removes <p> tags from the beginning and </p> tags from the end
 * of origin, origin_lowercase, and translation fields in the examples collection.
 *
 * Usage: node remove-p-tags.js
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
 * Remove <p> and </p> tags from the beginning and end of a string
 */
function removePTags(text) {
  if (!text || typeof text !== 'string') {
    return text
  }

  let result = text

  // Remove <p> from the beginning (case insensitive, with optional whitespace)
  result = result.replace(/^\s*<p>\s*/i, '')

  // Remove </p> from the end (case insensitive, with optional whitespace)
  result = result.replace(/\s*<\/p>\s*$/i, '')

  return result
}

/**
 * Clean p tags from all documents in the examples collection
 */
async function cleanPTagsFromExamples() {
  console.log(`\n🔄 Processing examples collection...`)

  try {
    const collectionRef = db.collection('examples')
    const snapshot = await collectionRef.get()

    if (snapshot.empty) {
      console.log(`⚠️  No documents found in examples`)
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
        const updates = {}
        let hasChanges = false

        // Check and clean origin field
        if (data.origin && typeof data.origin === 'string') {
          const cleanedOrigin = removePTags(data.origin)
          if (cleanedOrigin !== data.origin) {
            updates.origin = cleanedOrigin
            hasChanges = true
          }
        }

        // Check and clean origin_lowercase field
        if (data.origin_lowercase && typeof data.origin_lowercase === 'string') {
          const cleanedOriginLowercase = removePTags(data.origin_lowercase)
          if (cleanedOriginLowercase !== data.origin_lowercase) {
            updates.origin_lowercase = cleanedOriginLowercase
            hasChanges = true
          }
        }

        // Check and clean translation field
        if (data.translation && typeof data.translation === 'string') {
          const cleanedTranslation = removePTags(data.translation)
          if (cleanedTranslation !== data.translation) {
            updates.translation = cleanedTranslation
            hasChanges = true
          }
        }

        // Skip if no changes needed
        if (!hasChanges) {
          skippedCount++
          continue
        }

        // Log the changes for first few documents
        if (successCount < 5) {
          console.log(`\n📝 Document ${doc.id} changes:`)
          if (updates.origin) {
            console.log(`   origin: "${data.origin}" -> "${updates.origin}"`)
          }
          if (updates.origin_lowercase) {
            console.log(
              `   origin_lowercase: "${data.origin_lowercase}" -> "${updates.origin_lowercase}"`,
            )
          }
          if (updates.translation) {
            console.log(`   translation: "${data.translation}" -> "${updates.translation}"`)
          }
        }

        // Update the document
        batch.update(doc.ref, updates)
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

    console.log(`\n✨ Examples migration complete:`)
    console.log(`   - Updated: ${successCount}`)
    console.log(`   - Skipped (no changes): ${skippedCount}`)
    console.log(`   - Failed: ${failedCount}`)

    return {
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
    }
  } catch (error) {
    console.error(`❌ Error processing examples:`, error.message)
    throw error
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting p-tag removal migration...')
  console.log('⏰ Start time:', new Date().toISOString())

  const startTime = Date.now()

  try {
    // Clean examples collection
    const result = await cleanPTagsFromExamples()

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Migration completed successfully!')
    console.log('='.repeat(60))
    console.log('\n📊 Summary:')
    console.log(
      `   Examples - Updated: ${result.success}, Skipped: ${result.skipped}, Failed: ${result.failed}`,
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
