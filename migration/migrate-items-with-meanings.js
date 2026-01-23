/**
 * Migration Script: SQL Items with Meanings and Examples to Firebase
 * This script reads items, meanings, and examples from SQL file and inserts them into Firebase
 * following the IItem and IMeaning interface structures with proper relationships.
 */

import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json')
const FB_USER_ID = 'zdSNTrF4JFbDzxEyVFK3n5Rv6w62' // Default user ID for migrated data

initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()

/**
 * Parse individual value from SQL
 */
function parseValue(value) {
  if (value.toLowerCase() === 'null') return null
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  if (!isNaN(value)) return Number(value)
  return value
}

/**
 * Parse SQL INSERT statements from file for a specific table
 * @param {string} sqlContent - SQL file content
 * @param {string} tableName - Name of the table to parse
 * @returns {Array} Array of parsed records
 */
function parseTableFromSql(sqlContent, tableName) {
  const records = []

  // Match INSERT INTO statements with multiple rows
  const insertPattern = new RegExp(
    `INSERT INTO\\s+\`${tableName}\`\\s*\\(([^)]+)\\)\\s*VALUES\\s*([^;]+);`,
    'gis',
  )
  const matches = sqlContent.matchAll(insertPattern)

  for (const match of matches) {
    const columns = match[1].split(',').map((col) => col.trim().replace(/`/g, ''))
    const valuesSection = match[2]

    // Split into individual row values - handle parentheses
    const rows = []
    let depth = 0
    let currentRow = ''

    for (let i = 0; i < valuesSection.length; i++) {
      const char = valuesSection[i]

      if (char === '(') {
        depth++
        if (depth === 1) continue
      } else if (char === ')') {
        depth--
        if (depth === 0) {
          if (currentRow.trim()) {
            rows.push(currentRow.trim())
          }
          currentRow = ''
          continue
        }
      }

      if (depth > 0) {
        currentRow += char
      }
    }

    // Parse each row
    for (const rowString of rows) {
      const values = []
      let current = ''
      let inString = false
      let escapeNext = false

      for (let i = 0; i < rowString.length; i++) {
        const char = rowString[i]

        if (escapeNext) {
          current += char
          escapeNext = false
          continue
        }

        if (char === '\\') {
          escapeNext = true
          continue
        }

        if (char === "'" && !inString) {
          inString = true
          continue
        }

        if (char === "'" && inString && rowString[i - 1] !== '\\') {
          inString = false
          values.push(current)
          current = ''
          continue
        }

        if (char === ',' && !inString) {
          if (current.trim()) {
            values.push(parseValue(current.trim()))
          }
          current = ''
          continue
        }

        if (inString || char !== ' ' || current) {
          current += char
        }
      }

      if (current.trim()) {
        values.push(parseValue(current.trim()))
      }

      // Create object from columns and values
      const record = {}
      columns.forEach((col, idx) => {
        if (idx < values.length) {
          record[col] = values[idx]
        }
      })

      records.push(record)
    }
  }

  return records
}

/**
 * Parse all required tables from SQL file
 */
function parseSqlFile(filePath) {
  console.log('  Reading SQL file...')
  const sqlContent = readFileSync(filePath, 'utf-8')

  console.log('  Parsing items table...')
  const items = parseTableFromSql(sqlContent, 'item')

  console.log('  Parsing meanings table...')
  const meanings = parseTableFromSql(sqlContent, 'meaning')

  console.log('  Parsing examples table...')
  const examples = parseTableFromSql(sqlContent, 'example')

  console.log('  Parsing meaning-example relationships...')
  const meaningExamples = parseTableFromSql(sqlContent, 'meaning_examples_example')

  return { items, meanings, examples, meaningExamples }
}

/**
 * Build lookup maps for quick access
 */
function buildLookupMaps(meanings, examples, meaningExamples) {
  // Map: itemId -> [meaning records]
  const meaningsByItemId = {}
  meanings.forEach((meaning) => {
    if (meaning.itemId) {
      if (!meaningsByItemId[meaning.itemId]) {
        meaningsByItemId[meaning.itemId] = []
      }
      meaningsByItemId[meaning.itemId].push(meaning)
    }
  })

  // Map: exampleId -> example record
  const examplesById = {}
  examples.forEach((example) => {
    examplesById[example.id] = example
  })

  // Map: meaningId -> [exampleIds]
  const exampleIdsByMeaningId = {}
  meaningExamples.forEach((rel) => {
    if (!exampleIdsByMeaningId[rel.meaningId]) {
      exampleIdsByMeaningId[rel.meaningId] = []
    }
    exampleIdsByMeaningId[rel.meaningId].push(rel.exampleId)
  })

  return { meaningsByItemId, examplesById, exampleIdsByMeaningId }
}

/**
 * Map meaning record to IMeaning interface
 */
function mapToIMeaning(meaningRecord, exampleIdsByMeaningId, sqlToFirebaseExampleIds, userId) {
  const now = Date.now()

  // Parse array fields
  const parseArrayField = (field) => {
    if (!field) return []
    if (typeof field === 'string') {
      return field
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return []
  }

  // Get SQL example IDs for this meaning and convert to Firebase example IDs
  const sqlExampleIds = exampleIdsByMeaningId[meaningRecord.id] || []
  const firebaseExampleIds = sqlExampleIds
    .map((sqlId) => sqlToFirebaseExampleIds[sqlId])
    .filter(Boolean)

  const meaning = {
    uid: userId || FB_USER_ID,
    typeId: meaningRecord.typeId || 0,
    common: meaningRecord.common === 1 || meaningRecord.common === true,
    enable: meaningRecord.enable === 1 || meaningRecord.enable === true,
    pronunciation: {
      // You may need to join with pronunciation table if needed
      common: '',
      us: '',
      uk: '',
    },
    note: meaningRecord.note || '',
    definition: meaningRecord.definition || '',
    translation: meaningRecord.translation || '',
    grammar: meaningRecord.grammar || '',
    collocations: meaningRecord.collocations || '',
    synonyms: parseArrayField(meaningRecord.synonyms),
    antonyms: parseArrayField(meaningRecord.antonyms),
    created_date: meaningRecord.created_date || now,
    last_update: meaningRecord.last_update || now,
    examples: firebaseExampleIds, // Firebase example IDs as string array
  }

  // Remove null/undefined/empty values
  Object.keys(meaning).forEach((key) => {
    if (meaning[key] === null || meaning[key] === undefined || meaning[key] === '') {
      delete meaning[key]
    }
  })

  return meaning
}

/**
 * Map item record to IItem interface with meanings
 */
function mapToIItem(
  itemRecord,
  meaningsByItemId,
  exampleIdsByMeaningId,
  sqlToFirebaseExampleIds,
  userId,
) {
  const now = Date.now()

  // Parse array fields
  const parseArrayField = (field) => {
    if (!field) return []
    if (typeof field === 'string') {
      return field
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return []
  }

  // Get meanings for this item
  const itemMeanings = meaningsByItemId[itemRecord.id] || []
  const mappedMeanings = itemMeanings.map((meaning) =>
    mapToIMeaning(meaning, exampleIdsByMeaningId, sqlToFirebaseExampleIds, userId),
  )

  const item = {
    origin: itemRecord.original || '',
    uid: userId || 'xK0dvMHrcnMIKxIryzTkBjybdgW2',
    catId: itemRecord.catId || 0,
    favorite: itemRecord.favorite === 1 || itemRecord.favorite === true,
    level: itemRecord.level || 0,
    archive: itemRecord.archive === 1 || itemRecord.archive === true,
    is_deleted: itemRecord.is_deleted === 1 || itemRecord.is_deleted === true,
    forms: parseArrayField(itemRecord.forms),
    collocations: parseArrayField(itemRecord.collocations),
    word_family: parseArrayField(itemRecord.word_family),
    relation: parseArrayField(itemRecord.relation),
    created_date: itemRecord.created_date || now,
    last_update: itemRecord.last_update || now,
  }

  // Add meanings if any
  if (mappedMeanings.length > 0) {
    item.meanings = mappedMeanings
  }

  // Add deleted_date if item is deleted
  if (item.is_deleted && itemRecord.deleted_date) {
    item.deleted_date = itemRecord.deleted_date
  }

  // Remove null/undefined/empty values
  Object.keys(item).forEach((key) => {
    const value = item[key]
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete item[key]
    }
  })

  return item
}

/**
 * Insert examples into Firebase and return mapping of SQL IDs to Firebase IDs
 */
async function insertExamplesToFirebase(examples, userId, batchSize = 500) {
  console.log(`\nInserting ${examples.length} examples into Firebase...`)
  const sqlToFirebaseIds = {}
  let successCount = 0

  for (let i = 0; i < examples.length; i += batchSize) {
    const batch = db.batch()
    const batchExamples = examples.slice(i, i + batchSize)

    console.log(`  Batch ${Math.floor(i / batchSize) + 1} (${batchExamples.length} examples)...`)

    for (const example of batchExamples) {
      const docRef = db.collection('examples').doc()
      const exampleData = {
        id: docRef.id,
        uid: userId || 'xK0dvMHrcnMIKxIryzTkBjybdgW2',
        origin: example.original || '',
        translation: example.translation || '',
        note: example.note || '',
        created_date: example.created_date || Date.now(),
        last_update: example.last_update || Date.now(),
      }

      // Remove empty values
      Object.keys(exampleData).forEach((key) => {
        if (exampleData[key] === '') {
          delete exampleData[key]
        }
      })

      batch.set(docRef, exampleData)
      sqlToFirebaseIds[example.id] = docRef.id
      successCount++
    }

    await batch.commit()
  }

  console.log(`✓ Inserted ${successCount} examples`)
  return sqlToFirebaseIds
}

/**
 * Insert items into Firebase in batches
 */
async function insertItemsToFirebase(items, collectionName = 'items', batchSize = 500) {
  console.log(`\nStarting migration of ${items.length} items...`)
  let successCount = 0
  let errorCount = 0
  const errors = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = db.batch()
    const batchItems = items.slice(i, i + batchSize)

    console.log(
      `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batchItems.length} items)...`,
    )

    for (const item of batchItems) {
      try {
        const docRef = db.collection(collectionName).doc()

        const itemWithId = {
          id: docRef.id,
          ...item,
        }

        batch.set(docRef, itemWithId)
        successCount++
      } catch (error) {
        errorCount++
        errors.push({
          item: item.origin || 'Unknown',
          error: error.message,
        })
        console.error(`Error preparing item "${item.origin}": ${error.message}`)
      }
    }

    try {
      await batch.commit()
      console.log(`✓ Batch ${Math.floor(i / batchSize) + 1} committed successfully`)
    } catch (error) {
      console.error(`✗ Error committing batch: ${error.message}`)
      errorCount += batchItems.length
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('Migration Summary:')
  console.log('='.repeat(50))
  console.log(`Total items processed: ${items.length}`)
  console.log(`✓ Successfully migrated: ${successCount}`)
  console.log(`✗ Failed: ${errorCount}`)

  if (errors.length > 0) {
    console.log('\nErrors (first 10):')
    errors.slice(0, 10).forEach((err) => {
      console.log(`  - ${err.item}: ${err.error}`)
    })
  }

  return { successCount, errorCount, errors }
}

/**
 * Main migration function
 */
async function migrateItems() {
  try {
    const SQL_FILE_PATH = process.argv[2] || './enmory_webapp_11132025.sql'
    const USER_ID = process.argv[3] || null
    const COLLECTION_NAME = 'items'

    console.log('='.repeat(50))
    console.log('Items Migration Script with Meanings & Examples')
    console.log('='.repeat(50))
    console.log(`SQL File: ${SQL_FILE_PATH}`)
    console.log(`Collection: ${COLLECTION_NAME}`)
    console.log(`User ID: ${USER_ID || FB_USER_ID}`)
    console.log('='.repeat(50))

    // Step 1: Parse SQL file
    console.log('\n[1/5] Parsing SQL file...')
    const { items, meanings, examples, meaningExamples } = parseSqlFile(SQL_FILE_PATH)
    console.log(`✓ Parsed ${items.length} items`)
    console.log(`✓ Parsed ${meanings.length} meanings`)
    console.log(`✓ Parsed ${examples.length} examples`)
    console.log(`✓ Parsed ${meaningExamples.length} meaning-example relationships`)

    // Step 2: Insert examples into separate collection
    console.log('\n[2/6] Inserting examples into Firebase...')
    const sqlToFirebaseExampleIds = await insertExamplesToFirebase(examples, USER_ID)
    console.log(`✓ Created ${Object.keys(sqlToFirebaseExampleIds).length} examples`)

    // Step 3: Build lookup maps
    console.log('\n[3/6] Building relationship maps...')
    const { meaningsByItemId, examplesById, exampleIdsByMeaningId } = buildLookupMaps(
      meanings,
      examples,
      meaningExamples,
    )
    console.log(`✓ Built lookup maps`)

    // Step 4: Map to IItem interface with meanings
    console.log('\n[4/6] Mapping records to IItem interface...')
    const mappedItems = items.map((record) =>
      mapToIItem(record, meaningsByItemId, exampleIdsByMeaningId, sqlToFirebaseExampleIds, USER_ID),
    )
    console.log(`✓ Mapped ${mappedItems.length} items with meanings`)

    // Preview first item
    if (mappedItems.length > 0) {
      console.log('\n[5/6] First item preview:')
      const preview = mappedItems.find((item) => item.meanings && item.meanings.length > 0)
      if (preview) {
        console.log(JSON.stringify(preview, null, 2))
      } else {
        console.log(JSON.stringify(mappedItems[0], null, 2))
      }
    }

    // Step 5: Insert items into Firebase
    console.log('\n[6/6] Inserting items into Firebase...')
    await insertItemsToFirebase(mappedItems, COLLECTION_NAME)

    console.log('\n✓ Migration completed!')

    process.exit(0)
  } catch (error) {
    console.error('\n✗ Migration failed:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run migration
migrateItems()
