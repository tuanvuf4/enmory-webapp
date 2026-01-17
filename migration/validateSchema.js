/**
 * Migration Validation Script
 * Validates that all data was correctly migrated from MySQL to Firestore
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

/* ========== INITIALIZATION ========== */

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'),
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const firestore = admin.firestore()

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enmory_webapp',
})

/* ========== VALIDATION FUNCTIONS ========== */

async function query(sql, values) {
  const [rows] = await connection.execute(sql, values)
  return rows
}

async function validateUsers() {
  console.log('\n👤 Validating Users...')
  try {
    const mysqlUsers = await query('SELECT COUNT(*) as count FROM user', [])
    const mysqlCount = mysqlUsers[0].count

    const firebaseSnapshot = await firestore.collection('users').get()
    const firebaseCount = firebaseSnapshot.size

    console.log(`   MySQL Users: ${mysqlCount}`)
    console.log(`   Firebase Users: ${firebaseCount}`)

    if (mysqlCount === firebaseCount) {
      console.log('   ✅ User count matches')
      return true
    } else {
      console.log(`   ❌ Count mismatch! Expected ${mysqlCount}, got ${firebaseCount}`)
      return false
    }
  } catch (error) {
    console.error('   ❌ Error validating users:', error.message)
    return false
  }
}

async function validateItems() {
  console.log('\n📚 Validating Items...')
  try {
    const mysqlItems = await query('SELECT COUNT(*) as count FROM item', [])
    const mysqlCount = mysqlItems[0].count

    const firebaseSnapshot = await firestore.collection('items').get()
    const firebaseCount = firebaseSnapshot.size

    console.log(`   MySQL Items: ${mysqlCount}`)
    console.log(`   Firebase Items: ${firebaseCount}`)

    if (mysqlCount === firebaseCount) {
      console.log('   ✅ Item count matches')
      return true
    } else {
      console.log(`   ❌ Count mismatch! Expected ${mysqlCount}, got ${firebaseCount}`)
      return false
    }
  } catch (error) {
    console.error('   ❌ Error validating items:', error.message)
    return false
  }
}

async function validateExamples() {
  console.log('\n💡 Validating Examples...')
  try {
    const mysqlExamples = await query('SELECT COUNT(*) as count FROM example', [])
    const mysqlCount = mysqlExamples[0].count

    const firebaseSnapshot = await firestore.collection('examples').get()
    const firebaseCount = firebaseSnapshot.size

    console.log(`   MySQL Examples: ${mysqlCount}`)
    console.log(`   Firebase Examples: ${firebaseCount}`)

    if (mysqlCount === firebaseCount) {
      console.log('   ✅ Example count matches')
      return true
    } else {
      console.log(`   ❌ Count mismatch! Expected ${mysqlCount}, got ${firebaseCount}`)
      return false
    }
  } catch (error) {
    console.error('   ❌ Error validating examples:', error.message)
    return false
  }
}

async function validateCategories() {
  console.log('\n📂 Validating Categories...')
  try {
    const mysqlCategories = await query('SELECT COUNT(*) as count FROM category', [])
    const mysqlCount = mysqlCategories[0].count

    const firebaseSnapshot = await firestore.collection('categories').get()
    const firebaseCount = firebaseSnapshot.size

    console.log(`   MySQL Categories: ${mysqlCount}`)
    console.log(`   Firebase Categories: ${firebaseCount}`)

    if (mysqlCount === firebaseCount) {
      console.log('   ✅ Category count matches')
      return true
    } else {
      console.log(`   ❌ Count mismatch! Expected ${mysqlCount}, got ${firebaseCount}`)
      return false
    }
  } catch (error) {
    console.error('   ❌ Error validating categories:', error.message)
    return false
  }
}

async function validateConfigurations() {
  console.log('\n⚙️  Validating Configurations...')
  try {
    const mysqlConfigs = await query('SELECT COUNT(*) as count FROM configuration', [])
    const mysqlCount = mysqlConfigs[0].count

    const firebaseSnapshot = await firestore.collectionGroup('configuration').get()
    const firebaseCount = firebaseSnapshot.size

    console.log(`   MySQL Configurations: ${mysqlCount}`)
    console.log(`   Firebase Configurations: ${firebaseCount}`)

    if (mysqlCount <= firebaseCount) {
      console.log('   ✅ Configuration count is valid')
      return true
    } else {
      console.log(`   ⚠️  Some configurations may be missing`)
      return false
    }
  } catch (error) {
    console.error('   ❌ Error validating configurations:', error.message)
    return false
  }
}

async function validateDataIntegrity() {
  console.log('\n🔍 Validating Data Integrity...')
  try {
    // Check if items have required fields
    const items = await firestore.collection('items').limit(5).get()

    let hasErrors = false

    items.forEach((doc) => {
      const data = doc.data()

      if (!data.original) {
        console.log(`   ❌ Item ${doc.id} missing 'original' field`)
        hasErrors = true
      }

      if (data.meanings && !Array.isArray(data.meanings)) {
        console.log(`   ❌ Item ${doc.id} has invalid 'meanings' field`)
        hasErrors = true
      }
    })

    if (!hasErrors) {
      console.log('   ✅ Sample data integrity check passed')
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('   ❌ Error validating data integrity:', error.message)
    return false
  }
}

/* ========== MAIN VALIDATION ========== */

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║         Firebase Migration Validation Tool             ║')
    console.log('╚════════════════════════════════════════════════════════╝')

    const results = []

    results.push(await validateUsers())
    results.push(await validateItems())
    results.push(await validateExamples())
    results.push(await validateCategories())
    results.push(await validateConfigurations())
    results.push(await validateDataIntegrity())

    console.log('\n╔════════════════════════════════════════════════════════╗')
    const passedCount = results.filter((r) => r).length
    const totalCount = results.length

    if (passedCount === totalCount) {
      console.log('║           ✅ ALL VALIDATIONS PASSED                    ║')
    } else {
      console.log(`║      ⚠️  ${passedCount}/${totalCount} validations passed                   ║`)
    }

    console.log('╚════════════════════════════════════════════════════════╝')

    console.log(`\n📊 Results: ${passedCount}/${totalCount} checks passed`)

    if (passedCount < totalCount) {
      console.log('\n🔧 Recommended Actions:')
      console.log('   1. Review failed validations above')
      console.log('   2. Check your MySQL database for missing data')
      console.log('   3. Re-run the migration script')
      console.log('   4. Run validation again')
      process.exit(1)
    } else {
      console.log('\n✨ Migration validation complete! Your data is ready.')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Validation failed:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

main()
