import {
  collection,
  deleteField,
  documentId,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { IExample, IItem, IMeaning } from '@/models/item.model'
import { localDb, invalidateSearchIndex } from '@/services/localDb'

const FIRESTORE_IN_QUERY_LIMIT = 30
const FIRESTORE_BATCH_WRITE_LIMIT = 400

export interface IIntegrationResult {
  isSuccess: boolean
  totalItems: number
  itemsScanned: number
  itemsUpdated: number
  examplesEmbedded: number
  alreadyIntegrated: number
  errors: string[]
  message: string
}

/**
 * Remove undefined values recursively from objects/arrays to satisfy Firestore rules.
 */
export const removeUndefinedFields = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields) as unknown as T
  }
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefinedFields(value)
      }
    }
    return result as T
  }
  return obj
}

/**
 * Extract all IExample objects from a list of IItem objects.
 * Used for extracting examples embedded in items without querying any examples collection.
 */
export const extractExamplesFromItems = (items: IItem[]): IExample[] => {
  const examplesById = new Map<string, IExample>()

  for (const item of items) {
    for (const meaning of item.meanings || []) {
      for (const example of (meaning.examples || []) as unknown[]) {
        if (typeof example === 'object' && example !== null) {
          const ex = example as IExample
          // Only extract if example has non-empty origin to avoid overwriting valid examples with stubs
          if (ex.origin && ex.origin.trim()) {
            if (ex.id) {
              examplesById.set(ex.id, ex)
            } else {
              const fallbackKey = `${item.id || ''}_${ex.origin}`
              examplesById.set(fallbackKey, { ...ex, id: fallbackKey })
            }
          }
        }
      }
    }
  }

  return Array.from(examplesById.values())
}

/**
 * Sanitizes an item payload before writing to Firestore, ensuring:
 * 1. Meanings and embedded examples are clean and conform to IMeaning / IExample.
 * 2. Examples are kept as full IExample objects (NOT string IDs).
 * 3. No undefined properties exist.
 * 4. CRITICAL: Only updates meanings if `meanings` was explicitly provided in the payload!
 *    Partial updates (favorite, level, archive, etc.) MUST NOT overwrite meanings with [].
 */
export const sanitizeItemForFirestore = (item: Partial<IItem>): any => {
  const { id: _docId, quiz: _quiz, ...rest } = item as any
  delete rest.quiz

  const cleanItem: any = {
    ...rest,
  }

  if (rest.meanings !== undefined) {
    cleanItem.meanings = (rest.meanings || []).map((meaning: IMeaning) => ({
      ...meaning,
      examples: ((meaning.examples || []) as unknown[]).map((ex: any) => {
        if (typeof ex === 'string') {
          return {
            id: ex,
            origin: '',
            translation: '',
            note: '',
          }
        }
        return {
          id: ex.id || '',
          uid: ex.uid || rest.uid || '',
          origin: ex.origin || '',
          translation: ex.translation || '',
          note: ex.note || '',
          created_date: ex.created_date || Date.now(),
          last_update: ex.last_update || Date.now(),
          randomIndex: ex.randomIndex ?? Math.random(),
        }
      }),
    }))
  }

  return removeUndefinedFields(cleanItem)
}

/**
 * Hydrates items that contain string example IDs or empty example stubs.
 * Ensures items have valid structure without querying Firestore or localDb examples.
 */
export const hydrateItemsWithExamples = async (items: IItem[]): Promise<IItem[]> => {
  if (!items || items.length === 0) return items

  // Examples are already embedded directly in items.
  // Return items with quiz removed without querying any examples table/collection.
  return items.map((item) => {
    const { quiz: _quiz, ...cleanItem } = item as any
    return cleanItem as IItem
  })
}

/**
 * Normalizes item examples in memory (defensive fallback for any unmigrated string IDs).
 * Also defensively ensures no quiz property is persisted to localDb.
 */
