/**
 * Debug script to check parsing issues
 */

import { readFileSync } from 'fs'

const sqlContent = readFileSync('./enmory_webapp_test.sql', 'utf-8')

// Find first meaning INSERT
const insertPattern = /INSERT INTO\s+`meaning`\s*\(([^)]+)\)\s*VALUES\s*([^;]+);/gis
const matches = Array.from(sqlContent.matchAll(insertPattern))

console.log(`Found ${matches.length} INSERT statements`)

matches.forEach((match, idx) => {
  const columns = match[1].split(',').map((col) => col.trim().replace(/`/g, ''))
  const valuesSection = match[2]

  console.log(`\nINSERT ${idx + 1}:`)
  console.log(`Columns: ${columns.length}`)
  console.log(`Values section length: ${valuesSection.length} chars`)

  // Count opening parentheses to estimate rows
  const openParens = (valuesSection.match(/\(/g) || []).length
  console.log(`Estimated rows (by '(' count): ${openParens}`)

  // Try simple split by "),("
  const simpleSplit = valuesSection.split(/\),\s*\(/g)
  console.log(`Simple split rows: ${simpleSplit.length}`)
})
