import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { useLiveQuery } from 'dexie-react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@/core/hooks/redux'
import { localDb } from './db'
import {
  syncService,
  ISyncResult,
  IUnsyncedRecord,
  IDataChanges,
  SyncMode,
  SyncType,
} from './syncService'
import { itemKeys } from '@/core/hooks/useItems'
import { blogKeys } from '@/core/hooks/useBlogs'
import { refreshAiUsageFromCloud } from '@/services/gemini'
import { firebaseAuthService } from '@/services/firebase/authService'

export interface ISyncFeedback {
  type: 'success' | 'warning' | 'error'
  message: string
  description?: string
}

export interface IUseManualSyncOptions {
  autoFetchServerCounts?: boolean
  showMessages?: boolean
}

export const useManualSync = (options?: IUseManualSyncOptions) => {
  const autoFetchServerCounts = options?.autoFetchServerCounts ?? false
  const showMessages = options?.showMessages ?? true
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  const [isSyncing, setIsSyncing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [serverItemCount, setServerItemCount] = useState<number | null>(null)
  const [isLoadingServerCount, setIsLoadingServerCount] = useState<boolean>(false)
  const [serverBlogCount, setServerBlogCount] = useState<number | null>(null)
  const [isLoadingServerBlogCount, setIsLoadingServerBlogCount] = useState<boolean>(false)
  const [serverDictationCount, setServerDictationCount] = useState<number | null>(null)
  const [isLoadingServerDictationCount, setIsLoadingServerDictationCount] = useState<boolean>(false)
  const [serverToeicCount, setServerToeicCount] = useState<number | null>(null)
  const [isLoadingServerToeicCount, setIsLoadingServerToeicCount] = useState<boolean>(false)
  const [unsyncedRecords, setUnsyncedRecords] = useState<IUnsyncedRecord[]>([])
  const [lastSyncResult, setLastSyncResult] = useState<ISyncResult | null>(null)
  const [syncFeedback, setSyncFeedback] = useState<ISyncFeedback | null>(null)
  const clearSyncFeedback = useCallback(() => setSyncFeedback(null), [])

  // Manual local count states and loading indicators
  const [localRefreshTick, setLocalRefreshTick] = useState<number>(0)
  const [isLoadingLocalCount, setIsLoadingLocalCount] = useState<boolean>(false)
  const [isLoadingLocalBlogCount, setIsLoadingLocalBlogCount] = useState<boolean>(false)
  const [isLoadingLocalDictationCount, setIsLoadingLocalDictationCount] = useState<boolean>(false)
  const [isLoadingLocalToeicCount, setIsLoadingLocalToeicCount] = useState<boolean>(false)
  const [manualLocalItemCount, setManualLocalItemCount] = useState<number | null>(null)
  const [manualLocalBlogCount, setManualLocalBlogCount] = useState<number | null>(null)
  const [manualLocalDictationCount, setManualLocalDictationCount] = useState<number | null>(null)
  const [manualLocalToeicCount, setManualLocalToeicCount] = useState<number | null>(null)

  const getEffectiveUid = useCallback(
    () => user?.uid || firebaseAuthService.getCurrentUser()?.uid || null,
    [user?.uid],
  )

  // Live counts from Dexie IndexedDB for currently logged in user
  const liveLocalItemCount = useLiveQuery(
    async () => {
      const uid = getEffectiveUid()
      if (uid) {
        const count = await localDb.items.where('uid').equals(uid).count()
        if (count === 0) {
          const total = await localDb.items.count()
          if (total > 0) {
            const noUidCount = await localDb.items.filter((it) => !it.uid).count()
            if (noUidCount > 0) return noUidCount
          }
        }
        return count
      }
      return await localDb.items.count()
    },
    [user?.uid, localRefreshTick, getEffectiveUid],
    0,
  )

  const liveLocalBlogCount = useLiveQuery(
    async () => {
      const uid = getEffectiveUid()
      if (uid) {
        const count = await localDb.blogs.where('uid').equals(uid).count()
        if (count === 0) {
          const total = await localDb.blogs.count()
          if (total > 0) {
            const noUidCount = await localDb.blogs.filter((it) => !it.uid).count()
            if (noUidCount > 0) return noUidCount
          }
        }
        return count
      }
      return await localDb.blogs.count()
    },
    [user?.uid, localRefreshTick, getEffectiveUid],
    0,
  )

  const liveLocalDictationCount = useLiveQuery(
    async () => {
      const uid = getEffectiveUid()
      if (uid) {
        const count = await localDb.listeningHistory.where('uid').equals(uid).count()
        if (count === 0) {
          const total = await localDb.listeningHistory.count()
          if (total > 0) {
            const noUidCount = await localDb.listeningHistory.filter((it) => !it.uid).count()
            if (noUidCount > 0) return noUidCount
          }
        }
        return count
      }
      return await localDb.listeningHistory.count()
    },
    [user?.uid, localRefreshTick, getEffectiveUid],
    0,
  )

  const liveLocalToeicCount = useLiveQuery(
    async () => {
      return await localDb.toeicExams.filter((e) => !e.is_deleted && !e.isSample).count()
    },
    [user?.uid, localRefreshTick],
    0,
  )

  useEffect(() => {
    if (liveLocalItemCount !== undefined && liveLocalItemCount !== null) {
      setManualLocalItemCount(liveLocalItemCount)
    }
  }, [liveLocalItemCount])

  useEffect(() => {
    if (liveLocalBlogCount !== undefined && liveLocalBlogCount !== null) {
      setManualLocalBlogCount(liveLocalBlogCount)
    }
  }, [liveLocalBlogCount])

  useEffect(() => {
    if (liveLocalDictationCount !== undefined && liveLocalDictationCount !== null) {
      setManualLocalDictationCount(liveLocalDictationCount)
    }
  }, [liveLocalDictationCount])

  useEffect(() => {
    if (liveLocalToeicCount !== undefined && liveLocalToeicCount !== null) {
      setManualLocalToeicCount(liveLocalToeicCount)
    }
  }, [liveLocalToeicCount])

  const localItemCount =
    manualLocalItemCount !== null ? manualLocalItemCount : (liveLocalItemCount ?? 0)
  const localBlogCount =
    manualLocalBlogCount !== null ? manualLocalBlogCount : (liveLocalBlogCount ?? 0)
  const localDictationCount =
    manualLocalDictationCount !== null ? manualLocalDictationCount : (liveLocalDictationCount ?? 0)
  const localToeicCount =
    manualLocalToeicCount !== null ? manualLocalToeicCount : (liveLocalToeicCount ?? 0)

  // Refresh local item count directly from IndexedDB
  const refreshLocalItemCount = useCallback(async () => {
    setIsLoadingLocalCount(true)
    try {
      const uid = getEffectiveUid()
      let count = 0
      if (uid) {
        count = await localDb.items.where('uid').equals(uid).count()
        if (count === 0) {
          const total = await localDb.items.count()
          if (total > 0) {
            const noUidCount = await localDb.items.filter((it) => !it.uid).count()
            if (noUidCount > 0) count = noUidCount
          }
        }
      } else {
        count = await localDb.items.count()
      }
      setManualLocalItemCount(count)
      setLocalRefreshTick((t) => t + 1)
      return count
    } catch (err) {
      console.warn('Failed to refresh local item count:', err)
      return 0
    } finally {
      setIsLoadingLocalCount(false)
    }
  }, [getEffectiveUid])

  // Refresh local blog count directly from IndexedDB
  const refreshLocalBlogCount = useCallback(async () => {
    setIsLoadingLocalBlogCount(true)
    try {
      const uid = getEffectiveUid()
      let count = 0
      if (uid) {
        count = await localDb.blogs.where('uid').equals(uid).count()
        if (count === 0) {
          const total = await localDb.blogs.count()
          if (total > 0) {
            const noUidCount = await localDb.blogs.filter((it) => !it.uid).count()
            if (noUidCount > 0) count = noUidCount
          }
        }
      } else {
        count = await localDb.blogs.count()
      }
      setManualLocalBlogCount(count)
      setLocalRefreshTick((t) => t + 1)
      return count
    } catch (err) {
      console.warn('Failed to refresh local blog count:', err)
      return 0
    } finally {
      setIsLoadingLocalBlogCount(false)
    }
  }, [getEffectiveUid])

  // Refresh local dictation count directly from IndexedDB
  const refreshLocalDictationCount = useCallback(async () => {
    setIsLoadingLocalDictationCount(true)
    try {
      const uid = getEffectiveUid()
      let count = 0
      if (uid) {
        count = await localDb.listeningHistory.where('uid').equals(uid).count()
        if (count === 0) {
          const total = await localDb.listeningHistory.count()
          if (total > 0) {
            const noUidCount = await localDb.listeningHistory.filter((it) => !it.uid).count()
            if (noUidCount > 0) count = noUidCount
          }
        }
      } else {
        count = await localDb.listeningHistory.count()
      }
      setManualLocalDictationCount(count)
      setLocalRefreshTick((t) => t + 1)
      return count
    } catch (err) {
      console.warn('Failed to refresh local dictation count:', err)
      return 0
    } finally {
      setIsLoadingLocalDictationCount(false)
    }
  }, [getEffectiveUid])

  // Refresh local TOEIC exam count directly from IndexedDB
  const refreshLocalToeicCount = useCallback(async () => {
    setIsLoadingLocalToeicCount(true)
    try {
      const count = await localDb.toeicExams.filter((e) => !e.is_deleted && !e.isSample).count()
      setManualLocalToeicCount(count)
      setLocalRefreshTick((t) => t + 1)
      return count
    } catch (err) {
      console.warn('Failed to refresh local TOEIC count:', err)
      return 0
    } finally {
      setIsLoadingLocalToeicCount(false)
    }
  }, [])

  const refreshAllLocalCounts = useCallback(async () => {
    await Promise.all([
      refreshLocalItemCount(),
      refreshLocalBlogCount(),
      refreshLocalDictationCount(),
      refreshLocalToeicCount(),
    ])
  }, [
    refreshLocalItemCount,
    refreshLocalBlogCount,
    refreshLocalDictationCount,
    refreshLocalToeicCount,
  ])

  // Load last sync time
  const refreshLastSyncTime = useCallback(async () => {
    const uid = getEffectiveUid()
    if (uid) {
      const ts = await syncService.getLastSyncTimestamp(uid)
      setLastSyncTime(ts > 0 ? ts : null)
    } else {
      setLastSyncTime(null)
    }
  }, [getEffectiveUid])

  // Count items from server
  const refreshServerItemCount = useCallback(
    async (force = true) => {
      const uid = getEffectiveUid()
      if (!uid) {
        setServerItemCount(null)
        setIsLoadingServerCount(false)
        return
      }

      setIsLoadingServerCount(true)
      try {
        if (force) {
          syncService.clearCountCache(uid)
        }
        const count = await syncService.getServerItemCount(uid, force)
        setServerItemCount(count)
      } catch (err) {
        console.warn('Failed to fetch server item count:', err)
        setServerItemCount(null)
      } finally {
        setIsLoadingServerCount(false)
      }
    },
    [getEffectiveUid],
  )

  // Count blogs from server
  const refreshServerBlogCount = useCallback(
    async (force = true) => {
      const uid = getEffectiveUid()
      if (!uid) {
        setServerBlogCount(null)
        setIsLoadingServerBlogCount(false)
        return
      }

      setIsLoadingServerBlogCount(true)
      try {
        if (force) {
          syncService.clearCountCache(uid)
        }
        const count = await syncService.getServerBlogCount(uid, force)
        setServerBlogCount(count)
      } catch (err) {
        console.warn('Failed to fetch server blog count:', err)
        setServerBlogCount(null)
      } finally {
        setIsLoadingServerBlogCount(false)
      }
    },
    [getEffectiveUid],
  )

  // Count dictation practice records from server
  const refreshServerDictationCount = useCallback(
    async (force = true) => {
      const uid = getEffectiveUid()
      if (!uid) {
        setServerDictationCount(null)
        setIsLoadingServerDictationCount(false)
        return
      }

      setIsLoadingServerDictationCount(true)
      try {
        if (force) {
          syncService.clearCountCache(uid)
        }
        const count = await syncService.getServerDictationCount(uid, force)
        setServerDictationCount(count)
      } catch (err) {
        console.warn('Failed to fetch server dictation count:', err)
        setServerDictationCount(null)
      } finally {
        setIsLoadingServerDictationCount(false)
      }
    },
    [getEffectiveUid],
  )

  // Count TOEIC exams from server
  const refreshServerToeicCount = useCallback(
    async (force = true) => {
      const uid = getEffectiveUid()
      if (!uid) {
        setServerToeicCount(null)
        setIsLoadingServerToeicCount(false)
        return
      }

      setIsLoadingServerToeicCount(true)
      try {
        if (force) {
          syncService.clearCountCache(uid)
        }
        const count = await syncService.getServerToeicCount(uid, force)
        setServerToeicCount(count)
      } catch (err) {
        console.warn('Failed to fetch server TOEIC count:', err)
        setServerToeicCount(null)
      } finally {
        setIsLoadingServerToeicCount(false)
      }
    },
    [getEffectiveUid],
  )

  const refreshAllServerCounts = useCallback(
    async (force = true) => {
      await Promise.all([
        refreshServerItemCount(force),
        refreshServerBlogCount(force),
        refreshServerDictationCount(force),
        refreshServerToeicCount(force),
      ])
    },
    [
      refreshServerItemCount,
      refreshServerBlogCount,
      refreshServerDictationCount,
      refreshServerToeicCount,
    ],
  )

  const refreshAllCounts = useCallback(
    async (force = true) => {
      await Promise.all([
        refreshServerItemCount(force),
        refreshServerBlogCount(force),
        refreshServerDictationCount(force),
        refreshServerToeicCount(force),
        refreshLocalItemCount(),
        refreshLocalBlogCount(),
        refreshLocalDictationCount(),
        refreshLocalToeicCount(),
        refreshLastSyncTime(),
      ])
    },
    [
      refreshServerItemCount,
      refreshServerBlogCount,
      refreshServerDictationCount,
      refreshServerToeicCount,
      refreshLocalItemCount,
      refreshLocalBlogCount,
      refreshLocalDictationCount,
      refreshLocalToeicCount,
      refreshLastSyncTime,
    ],
  )

  useEffect(() => {
    const uid = getEffectiveUid()
    refreshLastSyncTime()
    refreshAllLocalCounts()
    if (autoFetchServerCounts && uid) {
      refreshServerItemCount(false)
      refreshServerBlogCount(false)
      refreshServerDictationCount(false)
      refreshServerToeicCount(false)
    }
    if (uid) {
      syncService.getLastUnsyncedRecords(uid).then((records) => {
        setUnsyncedRecords(records)
      })
    } else {
      setUnsyncedRecords([])
      setLastSyncResult(null)
    }
  }, [
    user?.uid,
    getEffectiveUid,
    refreshLastSyncTime,
    refreshAllLocalCounts,
    refreshServerItemCount,
    refreshServerBlogCount,
    refreshServerDictationCount,
    refreshServerToeicCount,
    autoFetchServerCounts,
  ])

  // React to Firebase auth state changes (e.g. on page refresh when user restores from storage)
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged((fbUser) => {
      if (fbUser?.uid) {
        refreshLastSyncTime()
        refreshAllLocalCounts()
        if (autoFetchServerCounts) {
          refreshServerItemCount(false)
          refreshServerBlogCount(false)
          refreshServerDictationCount(false)
          refreshServerToeicCount(false)
        }
        syncService.getLastUnsyncedRecords(fbUser.uid).then((records) => {
          setUnsyncedRecords(records)
        })
      }
    })
    return () => unsubscribe()
  }, [
    refreshLastSyncTime,
    refreshAllLocalCounts,
    autoFetchServerCounts,
    refreshServerItemCount,
    refreshServerBlogCount,
    refreshServerDictationCount,
    refreshServerToeicCount,
  ])

  const syncNow = useCallback(
    async (
      modeOrForceFull: SyncMode | boolean = 'sync',
      type: SyncType = 'all',
    ): Promise<ISyncResult | null> => {
      const mode: SyncMode =
        typeof modeOrForceFull === 'string'
          ? modeOrForceFull
          : modeOrForceFull === true
            ? 'full-sync'
            : 'sync'
      const isFullSync = mode === 'full-sync'

      setSyncFeedback(null)

      if (!user?.uid) {
        const feedback: ISyncFeedback = {
          type: 'warning',
          message: 'Please log in before syncing.',
        }
        setSyncFeedback(feedback)
        if (showMessages) {
          message.warning(feedback.message)
        }
        return null
      }

      setIsSyncing(true)
      const targetLabel =
        type === 'item'
          ? 'từ vựng (Items)'
          : type === 'blog'
            ? 'bài viết (Blogs)'
            : type === 'dictation'
              ? 'luyện nghe (Dictation)'
              : type === 'toeic'
                ? 'đề thi TOEIC (TOEIC Exams)'
                : 'dữ liệu (Items, Blogs, Dictation & TOEIC)'

      setProgressText(
        isFullSync
          ? `Bắt đầu Full Sync ${targetLabel} (tải toàn bộ từ Cloud)...`
          : `Đang kết nối Cloud (chỉ đồng bộ thay đổi ${targetLabel})...`,
      )

      try {
        const result = await syncService.sync({
          mode,
          type,
          onProgress: (step) => setProgressText(step),
        })

        setLastSyncResult(result)
        setUnsyncedRecords(result.unsyncedRecords || [])

        await refreshLastSyncTime()
        await refreshAllLocalCounts()
        if (autoFetchServerCounts) {
          if (type === 'all' || type === 'item') await refreshServerItemCount(true)
          if (type === 'all' || type === 'blog') await refreshServerBlogCount(true)
          if (type === 'all' || type === 'dictation') await refreshServerDictationCount(true)
          if (type === 'all' || type === 'toeic') await refreshServerToeicCount(true)
        }
        await refreshAiUsageFromCloud().catch(() => null)

        // Refresh react-query caches so the UI reflects newly synced data
        if (type === 'all' || type === 'item') {
          queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
        }
        if (type === 'all' || type === 'blog') {
          queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
          queryClient.invalidateQueries({ queryKey: blogKeys.counts() })
        }

        const hasAnyChanges =
          result.updatedItems > 0 ||
          result.updatedBlogs > 0 ||
          result.updatedDictations > 0 ||
          result.deletedItems > 0 ||
          Boolean(result.deletedBlogs && result.deletedBlogs > 0)

        const details = result.isFullSync
          ? type === 'item'
            ? `Đã tải toàn bộ ${result.updatedItems} items và ${result.updatedExamples} ví dụ.`
            : type === 'blog'
              ? `Đã tải toàn bộ ${result.updatedBlogs} bài viết.`
              : type === 'dictation'
                ? `Đã tải toàn bộ ${result.updatedDictations} bản ghi dictation.`
                : type === 'toeic'
                  ? 'Đã tải toàn bộ đề thi và lịch sử làm bài TOEIC.'
                  : `Đã tải toàn bộ ${result.updatedItems} items, ${result.updatedBlogs} bài viết, ${result.updatedDictations} bản ghi dictation và dữ liệu TOEIC.`
          : hasAnyChanges
            ? `Đã đồng bộ ${result.updatedItems} items thay đổi, ${result.updatedBlogs} bài viết thay đổi, ${result.updatedDictations} bản ghi dictation thay đổi, xóa ${result.deletedItems} items${result.deletedBlogs ? `, xóa ${result.deletedBlogs} bài viết` : ''}.`
            : `Tất cả ${targetLabel} đã được cập nhật mới nhất.`

        const unsyncedCount = result.unsyncedRecords?.length || 0
        if (unsyncedCount > 0) {
          const feedback: ISyncFeedback = {
            type: 'warning',
            message: 'Đồng bộ hoàn tất với cảnh báo',
            description: `Đồng bộ hoàn tất với ${unsyncedCount} bản ghi lỗi schema chưa thể sync. Kiểm tra bảng bên dưới.`,
          }
          setSyncFeedback(feedback)
          if (showMessages) {
            message.warning(
              `Đồng bộ hoàn tất với ${unsyncedCount} bản ghi lỗi schema chưa thể sync. Kiểm tra bảng bên dưới.`,
            )
          }
        } else {
          const feedback: ISyncFeedback = {
            type: 'success',
            message: 'Đồng bộ hoàn tất!',
            description: details,
          }
          setSyncFeedback(feedback)
          if (showMessages) {
            message.success(`Đồng bộ hoàn tất! ${details}`)
          }
        }
        return result
      } catch (err: any) {
        console.error('Manual sync failed:', err)
        const errorDetail = err.message || 'Lỗi mạng'
        const feedback: ISyncFeedback = {
          type: 'error',
          message: 'Đồng bộ thất bại',
          description: errorDetail,
        }
        setSyncFeedback(feedback)
        if (showMessages) {
          message.error(`Đồng bộ thất bại: ${errorDetail}`)
        }
        return null
      } finally {
        setIsSyncing(false)
        setProgressText('')
      }
    },
    [
      user?.uid,
      showMessages,
      getEffectiveUid,
      autoFetchServerCounts,
      refreshLastSyncTime,
      refreshAllLocalCounts,
      refreshServerItemCount,
      refreshServerBlogCount,
      refreshServerDictationCount,
      refreshServerToeicCount,
      queryClient,
    ],
  )

  const syncDelta = useCallback(() => syncNow('sync'), [syncNow])
  const fullSync = useCallback(() => syncNow('full-sync'), [syncNow])

  const clearLocalData = async () => {
    const uid = getEffectiveUid()
    if (!uid) return

    try {
      await syncService.clearLocalData(uid)
      await refreshLastSyncTime()
      await refreshAllLocalCounts()
      setUnsyncedRecords([])
      setLastSyncResult(null)
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
      queryClient.invalidateQueries({ queryKey: blogKeys.counts() })
      message.info('Local database cleared.')
    } catch (err: any) {
      message.error(`Failed to clear local data: ${err.message}`)
    }
  }

  const checkChanges = useCallback(async (): Promise<IDataChanges | null> => {
    const uid = getEffectiveUid()
    if (!uid) return null
    return await syncService.detectDataChanges(uid)
  }, [getEffectiveUid])

  return {
    isSyncing,
    progressText,
    lastSyncTime,
    localItemCount: localItemCount ?? 0,
    isLoadingLocalCount,
    refreshLocalItemCount,
    localBlogCount: localBlogCount ?? 0,
    isLoadingLocalBlogCount,
    refreshLocalBlogCount,
    refreshAllLocalCounts,
    serverItemCount,
    isLoadingServerCount,
    refreshServerItemCount,
    serverBlogCount,
    isLoadingServerBlogCount,
    refreshServerBlogCount,
    localDictationCount: localDictationCount ?? 0,
    isLoadingLocalDictationCount,
    refreshLocalDictationCount,
    serverDictationCount,
    isLoadingServerDictationCount,
    refreshServerDictationCount,
    localToeicCount: localToeicCount ?? 0,
    isLoadingLocalToeicCount,
    refreshLocalToeicCount,
    serverToeicCount,
    isLoadingServerToeicCount,
    refreshServerToeicCount,
    refreshAllServerCounts,
    refreshAllCounts,
    syncNow,
    syncDelta,
    fullSync,
    clearLocalData,
    refreshLastSyncTime,
    checkChanges,
    detectDataChanges: checkChanges,
    unsyncedRecords,
    lastSyncResult,
    setUnsyncedRecords,
    syncFeedback,
    clearSyncFeedback,
  }
}
