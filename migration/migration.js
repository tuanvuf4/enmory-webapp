/**
 * SQL (MySQL / MariaDB) → Firestore Migration Script
 * Designed for enmory_webapp schema
 * Migrates: users, items, examples, configurations, and all relationships
 */

import mysql from 'mysql2/promise'
import admin from 'firebase-admin'
import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ========== FIREBASE INITIALIZATION ========== */

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'),
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const firestore = admin.firestore()

/* ========== MYSQL CONNECTION ========== */

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enmory_webapp',
})

/* ========== HELPER FUNCTIONS ========== */

async function query(sql, values) {
  const [rows] = await connection.execute(sql, values)
  return rows
}

function createDocId(id) {
  return String(id)
}

function generateTimestamp(timestamp) {
  if (!timestamp) return admin.firestore.FieldValue.serverTimestamp()
  const ms = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  return new Date(ms)
}

/* ========== MIGRATION FUNCTIONS ========== */

/**
 * Migrate users table
 */
async function migrateUsers() {
  console.log('\n📝 Migrating users...')
  try {
    const users = await query('SELECT * FROM user', [])

    if (users.length === 0) {
      console.log('  ℹ️  No users found')
      return {}
    }

    const userMap = {}

    for (const user of users) {
      const docId = createDocId(user.id)
      const userData = {
        id: docId,
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstname || '',
        lastName: user.lastname || '',
        avatar: user.avatar || null,
        phoneNumber: user.phonenumber || null,
        sex: user.sex ? Boolean(user.sex) : false,
        status: user.status ? Boolean(user.status) : true,
        is_active: user.is_active ? Boolean(user.is_active) : true,
        created_date: user.created_date ? parseInt(user.created_date) : Date.now(),
        last_active: user.last_active ? parseInt(user.last_active) : Date.now(),
        last_update: user.last_update ? parseInt(user.last_update) : Date.now(),
      }

      await firestore.collection('users').doc(docId).set(userData)
      userMap[user.id] = docId
      console.log(`  ✅ Migrated user: ${user.username} (${docId})`)
    }

    return userMap
  } catch (error) {
    console.error('  ❌ Error migrating users:', error.message)
    throw error
  }
}

/**
 * Migrate categories
 */
async function migrateCategories() {
  console.log('\n📂 Migrating categories...')
  try {
    const categories = await query('SELECT * FROM category', [])

    if (categories.length === 0) {
      console.log('  ℹ️  No categories found')
      return {}
    }

    const categoryMap = {}

    for (const cat of categories) {
      const catData = {
        id: cat.id,
        label: cat.label,
      }
      await firestore.collection('categories').doc(String(cat.id)).set(catData)
      categoryMap[cat.id] = cat.label
      console.log(`  ✅ Migrated category: ${cat.label}`)
    }

    return categoryMap
  } catch (error) {
    console.error('  ❌ Error migrating categories:', error.message)
    throw error
  }
}

/**
 * Migrate examples
 */
async function migrateExamples() {
  console.log('\n💡 Migrating examples...')
  try {
    const examples = await query('SELECT * FROM example', [])

    if (examples.length === 0) {
      console.log('  ℹ️  No examples found')
      return {}
    }

    const exampleMap = {}

    for (const example of examples) {
      const docId = createDocId(example.id)
      const exampleData = {
        id: docId,
        original: example.original || '',
        translation: example.translation || '',
        note: example.note || '',
        created_date: example.created_date ? parseInt(example.created_date) : Date.now(),
        last_update: example.last_update ? parseInt(example.last_update) : Date.now(),
      }

      await firestore.collection('examples').doc(docId).set(exampleData)
      exampleMap[example.id] = docId
    }

    console.log(`  ✅ Migrated ${examples.length} examples`)
    return exampleMap
  } catch (error) {
    console.error('  ❌ Error migrating examples:', error.message)
    throw error
  }
}

/**
 * Migrate items (words, phrases, idioms, etc.)
 */
