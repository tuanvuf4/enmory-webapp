#!/usr/bin/env node

/**
 * Individual Table Migration Runner
 * Run specific table migrations independently
 * 
 * Usage: node run-migration.js [table-name]
 * 
 * Examples:
 *   node run-migration.js users
 *   node run-migration.js categories
 *   node run-migration.js items
 *   node run-migration.js all
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import { migrateUsers } from './modules/migrate-users.js'
import { migrateCategories } from './modules/migrate-categories.js'
import { migrateExamples } from './modules/migrate-examples.js'
import { migrateMeanings } from './modules/migrate-meanings.js'
import { migrateItems } from './modules/migrate-items.js'
import { migrateConfigurations } from './modules/migrate-configurations.js'

// Load environment variables
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ========== CONSTANTS ========== */

const MIGRATIONS = {
  users: {
    name: 'Users',
    func: migrateUsers,
    description: 'Migrate user accounts',
  },
  categories: {
    name: 'Categories',
    func: migrateCategories,
    description: 'Migrate learning categories',
  },
  examples: {
    name: 'Examples',
    func: migrateExamples,
    description: 'Migrate example sentences',
  },
  meanings: {
    name: 'Meanings',
    func: migrateMeanings,
    description: 'Process word meanings (preparation for items)',
  },
  items: {
    name: 'Items',
    func: migrateItems,
    description: 'Migrate learning items with nested data',
  },
  configurations: {
    name: 'Configurations',
    func: migrateConfigurations,
    description: 'Migrate user configurations',
  },
}

const MIGRATION_ORDER = ['categories', 'users', 'examples', 'meanings', 'items', 'configurations']

/* ========== HELPER FUNCTIONS ========== */

function printUsage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           Individual Table Migration Runner                        ║
╚════════════════════════════════════════════════════════════════════╝

Usage: node run-migration.js [table-name]

Available migrations:
`)

  MIGRATION_ORDER.forEach((key) => {
    const m = MIGRATIONS[key]
    console.log(`  ${key.padEnd(15)} - ${m.description}`)
  })

  console.log(`
  all                - Run all migrations in order

Examples:
  node run-migration.js users
  node run-migration.js categories
  node run-migration.js items
  node run-migration.js all

Special options:
  --help             - Show this help message
  --list             - List all available migrations
`)
}

function listMigrations() {
  console.log('\n📋 Available Migrations:\n')
  MIGRATION_ORDER.forEach((key, index) => {
    const m = MIGRATIONS[key]
    console.log(`  ${index + 1}. ${m.name.padEnd(15)} (${key})`)
    console.log(`     └─ ${m.description}\n`)
  })
}

/* ========== MAIN FUNCTION ========== */

async function runMigration(tableName) {
  let connection = null

  try {
    // Get command line argument
    const target = (tableName || process.argv[2] || '').toLowerCase()

    // Handle help and list commands
    if (target === '--help' || target === '-h') {
      printUsage()
      process.exit(0)
    }

    if (target === '--list' || target === '-l') {
      listMigrations()
      process.exit(0)
    }

    if (!target) {
      console.error('❌ No migration specified!\n')
      printUsage()
      process.exit(1)
    }

    // Determine which migrations to run (will be recalculated with dependencies below)
    const requestedTarget = target

    // Connect to MySQL
    console.log('\n🔌 Connecting to MySQL database...')
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'enmory_webapp',
    })
    console.log('  ✅ Connected to MySQL\n')

    // Run migrations
    let results = {}
    const startTime = Date.now()

    // For individual migrations, ensure dependencies are run first
    let migrationsToRun = []
    if (requestedTarget === 'all') {
      migrationsToRun = MIGRATION_ORDER
    } else if (MIGRATIONS[requestedTarget]) {
      // Add dependencies if running individual migrations
      const dependencies = {
        meanings: ['examples'],
        items: ['users', 'examples', 'meanings'],
        configurations: ['users'],
      }
      
      migrationsToRun = [...(dependencies[requestedTarget] || []), requestedTarget]
      // Remove duplicates while preserving order
      migrationsToRun = [...new Set(migrationsToRun)]
      // But reorder to follow MIGRATION_ORDER
      migrationsToRun = MIGRATION_ORDER.filter(m => migrationsToRun.includes(m))
    } else {
      console.error(`❌ Unknown migration: "${requestedTarget}"\n`)
      console.log('Available migrations:', Object.keys(MIGRATIONS).join(', '))
      process.exit(1)
    }

    for (const migrationKey of migrationsToRun) {
      const migration = MIGRATIONS[migrationKey]
      const migrationFunc = migration.func

      // Special handling for migrations that need maps
      const args = [connection]

      // Add dependency maps if needed
      if (migrationKey === 'meanings' && results.examples) {
        args.push(results.examples.exampleMap)
      }
      if (migrationKey === 'items' && results.users && results.meanings && results.examples) {
        args.push(results.users.userMap)
        args.push(results.meanings.meaningsByItem)
        args.push(results.examples.exampleMap)
      }
      if (migrationKey === 'configurations' && results.users) {
        args.push(results.users.userMap)
      }

      // Run migration
      results[migrationKey] = await migrationFunc(...args)
    }

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n')
    console.log('╔════════════════════════════════════════════════════════════════════╗')
    console.log('║                     MIGRATION SUMMARY                              ║')
    console.log('╚════════════════════════════════════════════════════════════════════╝')
    console.log('\n📊 Results:\n')

    let totalCount = 0
    let totalErrors = 0

    for (const key of migrationsToRun) {
      const result = results[key]
      const count = result.count || 0
      const errors = result.errors ? result.errors.length : 0
      totalCount += count
      totalErrors += errors

      const status = errors === 0 ? '✅' : '⚠️'
      const migration = MIGRATIONS[key]
      console.log(
        `  ${status} ${migration.name.padEnd(15)} | ${String(count).padEnd(6)} migrated | ${errors} errors`,
      )
    }

    console.log(`\n📈 Summary:`)
    console.log(`  Total Records: ${totalCount}`)
    console.log(`  Total Errors:  ${totalErrors}`)
    console.log(`  Duration:      ${duration}s`)

    if (totalErrors === 0) {
      console.log('\n✅ Migration completed successfully!')
    } else {
      console.log(`\n⚠️ Migration completed with ${totalErrors} error(s)`)
    }

    console.log('\n═══════════════════════════════════════════════════════════════════')

  } catch (error) {
    console.error('\n❌ Migration failed with error:')
    console.error(`   ${error.message}`)
    console.error('\n📋 Troubleshooting:')
    console.error('   1. Check MySQL credentials in .env')
    console.error('   2. Verify serviceAccountKey.json exists')
    console.error('   3. Ensure database exists: ' + (process.env.DB_NAME || 'enmory_webapp'))
    process.exit(1)
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (error) {
        console.error('Error closing MySQL connection:', error.message)
      }
    }
  }
}

/* ========== RUN ========== */

runMigration().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