export const normalizeItemExamples = (items: IItem[]): IItem[] => {
  return items.map((item) => {
    const { quiz: _quiz, ...cleanItem } = item as any
    return {
      ...cleanItem,
      meanings: (cleanItem.meanings || []).map((meaning: IMeaning) => ({
        ...meaning,
        examples: ((meaning.examples || []) as unknown[]).map((ex: any) => {
          if (typeof ex === 'string') {
            return {
              id: ex,
              origin: '',
              translation: '',
              note: '',
            } as IExample
          }
          return ex as IExample
        }),
      })),
    }
  })
}

/**
 * Integrates (migrates) examples directly into item meanings in Firebase Firestore.
 * Finds items where meanings[].examples contains string IDs, fetches the corresponding
 * example documents from Firestore's examples collection (or localDb fallback),
 * embeds them as IExample[] in each meaning, and updates the item documents in Firestore.
 */
export const integrateFirebaseDbExamples = async (options?: {
  uid?: string
  onProgress?: (message: string, current?: number, total?: number) => void
}): Promise<IIntegrationResult> => {
  const result: IIntegrationResult = {
    isSuccess: false,
    totalItems: 0,
    itemsScanned: 0,
    itemsUpdated: 0,
    examplesEmbedded: 0,
    alreadyIntegrated: 0,
    errors: [],
    message: '',
  }

  try {
    options?.onProgress?.('Fetching items from Firestore...')

    // 1. Fetch items from Firestore
    let itemsQuery = query(collection(db, dbCollections.items))
    if (options?.uid) {
      itemsQuery = query(collection(db, dbCollections.items), where('uid', '==', options.uid))
    }

    const itemsSnapshot = await getDocs(itemsQuery)
    result.totalItems = itemsSnapshot.size
    result.itemsScanned = itemsSnapshot.size

    // 2. Scan items and collect example IDs that are strings
    const exampleIdSet = new Set<string>()
    const itemsToUpdate: Array<{
      ref: any
      itemData: any
      stringExampleIds: string[]
    }> = []

    for (const docSnap of itemsSnapshot.docs) {
      const data = docSnap.data()
      const meanings = data.meanings || []
      const itemStringExampleIds: string[] = []

      for (const meaning of meanings) {
        for (const ex of meaning.examples || []) {
          if (typeof ex === 'string' && ex.trim()) {
            itemStringExampleIds.push(ex.trim())
            exampleIdSet.add(ex.trim())
          }
        }
      }

      if (itemStringExampleIds.length > 0) {
        itemsToUpdate.push({
          ref: docSnap.ref,
          itemData: data,
          stringExampleIds: itemStringExampleIds,
        })
      } else {
        result.alreadyIntegrated++
      }
    }

    options?.onProgress?.(
      `Found ${itemsToUpdate.length} items needing migration with ${exampleIdSet.size} unique examples...`,
      0,
      itemsToUpdate.length,
    )

    if (itemsToUpdate.length === 0) {
      result.isSuccess = true
      result.message = `All ${result.totalItems} items already have examples integrated!`
      options?.onProgress?.(result.message)
      return result
    }

    // 3. Fetch all referenced examples from Firestore in batches
    const examplesMap = new Map<string, IExample>()
    const allExampleIds = Array.from(exampleIdSet)

    for (let i = 0; i < allExampleIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
      const chunk = allExampleIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT)
      options?.onProgress?.(
        `Fetching examples ${Math.min(i + chunk.length, allExampleIds.length)}/${allExampleIds.length} from Firestore...`,
      )

      try {
        const exSnapshot = await getDocs(
          query(collection(db, 'examples'), where(documentId(), 'in', chunk)),
        )
        exSnapshot.forEach((docSnap) => {
          examplesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as IExample)
        })
      } catch (err: any) {
        result.errors.push(`Error fetching chunk ${i}: ${err.message}`)
      }
    }

    // Fallback: check localDb.items for any missing example IDs
    const missingIds = new Set(allExampleIds.filter((id) => !examplesMap.has(id)))
    if (missingIds.size > 0) {
      try {
        const localItems = await localDb.items.toArray()
        for (const it of localItems) {
          for (const m of it.meanings || []) {
            for (const ex of (m.examples || []) as any[]) {
              if (ex && typeof ex === 'object' && ex.id && missingIds.has(ex.id)) {
                examplesMap.set(ex.id, ex as IExample)
                missingIds.delete(ex.id)
              }
            }
          }
        }
      } catch (localErr) {
        console.warn('Fallback to localDb.items failed:', localErr)
      }
    }

    // 4. Update items in Firestore with embedded IExample[]
    let currentBatch = writeBatch(db)
    let batchCount = 0
    let processedCount = 0

    for (const { ref, itemData } of itemsToUpdate) {
      const updatedMeanings = (itemData.meanings || []).map((meaning: any) => {
        const currentExamples = meaning.examples || []
        const embeddedExamples = currentExamples.map((ex: any) => {
          if (typeof ex === 'string') {
            const found = examplesMap.get(ex)
            if (found) {
              result.examplesEmbedded++
              return {
                id: found.id || ex,
                uid: found.uid || itemData.uid || '',
                origin: found.origin || '',
                translation: found.translation || '',
                note: found.note || '',
                created_date: found.created_date || Date.now(),
                last_update: found.last_update || Date.now(),
                randomIndex: found.randomIndex ?? Math.random(),
              }
            }
            return {
              id: ex,
              origin: '',
              translation: '',
              note: '',
            }
          }
          return ex
        })

        return {
          ...meaning,
          examples: embeddedExamples,
        }
      })

      const updatePayload = removeUndefinedFields({
        meanings: updatedMeanings,
        last_update: Date.now(),
      })

      currentBatch.update(ref, updatePayload)
      batchCount++
      processedCount++
      result.itemsUpdated++

      if (batchCount >= FIRESTORE_BATCH_WRITE_LIMIT) {
        options?.onProgress?.(
          `Writing updates to Firestore: ${processedCount}/${itemsToUpdate.length}...`,
          processedCount,
          itemsToUpdate.length,
        )
        await currentBatch.commit()
        currentBatch = writeBatch(db)
        batchCount = 0
      }
    }

    if (batchCount > 0) {
      options?.onProgress?.(
        `Finalizing updates: ${processedCount}/${itemsToUpdate.length}...`,
        processedCount,
        itemsToUpdate.length,
      )
      await currentBatch.commit()
    }

    result.isSuccess = true
    result.message = `Successfully integrated ${result.examplesEmbedded} examples into ${result.itemsUpdated} items in Firebase DB.`
    options?.onProgress?.(result.message)
    return result
  } catch (error: any) {
    console.error('Failed to integrate Firebase DB examples:', error)
    result.errors.push(error.message || String(error))
    result.message = error.message || 'Integration failed'
    return result
  }
}