async function migrateItems(userMap, exampleMap) {
  console.log('\n📚 Migrating items...')
  try {
    const items = await query(
      `SELECT i.*, u.username 
       FROM item i 
       LEFT JOIN user u ON i.uid = u.id`,
      [],
    )

    if (items.length === 0) {
      console.log('  ℹ️  No items found')
      return {}
    }

    const itemMap = {}
    let migratedCount = 0

    for (const item of items) {
      try {
        const docId = createDocId(item.id)

        // Get meanings for this item
        const meanings = await query('SELECT * FROM meaning WHERE itemid = ?', [item.id])

        // Process meanings with their examples
        const processedMeanings = []
        for (const meaning of meanings) {
          // Get examples for this meaning
          const meaningExamples = await query(
            `SELECT e.* FROM example e 
             WHERE e.id IN (
               SELECT exampleid FROM meaning_example WHERE meaningid = ?
             )`,
            [meaning.id],
          )

          const processedMeaning = {
            id: meaning.id,
            typeId: meaning.typeid || 0,
            common: meaning.common ? Boolean(meaning.common) : false,
            enable: meaning.enable !== undefined ? Boolean(meaning.enable) : true,
            pronunciation: {
              us: meaning.us || null,
              uk: meaning.uk || null,
              common: meaning.common_pronunciation || null,
            },
            note: meaning.note || '',
            definition: meaning.definition || '',
            translation: meaning.translation || '',
            grammar: meaning.grammar || '',
            collocations: meaning.collocations || '',
            synonyms: [],
            antonyms: [],
            last_update: meaning.last_update ? parseInt(meaning.last_update) : Date.now(),
            examples: meaningExamples.map((ex) => ({
              id: ex.id,
              original: ex.original || '',
              translation: ex.translation || '',
              note: ex.note || '',
              auto: ex.auto ? Boolean(ex.auto) : false,
              created_date: ex.created_date ? parseInt(ex.created_date) : Date.now(),
              last_update: ex.last_update ? parseInt(ex.last_update) : Date.now(),
            })),
          }

          processedMeanings.push(processedMeaning)
        }

        // Construct item document
        const itemData = {
          id: docId,
          uid: item.uid ? userMap[item.uid] || String(item.uid) : null,
          catId: item.catid || 0,
          original: item.original || '',
          favorite: item.favorite ? Boolean(item.favorite) : false,
          level: item.level || 0,
          created_date: item.created_date ? parseInt(item.created_date) : Date.now(),
          last_update: item.last_update ? parseInt(item.last_update) : Date.now(),
          deleted_date: item.deleted_date ? parseInt(item.deleted_date) : null,
          is_deleted: item.is_deleted ? Boolean(item.is_deleted) : false,
          archive: item.archive ? Boolean(item.archive) : false,
          forms: [],
          collocations: [],
          word_family: [],
          relation: [],
          meanings: processedMeanings,
          user: item.username
            ? {
                username: item.username,
                firstName: item.firstname || '',
                lastName: item.lastname || '',
                email: item.email || '',
                phoneNumber: item.phonenumber || '',
              }
            : null,
          practiceCount: item.practicecount || 0,
        }

        await firestore.collection('items').doc(docId).set(itemData)
        itemMap[item.id] = docId
        migratedCount++

        if (migratedCount % 10 === 0) {
          console.log(`  ✅ Migrated ${migratedCount} items...`)
        }
      } catch (itemError) {
        console.error(`  ⚠️  Error migrating item ${item.id}:`, itemError.message)
        continue
      }
    }

    console.log(`  ✅ Completed migrating ${migratedCount} items`)
    return itemMap
  } catch (error) {
    console.error('  ❌ Error migrating items:', error.message)
    throw error
  }
}

/**
 * Migrate configurations
 */
