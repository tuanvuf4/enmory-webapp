import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  writeBatch,
  Timestamp,
  limit,
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

// In-memory cache for server counts to prevent duplicate getCountFromServer queries
const COUNT_CACHE_TTL_MS = 60000 // 60 seconds
const serverItemCountCache = new Map<string, { count: number; timestamp: number }>()
const serverBlogCountCache = new Map<string, { count: number; timestamp: number }>()

// In-memory cache for detectDataChanges to prevent rapid redundant checks
let lastDetectionCache: { uid: string; result: IDataChanges; timestamp: number } | null = null
const DETECTION_CACHE_TTL_MS = 30000 // 30 seconds

export interface IUnsyncedRecord {
  id: string
  type: 'item' | 'blog'
  title: string
  reason: string
  updatedAt?: number
  errorDetails?: string
}

export interface IDataChanges {
  hasChanges: boolean
  lastSyncTime: number | null
  items: {
    hasChanges: boolean
    localCount: number
    serverCount: number
    diffCount: number
    updatedCount: number
    deletedCount: number
  }
  blogs: {
    hasChanges: boolean
    localCount: number
    serverCount: number
    diffCount: number
    updatedCount: number
    deletedCount: number
  }
  totalChanges: number
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
   * Invalidate server count and detection caches.
   */
  clearCountCache(uid?: string) {
    if (uid) {
      serverItemCountCache.delete(uid)
      serverBlogCountCache.delete(uid)
      if (lastDetectionCache?.uid === uid) lastDetectionCache = null
    } else {
      serverItemCountCache.clear()
      serverBlogCountCache.clear()
      lastDetectionCache = null
    }
  },

  /**
   * Get total count of active items on Firebase Firestore for a user.
   * Memoized for 60 seconds to eliminate redundant Firestore getCountFromServer queries.
   */
  async getServerItemCount(uid: string, force = false): Promise<number> {
    if (!uid) return 0
    if (!force) {
      const cached = serverItemCountCache.get(uid)
      if (cached && Date.now() - cached.timestamp < COUNT_CACHE_TTL_MS) {
        return cached.count
      }
    }

    try {
      const itemsRef = collection(db, dbCollections.items)
      const baseQuery = query(itemsRef, where('uid', '==', uid))
      const totalSnap = await getCountFromServer(baseQuery)
      const totalCount = totalSnap.data().count

      serverItemCountCache.set(uid, { count: totalCount, timestamp: Date.now() })
      return totalCount
    } catch (err) {
      console.warn('getServerItemCount getCountFromServer failed:', err)
      return 0
    }
  },