export interface IRemoveLegacyFieldsResult {
  isSuccess: boolean
  totalItems: number
  itemsScanned: number
  itemsUpdated: number
  examplesUpdated: number
  errors: string[]
  message: string
}

export type IRemoveKeywordsResult = IRemoveLegacyFieldsResult
export type IRemoveOriginLowercaseResult = IRemoveLegacyFieldsResult

/**
 * Removes legacy search fields (`keywords` and `origin_lowercase`) from:
 * 1. Root level of items documents in Firestore.
 * 2. Meanings and embedded examples inside items documents.
 * 3. Standalone examples collection documents in Firestore.
 * 4. Local IndexedDB cache (items and examples).
 */
export const removeLegacyFieldsFromFirebaseDb = async (options?: {
  uid?: string
  onProgress?: (message: string, current?: number, total?: number) => void
}): Promise<IRemoveLegacyFieldsResult> => {
  const result: IRemoveLegacyFieldsResult = {
    isSuccess: false,
    totalItems: 0,
    itemsScanned: 0,
    itemsUpdated: 0,
    examplesUpdated: 0,
    errors: [],
    message: '',
  }

  try {
    options?.onProgress?.('Fetching items from Firestore...')

    // 1. Process items collection
    let itemsQuery = query(collection(db, dbCollections.items))
    if (options?.uid) {
      itemsQuery = query(collection(db, dbCollections.items), where('uid', '==', options.uid))
    }

    const itemsSnapshot = await getDocs(itemsQuery)
    result.totalItems = itemsSnapshot.size
    result.itemsScanned = itemsSnapshot.size

    const itemsToUpdate: Array<{
      ref: any
      updatedMeanings: any[]
      hasRootKeywords: boolean
      hasRootOriginLowercase: boolean
    }> = []

    for (const docSnap of itemsSnapshot.docs) {
      const data = docSnap.data()
      const hasRootKeywords = 'keywords' in data
      const hasRootOriginLowercase = 'origin_lowercase' in data
      let hasMeaningOrExampleChanges = false

      const meanings = data.meanings || []
      const updatedMeanings = meanings.map((meaning: any) => {
        let meaningChanged = false
        const cleanMeaning = { ...meaning }

        if ('keywords' in cleanMeaning) {
          delete cleanMeaning.keywords
          meaningChanged = true
          hasMeaningOrExampleChanges = true
        }

        const examples = cleanMeaning.examples || []
        const updatedExamples = examples.map((ex: any) => {
          if (typeof ex === 'object' && ex !== null) {
            let exChanged = false
            const cleanEx = { ...ex }
            if ('keywords' in cleanEx) {
              delete cleanEx.keywords
              exChanged = true
            }
            if ('origin_lowercase' in cleanEx) {
              delete cleanEx.origin_lowercase
              exChanged = true
            }
            if (exChanged) {
              meaningChanged = true
              hasMeaningOrExampleChanges = true
              return cleanEx
            }
          }
          return ex
        })

        if (meaningChanged) {
          cleanMeaning.examples = updatedExamples
        }

        return cleanMeaning
      })

      if (hasRootKeywords || hasRootOriginLowercase || hasMeaningOrExampleChanges) {
        itemsToUpdate.push({
          ref: docSnap.ref,
          updatedMeanings,
          hasRootKeywords,
          hasRootOriginLowercase,
        })
      }
    }

    options?.onProgress?.(
      `Found ${itemsToUpdate.length} items with legacy fields to clean up out of ${result.totalItems}...`,
      0,
      itemsToUpdate.length,
    )

    let currentBatch = writeBatch(db)
    let batchCount = 0
    let processedCount = 0

    for (const { ref, updatedMeanings, hasRootKeywords, hasRootOriginLowercase } of itemsToUpdate) {
      const updatePayload: any = {
        meanings: updatedMeanings,
        last_update: Date.now(),
      }

      if (hasRootKeywords) {
        updatePayload.keywords = deleteField()
      }
      if (hasRootOriginLowercase) {
        updatePayload.origin_lowercase = deleteField()
      }

      currentBatch.update(ref, updatePayload)
      batchCount++
      processedCount++
      result.itemsUpdated++

      if (batchCount >= FIRESTORE_BATCH_WRITE_LIMIT) {
        options?.onProgress?.(
          `Updating items in Firestore: ${processedCount}/${itemsToUpdate.length}...`,
          processedCount,
          itemsToUpdate.length,
        )
        await currentBatch.commit()
        currentBatch = writeBatch(db)
        batchCount = 0
      }
    }

    if (batchCount > 0) {
      options?.onProgress?.('Finalizing updates in Firestore...')
      await currentBatch.commit()
    }

    // 3. Clean up local IndexedDB cache
    try {
      const allLocal = await localDb.items.toArray()
      const localToUpdate: IItem[] = []
      for (const item of allLocal) {
        let changed = false
        const cleanItem: any = { ...item }
        if ('keywords' in cleanItem) {
          delete cleanItem.keywords
          changed = true
        }
        if ('origin_lowercase' in cleanItem) {
          delete cleanItem.origin_lowercase
          changed = true
        }
        if (cleanItem.meanings) {
          cleanItem.meanings = cleanItem.meanings.map((m: any) => {
            let mChanged = false
            const cleanM = { ...m }
            if ('keywords' in cleanM) {
              delete cleanM.keywords
              mChanged = true
            }
            if (cleanM.examples) {
              cleanM.examples = cleanM.examples.map((ex: any) => {
                if (typeof ex === 'object' && ex !== null) {
                  let exChanged = false
                  const cleanEx = { ...ex }
                  if ('keywords' in cleanEx) {
                    delete cleanEx.keywords
                    exChanged = true
                  }
                  if ('origin_lowercase' in cleanEx) {
                    delete cleanEx.origin_lowercase
                    exChanged = true
                  }
                  if (exChanged) {
                    mChanged = true
                    return cleanEx
                  }
                }
                return ex
              })
            }
            if (mChanged) {
              changed = true
              return cleanM
            }
            return m
          })
        }
        if (changed) {
          localToUpdate.push(cleanItem)
        }
      }
      if (localToUpdate.length > 0) {
        await localDb.items.bulkPut(localToUpdate)
      }
    } catch (localErr) {
      console.warn('Failed to clean up legacy fields in localDb:', localErr)
    }

    result.isSuccess = true
    if (result.itemsUpdated === 0 && result.examplesUpdated === 0) {
      result.message =
        'No legacy fields (keywords & origin_lowercase) found. Firebase DB is already clean!'
    } else {
      result.message = `Successfully removed legacy fields (keywords & origin_lowercase) from ${result.itemsUpdated} items and ${result.examplesUpdated} standalone examples in Firebase DB.`
    }
    options?.onProgress?.(result.message)
    return result
  } catch (error: any) {
    console.error('Failed to remove legacy fields from Firebase DB:', error)
    result.errors.push(error.message || String(error))
    result.message = error.message || 'Failed to remove legacy fields'
    return result
  }
}

