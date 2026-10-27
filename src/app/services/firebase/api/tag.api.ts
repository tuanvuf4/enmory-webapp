import { db, dbCollections } from '@/config/firebaseConfig'
import { IHttpResponse } from '@/models/http.model'
import { IItem } from '@/models/item.model'
import { ITagEntity, ITagDto } from '@/models/tag.model'
import { firebaseAuthService } from '@/services/firebase/authService'
import { localDb } from '@/services/localDb/db'
import { invalidateSearchIndex } from '@/services/localDb/searchEngine'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

export type { ITagEntity, ITagDto }

const normalizeTags = (tags: string[] = []) => {
  const cleanTags = tags.map((tag) => tag.trim()).filter(Boolean)
  return Array.from(new Set(cleanTags))
}

const PENDING_DELETED_TAGS_PREFIX = 'pending_deleted_tags_'

/**
 * Remove a deleted tag from items in local database only.
 * This runs immediately and avoids large server queries during tag deletion.
 */
const removeTagFromLocalItems = async (uid: string, targetTagLower: string): Promise<number> => {
  if (!uid || !targetTagLower) return 0

  const now = Date.now()
  let modifiedCount = 0

  try {
    const localItems = await localDb.items.where('uid').equals(uid).toArray()
    const updatedLocalItems: IItem[] = []

    for (const item of localItems) {
      const itemTags = item.tags || []
      const itemTagsLower = item.tags_lowercase || itemTags.map((t: string) => String(t).trim().toLowerCase())

      const hasTag =
        itemTagsLower.some((t: string) => String(t).trim().toLowerCase() === targetTagLower) ||
        itemTags.some((t: string) => String(t).trim().toLowerCase() === targetTagLower)

      if (hasTag) {
        updatedLocalItems.push({
          ...item,
          tags: itemTags.filter((t: string) => String(t).trim().toLowerCase() !== targetTagLower),
          tags_lowercase: itemTagsLower.filter((t: string) => String(t).trim().toLowerCase() !== targetTagLower),
          last_update: now,
        })
      }
    }

    if (updatedLocalItems.length > 0) {
      await localDb.items.bulkPut(updatedLocalItems)
      invalidateSearchIndex()
      modifiedCount = updatedLocalItems.length
    }
  } catch (localErr) {
    console.warn('Failed to remove tag from localDb items:', localErr)
  }

  return modifiedCount
}

/**
 * Record a deleted tag that is pending synchronization to cloud items during manual sync
 */
const recordPendingDeletedTag = async (uid: string, targetTagLower: string): Promise<void> => {
  if (!uid || !targetTagLower) return
  const pendingKey = `${PENDING_DELETED_TAGS_PREFIX}${uid}`
  try {
    const existing = await localDb.syncMeta.get(pendingKey)
    const currentList: string[] = Array.isArray(existing?.value) ? existing.value : []
    if (!currentList.includes(targetTagLower)) {
      await localDb.syncMeta.put({
        key: pendingKey,
        value: [...currentList, targetTagLower],
      })
    }
  } catch (err) {
    console.warn('Failed to record pending deleted tag in syncMeta:', err)
  }
}

/**
 * Get the list of deleted tags pending synchronization to cloud items
 */
const getPendingDeletedTags = async (uid: string): Promise<string[]> => {
  if (!uid) return []
  const pendingKey = `${PENDING_DELETED_TAGS_PREFIX}${uid}`
  try {
    const existing = await localDb.syncMeta.get(pendingKey)
    return Array.isArray(existing?.value) ? existing.value : []
  } catch {
    return []
  }
}

/**
 * Clear the pending deleted tags list after manual sync has completed
 */
const clearPendingDeletedTags = async (uid: string): Promise<void> => {
  if (!uid) return
  const pendingKey = `${PENDING_DELETED_TAGS_PREFIX}${uid}`
  try {
    await localDb.syncMeta.delete(pendingKey)
  } catch {
    // ignore
  }
}

/**
 * Sync deleted tags to Firestore items (called during manual sync to avoid high query volume during tag deletion).
 */
