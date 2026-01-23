/**
 * Test script to check meaning parsing
 */

import { readFileSync } from 'fs'

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

// Test
console.log('Testing meaning parsing...')
// const sqlContent = readFileSync('./enmory_webapp.sql', 'utf-8')
const sqlContent = readFileSync('./enmory_webapp_test.sql', 'utf-8')

console.log('Parsing meanings...')
const meanings = parseTableFromSql(sqlContent, 'meaning')

console.log(`Total meanings: ${meanings.length}`)
console.log('\nFirst 5 meanings:')
meanings.slice(0, 5).forEach((m, i) => {
  console.log(`\n${i + 1}. Meaning ID: ${m.id}, ItemId: ${m.itemId}`)
  console.log(`   Definition: ${m.definition?.substring(0, 50)}...`)
})

// Count meanings with itemId
const withItemId = meanings.filter((m) => m.itemId !== null && m.itemId !== undefined)
const withoutItemId = meanings.filter((m) => m.itemId === null || m.itemId === undefined)

console.log(`\n✓ Meanings with itemId: ${withItemId.length}`)
console.log(`✗ Meanings without itemId: ${withoutItemId.length}`)
