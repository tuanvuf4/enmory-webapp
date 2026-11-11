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
import { IBlogItem } from '@/models/blog.model'
import { mapDocToBlogItem } from '@/services/firebase/api/blog.api'
import { invalidateSearchIndex } from './searchEngine'
import { hydrateItemsWithExamples } from '@/services/firebase/dbIntegration'

const SYNC_META_PREFIX = 'last_sync_time_'
const UNSYNCED_META_PREFIX = 'last_unsynced_records_'

export interface IUnsyncedRecord {
  id: string
  type: 'item' | 'blog'
  title: string
  reason: string
  updatedAt?: number
  errorDetails?: string
}

export interface ISyncResult {
  isSuccess: boolean
  updatedItems: number
  deletedItems: number
  updatedExamples: number
  updatedBlogs: number
  deletedBlogs: number
  totalItems: number
  totalExamples: number
  totalBlogs: number
  timestamp: number
  isFullSync: boolean
  unsyncedRecords: IUnsyncedRecord[]
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
        // Fallback to query all user items and count non-deleted docs to avoid composite index errors
        const itemsQuery = query(itemsRef, where('uid', '==', uid))
        const snapshot = await getDocs(itemsQuery)
        let count = 0
        snapshot.forEach((docSnap) => {
          if (!docSnap.data().is_deleted) {
            count++
          }
        })
        return count
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
   * Get total count of active blogs on Firebase Firestore for a user.
   * Directly queries all user blogs to accurately account for any soft-deleted records.
   */
  async getServerBlogCount(uid: string): Promise<number> {
    if (!uid) return 0
    try {
      const blogsRef = collection(db, dbCollections.blogs || dbCollections.articles)
      const blogsQuery = query(blogsRef, where('uid', '==', uid))
      const snapshot = await getDocs(blogsQuery)
      let count = 0
      snapshot.forEach((docSnap) => {
        if (!docSnap.data().is_deleted) {
          count++
        }
      })
      return count
    } catch (err) {
      console.warn('getServerBlogCount failed:', err)
      return 0
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
    await localDb.transaction('rw', localDb.items, localDb.blogs, localDb.syncMeta, async () => {
      await localDb.items.where('uid').equals(uid).delete()
      await localDb.blogs.where('uid').equals(uid).delete()
      await localDb.syncMeta.delete(`${SYNC_META_PREFIX}${uid}`)
      await localDb.syncMeta.delete(`${UNSYNCED_META_PREFIX}${uid}`)
    })
    localStorage.removeItem(`${SYNC_META_PREFIX}${uid}`)
    localStorage.removeItem(`${UNSYNCED_META_PREFIX}${uid}`)
    invalidateSearchIndex()
  },

  /**
   * Get cached unsynced records from last sync.
   */
  async getLastUnsyncedRecords(uid: string): Promise<IUnsyncedRecord[]> {
    if (!uid) return []
    const metaKey = `${UNSYNCED_META_PREFIX}${uid}`
    const meta = await localDb.syncMeta.get(metaKey)
    if (meta && Array.isArray(meta.value)) {
      return meta.value
    }
    const localVal = localStorage.getItem(metaKey)
    if (localVal) {
      try {
        return JSON.parse(localVal)
      } catch {
        return []
      }
    }
    return []
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
    const unsyncedRecords: IUnsyncedRecord[] = []

    // ==========================================
    // 1. SYNC BLOGS
    // Always fetch all active blogs for user to guarantee 100% consistency.
    // ==========================================
    options?.onProgress?.('Fetching all active blogs from cloud...')
    const blogsQuery = query(
      collection(db, dbCollections.blogs || dbCollections.articles),
      where('uid', '==', uid),
    )
    const blogsSnapshot = await getDocs(blogsQuery)
    const cloudBlogs: IBlogItem[] = []
    const cloudBlogIds = new Set<string>()

    blogsSnapshot.forEach((docSnap) => {
      const data = docSnap.data() || {}
      if ((data as any).is_deleted) {
        return
      }

      const blogId = docSnap.id
      const blogTitle = data.title || '(Untitled Blog)'

      if (!blogId) {
        unsyncedRecords.push({
          id: 'unknown',
          type: 'blog',
          title: blogTitle,
          reason: 'Missing document ID',
          updatedAt: data.last_update || data.created_date,
        })
        return
      }

      if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
        unsyncedRecords.push({
          id: blogId,
          type: 'blog',
          title: '(No title)',
          reason: 'Blog title is empty or missing',
          updatedAt: data.last_update || data.created_date,
        })
        return
      }

      try {
        const blogItem = mapDocToBlogItem(docSnap)
        if (!blogItem.uid) {
          blogItem.uid = uid
        }
        cloudBlogs.push(blogItem)
        if (blogItem.id) {
          cloudBlogIds.add(blogItem.id)
        }
      } catch (err: any) {
        unsyncedRecords.push({
          id: blogId,
          type: 'blog',
          title: blogTitle,
          reason: `Failed to process blog data: ${err?.message || 'Invalid format'}`,
          updatedAt: data.last_update || data.created_date,
        })
      }
    })

    // Find any local blogs for this user that are no longer active in the cloud
    const existingLocalBlogs = await localDb.blogs.where('uid').equals(uid).toArray()
    const blogIdsToDelete = existingLocalBlogs
      .map((b) => b.id!)
      .filter((id) => id && !cloudBlogIds.has(id))

    const existingLocalBlogMap = new Map<string, IBlogItem>(
      existingLocalBlogs.map((b) => [b.id!, b]),
    )

    const isBlogModified = (cloud: IBlogItem, local?: IBlogItem): boolean => {
      if (!local) return true
      const cloudTime = cloud.last_update || cloud.created_date || 0
      const localTime = local.last_update || local.created_date || 0
      if (cloudTime !== localTime) return true
      if (cloud.title !== local.title) return true
      if (cloud.description !== local.description) return true
      if (cloud.translation !== local.translation) return true
      if (JSON.stringify(cloud.tags || []) !== JSON.stringify(local.tags || [])) return true
      if (JSON.stringify(cloud.relation || []) !== JSON.stringify(local.relation || [])) return true
      if (
        JSON.stringify(cloud.vocabClassification || []) !==
        JSON.stringify(local.vocabClassification || [])
      )
        return true
      return false
    }

    const modifiedBlogs = isFullSync
      ? cloudBlogs
      : cloudBlogs.filter((cloudBlog) => {
          const localBlog = existingLocalBlogMap.get(cloudBlog.id!)
          return isBlogModified(cloudBlog, localBlog)
        })

    const updatedBlogs = modifiedBlogs.length

    // ==========================================
    // 2. SYNC ITEMS
    // ==========================================
    let allItemsToPut: IItem[] = []
    let itemIdsToDelete: string[] = []

    if (isFullSync) {
      options?.onProgress?.('Fetching all active items from cloud...')
      const itemsQuery = query(collection(db, dbCollections.items), where('uid', '==', uid))
      const itemsSnapshot = await getDocs(itemsQuery)
      const cloudItems: IItem[] = []
      itemsSnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {}
        if ((data as any).is_deleted) {
          return
        }

        const itemId = docSnap.id
        const itemOrigin = data.origin || '(No vocabulary origin)'

        if (!itemId) {
          unsyncedRecords.push({
            id: 'unknown',
            type: 'item',
            title: itemOrigin,
            reason: 'Missing document ID',
            updatedAt: data.last_update || data.created_date,
          })
          return
        }

        if (!data.origin || typeof data.origin !== 'string' || !data.origin.trim()) {
          unsyncedRecords.push({
            id: itemId,
            type: 'item',
            title: '(Empty origin)',
            reason: 'Item vocabulary origin word/phrase is empty or missing',
            updatedAt: data.last_update || data.created_date,
          })
          return
        }

        try {
          const itemObj = { id: itemId, ...data } as IItem
          if (!itemObj.uid) {
            itemObj.uid = uid
          }
          cloudItems.push(itemObj)
        } catch (err: any) {
          unsyncedRecords.push({
            id: itemId,
            type: 'item',
            title: itemOrigin,
            reason: `Failed to process item: ${err?.message || 'Invalid format'}`,
            updatedAt: data.last_update || data.created_date,
          })
        }
      })