const syncDeletedTagsToServer = async (
  uid: string,
  targetTagLowers: string[],
  onProgress?: (msg: string) => void,
): Promise<number> => {
  if (!uid || targetTagLowers.length === 0) return 0

  const now = Timestamp.now().toMillis()
  let totalUpdated = 0

  for (const tagLower of targetTagLowers) {
    onProgress?.(`Cleaning tag "${tagLower}" on cloud items...`)
    try {
      let itemDocsToUpdate: Array<{ id: string; ref: any; data: any }> = []

      try {
        const q = query(
          collection(db, dbCollections.items),
          where('uid', '==', uid),
          where('tags_lowercase', 'array-contains', tagLower),
        )
        const snapshot = await getDocs(q)
        itemDocsToUpdate = snapshot.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() }))
      } catch (indexErr) {
        console.warn('Firestore query by tags_lowercase failed, falling back to client filter:', indexErr)
        const fallbackQ = query(
          collection(db, dbCollections.items),
          where('uid', '==', uid),
        )
        const snapshot = await getDocs(fallbackQ)
        itemDocsToUpdate = snapshot.docs
          .filter((d) => {
            const data = d.data()
            const tagsLower = data.tags_lowercase || (data.tags || []).map((t: string) => String(t).trim().toLowerCase())
            return tagsLower.includes(tagLower)
          })
          .map((d) => ({ id: d.id, ref: d.ref, data: d.data() }))
      }

      if (itemDocsToUpdate.length > 0) {
        let batch = writeBatch(db)
        let batchCount = 0

        for (const itemDoc of itemDocsToUpdate) {
          const currentTags = (itemDoc.data.tags || []) as string[]
          const nextTags = currentTags.filter((t) => String(t).trim().toLowerCase() !== tagLower)
          const currentTagsLower = (itemDoc.data.tags_lowercase || currentTags.map((t) => String(t).trim().toLowerCase())) as string[]
          const nextTagsLower = currentTagsLower.filter((t) => t !== tagLower)

          batch.update(itemDoc.ref, {
            tags: nextTags,
            tags_lowercase: nextTagsLower,
            last_update: now,
          })
          batchCount++

          if (batchCount >= 400) {
            await batch.commit()
            batch = writeBatch(db)
            batchCount = 0
          }
        }

        if (batchCount > 0) {
          await batch.commit()
        }

        totalUpdated += itemDocsToUpdate.length
      }
    } catch (err) {
      console.warn(`Failed to clean tag "${tagLower}" on cloud items:`, err)
    }
  }

  return totalUpdated
}

const ensureTagsExist = async (tags: string[]): Promise<IHttpResponse<string[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: [],
        statusCode: 401,
      }
    }

    const normalizedTags = normalizeTags(tags)

    if (normalizedTags.length === 0) {
      return {
        isSuccess: true,
        message: 'No tags to sync',
        content: [],
        statusCode: 200,
      }
    }

    for (const tag of normalizedTags) {
      const lower = tag.toLowerCase()

      const q = query(
        collection(db, dbCollections.tags),
        where('uid', '==', currentUser.uid),
        where('value_lowercase', '==', lower),
        limit(1),
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        const now = Timestamp.now().toMillis()

        const payload: ITagEntity = {
          uid: currentUser.uid,
          value: tag,
          value_lowercase: lower,
          created_date: now,
          last_update: now,
        }

        const addedDoc = await addDoc(collection(db, dbCollections.tags), payload)
        try {
          await localDb.tags.put({ id: addedDoc.id, ...payload })
        } catch (localErr) {
          console.warn('Failed to put tag into localDb:', localErr)
        }
      }
    }

    return {
      isSuccess: true,
      message: 'Tags synced successfully',
      content: normalizedTags,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error syncing tags:', error)

    return {
      isSuccess: false,
      message: 'Failed to sync tags',
      content: [],
      statusCode: 500,
    }
  }
}

