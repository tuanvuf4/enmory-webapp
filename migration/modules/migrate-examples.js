/**
 * Examples Migration Module
 * Migrates example sentences from MySQL to Firebase
 */

import { db } from './firebaseConfig.js'
import { safeDate } from './dateUtils.js'

async function migrateExamples(connection) {
  console.log('\n💡 Migrating examples...')

  try {
    const [examples] = await connection.execute('SELECT * FROM example')

    if (examples.length === 0) {
      console.log('  ℹ️ No examples to migrate')
      return { count: 0, errors: [] }
    }

    const batch = db.batch()
    let count = 0
    const errors = []
    const exampleMap = {}

    for (const example of examples) {
      try {
        const exampleId = String(example.id)
        exampleMap[example.id] = exampleId

        const exampleRef = db.collection('examples').doc(exampleId)

        batch.set(exampleRef, {
          id: exampleId,
          sentence: example.sentence || '',
          translation: example.translation || '',
          source: example.source || '',
          level: example.level || 0,
          created_at: safeDate(example.created_date) || Date.now(),
          updated_at: Date.now(),
        })

        count++
        if (count % 50 === 0) {
          console.log(`  ✓ Processed ${count} examples`)
        }
      } catch (error) {
        errors.push({ exampleId: example.id, error: error.message })
        console.error(`  ✗ Error migrating example ${example.id}:`, error.message)
      }
    }

    await batch.commit()
    console.log(`  ✅ Successfully migrated ${count} examples`)

    return { count, errors, exampleMap }
  } catch (error) {
    console.error('  ✗ Example migration failed:', error.message)
    throw error
  }
}

export { migrateExamples }
