/**
 * Items Migration Module
 * Migrates learning items (words, phrases, idioms) with nested meanings and examples
 */

import { db } from './firebaseConfig.js'
import { safeDate } from './dateUtils.js'

async function migrateItems(connection, userMap, meaningsByItem, exampleMap) {
  console.log('\n🎯 Migrating items...')

  try {
    const [items] = await connection.execute('SELECT * FROM item')

    if (items.length === 0) {
      console.log('  ℹ️ No items to migrate')
      return { count: 0, errors: [] }
    }

    const itemMap = {}
    let count = 0
    const errors = []

    for (const item of items) {
      try {
        const itemId = String(item.id)
        itemMap[item.id] = itemId
        const uid = item.user_id ? String(item.user_id) : null

        // Get meanings for this item
        const itemMeanings = meaningsByItem[item.id] || []

        // Build meanings array
        const meanings = []
        for (const meaning of itemMeanings) {
          // Get examples for this meaning
          let examples = []
          try {
            const [exs] = await connection.execute(
              'SELECT * FROM example_meaning WHERE meaning_id = ?',
              [meaning.id],
            )

            examples = exs.map((ex) => ({
              id: String(ex.example_id),
              sentence: ex.sentence || '',
              translation: ex.translation || '',
              order: ex.order || 0,
            }))
          } catch (e) {
            console.error(`    Warning: Could not fetch examples for meaning ${meaning.id}`)
          }

          meanings.push({
            id: String(meaning.id),
            definition: meaning.definition || '',
            translation: meaning.translation || '',
            grammar: meaning.grammar || '',
            pronunciation: meaning.pronunciation || '',
            examples: examples,
            order: meaning.order || 0,
          })
        }

        // Create item document
        const itemRef = db.collection('items').doc(itemId)

        const itemData = {
          id: itemId,
          original: item.original || '',
          uid: uid,
          categoryId: item.category_id ? String(item.category_id) : null,
          type: item.type || '',
          level: item.level || 0,
          favorite: item.favorite === 1,
          archive: item.archive === 1,
          is_deleted: item.is_deleted === 1,
          practiceCount: item.practice_count || 0,
          meanings: meanings,
          forms: [],
          collocations: [],
          word_family: [],
          relation: [],
          created_at: safeDate(item.created_date) || Date.now(),
          updated_at: safeDate(item.updated_date) || Date.now(),
        }

        await itemRef.set(itemData)

        count++
        if (count % 10 === 0) {
          console.log(`  ✓ Migrated ${count} items`)
        }
      } catch (error) {
        errors.push({ itemId: item.id, error: error.message })
        console.error(`  ✗ Error migrating item ${item.id}:`, error.message)
      }
    }

    console.log(`  ✅ Successfully migrated ${count} items`)

    return { count, errors, itemMap }
  } catch (error) {
    console.error('  ✗ Item migration failed:', error.message)
    throw error
  }
}

export { migrateItems }
