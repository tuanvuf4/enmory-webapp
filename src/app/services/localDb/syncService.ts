import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { localDb } from './db'
import { IItem, IExample } from '@/models/item.model'
import { invalidateSearchIndex } from './searchEngine'

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
    await localDb.transaction('rw', localDb.items, localDb.examples, localDb.syncMeta, async () => {
      await localDb.items.clear()
      await localDb.examples.clear()
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

      const itemsQuery = query(
        collection(db, dbCollections.items),
        where('uid', '==', uid),
        where('is_deleted', '==', false),
      )
      const itemsSnapshot = await getDocs(itemsQuery)
      const allItems: IItem[] = []
      itemsSnapshot.forEach((docSnap) => {
        allItems.push({ id: docSnap.id, ...docSnap.data() } as IItem)
      })

      options?.onProgress?.('Fetching all examples from cloud...')
      const examplesQuery = query(
        collection(db, dbCollections.examples),
        where('uid', '==', uid),
      )
      const examplesSnapshot = await getDocs(examplesQuery)
      const allExamples: IExample[] = []
      examplesSnapshot.forEach((docSnap) => {
        allExamples.push({ id: docSnap.id, ...docSnap.data() } as IExample)
      })

      options?.onProgress?.('Saving to local database...')
      await localDb.transaction('rw', localDb.items, localDb.examples, localDb.syncMeta, async () => {
        await localDb.items.clear()
        await localDb.examples.clear()

        if (allItems.length > 0) {
          await localDb.items.bulkPut(allItems)
        }
        if (allExamples.length > 0) {
          await localDb.examples.bulkPut(allExamples)
        }

        await localDb.syncMeta.put({ key: `${SYNC_META_PREFIX}${uid}`, value: now })
      })

      localStorage.setItem(`${SYNC_META_PREFIX}${uid}`, now.toString())
      updatedItems = allItems.length
      updatedExamples = allExamples.length
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

      const itemsToPut: IItem[] = []
      const itemIdsToDelete: string[] = []

      deltaItemsSnapshot.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as IItem
        if (item.is_deleted) {
          itemIdsToDelete.push(docSnap.id)
        } else {
          itemsToPut.push(item)
        }
      })

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

      options?.onProgress?.('Checking for updated examples...')
      const deltaExamplesQuery = query(
        collection(db, dbCollections.examples),
        where('uid', '==', uid),
        where('last_update', '>', lastSyncTime),
      )
      const deltaExamplesSnapshot = await getDocs(deltaExamplesQuery)

      const examplesToPut: IExample[] = []
      const exampleIdsToDelete: string[] = []

      deltaExamplesSnapshot.forEach((docSnap) => {
        const example = { id: docSnap.id, ...docSnap.data() } as IExample
        if ((example as any).is_deleted) {
          exampleIdsToDelete.push(docSnap.id)
        } else {
          examplesToPut.push(example)
        }
      })

      options?.onProgress?.('Updating local database...')
      await localDb.transaction('rw', localDb.items, localDb.examples, localDb.syncMeta, async () => {
        if (itemsToPut.length > 0) {
          await localDb.items.bulkPut(itemsToPut)
        }
        if (itemIdsToDelete.length > 0) {
          await localDb.items.bulkDelete(itemIdsToDelete)
        }
        if (examplesToPut.length > 0) {
          await localDb.examples.bulkPut(examplesToPut)
        }
        if (exampleIdsToDelete.length > 0) {
          await localDb.examples.bulkDelete(exampleIdsToDelete)
        }

        await localDb.syncMeta.put({ key: `${SYNC_META_PREFIX}${uid}`, value: now })
      })

      localStorage.setItem(`${SYNC_META_PREFIX}${uid}`, now.toString())
      updatedItems = itemsToPut.length
      deletedItems = itemIdsToDelete.length
      updatedExamples = examplesToPut.length
    }

    invalidateSearchIndex()

    const totalItems = await localDb.items.count()
    const totalExamples = await localDb.examples.count()

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