      try {
        allItemsToPut = await hydrateItemsWithExamples(cloudItems)
      } catch (hydrateErr: any) {
        console.warn('Hydration error, falling back to raw cloudItems:', hydrateErr)
        allItemsToPut = cloudItems
      }

      updatedItems = allItemsToPut.length
      updatedExamples = allItemsToPut.reduce(
        (sum, item) =>
          sum +
          (item.meanings || []).reduce(
            (mSum: number, m: any) => mSum + (m.examples || []).length,
            0,
          ),
        0,
      )
    } else {
      options?.onProgress?.('Checking for updated items since last sync...')
      const deltaItemsQuery = query(
        collection(db, dbCollections.items),
        where('uid', '==', uid),
        where('last_update', '>', lastSyncTime),
      )
      const deltaItemsSnapshot = await getDocs(deltaItemsQuery)
      const cloudItemsToPut: IItem[] = []

      deltaItemsSnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {}
        if ((data as any).is_deleted) {
          itemIdsToDelete.push(docSnap.id)
          return
        }

        const itemId = docSnap.id
        const itemOrigin = data.origin || '(No vocabulary origin)'

        if (!itemId) {
          unsyncedRecords.push({
            id: 'unknown',
            type: 'item',
            title: itemOrigin,
            reason: 'Missing document ID',
            updatedAt: data.last_update || data.created_date,
          })
          return
        }

        if (!data.origin || typeof data.origin !== 'string' || !data.origin.trim()) {
          unsyncedRecords.push({
            id: itemId,
            type: 'item',
            title: '(Empty origin)',
            reason: 'Item vocabulary origin word/phrase is empty or missing',
            updatedAt: data.last_update || data.created_date,
          })
          return
        }

        try {
          const itemObj = { id: itemId, ...data } as IItem
          if (!itemObj.uid) {
            itemObj.uid = uid
          }
          cloudItemsToPut.push(itemObj)
        } catch (err: any) {
          unsyncedRecords.push({
            id: itemId,
            type: 'item',
            title: itemOrigin,
            reason: `Failed to process item: ${err?.message || 'Invalid format'}`,
            updatedAt: data.last_update || data.created_date,
          })
        }
      })

      try {
        allItemsToPut = await hydrateItemsWithExamples(cloudItemsToPut)
      } catch (hydrateErr: any) {
        console.warn('Hydration error, falling back to raw cloudItemsToPut:', hydrateErr)
        allItemsToPut = cloudItemsToPut
      }

      updatedItems = allItemsToPut.length
      updatedExamples = allItemsToPut.reduce(
        (sum, item) =>
          sum +
          (item.meanings || []).reduce(
            (mSum: number, m: any) => mSum + (m.examples || []).length,
            0,
          ),
        0,
      )

      // Query deleted_records collection for items deleted on other devices
      options?.onProgress?.('Checking for deleted items from cloud...')
      try {
        let deletedDocs: Array<{ recordId: string; collectionName?: string }> = []
        try {
          const lastSyncTimestamp = Timestamp.fromMillis(lastSyncTime)
          const deletedRecordsQuery = query(
            collection(db, dbCollections.deleted_records),
            where('uid', '==', uid),
            where('deleted_at', '>', lastSyncTimestamp),
          )
          const deletedRecordsSnapshot = await getDocs(deletedRecordsQuery)
          deletedDocs = deletedRecordsSnapshot.docs.map((docSnap) => ({
            recordId: (docSnap.data().recordId as string) || docSnap.id,
            collectionName: docSnap.data().collectionName as string | undefined,
          }))
        } catch {
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
            .map((docSnap) => ({
              recordId: (docSnap.data().recordId as string) || docSnap.id,
              collectionName: docSnap.data().collectionName as string | undefined,
            }))
        }

        deletedDocs.forEach(({ recordId, collectionName }) => {
          if (!collectionName || collectionName === dbCollections.items) {
            if (!itemIdsToDelete.includes(recordId)) {
              itemIdsToDelete.push(recordId)
            }
          }
        })
      } catch (deletedErr) {
        console.warn('Failed to fetch deleted_records from cloud:', deletedErr)
      }

      // Check soft-deleted items
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
      } catch {
        // Safe to ignore
      }

      deletedItems = itemIdsToDelete.length
    }

    // ==========================================
    // 3. COMMIT TRANSACTION TO LOCAL DB
    // ==========================================
    options?.onProgress?.('Saving items and blogs to local database...')
    await localDb.transaction('rw', localDb.items, localDb.blogs, localDb.syncMeta, async () => {
      if (isFullSync) {
        await localDb.items.where('uid').equals(uid).delete()
        if (allItemsToPut.length > 0) {
          try {
            await localDb.items.bulkPut(allItemsToPut)
          } catch (bulkErr: any) {
            for (const item of allItemsToPut) {
              try {
                await localDb.items.put(item)
              } catch (singleErr: any) {
                unsyncedRecords.push({
                  id: item.id || 'unknown',
                  type: 'item',
                  title: item.origin || '(Unknown Item)',
                  reason: `Failed to save to local database: ${singleErr?.message || 'Storage error'}`,
                  updatedAt: item.last_update,
                })
              }
            }
          }
        }
      } else {
        if (allItemsToPut.length > 0) {
          try {
            await localDb.items.bulkPut(allItemsToPut)
          } catch (bulkErr: any) {
            for (const item of allItemsToPut) {
              try {
                await localDb.items.put(item)
              } catch (singleErr: any) {
                unsyncedRecords.push({
                  id: item.id || 'unknown',
                  type: 'item',
                  title: item.origin || '(Unknown Item)',
                  reason: `Failed to save to local database: ${singleErr?.message || 'Storage error'}`,
                  updatedAt: item.last_update,
                })
              }
            }
          }
        }
        if (itemIdsToDelete.length > 0) {
          await localDb.items.bulkDelete(itemIdsToDelete)
        }
      }

      // Put blogs into localDb (all blogs if full sync, or only modified/added blogs in delta sync)
      const blogsToPut = isFullSync ? cloudBlogs : modifiedBlogs
      if (blogsToPut.length > 0) {
        try {
          await localDb.blogs.bulkPut(blogsToPut)
        } catch (bulkErr: any) {
          for (const blog of blogsToPut) {
            try {
              await localDb.blogs.put(blog)
            } catch (singleErr: any) {
              unsyncedRecords.push({
                id: blog.id || 'unknown',
                type: 'blog',
                title: blog.title || '(Untitled Blog)',
                reason: `Failed to save to local database: ${singleErr?.message || 'Storage error'}`,
                updatedAt: blog.last_update,
              })
            }
          }
        }
      }
      if (blogIdsToDelete.length > 0) {
        await localDb.blogs.bulkDelete(blogIdsToDelete)
      }

      await localDb.syncMeta.put({ key: `${SYNC_META_PREFIX}${uid}`, value: now })
    })

    // Verify stored items in localDb
    for (const item of allItemsToPut) {
      if (item.id && !unsyncedRecords.some((u) => u.id === item.id)) {
        const saved = await localDb.items.get(item.id)
        if (!saved) {
          unsyncedRecords.push({
            id: item.id,
            type: 'item',
            title: item.origin || '(Unknown Item)',
            reason: 'Item not found in local database after sync',
            updatedAt: item.last_update,
          })
        }
      }
    }

    // Verify stored blogs in localDb
    const blogsToVerify = isFullSync ? cloudBlogs : modifiedBlogs
    for (const blog of blogsToVerify) {
      if (blog.id && !unsyncedRecords.some((u) => u.id === blog.id)) {
        const saved = await localDb.blogs.get(blog.id)
        if (!saved) {
          unsyncedRecords.push({
            id: blog.id,
            type: 'blog',
            title: blog.title || '(Untitled Blog)',
            reason: 'Blog not found in local database after sync',
            updatedAt: blog.last_update,
          })
        }
      }
    }

    // In delta sync, if server has items not in localDb, check which ones are missing
    if (!isFullSync) {
      const currentLocalItemCount = await localDb.items.where('uid').equals(uid).count()
      const serverCount = await this.getServerItemCount(uid)
      if (currentLocalItemCount < serverCount) {
        options?.onProgress?.('Checking for missing server items...')
        try {
          const checkItemsQuery = query(
            collection(db, dbCollections.items),
            where('uid', '==', uid),
          )
          const checkSnapshot = await getDocs(checkItemsQuery)
          for (const docSnap of checkSnapshot.docs) {
            const data = docSnap.data() || {}
            if (!data.is_deleted && !unsyncedRecords.some((u) => u.id === docSnap.id)) {
              const existsLocally = await localDb.items.get(docSnap.id)
              if (!existsLocally) {
                unsyncedRecords.push({
                  id: docSnap.id,
                  type: 'item',
                  title: data.origin || '(No vocabulary origin)',
                  reason: 'Missing in local database (delta sync skipped; full sync recommended)',
                  updatedAt: data.last_update || data.created_date,
                })
              }
            }
          }
        } catch (checkErr) {
          console.warn('Failed to check missing items during delta sync:', checkErr)
        }
      }
    }

    // Persist latest unsynced records to syncMeta and localStorage
    try {
      await localDb.syncMeta.put({ key: `${UNSYNCED_META_PREFIX}${uid}`, value: unsyncedRecords })
      localStorage.setItem(`${UNSYNCED_META_PREFIX}${uid}`, JSON.stringify(unsyncedRecords))
    } catch (metaErr) {
      console.warn('Failed to persist unsynced records meta:', metaErr)
    }

    localStorage.setItem(`${SYNC_META_PREFIX}${uid}`, now.toString())
    invalidateSearchIndex()

    const totalItems = await localDb.items.where('uid').equals(uid).count()
    const totalBlogs = await localDb.blogs.where('uid').equals(uid).count()

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
      updatedBlogs,
      deletedBlogs: blogIdsToDelete.length,
      totalItems,
      totalExamples,
      totalBlogs,
      timestamp: now,
      isFullSync,
      unsyncedRecords,
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