const createTags = async (tags: string[]): Promise<IHttpResponse<string[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: [],
        statusCode: 401,
      }
    }

    const normalizedTags = normalizeTags(tags)

    if (normalizedTags.length === 0) {
      return {
        isSuccess: true,
        message: 'No tags to create',
        content: [],
        statusCode: 200,
      }
    }

    for (const tag of normalizedTags) {
      const lower = tag.toLowerCase()
      const now = Timestamp.now().toMillis()

      const payload: ITagEntity = {
        uid: currentUser.uid,
        value: tag,
        value_lowercase: lower,
        created_date: now,
        last_update: now,
      }

      const addedDoc = await addDoc(collection(db, dbCollections.tags), payload)
      try {
        await localDb.tags.put({ id: addedDoc.id, ...payload })
      } catch (localErr) {
        console.warn('Failed to put tag into localDb:', localErr)
      }
    }

    return {
      isSuccess: true,
      message: 'Tags created successfully',
      content: normalizedTags,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error creating tags:', error)
    return {
      isSuccess: false,
      message: 'Failed to create tags',
      content: [],
      statusCode: 500,
    }
  }
}

const getTags = async (keyword = ''): Promise<IHttpResponse<ITagDto[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: [],
        statusCode: 401,
      }
    }

    const normalizedKeyword = keyword.trim().toLowerCase()

    try {
      const q = query(
        collection(db, dbCollections.tags),
        where('uid', '==', currentUser.uid),
        orderBy('value_lowercase', 'asc'),
        limit(200),
      )

      const snapshot = await getDocs(q)

      let tags = snapshot.docs
        .map((doc) => {
          const data = doc.data() as Partial<ITagEntity>
          return {
            id: doc.id,
            value: String(data.value || '').trim(),
            value_lowercase: String(data.value_lowercase || '').trim(),
            created_date: data.created_date || 0,
            last_update: data.last_update || 0,
            uid: currentUser.uid,
          }
        })
        .filter((tag) => tag.value)

      // Sync fetched tags to localDb
      try {
        if (tags.length > 0) {
          await localDb.tags.bulkPut(tags)
        }
      } catch (localSaveErr) {
        console.warn('Failed to cache tags into localDb:', localSaveErr)
      }

      if (normalizedKeyword) {
        tags = tags.filter((tag) => tag.value.toLowerCase().includes(normalizedKeyword))
      }

      const uniqueByLowercase = new Map<string, ITagDto>()
      tags.forEach((tag) => {
        const key = tag.value_lowercase || tag.value.toLowerCase()
        if (!uniqueByLowercase.has(key)) {
          uniqueByLowercase.set(key, {
            id: tag.id,
            value: tag.value,
            value_lowercase: key,
          })
        }
      })

      return {
        isSuccess: true,
        message: 'Tags fetched successfully',
        content: Array.from(uniqueByLowercase.values()),
        statusCode: 200,
      }
    } catch (firestoreErr) {
      console.warn('Failed to fetch tags from Firestore, falling back to localDb:', firestoreErr)

      // Fallback to local database
      const localTags = await localDb.tags.where('uid').equals(currentUser.uid).toArray()
      let tags = localTags
        .map((t) => ({
          id: t.id || '',
          value: t.value,
          value_lowercase: t.value_lowercase,
        }))
        .filter((t) => t.value)

      if (normalizedKeyword) {
        tags = tags.filter((tag) => tag.value.toLowerCase().includes(normalizedKeyword))
      }

      tags.sort((a, b) => a.value_lowercase.localeCompare(b.value_lowercase))

      const uniqueByLowercase = new Map<string, ITagDto>()
      tags.forEach((tag) => {
        const key = tag.value_lowercase || tag.value.toLowerCase()
        if (!uniqueByLowercase.has(key)) {
          uniqueByLowercase.set(key, {
            id: tag.id,
            value: tag.value,
            value_lowercase: key,
          })
        }
      })

      return {
        isSuccess: true,
        message: 'Tags fetched from local database',
        content: Array.from(uniqueByLowercase.values()),
        statusCode: 200,
      }
    }
  } catch (error) {
    console.error('Error fetching tags:', error)
    return {
      isSuccess: false,
      message: 'Failed to fetch tags',
      content: [],
      statusCode: 500,
    }
  }
}

