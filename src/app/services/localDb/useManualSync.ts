import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { useLiveQuery } from 'dexie-react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@/core/hooks/redux'
import { localDb } from './db'
import { syncService, ISyncResult } from './syncService'
import { itemKeys } from '@/core/hooks/useItems'
import { blogKeys } from '@/core/hooks/useBlogs'

export const useManualSync = () => {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  const [isSyncing, setIsSyncing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [serverItemCount, setServerItemCount] = useState<number | null>(null)
  const [isLoadingServerCount, setIsLoadingServerCount] = useState<boolean>(false)
  const [serverBlogCount, setServerBlogCount] = useState<number | null>(null)
  const [isLoadingServerBlogCount, setIsLoadingServerBlogCount] = useState<boolean>(false)

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
    refreshServerItemCount()
    refreshServerBlogCount()
  }, [refreshLastSyncTime, refreshServerItemCount, refreshServerBlogCount])

  const syncNow = async (forceFull = false): Promise<ISyncResult | null> => {
    if (!user?.uid) {
      message.warning('Please log in before syncing.')
      return null
    }

    setIsSyncing(true)
    setProgressText(
      forceFull ? 'Starting full sync for items & blogs...' : 'Connecting to cloud...',
    )

    try {
      const result = await syncService.sync({
        forceFull,
        onProgress: (step) => setProgressText(step),
      })

      await refreshLastSyncTime()
      await refreshServerItemCount()
      await refreshServerBlogCount()

      // Refresh react-query caches so the UI reflects newly synced data
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
      queryClient.invalidateQueries({ queryKey: blogKeys.counts() })

      const details = result.isFullSync
        ? `Downloaded ${result.updatedItems} items, ${result.updatedBlogs} blogs, and ${result.updatedExamples} examples.`
        : `Synced ${result.updatedItems} modified items, ${result.updatedBlogs} modified blogs, removed ${result.deletedItems} deleted items${result.deletedBlogs ? `, removed ${result.deletedBlogs} deleted blogs` : ''}.`

      message.success(`Sync completed! ${details}`)
      return result
    } catch (err: any) {
      console.error('Manual sync failed:', err)
      message.error(`Sync failed: ${err.message || 'Network error'}`)
      return null
    } finally {
      setIsSyncing(false)
      setProgressText('')
    }
  }

  const clearLocalData = async () => {
    if (!user?.uid) return

    try {
      await syncService.clearLocalData(user.uid)
      await refreshLastSyncTime()
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
      queryClient.invalidateQueries({ queryKey: blogKeys.counts() })
      message.info('Local database cleared.')
    } catch (err: any) {
      message.error(`Failed to clear local data: ${err.message}`)
    }
  }

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
    clearLocalData,
    refreshLastSyncTime,
  }
}
