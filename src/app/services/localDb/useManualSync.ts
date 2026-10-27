import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { useLiveQuery } from 'dexie-react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector, useDispatch } from '@/core/hooks/redux'
import { actionAsyncApp } from '@/store/asyncActions'
import { localDb } from './db'
import { syncService, ISyncResult } from './syncService'
import { tagApi } from '@/services/firebase/api/tag.api'
import { itemKeys } from '@/core/hooks/useItems'

export const useManualSync = () => {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  const [isSyncing, setIsSyncing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [serverItemCount, setServerItemCount] = useState<number | null>(null)
  const [isLoadingServerCount, setIsLoadingServerCount] = useState<boolean>(false)
  const [serverTagCount, setServerTagCount] = useState<number | null>(null)
  const [isLoadingServerTagCount, setIsLoadingServerTagCount] = useState<boolean>(false)

  // Live counts from Dexie IndexedDB for currently logged in user
  const localItemCount = useLiveQuery(
    () => (user?.uid ? localDb.items.where('uid').equals(user.uid).count() : 0),
    [user?.uid],
    0,
  )

  const localTagCount = useLiveQuery(
    () => (user?.uid ? localDb.tags.where('uid').equals(user.uid).count() : 0),
    [user?.uid],
    0,
  )

  // Count of pending deleted tags waiting for manual sync to cloud items
  const pendingTagCleanupsCount = useLiveQuery(
    async () => {
      if (!user?.uid) return 0
      const list = await tagApi.getPendingDeletedTags(user.uid)
      return list.length
    },
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

  // Count tags from server
  const refreshServerTagCount = useCallback(async () => {
    if (!user?.uid) {
      setServerTagCount(null)
      setIsLoadingServerTagCount(false)
      return
    }

    setIsLoadingServerTagCount(true)
    try {
      const count = await syncService.getServerTagCount(user.uid)
      setServerTagCount(count)
    } catch (err) {
      console.warn('Failed to fetch server tag count:', err)
      setServerTagCount(null)
    } finally {
      setIsLoadingServerTagCount(false)
    }
  }, [user?.uid])

  const refreshAllServerCounts = useCallback(async () => {
    await Promise.all([refreshServerItemCount(), refreshServerTagCount()])
  }, [refreshServerItemCount, refreshServerTagCount])

  useEffect(() => {
    refreshLastSyncTime()
    refreshServerItemCount()
    refreshServerTagCount()
  }, [refreshLastSyncTime, refreshServerItemCount, refreshServerTagCount])

  const syncNow = async (forceFull = false): Promise<ISyncResult | null> => {
    if (!user?.uid) {
      message.warning('Please log in before syncing.')
      return null
    }

    setIsSyncing(true)
    setProgressText(
      forceFull ? 'Starting full sync for items & tag items...' : 'Connecting to cloud...',
    )

    try {
      const result = await syncService.sync({
        forceFull,
        onProgress: (step) => setProgressText(step),
      })

      await refreshLastSyncTime()
      await refreshServerItemCount()
      await refreshServerTagCount()

      // Refresh react-query caches so the UI reflects newly synced data
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

      // Refresh tags in Redux store
      dispatch(actionAsyncApp.fetchTags() as any)

      const tagCleanupMsg = result.cloudItemsUpdatedForTags
        ? `, cleaned ${result.cloudItemsUpdatedForTags} cloud items for deleted tags`
        : ''

      const details = result.isFullSync
        ? `Downloaded ${result.updatedItems} items, ${result.updatedTags ?? 0} tag items, and ${result.updatedExamples} examples${tagCleanupMsg}.`
        : `Synced ${result.updatedItems} modified items, ${result.updatedTags ?? 0} modified tag items, removed ${result.deletedItems} deleted items${result.deletedTags ? `, removed ${result.deletedTags} deleted tag items` : ''}${tagCleanupMsg}.`

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
      dispatch(actionAsyncApp.fetchTags() as any)
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
    localTagCount: localTagCount ?? 0,
    serverTagCount,
    isLoadingServerTagCount,
    refreshServerTagCount,
    refreshAllServerCounts,
    pendingTagCleanupsCount: pendingTagCleanupsCount ?? 0,
    syncNow,
    clearLocalData,
    refreshLastSyncTime,
  }
}