const createTag = async (value: string): Promise<IHttpResponse<ITagDto | null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null,
        statusCode: 401,
      }
    }

    const normalizedValue = String(value || '').trim()
    if (!normalizedValue) {
      return {
        isSuccess: false,
        message: 'Tag is required',
        content: null,
        statusCode: 400,
      }
    }

    const normalizedLowercase = normalizedValue.toLowerCase()

    const existsQuery = query(
      collection(db, dbCollections.tags),
      where('uid', '==', currentUser.uid),
      where('value_lowercase', '==', normalizedLowercase),
      limit(1),
    )

    const existsSnapshot = await getDocs(existsQuery)
    if (!existsSnapshot.empty) {
      const existedDoc = existsSnapshot.docs[0]
      return {
        isSuccess: false,
        message: 'Tag already exists',
        content: {
          id: existedDoc.id,
          value: normalizedValue,
          value_lowercase: normalizedLowercase,
        },
        statusCode: 409,
      }
    }

    const now = Timestamp.now().toMillis()
    const payload: ITagEntity = {
      uid: currentUser.uid,
      value: normalizedValue,
      value_lowercase: normalizedLowercase,
      created_date: now,
      last_update: now,
    }

    const createdDoc = await addDoc(collection(db, dbCollections.tags), payload)

    try {
      await localDb.tags.put({
        id: createdDoc.id,
        ...payload,
      })
    } catch (localErr) {
      console.warn('Failed to save created tag to localDb:', localErr)
    }

    return {
      isSuccess: true,
      message: 'Tag created successfully',
      content: {
        id: createdDoc.id,
        value: normalizedValue,
        value_lowercase: normalizedLowercase,
      },
      statusCode: 201,
    }
  } catch (error) {
    console.error('Error creating tag:', error)
    return {
      isSuccess: false,
      message: 'Failed to create tag',
      content: null,
      statusCode: 500,
    }
  }
}

const updateTag = async (tagId: string, value: string): Promise<IHttpResponse<ITagDto | null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null,
        statusCode: 401,
      }
    }

    if (!tagId) {
      return {
        isSuccess: false,
        message: 'Invalid tag id',
        content: null,
        statusCode: 400,
      }
    }

    const normalizedValue = String(value || '').trim()
    if (!normalizedValue) {
      return {
        isSuccess: false,
        message: 'Tag is required',
        content: null,
        statusCode: 400,
      }
    }

    const tagRef = doc(db, dbCollections.tags, tagId)
    const tagDoc = await getDoc(tagRef)

    if (!tagDoc.exists()) {
      return {
        isSuccess: false,
        message: 'Tag not found',
        content: null,
        statusCode: 404,
      }
    }

    const existingTag = tagDoc.data() as Partial<ITagEntity>
    if (existingTag.uid !== currentUser.uid) {
      return {
        isSuccess: false,
        message: 'Unauthorized',
        content: null,
        statusCode: 403,
      }
    }

    const normalizedLowercase = normalizedValue.toLowerCase()

    const duplicateQuery = query(
      collection(db, dbCollections.tags),
      where('uid', '==', currentUser.uid),
      where('value_lowercase', '==', normalizedLowercase),
      limit(1),
    )

    const duplicateSnapshot = await getDocs(duplicateQuery)
    if (!duplicateSnapshot.empty && duplicateSnapshot.docs[0].id !== tagId) {
      return {
        isSuccess: false,
        message: 'Tag already exists',
        content: null,
        statusCode: 409,
      }
    }

    const now = Timestamp.now().toMillis()
    await updateDoc(tagRef, {
      value: normalizedValue,
      value_lowercase: normalizedLowercase,
      last_update: now,
    })

    try {
      await localDb.tags.update(tagId, {
        value: normalizedValue,
        value_lowercase: normalizedLowercase,
        last_update: now,
      })
    } catch (localErr) {
      console.warn('Failed to update tag in localDb:', localErr)
    }

    return {
      isSuccess: true,
      message: 'Tag updated successfully',
      content: {
        id: tagId,
        value: normalizedValue,
        value_lowercase: normalizedLowercase,
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating tag:', error)
    return {
      isSuccess: false,
      message: 'Failed to update tag',
      content: null,
      statusCode: 500,
    }
  }
}

