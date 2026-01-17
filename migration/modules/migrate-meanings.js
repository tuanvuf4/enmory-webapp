/**
 * Meanings Migration Module
 * Migrates word meanings from MySQL to Firebase (nested in items)
 */

import { db } from './firebaseConfig.js'

async function migrateMeanings(connection, exampleMap) {
  console.log('\n📚 Migrating meanings...')

  try {
    const [meanings] = await connection.execute('SELECT * FROM meaning')

    if (meanings.length === 0) {
      console.log('  ℹ️ No meanings to migrate')
      return { count: 0, errors: [] }
    }

    const meaningMap = {}
    let count = 0
    const errors = []

    // Group meanings by item_id
    const meaningsByItem = {}
    for (const meaning of meanings) {
      if (!meaningsByItem[meaning.item_id]) {
        meaningsByItem[meaning.item_id] = []
      }
      meaningsByItem[meaning.item_id].push(meaning)
    }

    // Meanings will be stored as nested documents
    // They'll be migrated when items are migrated
    for (const itemId in meaningsByItem) {
      for (const meaning of meaningsByItem[itemId]) {
        try {
          const meaningId = String(meaning.id)
          meaningMap[meaning.id] = meaningId
          count++
        } catch (error) {
          errors.push({ meaningId: meaning.id, error: error.message })
          console.error(`  ✗ Error processing meaning ${meaning.id}:`, error.message)
        }
      }
    }

    console.log(`  ✅ Processed ${count} meanings (will be nested in items)`)

    return { count, errors, meaningMap, meaningsByItem }
  } catch (error) {
    console.error('  ✗ Meaning migration failed:', error.message)
    throw error
  }
}

export { migrateMeanings }
