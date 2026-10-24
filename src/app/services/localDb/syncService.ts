import { collection, getDocs, getCountFromServer, query, where } from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { localDb } from './db'
import { IItem } from '@/models/item.model'
import { invalidateSearchIndex } from './searchEngine'
import { hydrateItemsWithExamples } from '@/services/firebase/dbIntegration'

const SYNC_META_PREFIX = 'last_sync_time_'

export interface ISyncResult {
  isSuccess: boolean
  updatedItems: number
  deletedItems: number
  updatedExamples: number
  totalItems: number
  totalExamples: number
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
    await localDb.transaction('rw', localDb.items, localDb.syncMeta, async () => {
      await localDb.items.clear()
      await localDb.syncMeta.delete(`${SYNC_META_PREFIX}${uid}`)
    })
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
          sum + (item.meanings || []).reduce((mSum, m) => mSum + (m.examples || []).length, 0),
        0,
      )

      options?.onProgress?.('Saving to local database...')
      await localDb.transaction('rw', localDb.items, localDb.syncMeta, async () => {
        await localDb.items.clear()

        if (allItems.length > 0) {
          await localDb.items.bulkPut(allItems)
        }

        await localDb.syncMeta.put({ key: `${SYNC_META_PREFIX}${uid}`, value: now })
      })

      localStorage.setItem(`${SYNC_META_PREFIX}${uid}`, now.toString())
      updatedItems = allItems.length
      updatedExamples = totalExamplesCount
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
          sum + (item.meanings || []).reduce((mSum, m) => mSum + (m.examples || []).length, 0),
        0,
      )

      // Also check if any items were soft-deleted with deleted_date > lastSyncTime
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

      options?.onProgress?.('Updating local database...')
      await localDb.transaction('rw', localDb.items, localDb.syncMeta, async () => {
        if (itemsToPut.length > 0) {
          await localDb.items.bulkPut(itemsToPut)
        }
        if (itemIdsToDelete.length > 0) {
          await localDb.items.bulkDelete(itemIdsToDelete)
        }
        await localDb.syncMeta.put({ key: `${SYNC_META_PREFIX}${uid}`, value: now })
      })

      localStorage.setItem(`${SYNC_META_PREFIX}${uid}`, now.toString())
      updatedItems = itemsToPut.length
      deletedItems = itemIdsToDelete.length
      updatedExamples = examplesToPutCount
    }

    invalidateSearchIndex()

    const totalItems = await localDb.items.count()
    const allLocalItems = await localDb.items.toArray()
    const totalExamples = allLocalItems.reduce(
      (sum, item) =>
        sum + (item.meanings || []).reduce((mSum, m) => mSum + (m.examples || []).length, 0),
      0,
    )

    return {
      isSuccess: true,
      updatedItems,
      deletedItems,
      updatedExamples,
      totalItems,
      totalExamples,
      timestamp: now,
      isFullSync,
    }
  },
}
