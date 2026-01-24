import { readFileSync } from 'fs'

function parseValue(value) {
  if (value.toLowerCase() === 'null') return null
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  if (!isNaN(value)) return Number(value)
  return value
}

function decodeSqlString(str) {
  if (typeof str !== 'string') return str

  return str
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\\/g, '\\')
}

function parseTableFromSql(sqlContent, tableName) {
  const records = []

  const insertPattern = new RegExp(
    `INSERT INTO\\s+\`${tableName}\`\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);(?=\\s*(?:INSERT|$))`,
    'gi',
  )
  const matches = sqlContent.matchAll(insertPattern)

  let statementCount = 0
  for (const match of matches) {
    statementCount++
    const columns = match[1].split(',').map((col) => col.trim().replace(/`/g, ''))
    const valuesSection = match[2]

    console.log(`\nStatement ${statementCount}: ${columns.length} columns`)
    console.log(`Columns: ${columns.join(', ')}`)

    const rows = []
    let depth = 0
    let inString = false
    let currentRow = ''
    let escapeNext = false

    for (let i = 0; i < valuesSection.length; i++) {
      const char = valuesSection[i]

      if (escapeNext) {
        currentRow += char
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        currentRow += char
        continue
      }

      if (char === "'" && !inString) {
        inString = true
        currentRow += char
        continue
      }

      if (char === "'" && inString) {
        inString = false
        currentRow += char
        continue
      }

      if (!inString) {
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
      }

      if (depth > 0) {
        currentRow += char
      }
    }

    console.log(`  Rows found: ${rows.length}`)

    // Parse first and last rows of this statement
    const parseRow = (rowString, rowNum) => {
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
          values.push(decodeSqlString(current))
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

      console.log(`  Row ${rowNum}: ${values.length} values`)
      if (values.length !== columns.length) {
        console.log(
          `    ⚠ WARNING: Column/value mismatch! Expected ${columns.length}, got ${values.length}`,
        )
        console.log(`    First few values:`, values.slice(0, 5))
        console.log(`    Last few values:`, values.slice(-5))
        console.log(`    Record:`, record)
      }

      return { record, valueCount: values.length }
    }

    if (rows.length > 0) {
      console.log(`  First row of statement ${statementCount}:`)
      const first = parseRow(rows[0], 1)
      records.push(first.record)

      console.log(`  Last row of statement ${statementCount}:`)
      const last = parseRow(rows[rows.length - 1], rows.length)
      records.push(last.record)

      // Add middle rows without parsing details
      for (let i = 1; i < rows.length - 1; i++) {
        const { record } = parseRow(rows[i], i + 1)
        records.push(record)
      }
    }
  }

  return records
}

console.log('Reading SQL file...')
const sqlContent = readFileSync('./enmory_webapp_test.sql', 'utf-8')

console.log('Parsing items table...')
const items = parseTableFromSql(sqlContent, 'item')

console.log(`\nTotal items parsed: ${items.length}`)
console.log(`\nChecking for issues...`)

let itemsWithMismatch = 0
items.forEach((item, idx) => {
  if (!item.original || item.original === '') {
    itemsWithMismatch++
    if (itemsWithMismatch <= 10) {
      console.log(`Item ${idx}:`, item)
    }
  }
})

console.log(`\nTotal items with missing origin: ${itemsWithMismatch}`)