/** @deprecated Use removeLegacyFieldsFromFirebaseDb instead */
export const removeKeywordsFromFirebaseDb = removeLegacyFieldsFromFirebaseDb
/** @deprecated Use removeLegacyFieldsFromFirebaseDb instead */
export const removeOriginLowercaseFromFirebaseDb = removeLegacyFieldsFromFirebaseDb

export interface IPurgeDeletedItemsResult {
  isSuccess: boolean
  totalScanned: number
  itemsDeleted: number
  errors: string[]
  message: string
  deletedItems: Array<{ id: string; origin: string; uid?: string; deleted_date?: number }>
}

/**
 * Permanently deletes (purges) all items marked with is_deleted = true from Firebase Firestore.
 * Also cleans up local IndexedDB cache and any orphaned checklist entries for those items.
 */
export const purgeDeletedItemsFromFirebaseDb = async (options?: {
  uid?: string
  onProgress?: (message: string, current?: number, total?: number) => void
}): Promise<IPurgeDeletedItemsResult> => {
  const result: IPurgeDeletedItemsResult = {
    isSuccess: false,
    totalScanned: 0,
    itemsDeleted: 0,
    errors: [],
    message: '',
    deletedItems: [],
  }

  try {
    options?.onProgress?.('Fetching soft-deleted items from Firestore (is_deleted = true)...')

    // Query Firestore for documents where is_deleted == true
    const deletedQuery = query(collection(db, dbCollections.items), where('is_deleted', '==', true))

    const snapshot = await getDocs(deletedQuery)
    result.totalScanned = snapshot.size

    // Filter by uid if specified
    const docsToDelete = snapshot.docs.filter((docSnap) => {
      if (!options?.uid) return true
      return docSnap.data().uid === options.uid
    })

    if (docsToDelete.length === 0) {
      result.isSuccess = true
      result.message = options?.uid
        ? 'No items with is_deleted = true found for the current user in Firestore.'
        : 'No items with is_deleted = true found in Firestore.'
      options?.onProgress?.(result.message)
      return result
    }

    options?.onProgress?.(
      `Found ${docsToDelete.length} soft-deleted items. Permanently deleting documents from Firestore...`,
      0,
      docsToDelete.length,
    )

    const deletedIds: string[] = []
    const deletedDetails: Array<{
      id: string
      origin: string
      uid?: string
      deleted_date?: number
    }> = []

    let currentBatch = writeBatch(db)
    let batchCount = 0
    let processedCount = 0

    for (const docSnap of docsToDelete) {
      const data = docSnap.data()
      deletedIds.push(docSnap.id)
      deletedDetails.push({
        id: docSnap.id,
        origin: data.origin || '(no origin)',
        uid: data.uid || '',
        deleted_date: data.deleted_date || data.last_update,
      })

      currentBatch.delete(docSnap.ref)
      batchCount++

      const itemUid = data.uid || options?.uid || ''
      if (itemUid) {
        const deletedRecordRef = doc(db, dbCollections.deleted_records, `${itemUid}_${docSnap.id}`)
        currentBatch.set(deletedRecordRef, {
          uid: itemUid,
          recordId: docSnap.id,
          collectionName: dbCollections.items,
          deleted_at: Timestamp.now(),
        })
        batchCount++
      }

      processedCount++
      result.itemsDeleted++

      if (batchCount >= FIRESTORE_BATCH_WRITE_LIMIT) {
        options?.onProgress?.(
          `Deleting from Firestore: ${processedCount}/${docsToDelete.length}...`,
          processedCount,
          docsToDelete.length,
        )
        await currentBatch.commit()
        currentBatch = writeBatch(db)
        batchCount = 0
      }
    }

    if (batchCount > 0) {
      await currentBatch.commit()
    }

    result.deletedItems = deletedDetails

    // Clean up local IndexedDB if any of these deleted items are still cached
    try {
      if (deletedIds.length > 0) {
        await localDb.items.bulkDelete(deletedIds)
        invalidateSearchIndex()
      }
    } catch (localErr) {
      console.warn('Failed to clean up purged items in localDb:', localErr)
    }

    // Clean up any checklist entries referencing these purged item IDs
    try {
      options?.onProgress?.('Cleaning up corresponding checklist entries...')
      for (let i = 0; i < deletedIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
        const chunk = deletedIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT)
        const clQuery = query(
          collection(db, dbCollections.checklists),
          where('itemId', 'in', chunk),
        )
        const clSnapshot = await getDocs(clQuery)
        if (!clSnapshot.empty) {
          let clBatch = writeBatch(db)
          let clCount = 0
          for (const clDoc of clSnapshot.docs) {
            clBatch.delete(clDoc.ref)
            clCount++
            if (clCount >= FIRESTORE_BATCH_WRITE_LIMIT) {
              await clBatch.commit()
              clBatch = writeBatch(db)
              clCount = 0
            }
          }
          if (clCount > 0) {
            await clBatch.commit()
          }
        }
      }
    } catch (clErr) {
      console.warn('Failed to clean up checklist references for purged items:', clErr)
    }

    result.isSuccess = true
    result.message = `Successfully permanently deleted ${result.itemsDeleted} items (is_deleted = true) from Firebase Firestore.`
    options?.onProgress?.(result.message)
    return result
  } catch (error: any) {
    console.error('Failed to purge deleted items from Firebase DB:', error)
    result.errors.push(error.message || String(error))
    result.message = error.message || 'Failed to purge soft-deleted items'
    return result
  }
}
