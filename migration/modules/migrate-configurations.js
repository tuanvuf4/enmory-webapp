/**
 * Configurations Migration Module
 * Migrates user configuration settings from MySQL to Firebase
 */

import { db } from './firebaseConfig.js'
import { safeDate } from './dateUtils.js'

async function migrateConfigurations(connection, userMap) {
  console.log('\n📝 Migrating configurations...')

  try {
    const [configurations] = await connection.execute('SELECT * FROM configuration')

    const batch = db.batch()
    let count = 0
    const errors = []
    const processedUsers = new Set()

    // Process explicit configurations from database
    for (const config of configurations) {
      try {
        const uid = userMap[config.uid]

        if (!uid) {
          errors.push({
            configId: config.id,
            error: `User ${config.uid} not found - skipping orphaned configuration`,
          })
          console.warn(`  ⚠️ Configuration ${config.id}: User ${config.uid} not found - skipping`)
          continue
        }

        processedUsers.add(uid)

        const configRef = db
          .collection('users')
          .doc(uid)
          .collection('configuration')
          .doc('settings')

        batch.set(configRef, {
          community: config.community === 1,
          numberOfWordsInStudySet: config.number_of_words_in_study_set || 20,
          numberOfPhraseInStudySet: config.number_of_phrase_in_study_set || 10,
          numberOfIdiomInStudySet: config.number_of_idiom_in_study_set || 5,
          numberOfSlangInStudySet: config.number_of_slang_in_study_set || 5,
          numberOfCollocationsInStudySet: config.number_of_collocations_in_study_set || 5,
          numberOfSentencesInStudySet: config.number_of_sentences_in_study_set || 5,
          numberOfExampleReview: config.number_of_example_review || 5,
          numberOfDictationItem: config.number_of_dictation_item || 10,
          listeningType: config.listening_type || 'normal',
          player: config.player || 'default',
          created_at: safeDate(config.created_date) || Date.now(),
          updated_at: Date.now(),
        })

        count++
        if (count % 10 === 0) {
          console.log(`  ✓ Processed ${count} configurations`)
        }
      } catch (error) {
        errors.push({ configId: config.id, error: error.message })
        console.error(`  ✗ Error migrating configuration ${config.id}:`, error.message)
      }
    }

    // Create default configurations for users without existing config
    for (const [uid] of Object.entries(userMap)) {
      if (!processedUsers.has(uid)) {
        try {
          const configRef = db
            .collection('users')
            .doc(uid)
            .collection('configuration')
            .doc('settings')

          batch.set(configRef, {
            community: false,
            numberOfWordsInStudySet: 20,
            numberOfPhraseInStudySet: 10,
            numberOfIdiomInStudySet: 5,
            numberOfSlangInStudySet: 5,
            numberOfCollocationsInStudySet: 5,
            numberOfSentencesInStudySet: 5,
            numberOfExampleReview: 5,
            numberOfDictationItem: 10,
            listeningType: 'normal',
            player: 'default',
            created_at: Date.now(),
            updated_at: Date.now(),
          })

          count++
          console.log(`  ℹ️ Created default configuration for user ${uid}`)
        } catch (error) {
          console.error(`  ✗ Error creating default config for user ${uid}:`, error.message)
        }
      }
    }

    await batch.commit()
    console.log(`  ✅ Successfully migrated ${count} configurations`)

    return { count, errors }
  } catch (error) {
    console.error('  ✗ Configuration migration failed:', error.message)
    throw error
  }
}

export { migrateConfigurations }
