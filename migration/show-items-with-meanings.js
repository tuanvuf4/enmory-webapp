import { readFileSync } from 'fs'

function parseValue(value) {
  if (value.toLowerCase() === 'null') return null
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  if (!isNaN(value)) return Number(value)
  return value
}

function parseTableFromSql(sqlContent, tableName) {
  const records = []
  const insertPattern = new RegExp(
    `INSERT INTO\\s+\`${tableName}\`\\s*\\(([^)]+)\\)\\s*VALUES\\s*([^;]+);`,
    'gis',
  )
  const matches = sqlContent.matchAll(insertPattern)
  for (const match of matches) {
    const columns = match[1].split(',').map((col) => col.trim().replace(/`/g, ''))
    const valuesSection = match[2]
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
        if (char === "'" && inString) {
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

// const sqlContent = readFileSync('./enmory_webapp_test.sql', 'utf-8')
const sqlContent = readFileSync('./enmory_webapp.sql', 'utf-8')
const items = parseTableFromSql(sqlContent, 'item')
const meanings = parseTableFromSql(sqlContent, 'meaning')

const itemIds = new Set(items.map((i) => i.id))
const meaningsByItemId = {}

meanings.forEach((m) => {
  if (m.itemId && itemIds.has(m.itemId)) {
    if (!meaningsByItemId[m.itemId]) meaningsByItemId[m.itemId] = []
    meaningsByItemId[m.itemId].push(m)
  }
})

console.log('\nItems with meanings:')
console.log('='.repeat(60))
Object.keys(meaningsByItemId).forEach((itemId) => {
  const item = items.find((i) => i.id == itemId)
  const meaningsCount = meaningsByItemId[itemId].length
  console.log(
    `ID: ${itemId.toString().padEnd(6)} | ${item?.original.padEnd(30)} | ${meaningsCount} meaning(s)`,
  )
})

console.log('\n' + '='.repeat(60))
console.log(`Total: ${Object.keys(meaningsByItemId).length} items have meanings`)
console.log(`Total: ${items.length - Object.keys(meaningsByItemId).length} items have NO meanings`)
