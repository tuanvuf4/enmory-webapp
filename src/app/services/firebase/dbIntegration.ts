import {
  collection,
  deleteField,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { IExample, IItem, IMeaning } from '@/models/item.model'
import { localDb } from '@/services/localDb'

const FIRESTORE_BATCH_WRITE_LIMIT = 400

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
 * Ensures items have valid structure without querying Firestore.
 */
export const hydrateItemsWithExamples = async (items: IItem[]): Promise<IItem[]> => {
  if (!items || items.length === 0) return items

  // Examples are already embedded directly in items.
  // Return items with quiz removed.
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

export interface IRemoveLegacyFieldsResult {
  isSuccess: boolean
  totalItems: number
  itemsScanned: number
  itemsUpdated: number
  errors: string[]
  message: string
}

export type IRemoveKeywordsResult = IRemoveLegacyFieldsResult
export type IRemoveOriginLowercaseResult = IRemoveLegacyFieldsResult

/**
 * Removes legacy search fields (`keywords` and `origin_lowercase`) from:
 * 1. Root level of items documents in Firestore.
 * 2. Meanings and embedded examples inside items documents.
 * 3. Local IndexedDB cache (items).
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
    if (result.itemsUpdated === 0) {
      result.message =
        'No legacy fields (keywords & origin_lowercase) found. Firebase DB is already clean!'
    } else {
      result.message = `Successfully removed legacy fields (keywords & origin_lowercase) from ${result.itemsUpdated} items in Firebase DB.`
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
 * Obsolete legacy function (kept for backwards compatibility).
 */
export const purgeDeletedItemsFromFirebaseDb = async (_options?: {
  uid?: string
  onProgress?: (message: string, current?: number, total?: number) => void
}): Promise<IPurgeDeletedItemsResult> => {
  return {
    isSuccess: true,
    totalScanned: 0,
    itemsDeleted: 0,
    errors: [],
    message: 'Soft-delete has been deprecated. No items to purge.',
    deletedItems: [],
  }
}
