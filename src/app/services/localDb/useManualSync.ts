import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { useLiveQuery } from 'dexie-react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@/core/hooks/redux'
import { localDb } from './db'
import { syncService, ISyncResult } from './syncService'
import { itemKeys } from '@/core/hooks/useItems'

export const useManualSync = () => {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  const [isSyncing, setIsSyncing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  // Live counts from Dexie IndexedDB
  const localItemCount = useLiveQuery(() => localDb.items.count(), [], 0)
  const localExampleCount = useLiveQuery(
    async () => {
      const items = await localDb.items.toArray()
      return items.reduce(
        (acc, item) =>
          acc + (item.meanings || []).reduce((mAcc, m) => mAcc + (m.examples || []).length, 0),
        0,
      )
    },
    [],
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

  useEffect(() => {
    refreshLastSyncTime()
  }, [refreshLastSyncTime])

  const syncNow = async (forceFull = false): Promise<ISyncResult | null> => {
    if (!user?.uid) {
      message.warning('Please log in before syncing.')
      return null
    }

    setIsSyncing(true)
    setProgressText(forceFull ? 'Starting full sync...' : 'Connecting to cloud...')

    try {
      const result = await syncService.sync({
        forceFull,
        onProgress: (step) => setProgressText(step),
      })

      await refreshLastSyncTime()

      // Refresh react-query caches so the UI reflects newly synced data
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

      const details = result.isFullSync
        ? `Downloaded ${result.updatedItems} items and ${result.updatedExamples} examples.`
        : `Synced ${result.updatedItems} modified items, removed ${result.deletedItems} deleted items.`

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
    localExampleCount: localExampleCount ?? 0,
    syncNow,
    clearLocalData,
    refreshLastSyncTime,
  }
}