  /**
   * Get total count of active blogs on Firebase Firestore for a user.
   * Memoized for 60 seconds to eliminate redundant Firestore getCountFromServer queries.
   */
  async getServerBlogCount(uid: string, force = false): Promise<number> {
    if (!uid) return 0
    if (!force) {
      const cached = serverBlogCountCache.get(uid)
      if (cached && Date.now() - cached.timestamp < COUNT_CACHE_TTL_MS) {
        return cached.count
      }
    }

    try {
      const blogsRef = collection(db, dbCollections.blogs || dbCollections.articles)
      const baseQuery = query(blogsRef, where('uid', '==', uid))
      const totalSnap = await getCountFromServer(baseQuery)
      const totalCount = totalSnap.data().count

      serverBlogCountCache.set(uid, { count: totalCount, timestamp: Date.now() })
      return totalCount
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
    this.clearCountCache(uid)
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
          const itemObj = { ...data, id: itemId } as IItem
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
          const itemObj = { ...data, id: itemId } as IItem
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
    this.clearCountCache(uid)

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

  /**
   * Detect changes between local IndexedDB and cloud Firestore for items and blogs.
   *
   * PERFORMANCE & FIRESTORE OPTIMIZATIONS:
   * 1. 30s in-memory cache to prevent duplicate Firestore requests on rapid re-renders or page reloads.
   * 2. FAST PATH: Uses 3 lightweight parallel probes with limit(1). When data is already up-to-date
   *    (the 99% typical case), all 3 return empty -> 0 documents downloaded and 0 server count scans!
   * 3. SLOW PATH: Server count queries are only dispatched on-demand for the specific collection
   *    that actually detected changes.
   */
  async detectDataChanges(uid: string, force = false): Promise<IDataChanges> {
    const defaultResult: IDataChanges = {
      hasChanges: false,
      lastSyncTime: null,
      items: {
        hasChanges: false,
        localCount: 0,
        serverCount: 0,
        diffCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      },
      blogs: {
        hasChanges: false,
        localCount: 0,
        serverCount: 0,
        diffCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      },
      totalChanges: 0,
    }

    if (!uid) return defaultResult

    // 1. Check in-memory detection cache
    if (!force && lastDetectionCache && lastDetectionCache.uid === uid) {
      if (Date.now() - lastDetectionCache.timestamp < DETECTION_CACHE_TTL_MS) {
        return lastDetectionCache.result
      }
    }

    try {
      const lastSyncTime = await this.getLastSyncTimestamp(uid)
      const hasSyncedBefore = lastSyncTime > 0

      // Read local counts directly from IndexedDB (0 network/Firestore cost)
      const [localItemCount, localBlogCount] = await Promise.all([
        localDb.items.where('uid').equals(uid).count(),
        localDb.blogs.where('uid').equals(uid).count(),
      ])

      let itemsHasChanges = false
      let blogsHasChanges = false

      // Case A: Device has never synced before
      if (!hasSyncedBefore) {
        // Fast probe with limit(1) to check if any cloud data exists without fetching documents
        const [cloudItemSnap, cloudBlogSnap] = await Promise.all([
          getDocs(query(collection(db, dbCollections.items), where('uid', '==', uid), limit(1))),
          getDocs(
            query(
              collection(db, dbCollections.blogs || dbCollections.articles),
              where('uid', '==', uid),
              limit(1),
            ),
          ),
        ])

        const hasCloudItems = !cloudItemSnap.empty
        const hasCloudBlogs = !cloudBlogSnap.empty

        // If both local and cloud are completely empty, no sync is needed
        if (!hasCloudItems && !hasCloudBlogs && localItemCount === 0 && localBlogCount === 0) {
          const res: IDataChanges = {
            ...defaultResult,
            items: { ...defaultResult.items, localCount: localItemCount },
            blogs: { ...defaultResult.blogs, localCount: localBlogCount },
          }
          lastDetectionCache = { uid, result: res, timestamp: Date.now() }
          return res
        }

        itemsHasChanges = hasCloudItems || localItemCount > 0
        blogsHasChanges = hasCloudBlogs || localBlogCount > 0

        // Only query server counts if that collection has data to display in the modal
        const [serverItemCount, serverBlogCount] = await Promise.all([
          itemsHasChanges ? this.getServerItemCount(uid) : Promise.resolve(localItemCount),
          blogsHasChanges ? this.getServerBlogCount(uid) : Promise.resolve(localBlogCount),
        ])

        const diffItem = serverItemCount - localItemCount
        const diffBlog = serverBlogCount - localBlogCount

        const res: IDataChanges = {
          hasChanges: itemsHasChanges || blogsHasChanges,
          lastSyncTime: null,
          items: {
            hasChanges: itemsHasChanges,
            localCount: localItemCount,
            serverCount: serverItemCount,
            diffCount: diffItem,
            updatedCount: 0,
            deletedCount: 0,
          },
          blogs: {
            hasChanges: blogsHasChanges,
            localCount: localBlogCount,
            serverCount: serverBlogCount,
            diffCount: diffBlog,
            updatedCount: 0,
            deletedCount: 0,
          },
          totalChanges: Math.abs(diffItem) + Math.abs(diffBlog),
        }
        lastDetectionCache = { uid, result: res, timestamp: Date.now() }
        return res
      }

      // Case B: Device has synced before (hasSyncedBefore === true)
      // FAST PATH: Run 3 lightweight parallel probes with limit(1).
      // If nothing was modified, all 3 return empty -> 0 documents read, 0 count scans!
      const itemsProbePromise = getDocs(
        query(
          collection(db, dbCollections.items),
          where('uid', '==', uid),
          where('last_update', '>', lastSyncTime),
          limit(1),
        ),
      ).catch((err) => {
        console.warn('Items delta probe warning:', err)
        return null
      })

      const deletedProbePromise = getDocs(
        query(
          collection(db, dbCollections.deleted_records),
          where('uid', '==', uid),
          where('deleted_at', '>', Timestamp.fromMillis(lastSyncTime)),
          limit(1),
        ),
      ).catch(() => null)

      const blogsProbePromise = (async () => {
        try {
          return await getDocs(
            query(
              collection(db, dbCollections.blogs || dbCollections.articles),
              where('uid', '==', uid),
              where('last_update', '>', lastSyncTime),
              limit(1),
            ),
          )
        } catch {
          try {
            return await getDocs(
              query(
                collection(db, dbCollections.blogs || dbCollections.articles),
                where('uid', '==', uid),
                where('created_date', '>', lastSyncTime),
                limit(1),
              ),
            )
          } catch {
            return null
          }
        }
      })()

      const [itemsProbe, deletedProbe, blogsProbe] = await Promise.all([
        itemsProbePromise,
        deletedProbePromise,
        blogsProbePromise,
      ])

      const hasUpdatedItems = Boolean(itemsProbe && !itemsProbe.empty)
      const hasDeletedRecords = Boolean(deletedProbe && !deletedProbe.empty)
      const hasUpdatedBlogs = Boolean(blogsProbe && !blogsProbe.empty)

      // Fast exit if all 3 probes are empty (the typical 99% case):
      // No documents created, modified, or deleted in the cloud since last sync.
      if (!hasUpdatedItems && !hasDeletedRecords && !hasUpdatedBlogs) {
        const res: IDataChanges = {
          hasChanges: false,
          lastSyncTime,
          items: {
            hasChanges: false,
            localCount: localItemCount,
            serverCount: localItemCount, // Guaranteed identical without extra Firestore count query
            diffCount: 0,
            updatedCount: 0,
            deletedCount: 0,
          },
          blogs: {
            hasChanges: false,
            localCount: localBlogCount,
            serverCount: localBlogCount, // Guaranteed identical without extra Firestore count query
            diffCount: 0,
            updatedCount: 0,
            deletedCount: 0,
          },
          totalChanges: 0,
        }
        lastDetectionCache = { uid, result: res, timestamp: Date.now() }
        return res
      }

      // SLOW PATH: Changes detected by probes.
      // Retrieve server counts ONLY for collections that actually have detected changes.
      itemsHasChanges = hasUpdatedItems || hasDeletedRecords
      blogsHasChanges = hasUpdatedBlogs

      const [serverItemCount, serverBlogCount] = await Promise.all([
        itemsHasChanges ? this.getServerItemCount(uid) : Promise.resolve(localItemCount),
        blogsHasChanges ? this.getServerBlogCount(uid) : Promise.resolve(localBlogCount),
      ])

      const diffItemCount = serverItemCount - localItemCount
      const diffBlogCount = serverBlogCount - localBlogCount

      const res: IDataChanges = {
        hasChanges: true,
        lastSyncTime,
        items: {
          hasChanges: itemsHasChanges || diffItemCount !== 0,
          localCount: localItemCount,
          serverCount: serverItemCount,
          diffCount: diffItemCount,
          updatedCount: hasUpdatedItems ? 1 : 0,
          deletedCount: hasDeletedRecords ? 1 : 0,
        },
        blogs: {
          hasChanges: blogsHasChanges || diffBlogCount !== 0,
          localCount: localBlogCount,
          serverCount: serverBlogCount,
          diffCount: diffBlogCount,
          updatedCount: hasUpdatedBlogs ? 1 : 0,
          deletedCount: 0,
        },
        totalChanges:
          Math.abs(diffItemCount) +
          Math.abs(diffBlogCount) +
          (hasUpdatedItems ? 1 : 0) +
          (hasUpdatedBlogs ? 1 : 0),
      }

      lastDetectionCache = { uid, result: res, timestamp: Date.now() }
      return res
    } catch (err) {
      console.warn('detectDataChanges error:', err)
      return defaultResult
    }
  },
}
