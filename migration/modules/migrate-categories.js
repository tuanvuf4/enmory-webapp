/**
 * Categories Migration Module
 * Migrates category data from MySQL to Firebase
 */

import { db } from './firebaseConfig.js'


async function migrateCategories(connection) {
  console.log('\n📂 Migrating categories...')

  try {
    const [categories] = await connection.execute('SELECT * FROM category')

    if (categories.length === 0) {
      console.log('  ℹ️ No categories to migrate')
      return { count: 0, errors: [] }
    }

    const batch = db.batch()
    let count = 0
    const errors = []
    const categoryMap = {}

    for (const category of categories) {
      try {
        const categoryId = String(category.id)
        categoryMap[category.id] = categoryId

        const categoryRef = db.collection('categories').doc(categoryId)

        batch.set(categoryRef, {
          id: categoryId,
          name: category.name || '',
          description: category.description || '',
          icon: category.icon || '',
          color: category.color || '',
          order: category.order || 0,
          created_at: category.created_date ? category.created_date.getTime() : Date.now(),
          updated_at: Date.now(),
        })

        count++
        if (count % 5 === 0) {
          console.log(`  ✓ Processed ${count} categories`)
        }
      } catch (error) {
        errors.push({ categoryId: category.id, error: error.message })
        console.error(`  ✗ Error migrating category ${category.id}:`, error.message)
      }
    }

    await batch.commit()
    console.log(`  ✅ Successfully migrated ${count} categories`)

    return { count, errors, categoryMap }
  } catch (error) {
    console.error('  ✗ Category migration failed:', error.message)
    throw error
  }
}

export { migrateCategories }
