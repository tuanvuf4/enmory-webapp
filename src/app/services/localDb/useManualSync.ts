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

export interface IUseManualSyncOptions {
  autoFetchServerCounts?: boolean
}

export const useManualSync = (options?: IUseManualSyncOptions) => {
  const autoFetchServerCounts = options?.autoFetchServerCounts ?? false
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  const [isSyncing, setIsSyncing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [serverItemCount, setServerItemCount] = useState<number | null>(null)
  const [isLoadingServerCount, setIsLoadingServerCount] = useState<boolean>(false)
  const [serverBlogCount, setServerBlogCount] = useState<number | null>(null)
  const [isLoadingServerBlogCount, setIsLoadingServerBlogCount] = useState<boolean>(false)
  const [unsyncedRecords, setUnsyncedRecords] = useState<IUnsyncedRecord[]>([])
  const [lastSyncResult, setLastSyncResult] = useState<ISyncResult | null>(null)

  // Live counts from Dexie IndexedDB for currently logged in user
  const localItemCount = useLiveQuery(
    () => (user?.uid ? localDb.items.where('uid').equals(user.uid).count() : 0),
    [user?.uid],
    0,
  )

  const localBlogCount = useLiveQuery(
    () => (user?.uid ? localDb.blogs.where('uid').equals(user.uid).count() : 0),
    [user?.uid],
    0,
  )

  // Load last sync time
  const refreshLastSyncTime = useCallback(async () => {
    if (user?.uid) {
      const ts = await syncService.getLastSyncTimestamp(user.uid)
      setLastSyncTime(ts > 0 ? ts : null)
    } else {
      setLastSyncTime(null)
    }
  }, [user?.uid])

  // Count items from server
  const refreshServerItemCount = useCallback(async () => {
    if (!user?.uid) {
      setServerItemCount(null)
      setIsLoadingServerCount(false)
      return
    }

    setIsLoadingServerCount(true)
    try {
      const count = await syncService.getServerItemCount(user.uid)
      setServerItemCount(count)
    } catch (err) {
      console.warn('Failed to fetch server item count:', err)
      setServerItemCount(null)
    } finally {
      setIsLoadingServerCount(false)
    }
  }, [user?.uid])

  // Count blogs from server
  const refreshServerBlogCount = useCallback(async () => {
    if (!user?.uid) {
      setServerBlogCount(null)
      setIsLoadingServerBlogCount(false)
      return
    }

    setIsLoadingServerBlogCount(true)
    try {
      const count = await syncService.getServerBlogCount(user.uid)
      setServerBlogCount(count)
    } catch (err) {
      console.warn('Failed to fetch server blog count:', err)
      setServerBlogCount(null)
    } finally {
      setIsLoadingServerBlogCount(false)
    }
  }, [user?.uid])

  const refreshAllServerCounts = useCallback(async () => {
    await Promise.all([refreshServerItemCount(), refreshServerBlogCount()])
  }, [refreshServerItemCount, refreshServerBlogCount])

  useEffect(() => {
    refreshLastSyncTime()
    if (autoFetchServerCounts) {
      refreshServerItemCount()
      refreshServerBlogCount()
    }
    if (user?.uid) {
      syncService.getLastUnsyncedRecords(user.uid).then((records) => {
        setUnsyncedRecords(records)
      })
    } else {
      setUnsyncedRecords([])
      setLastSyncResult(null)
    }
  }, [
    user?.uid,
    refreshLastSyncTime,
    refreshServerItemCount,
    refreshServerBlogCount,
    autoFetchServerCounts,
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

      if (!user?.uid) {
        message.warning('Please log in before syncing.')
        return null
      }

      setIsSyncing(true)
      const targetLabel =
        type === 'item'
          ? 'từ vựng (Items)'
          : type === 'blog'
            ? 'bài viết (Blogs)'
            : 'dữ liệu (Items & Blogs)'

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
        if (autoFetchServerCounts) {
          if (type === 'all' || type === 'item') await refreshServerItemCount()
          if (type === 'all' || type === 'blog') await refreshServerBlogCount()
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
          result.deletedItems > 0 ||
          Boolean(result.deletedBlogs && result.deletedBlogs > 0)

        const details = result.isFullSync
          ? type === 'item'
            ? `Đã tải toàn bộ ${result.updatedItems} items và ${result.updatedExamples} ví dụ.`
            : type === 'blog'
              ? `Đã tải toàn bộ ${result.updatedBlogs} bài viết.`
              : `Đã tải toàn bộ ${result.updatedItems} items, ${result.updatedBlogs} bài viết, và ${result.updatedExamples} ví dụ.`
          : hasAnyChanges
            ? `Đã đồng bộ ${result.updatedItems} items thay đổi, ${result.updatedBlogs} bài viết thay đổi, xóa ${result.deletedItems} items${result.deletedBlogs ? `, xóa ${result.deletedBlogs} bài viết` : ''}.`
            : `Tất cả ${targetLabel} đã được cập nhật mới nhất.`

        const unsyncedCount = result.unsyncedRecords?.length || 0
        if (unsyncedCount > 0) {
          message.warning(
            `Đồng bộ hoàn tất với ${unsyncedCount} bản ghi lỗi schema chưa thể sync. Kiểm tra bảng bên dưới.`,
          )
        } else {
          message.success(`Đồng bộ hoàn tất! ${details}`)
        }
        return result
      } catch (err: any) {
        console.error('Manual sync failed:', err)
        message.error(`Đồng bộ thất bại: ${err.message || 'Lỗi mạng'}`)
        return null
      } finally {
        setIsSyncing(false)
        setProgressText('')
      }
    },
    [
      user?.uid,
      autoFetchServerCounts,
      refreshLastSyncTime,
      refreshServerItemCount,
      refreshServerBlogCount,
      queryClient,
    ],
  )

  const syncDelta = useCallback(() => syncNow('sync'), [syncNow])
  const fullSync = useCallback(() => syncNow('full-sync'), [syncNow])

  const clearLocalData = async () => {
    if (!user?.uid) return

    try {
      await syncService.clearLocalData(user.uid)
      await refreshLastSyncTime()
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
    if (!user?.uid) return null
    return await syncService.detectDataChanges(user.uid)
  }, [user?.uid])

  return {
    isSyncing,
    progressText,
    lastSyncTime,
    localItemCount: localItemCount ?? 0,
    serverItemCount,
    isLoadingServerCount,
    refreshServerItemCount,
    localBlogCount: localBlogCount ?? 0,
    serverBlogCount,
    isLoadingServerBlogCount,
    refreshServerBlogCount,
    refreshAllServerCounts,
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
  }
}
