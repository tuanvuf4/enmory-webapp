import { collection, deleteField, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { IExample, IItem, IMeaning } from '@/models/item.model'
import { IBlogItem } from '@/models/blog.model'
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

// =========================================================================
// Dynamic Deep Deletion for Legacy Fields (Item & Article)
// =========================================================================

export type TLegacyFieldTarget = 'item' | 'article'

export interface IDeepDeleteResult {
  modified: boolean
  deletedCount: number
  pathsDeleted: string[]
  topLevelFields: Set<string>
}

export interface IPreviewFieldResult {
  isSuccess: boolean
  targetType: TLegacyFieldTarget
  fieldPath: string
  normalizedSegments: string[]
  totalScanned: number
  affectedCount: number
  totalOccurrences: number
  sampleDocs: Array<{
    id: string
    title: string
    occurrences: number
    samplePaths: string[]
  }>
  message: string
}

export interface IRemoveFieldByPathResult {
  isSuccess: boolean
  targetType: TLegacyFieldTarget
  fieldPath: string
  totalScanned: number
  itemsUpdated: number
  occurrencesDeleted: number
  errors: string[]
  message: string
}

export const matchesSegmentKey = (key: string, segment: string): boolean => {
  const k = key.toLowerCase()
  const s = segment.toLowerCase()
  if (k === s) return true
  // Match plural vs singular (meaning <-> meanings, example <-> examples)
  if (k === s + 's' || s === k + 's') return true
  if (k === s + 'es' || s === k + 'es') return true
  return false
}

export const matchesLeafKey = (key: string, leaf: string): boolean => {
  return key.toLowerCase() === leaf.toLowerCase()
}

export const normalizeFieldPath = (
  rawPath: string,
  targetType: TLegacyFieldTarget = 'item',
): string[] => {
  if (!rawPath || typeof rawPath !== 'string') return []
  const trimmed = rawPath.trim()
  if (!trimmed) return []

  const segments = trimmed
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)

  if (segments.length === 0) return []

  // Strip leading entity qualifier if present (e.g. item.meaning -> meaning, article.keywords -> keywords)
  const first = segments[0].toLowerCase()
  if (targetType === 'item') {
    if (first === 'item' || first === 'items') {
      segments.shift()
    }
  } else if (targetType === 'article') {
    if (['article', 'articles', 'blog', 'blogs'].includes(first)) {
      segments.shift()
    }
  }

  return segments
}

export const deleteDeepBySegments = (obj: any, segments: string[]): IDeepDeleteResult => {
  const result: IDeepDeleteResult = {
    modified: false,
    deletedCount: 0,
    pathsDeleted: [],
    topLevelFields: new Set<string>(),
  }

  if (!obj || typeof obj !== 'object' || segments.length === 0) {
    return result
  }

  const traverse = (current: any, segIdx: number, currentPath: string, rootKey?: string) => {
    if (!current || typeof current !== 'object') return

    // Leaf segment
    if (segIdx === segments.length - 1) {
      const leaf = segments[segIdx]

      if (Array.isArray(current)) {
        current.forEach((el, i) => {
          if (el && typeof el === 'object' && !Array.isArray(el)) {
            for (const key of Object.keys(el)) {
              if (matchesLeafKey(key, leaf)) {
                delete el[key]
                result.modified = true
                result.deletedCount++
                result.pathsDeleted.push(`${currentPath}[${i}].${key}`)
                if (rootKey) result.topLevelFields.add(rootKey)
              }
            }
          }
        })
      } else {
        for (const key of Object.keys(current)) {
          if (matchesLeafKey(key, leaf)) {
            delete current[key]
            result.modified = true
            result.deletedCount++
            result.pathsDeleted.push(currentPath ? `${currentPath}.${key}` : key)
            result.topLevelFields.add(rootKey || key)
          }
        }
      }
      return
    }

    // Intermediate segment
    const segment = segments[segIdx]

    if (Array.isArray(current)) {
      current.forEach((el, i) => {
        traverse(el, segIdx, `${currentPath}[${i}]`, rootKey)
      })
      return
    }

    let foundMatch = false
    for (const key of Object.keys(current)) {
      if (matchesSegmentKey(key, segment)) {
        foundMatch = true
        const nextRootKey = rootKey || key
        const nextPath = currentPath ? `${currentPath}.${key}` : key
        const child = current[key]

        if (Array.isArray(child)) {
          child.forEach((el, i) => {
            traverse(el, segIdx + 1, `${nextPath}[${i}]`, nextRootKey)
          })
        } else if (child && typeof child === 'object') {
          traverse(child, segIdx + 1, nextPath, nextRootKey)
        }
      }
    }

    // Fallback: search one level deeper if inside an intermediate object
    if (!foundMatch && currentPath !== '') {
      for (const [key, value] of Object.entries(current)) {
        if (value && typeof value === 'object') {
          const nextRootKey = rootKey || key
          const nextPath = `${currentPath}.${key}`
          traverse(value, segIdx, nextPath, nextRootKey)
        }
      }
    }
  }

  traverse(obj, 0, '', undefined)

  // If segments has only 1 item and was not found at root, deep search everywhere in all nested structures
  if (segments.length === 1 && result.deletedCount === 0) {
    const deepSearchAll = (curr: any, path: string, rootKey?: string) => {
      if (!curr || typeof curr !== 'object') return

      if (Array.isArray(curr)) {
        curr.forEach((el, i) => {
          deepSearchAll(el, `${path}[${i}]`, rootKey)
        })
      } else {
        for (const [k, v] of Object.entries(curr)) {
          if (matchesLeafKey(k, segments[0])) {
            delete curr[k]
            result.modified = true
            result.deletedCount++
            result.pathsDeleted.push(path ? `${path}.${k}` : k)
            result.topLevelFields.add(rootKey || k)
          } else if (v && typeof v === 'object') {
            deepSearchAll(v, path ? `${path}.${k}` : k, rootKey || k)
          }
        }
      }
    }

    deepSearchAll(obj, '', undefined)
  }

  return result
}