async function migrateConfigurations(userMap) {
  console.log('\n⚙️  Migrating user configurations...')
  try {
    const configs = await query('SELECT * FROM configuration', [])

    if (configs.length === 0) {
      console.log('  ℹ️  No configurations found')
      return
    }

    for (const config of configs) {
      const uid = config.uid ? userMap[config.uid] : null

      if (!uid) {
        console.log(`  ⚠️  Skipping config for non-existent user ${config.uid}`)
        continue
      }

      const configData = {
        id: config.id,
        uid: uid,
        numberOfWordsInStudySet: config.numberOfWordsInStudySet || 20,
        numberOfPhraseInStudySet: config.numberOfPhraseInStudySet || 20,
        numberOfIdiomInStudySet: config.numberOfIdiomInStudySet || 3,
        numberOfSlangInStudySet: config.numberOfSlangInStudySet || 3,
        numberOfDictationItem: config.numberOfDictationItem || 15,
        numberOfCollocationsInStudySet: config.numberOfCollocationsInStudySet || 3,
        numberOfSentencesInStudySet: config.numberOfSentencesInStudySet || 3,
        numberOfExampleReview: config.numberOfExampleReview || 5,
        player: config.player ? Boolean(config.player) : true,
        listeningType: config.listeningType || 0,
        references: config.references ? config.references.split(',').map(Number) : [],
        community: config.community ? Boolean(config.community) : false,
      }

      // Store config as a subcollection under the user
      await firestore
        .collection('users')
        .doc(uid)
        .collection('configuration')
        .doc('config')
        .set(configData)

      console.log(`  ✅ Migrated configuration for user: ${uid}`)
    }

    console.log(`  ✅ Completed migrating configurations`)
  } catch (error) {
    console.error('  ❌ Error migrating configurations:', error.message)
    throw error
  }
}

/**
 * Create indexes and metadata
 */
async function setupMetadata() {
  console.log('\n🏷️  Setting up metadata...')
  try {
    const metadata = {
      migrationDate: new Date().toISOString(),
      schemaVersion: 1,
      collections: ['users', 'items', 'examples', 'categories', 'configurations'],
    }

    await firestore.collection('_metadata').doc('migration').set(metadata)
    console.log('  ✅ Metadata created')
  } catch (error) {
    console.error('  ❌ Error setting up metadata:', error.message)
    throw error
  }
}

/* ========== MAIN MIGRATION PROCESS ========== */

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║     MySQL → Firebase Firestore Migration Tool          ║')
    console.log('║         enmory_webapp Database Migration              ║')
    console.log('╚════════════════════════════════════════════════════════╝')

    console.log('\n⏳ Starting migration process...\n')

    // Step 1: Migrate categories (no dependencies)
    const categoryMap = await migrateCategories()

    // Step 2: Migrate users
    const userMap = await migrateUsers()

    // Step 3: Migrate examples
    const exampleMap = await migrateExamples()

    // Step 4: Migrate items (depends on users and examples)
    const itemMap = await migrateItems(userMap, exampleMap)

    // Step 5: Migrate configurations (depends on users)
    await migrateConfigurations(userMap)

    // Step 6: Setup metadata
    await setupMetadata()

    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║                 ✅ MIGRATION SUCCESSFUL                 ║')
    console.log('╚════════════════════════════════════════════════════════╝')

    console.log('\n📊 Summary:')
    console.log(`   • Users migrated: ${Object.keys(userMap).length}`)
    console.log(`   • Categories migrated: ${Object.keys(categoryMap).length}`)
    console.log(`   • Examples migrated: ${Object.keys(exampleMap).length}`)
    console.log(`   • Items migrated: ${Object.keys(itemMap).length}`)

    console.log('\n✨ Next steps:')
    console.log('   1. Verify data in Firebase Firestore Console')
    console.log('   2. Update your app imports to use Firebase APIs')
    console.log('   3. Set up Firestore Security Rules')
    console.log('   4. Test authentication and data access')

    process.exit(0)
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════╗')
    console.error('║              ❌ MIGRATION FAILED                       ║')
    console.error('╚════════════════════════════════════════════════════════╝')
    console.error('\n🔴 Error:', error.message)
    console.error('\n📋 Stack trace:')
    console.error(error.stack)
    process.exit(1)
  } finally {
    // Close database connection
    await connection.end()
  }
}

/* ========== RUN MIGRATION ========== */

main()