/**
 * Delete a tag directly from Firestore and local database,
 * recording deletion into deleted_records collection for multi-device sync,
 * and removing this tag from all items across both Firestore and local database.
 */
const deleteTag = async (tagId: string, tagValue?: string): Promise<IHttpResponse<null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null,
        statusCode: 401,
      }
    }

    if (!tagId) {
      return {
        isSuccess: false,
        message: 'Invalid tag id',
        content: null,
        statusCode: 400,
      }
    }

    // 1. Get existing tag information to know its value
    let resolvedTagValue = tagValue || ''
    let resolvedTagLower = resolvedTagValue.trim().toLowerCase()

    const tagRef = doc(db, dbCollections.tags, tagId)
    const tagDoc = await getDoc(tagRef)

    if (tagDoc.exists()) {
      const existingTag = tagDoc.data() as Partial<ITagEntity>
      if (existingTag.uid && existingTag.uid !== currentUser.uid) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 403,
        }
      }
      if (!resolvedTagValue && existingTag.value) {
        resolvedTagValue = existingTag.value
        resolvedTagLower = (existingTag.value_lowercase || existingTag.value).trim().toLowerCase()
      }
    } else {
      // Check local database if doc doesn't exist in Firestore
      try {
        const localTag = await localDb.tags.get(tagId)
        if (localTag && localTag.uid === currentUser.uid) {
          if (!resolvedTagValue && localTag.value) {
            resolvedTagValue = localTag.value
            resolvedTagLower = (localTag.value_lowercase || localTag.value).trim().toLowerCase()
          }
        } else if (!resolvedTagValue) {
          return {
            isSuccess: false,
            message: 'Tag not found',
            content: null,
            statusCode: 404,
          }
        }
      } catch {
        if (!resolvedTagValue) {
          return {
            isSuccess: false,
            message: 'Tag not found',
            content: null,
            statusCode: 404,
          }
        }
      }
    }

    // 2. Atomic Firestore batch: delete tag doc AND record into deleted_records for multi-device sync
    try {
      const deletedRecordRef = doc(db, dbCollections.deleted_records, `${currentUser.uid}_${tagId}`)
      const batch = writeBatch(db)
      batch.delete(tagRef)
      batch.set(deletedRecordRef, {
        uid: currentUser.uid,
        recordId: tagId,
        value: resolvedTagValue,
        value_lowercase: resolvedTagLower,
        collectionName: dbCollections.tags,
        deleted_at: Timestamp.now(),
      })
      await batch.commit()
    } catch (batchErr) {
      console.warn('Failed to delete tag or write deleted_records in Firestore:', batchErr)
    }

    // 3. Delete tag from local database
    try {
      await localDb.tags.delete(tagId)
    } catch (localErr) {
      console.warn('Failed to delete tag from localDb:', localErr)
    }

    // 4. Remove tag from items in LOCAL database only (avoids large query volume to server)
    // The user will sync modified items to cloud manually when desired.
    if (resolvedTagLower) {
      await removeTagFromLocalItems(currentUser.uid, resolvedTagLower)
      await recordPendingDeletedTag(currentUser.uid, resolvedTagLower)
    }

    return {
      isSuccess: true,
      message: 'Tag deleted successfully',
      content: null,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error deleting tag:', error)
    return {
      isSuccess: false,
      message: 'Failed to delete tag',
      content: null,
      statusCode: 500,
    }
  }
}

export const tagApi = {
  ensureTagsExist,
  createTags,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  removeTagFromLocalItems,
  recordPendingDeletedTag,
  getPendingDeletedTags,
  clearPendingDeletedTags,
  syncDeletedTagsToServer,
}
