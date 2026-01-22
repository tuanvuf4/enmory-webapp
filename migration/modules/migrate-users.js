/**
 * User Migration Module
 * Migrates user data from MySQL to Firebase
 */

import { db, admin } from './firebaseConfig.js'
import { safeDate } from './dateUtils.js'

async function migrateUsers(connection) {
  console.log('\n📝 Migrating users...')

  try {
    const [users] = await connection.execute('SELECT * FROM user')

    if (users.length === 0) {
      console.log('  ℹ️ No users to migrate')
      return { count: 0, errors: [] }
    }

    const batch = db.batch()
    let count = 0
    const errors = []
    const userMap = {}

    for (const user of users) {
      try {
        const uid = String(user.id)
        userMap[user.id] = uid

        const userRef = db.collection('users').doc(uid)

        batch.set(userRef, {
          id: uid,
          username: user.username || '',
          email: user.email || '',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          avatar: user.avatar || '',
          phoneNumber: user.phone_number || '',
          status: user.status === 1,
          sex: user.sex === 1,
          is_active: user.is_active === 1,
          actived_date: safeDate(user.actived_date),
          last_active: safeDate(user.last_active),
          created_at: safeDate(user.created_date) || Date.now(),
          updated_at: Date.now(),
        })

        count++
        if (count % 10 === 0) {
          console.log(`  ✓ Processed ${count} users`)
        }
      } catch (error) {
        errors.push({ uid: user.id, error: error.message })
        console.error(`  ✗ Error migrating user ${user.id}:`, error.message)
      }
    }

    await batch.commit()
    console.log(`  ✅ Successfully migrated ${count} users`)

    return { count, errors, userMap }
  } catch (error) {
    console.error('  ✗ User migration failed:', error.message)
    throw error
  }
}

export { migrateUsers }