/**
 * Previews deep field removal on Firestore without modifying any data.
 */
export const previewFieldByPathInFirebaseDb = async (options: {
  targetType: TLegacyFieldTarget
  fieldPath: string
  uid?: string
  onlyCurrentUser?: boolean
  onProgress?: (message: string) => void
}): Promise<IPreviewFieldResult> => {
  const normalizedSegments = normalizeFieldPath(options.fieldPath, options.targetType)
  const result: IPreviewFieldResult = {
    isSuccess: false,
    targetType: options.targetType,
    fieldPath: options.fieldPath,
    normalizedSegments,
    totalScanned: 0,
    affectedCount: 0,
    totalOccurrences: 0,
    sampleDocs: [],
    message: '',
  }

  if (normalizedSegments.length === 0) {
    result.message = 'Đường dẫn trường cần xóa không hợp lệ.'
    return result
  }

  try {
    const collectionName =
      options.targetType === 'item'
        ? dbCollections.items
        : dbCollections.blogs || dbCollections.articles

    options.onProgress?.(`Đang quét bộ sưu tập ${collectionName}...`)

    let q = query(collection(db, collectionName))
    if (options.onlyCurrentUser && options.uid) {
      q = query(collection(db, collectionName), where('uid', '==', options.uid))
    }

    const snapshot = await getDocs(q)
    result.totalScanned = snapshot.size

    for (const docSnap of snapshot.docs) {
      const dataCopy = JSON.parse(JSON.stringify(docSnap.data()))
      const deleteRes = deleteDeepBySegments(dataCopy, normalizedSegments)
      if (deleteRes.modified) {
        result.affectedCount++
        result.totalOccurrences += deleteRes.deletedCount
        if (result.sampleDocs.length < 50) {
          result.sampleDocs.push({
            id: docSnap.id,
            title: dataCopy.origin || dataCopy.title || '(Không có tiêu đề)',
            occurrences: deleteRes.deletedCount,
            samplePaths: deleteRes.pathsDeleted,
          })
        }
      }
    }

    result.isSuccess = true
    if (result.affectedCount === 0) {
      result.message = `Không tìm thấy trường "${options.fieldPath}" trong bất kỳ tài liệu nào.`
    } else {
      result.message = `Tìm thấy ${result.affectedCount}/${result.totalScanned} tài liệu có chứa trường "${options.fieldPath}" (tổng cộng ${result.totalOccurrences} vị trí).`
    }
    return result
  } catch (err: any) {
    console.error('Preview legacy field error:', err)
    result.message = err?.message || 'Lỗi khi kiểm tra trường.'
    return result
  }
}

/**
 * Removes legacy field deeply from Firestore and local IndexedDB.
 */
