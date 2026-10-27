import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { localDb } from './db'
import { IItem } from '@/models/item.model'
import { ITagEntity } from '@/models/tag.model'
import { invalidateSearchIndex } from './searchEngine'
import { hydrateItemsWithExamples } from '@/services/firebase/dbIntegration'
import { tagApi } from '@/services/firebase/api/tag.api'

const SYNC_META_PREFIX = 'last_sync_time_'

export interface ISyncResult {
  isSuccess: boolean
  updatedItems: number
  deletedItems: number
  updatedExamples: number
  updatedTags?: number
  deletedTags?: number
  cloudItemsUpdatedForTags?: number
  totalItems: number
  totalExamples: number
  totalTags?: number
  timestamp: number
  isFullSync: boolean
  message?: string
}

export const syncService = {
  /**
   * Get total count of active items on Firebase Firestore for a user.
   */
  async getServerItemCount(uid: string): Promise<number> {
    if (!uid) return 0
    try {
      const itemsRef = collection(db, dbCollections.items)
      const baseQuery = query(itemsRef, where('uid', '==', uid))

      const totalSnap = await getCountFromServer(baseQuery)
      const totalCount = totalSnap.data().count

      // Attempt to subtract soft-deleted items (is_deleted == true) if any
      try {
        const deletedQuery = query(
          itemsRef,
          where('uid', '==', uid),
          where('is_deleted', '==', true),
        )
        const deletedSnap = await getCountFromServer(deletedQuery)
        const deletedCount = deletedSnap.data().count
        return Math.max(0, totalCount - deletedCount)
      } catch {
        return totalCount
      }
    } catch (err) {
      console.warn('getCountFromServer failed, falling back to getDocs:', err)
      const itemsQuery = query(collection(db, dbCollections.items), where('uid', '==', uid))
      const snapshot = await getDocs(itemsQuery)
      let count = 0
      snapshot.forEach((docSnap) => {
        if (!docSnap.data().is_deleted) {
          count++
        }
      })
      return count
    }
  },

  /**
   * Get total count of active tags on Firebase Firestore for a user.
   */
  async getServerTagCount(uid: string): Promise<number> {
    if (!uid) return 0
    try {
      const tagsRef = collection(db, dbCollections.tags)
      const baseQuery = query(tagsRef, where('uid', '==', uid))
      const totalSnap = await getCountFromServer(baseQuery)
      return totalSnap.data().count
    } catch (err) {
      console.warn('getCountFromServer for tags failed, falling back to getDocs:', err)
      try {
        const tagsQuery = query(collection(db, dbCollections.tags), where('uid', '==', uid))
        const snapshot = await getDocs(tagsQuery)
        return snapshot.size
      } catch (fallbackErr) {
        console.error('Failed to get server tag count:', fallbackErr)
        return 0
      }
    }
  },

  /**
   * Get the last sync timestamp for the given user ID.
   */
  async getLastSyncTimestamp(uid: string): Promise<number> {
    const metaKey = `${SYNC_META_PREFIX}${uid}`
    // First check Dexie syncMeta table
    const meta = await localDb.syncMeta.get(metaKey)
    if (meta && typeof meta.value === 'number') {
      return meta.value
    }
    // Fallback to localStorage
    const localVal = localStorage.getItem(metaKey)
    return localVal ? parseInt(localVal, 10) : 0
  },

  /**
   * Save the last sync timestamp.
   */
  async setLastSyncTimestamp(uid: string, timestamp: number): Promise<void> {
    const metaKey = `${SYNC_META_PREFIX}${uid}`
    await localDb.syncMeta.put({ key: metaKey, value: timestamp })
    localStorage.setItem(metaKey, timestamp.toString())
  },

  /**
   * Ask the browser/mobile device for persistent storage permissions.
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        return await navigator.storage.persist()
      } catch (err) {
        console.warn('Persistent storage request failed:', err)
      }
    }
    return false
  },

  /**
   * Clear all local data for the user.
   */
  async clearLocalData(uid: string): Promise<void> {
    await localDb.transaction('rw', localDb.items, localDb.tags, localDb.syncMeta, async () => {
      await localDb.items.where('uid').equals(uid).delete()
      await localDb.tags.where('uid').equals(uid).delete()
      await localDb.syncMeta.delete(`${SYNC_META_PREFIX}${uid}`)
    })
    await tagApi.clearPendingDeletedTags(uid)
    localStorage.removeItem(`${SYNC_META_PREFIX}${uid}`)
    invalidateSearchIndex()
  },

  /**
   * Perform synchronization between Firebase and IndexedDB.
   */
  async sync(options?: {
    forceFull?: boolean
    onProgress?: (step: string) => void
  }): Promise<ISyncResult> {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('You must be logged in to sync data.')
    }

    const uid = currentUser.uid
    await this.requestPersistentStorage()

    const lastSyncTime = await this.getLastSyncTimestamp(uid)
    const isFullSync = options?.forceFull || lastSyncTime === 0
    const now = Date.now()

    let updatedItems = 0
    let deletedItems = 0
    let updatedExamples = 0
    let updatedTags = 0
    let deletedTags = 0
    let cloudItemsUpdatedForTags = 0

    if (isFullSync) {
      // ==========================================
      // 1. FULL SYNC (Initial or forced reset)
      // ==========================================
      options?.onProgress?.('Fetching all active items from cloud...')

      const itemsQuery = query(collection(db, dbCollections.items), where('uid', '==', uid))
      const itemsSnapshot = await getDocs(itemsQuery)
      const cloudItems: IItem[] = []
      itemsSnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        if (!(data as any).is_deleted) {
          cloudItems.push({ id: docSnap.id, ...data } as IItem)
        }
      })
      const allItems = await hydrateItemsWithExamples(cloudItems)
      const totalExamplesCount = allItems.reduce(
        (sum, item) =>
          sum +
          (item.meanings || []).reduce(
            (mSum: number, m: any) => mSum + (m.examples || []).length,
            0,
          ),
        0,
      )

      // Fetch all tags from Firestore
      options?.onProgress?.('Fetching all tag items from cloud...')
      const tagsQuery = query(collection(db, dbCollections.tags), where('uid', '==', uid))
      const tagsSnapshot = await getDocs(tagsQuery)
      const cloudTags: ITagEntity[] = []
      tagsSnapshot.forEach((docSnap) => {
        cloudTags.push({ id: docSnap.id, ...(docSnap.data() as any) })
      })

      const activeTagLowerSet = new Set(
        cloudTags.map((t) => (t.value_lowercase || t.value).trim().toLowerCase()),
      )
      // Clean non-existing/deleted tags from items before saving locally
      allItems.forEach((item) => {
        const itemTags = item.tags || []
        const itemTagsLower =
          item.tags_lowercase || itemTags.map((t: string) => t.trim().toLowerCase())
        if (itemTagsLower.some((t: string) => !activeTagLowerSet.has(t))) {
          item.tags = itemTags.filter((t: string) => activeTagLowerSet.has(t.trim().toLowerCase()))
          item.tags_lowercase = itemTagsLower.filter((t: string) => activeTagLowerSet.has(t))
        }
      })

      // Sync pending deleted tags to cloud items if any
      const pendingTagLowers = await tagApi.getPendingDeletedTags(uid)
      if (pendingTagLowers.length > 0) {
        options?.onProgress?.('Syncing deleted tag updates to cloud items...')
        cloudItemsUpdatedForTags = await tagApi.syncDeletedTagsToServer(
          uid,
          pendingTagLowers,
          options?.onProgress,
        )
        await tagApi.clearPendingDeletedTags(uid)
      }

      options?.onProgress?.('Saving items and tag items to local database...')
      await localDb.transaction('rw', localDb.items, localDb.tags, localDb.syncMeta, async () => {
        // Only delete this user's existing items and tags so other accounts' local data is preserved
        await localDb.items.where('uid').equals(uid).delete()
        await localDb.tags.where('uid').equals(uid).delete()

        if (allItems.length > 0) {
          await localDb.items.bulkPut(allItems)
        }
        if (cloudTags.length > 0) {
          await localDb.tags.bulkPut(cloudTags)
        }

        await localDb.syncMeta.put({ key: `${SYNC_META_PREFIX}${uid}`, value: now })
      })

      localStorage.setItem(`${SYNC_META_PREFIX}${uid}`, now.toString())
      updatedItems = allItems.length
      updatedExamples = totalExamplesCount
      updatedTags = cloudTags.length
    } else {
      // ==========================================
      // 2. INCREMENTAL DELTA SYNC
      // ==========================================
      options?.onProgress?.('Checking for updated items since last sync...')

      // Query items changed since lastSyncTime
      const deltaItemsQuery = query(
        collection(db, dbCollections.items),
        where('uid', '==', uid),
        where('last_update', '>', lastSyncTime),
      )
      const deltaItemsSnapshot = await getDocs(deltaItemsQuery)

      const cloudItemsToPut: IItem[] = []
      const itemIdsToDelete: string[] = []

      deltaItemsSnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        if ((data as any).is_deleted) {
          itemIdsToDelete.push(docSnap.id)
        } else {
          cloudItemsToPut.push({ id: docSnap.id, ...data } as IItem)
        }
      })

      const itemsToPut = await hydrateItemsWithExamples(cloudItemsToPut)
      const examplesToPutCount = itemsToPut.reduce(
        (sum, item) =>
          sum +
          (item.meanings || []).reduce(
            (mSum: number, m: any) => mSum + (m.examples || []).length,
            0,
          ),
        0,
      )

      // Query tags changed since lastSyncTime
      options?.onProgress?.('Checking for updated tag items since last sync...')
      const cloudTagsToPut: ITagEntity[] = []
      try {
        const deltaTagsQuery = query(
          collection(db, dbCollections.tags),
          where('uid', '==', uid),
          where('last_update', '>', lastSyncTime),
        )
        const deltaTagsSnapshot = await getDocs(deltaTagsQuery)
        deltaTagsSnapshot.forEach((docSnap) => {
          cloudTagsToPut.push({ id: docSnap.id, ...(docSnap.data() as any) })
        })
      } catch (tagIndexErr) {
        console.warn('deltaTagsQuery failed with index, falling back to uid query:', tagIndexErr)
        try {
          const allTagsQuery = query(collection(db, dbCollections.tags), where('uid', '==', uid))
          const allTagsSnapshot = await getDocs(allTagsQuery)
          allTagsSnapshot.forEach((docSnap) => {
            const data = docSnap.data() as any
            const lastUpdate = data.last_update || data.created_date || 0
            if (lastUpdate > lastSyncTime) {
              cloudTagsToPut.push({ id: docSnap.id, ...data })
            }
          })
        } catch (fallbackErr) {
          console.warn('Fallback delta tags query failed:', fallbackErr)
        }
      }

      // Query deleted_records collection for items and tags deleted on other devices
      options?.onProgress?.('Checking for deleted items and tag items from cloud...')
      const tagIdsToDelete: string[] = []
      const tagValuesToDelete = new Set<string>()

      try {
        let deletedDocs: Array<{
          recordId: string
          collectionName?: string
          value?: string
          value_lowercase?: string
        }> = []

        try {
          // Attempt optimized indexed query (uid == uid && deleted_at > lastSyncTime)
          const lastSyncTimestamp = Timestamp.fromMillis(lastSyncTime)
          const deletedRecordsQuery = query(
            collection(db, dbCollections.deleted_records),
            where('uid', '==', uid),
            where('deleted_at', '>', lastSyncTimestamp),
          )
          const deletedRecordsSnapshot = await getDocs(deletedRecordsQuery)
          deletedDocs = deletedRecordsSnapshot.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
              recordId: (data.recordId as string) || docSnap.id,
              collectionName: data.collectionName as string | undefined,
              value: data.value as string | undefined,
              value_lowercase: data.value_lowercase as string | undefined,
            }
          })
        } catch (indexErr) {
          console.warn(
            'Indexed query on deleted_records failed (composite index pending), falling back to client filter:',
            indexErr,
          )
          // Fallback query by uid only (never requires a composite index)
          const fallbackQuery = query(
            collection(db, dbCollections.deleted_records),
            where('uid', '==', uid),
          )
          const fallbackSnapshot = await getDocs(fallbackQuery)
          deletedDocs = fallbackSnapshot.docs
            .filter((docSnap) => {
              const val = docSnap.data().deleted_at
              const ms = val?.toMillis ? val.toMillis() : typeof val === 'number' ? val : 0
              return ms > lastSyncTime
            })
            .map((docSnap) => {
              const data = docSnap.data()
              return {
                recordId: (data.recordId as string) || docSnap.id,
                collectionName: data.collectionName as string | undefined,
                value: data.value as string | undefined,
                value_lowercase: data.value_lowercase as string | undefined,
              }
            })
        }

        deletedDocs.forEach(({ recordId, collectionName, value, value_lowercase }) => {
          if (!collectionName || collectionName === dbCollections.items) {
            if (!itemIdsToDelete.includes(recordId)) {
              itemIdsToDelete.push(recordId)
            }
          } else if (collectionName === dbCollections.tags) {
            if (!tagIdsToDelete.includes(recordId)) {
              tagIdsToDelete.push(recordId)
            }
            if (value) tagValuesToDelete.add(value.trim().toLowerCase())
            if (value_lowercase) tagValuesToDelete.add(value_lowercase.trim().toLowerCase())
          }
        })
      } catch (deletedErr) {
        console.warn('Failed to fetch deleted_records from cloud:', deletedErr)
      }

      // Also check if any items were soft-deleted with deleted_date > lastSyncTime (backward compatibility)
      try {
        const deletedItemsQuery = query(
          collection(db, dbCollections.items),
          where('uid', '==', uid),
          where('deleted_date', '>', lastSyncTime),
        )
        const deletedSnapshot = await getDocs(deletedItemsQuery)
        deletedSnapshot.forEach((docSnap) => {
          if (!itemIdsToDelete.includes(docSnap.id)) {
            itemIdsToDelete.push(docSnap.id)
          }
        })
      } catch (err) {
        // Safe to ignore if index isn't created for deleted_date
      }

      // For any tag to delete, try to look up its value in localDb if not already captured
      for (const tId of tagIdsToDelete) {
        try {
          const lTag = await localDb.tags.get(tId)
          if (lTag?.value) tagValuesToDelete.add(lTag.value.trim().toLowerCase())
          if (lTag?.value_lowercase)
            tagValuesToDelete.add(lTag.value_lowercase.trim().toLowerCase())
        } catch {
          // ignore
        }
      }

      // Check for pending deleted tags to sync to cloud items during this manual sync
      const pendingTagLowers = await tagApi.getPendingDeletedTags(uid)
      pendingTagLowers.forEach((t) => tagValuesToDelete.add(t))

      const allTagsToCleanOnCloud = Array.from(tagValuesToDelete)
      if (allTagsToCleanOnCloud.length > 0) {
        options?.onProgress?.('Syncing deleted tag updates to cloud items...')
        cloudItemsUpdatedForTags = await tagApi.syncDeletedTagsToServer(
          uid,
          allTagsToCleanOnCloud,
          options?.onProgress,
        )
        await tagApi.clearPendingDeletedTags(uid)
      }

      // If any tags were deleted on other devices, remove them from itemsToPut and existing local items
      const cleanedLocalItems: IItem[] = []
      if (tagValuesToDelete.size > 0) {
        // Clean from incoming itemsToPut
        itemsToPut.forEach((item) => {
          const itemTags = item.tags || []
          const itemTagsLower = item.tags_lowercase || itemTags.map((t) => t.trim().toLowerCase())
          if (itemTagsLower.some((t) => tagValuesToDelete.has(t))) {
            item.tags = itemTags.filter((t) => !tagValuesToDelete.has(t.trim().toLowerCase()))
            item.tags_lowercase = itemTagsLower.filter((t) => !tagValuesToDelete.has(t))
          }
        })

        // Clean from existing localDb items that aren't already being updated or deleted
        try {
          const existingLocalItems = await localDb.items.where('uid').equals(uid).toArray()
          const itemsToPutIds = new Set(itemsToPut.map((it) => it.id))

          for (const item of existingLocalItems) {
            if (!item.id || itemsToPutIds.has(item.id) || itemIdsToDelete.includes(item.id)) {
              continue
            }
            const itemTags = item.tags || []
            const itemTagsLower =
              item.tags_lowercase || itemTags.map((t: string) => t.trim().toLowerCase())

            if (
              itemTagsLower.some((t: string) => tagValuesToDelete.has(t)) ||
              itemTags.some((t: string) => tagValuesToDelete.has(t.trim().toLowerCase()))
            ) {
              cleanedLocalItems.push({
                ...item,
                tags: itemTags.filter(
                  (t: string) => !tagValuesToDelete.has(t.trim().toLowerCase()),
                ),
                tags_lowercase: itemTagsLower.filter((t: string) => !tagValuesToDelete.has(t)),
                last_update: now,
              })
            }
          }
        } catch (cleanErr) {
          console.warn('Failed to clean deleted tags from local items:', cleanErr)
        }
      }

      options?.onProgress?.('Updating items and tag items in local database...')
      await localDb.transaction('rw', localDb.items, localDb.tags, localDb.syncMeta, async () => {
        if (itemsToPut.length > 0) {
          await localDb.items.bulkPut(itemsToPut)
        }
        if (cleanedLocalItems.length > 0) {
          await localDb.items.bulkPut(cleanedLocalItems)
        }
        if (itemIdsToDelete.length > 0) {
          await localDb.items.bulkDelete(itemIdsToDelete)
        }
        if (cloudTagsToPut.length > 0) {
          await localDb.tags.bulkPut(cloudTagsToPut)
        }
        if (tagIdsToDelete.length > 0) {
          await localDb.tags.bulkDelete(tagIdsToDelete)
        }
        await localDb.syncMeta.put({ key: `${SYNC_META_PREFIX}${uid}`, value: now })
      })

      localStorage.setItem(`${SYNC_META_PREFIX}${uid}`, now.toString())
      updatedItems = itemsToPut.length
      deletedItems = itemIdsToDelete.length
      updatedExamples = examplesToPutCount
      updatedTags = cloudTagsToPut.length
      deletedTags = tagIdsToDelete.length
    }

    invalidateSearchIndex()

    const totalItems = await localDb.items.where('uid').equals(uid).count()
    const totalTags = await localDb.tags.where('uid').equals(uid).count()

    console.log(`*** totalItems *** `, totalItems, `*** totalTags ***`, totalTags)

    const allLocalItems = await localDb.items.where('uid').equals(uid).toArray()
    const totalExamples = allLocalItems.reduce(
      (sum, item) =>
        sum +
        (item.meanings || []).reduce((mSum: number, m: any) => mSum + (m.examples || []).length, 0),
      0,
    )

    return {
      isSuccess: true,
      updatedItems,
      deletedItems,
      updatedExamples,
      updatedTags,
      deletedTags,
      cloudItemsUpdatedForTags,
      totalItems,
      totalExamples,
      totalTags,
      timestamp: now,
      isFullSync,
    }
  },

  /**
   * Optional maintenance: purge records older than specified days (default: 30) from deleted_records collection.
   */
  async cleanupOldDeletedRecords(daysToKeep = 30): Promise<number> {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) return 0

    try {
      const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
      const oldQuery = query(
        collection(db, dbCollections.deleted_records),
        where('uid', '==', currentUser.uid),
        where('deleted_at', '<', Timestamp.fromMillis(cutoffTime)),
      )
      const snap = await getDocs(oldQuery)
      if (snap.empty) return 0

      let batch = writeBatch(db)
      let count = 0
      for (const d of snap.docs) {
        batch.delete(d.ref)
        count++
        if (count % 400 === 0) {
          await batch.commit()
          batch = writeBatch(db)
        }
      }
      if (count % 400 !== 0) {
        await batch.commit()
      }
      return count
    } catch (err) {
      console.warn('Failed to cleanup old deleted_records:', err)
      return 0
    }
  },
}