export const removeFieldByPathFromFirebaseDb = async (options: {
  targetType: TLegacyFieldTarget
  fieldPath: string
  uid?: string
  onlyCurrentUser?: boolean
  updateLocalDb?: boolean
  onProgress?: (message: string, current?: number, total?: number) => void
}): Promise<IRemoveFieldByPathResult> => {
  const normalizedSegments = normalizeFieldPath(options.fieldPath, options.targetType)
  const result: IRemoveFieldByPathResult = {
    isSuccess: false,
    targetType: options.targetType,
    fieldPath: options.fieldPath,
    totalScanned: 0,
    itemsUpdated: 0,
    occurrencesDeleted: 0,
    errors: [],
    message: '',
  }

  if (normalizedSegments.length === 0) {
    result.message = 'Đường dẫn trường cần xóa không hợp lệ.'
    return result
  }

  try {
    const collectionName =
      options.targetType === 'item'
        ? dbCollections.items
        : dbCollections.blogs || dbCollections.articles

    options.onProgress?.(`Đang tải dữ liệu từ Firestore (${collectionName})...`)

    let q = query(collection(db, collectionName))
    if (options.onlyCurrentUser && options.uid) {
      q = query(collection(db, collectionName), where('uid', '==', options.uid))
    }

    const snapshot = await getDocs(q)
    result.totalScanned = snapshot.size

    const docsToUpdate: Array<{
      ref: any
      cleanData: any
      deleteRes: IDeepDeleteResult
    }> = []

    for (const docSnap of snapshot.docs) {
      const cleanData = JSON.parse(JSON.stringify(docSnap.data()))
      const deleteRes = deleteDeepBySegments(cleanData, normalizedSegments)
      if (deleteRes.modified) {
        docsToUpdate.push({
          ref: docSnap.ref,
          cleanData,
          deleteRes,
        })
        result.occurrencesDeleted += deleteRes.deletedCount
      }
    }

    if (docsToUpdate.length === 0) {
      result.isSuccess = true
      result.message = `Không tìm thấy trường "${options.fieldPath}" trong Firestore. Dữ liệu đã sạch!`
      options.onProgress?.(result.message)
      return result
    }

    options.onProgress?.(
      `Đang cập nhật Firestore: 0/${docsToUpdate.length}...`,
      0,
      docsToUpdate.length,
    )

    let currentBatch = writeBatch(db)
    let batchCount = 0
    let processedCount = 0

    for (const { ref, cleanData, deleteRes } of docsToUpdate) {
      const updatePayload: Record<string, any> = {
        last_update: Date.now(),
      }

      for (const topField of deleteRes.topLevelFields) {
        if (topField in cleanData) {
          updatePayload[topField] = cleanData[topField]
        } else {
          updatePayload[topField] = deleteField()
        }
      }

      currentBatch.update(ref, updatePayload)
      batchCount++
      processedCount++
      result.itemsUpdated++

      if (batchCount >= FIRESTORE_BATCH_WRITE_LIMIT) {
        options.onProgress?.(
          `Đang lưu vào Firestore: ${processedCount}/${docsToUpdate.length}...`,
          processedCount,
          docsToUpdate.length,
        )
        await currentBatch.commit()
        currentBatch = writeBatch(db)
        batchCount = 0
      }
    }

    if (batchCount > 0) {
      options.onProgress?.('Đang hoàn tất lưu vào Firestore...')
      await currentBatch.commit()
    }

    // Clean up local IndexedDB
    if (options.updateLocalDb !== false) {
      options.onProgress?.('Đang dọn dẹp Local Database (IndexedDB)...')
      try {
        if (options.targetType === 'item') {
          const allLocal =
            options.onlyCurrentUser && options.uid
              ? await localDb.items.where('uid').equals(options.uid).toArray()
              : await localDb.items.toArray()

          const localToUpdate: IItem[] = []
          for (const it of allLocal) {
            const cleanIt = JSON.parse(JSON.stringify(it))
            const localDeleteRes = deleteDeepBySegments(cleanIt, normalizedSegments)
            if (localDeleteRes.modified) {
              localToUpdate.push(cleanIt)
            }
          }
          if (localToUpdate.length > 0) {
            await localDb.items.bulkPut(localToUpdate)
          }
        } else {
          const allLocal =
            options.onlyCurrentUser && options.uid
              ? await localDb.blogs.where('uid').equals(options.uid).toArray()
              : await localDb.blogs.toArray()

          const localToUpdate: IBlogItem[] = []
          for (const b of allLocal) {
            const cleanIt = JSON.parse(JSON.stringify(b))
            const localDeleteRes = deleteDeepBySegments(cleanIt, normalizedSegments)
            if (localDeleteRes.modified) {
              localToUpdate.push(cleanIt)
            }
          }
          if (localToUpdate.length > 0) {
            await localDb.blogs.bulkPut(localToUpdate)
          }
        }
      } catch (localErr) {
        console.warn('Lỗi khi cập nhật Local DB:', localErr)
      }
    }

    result.isSuccess = true
    result.message = `Đã xóa thành công trường "${options.fieldPath}" khỏi ${result.itemsUpdated} tài liệu (tổng cộng ${result.occurrencesDeleted} vị trí) trong Firestore và Local DB.`
    options.onProgress?.(result.message)
    return result
  } catch (err: any) {
    console.error('Remove legacy field error:', err)
    result.errors.push(err?.message || String(err))
    result.message = err?.message || 'Lỗi khi xóa trường.'
    return result
  }
}
