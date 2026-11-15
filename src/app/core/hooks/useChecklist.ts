import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistApi } from '@/services/firebase/api/checklist.api'
import { firebaseAuthService } from '@/services/firebase/authService'
import { IItem } from '@/models/item.model'
import { IChecklistItem } from '@/models/checklist.model'
import { useMemo, useCallback } from 'react'
import { useSelector } from './redux'

export const checklistKeys = {
  all: ['checklist'] as const,
  list: (uid?: string) =>
    uid
      ? ([...checklistKeys.all, 'list', uid] as const)
      : ([...checklistKeys.all, 'list'] as const),
}

export const useChecklist = () => {
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const currentUid = user?.uid || firebaseAuthService.getCurrentUser()?.uid

  const queryKey = useMemo(() => checklistKeys.list(currentUid), [currentUid])

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await checklistApi.getChecklist()
    },
    enabled: !!currentUid,
    refetchOnWindowFocus: true,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({
      checklistId,
      isCompleted,
    }: {
      checklistId: string
      isCompleted: boolean
    }) => {
      return await checklistApi.toggleComplete(checklistId, isCompleted)
    },
    onMutate: async ({ checklistId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.all })
      const previous = queryClient.getQueryData<IChecklistItem[]>(queryKey)

      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          queryKey,
          previous.map((item) =>
            item.checklistId === checklistId || item.id === checklistId
              ? { ...item, isCompleted }
              : item,
          ),
        )
      }

      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      return await checklistApi.remove(checklistId)
    },
    onMutate: async (checklistId: string) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.all })
      const previous = queryClient.getQueryData<IChecklistItem[]>(queryKey)

      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          queryKey,
          previous.filter((item) => item.checklistId !== checklistId && item.id !== checklistId),
        )
      }

      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all })
    },
  })

  const removeByItemIdMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await checklistApi.removeByItemId(itemId)
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.all })
      const previous = queryClient.getQueryData<IChecklistItem[]>(queryKey)

      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          queryKey,
          previous.filter((item) => item.itemId !== itemId && item.id !== itemId),
        )
      }

      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all })
    },
  })

  const addMutation = useMutation({
    mutationFn: async (item: IItem) => {
      return await checklistApi.addFromItem(item)
    },
    onSuccess: (result) => {
      if (result.isSuccess) {
        queryClient.invalidateQueries({ queryKey: checklistKeys.all })
      }
    },
  })

  const clearCompletedMutation = useMutation({
    mutationFn: async () => {
      return await checklistApi.clearCompleted()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.all })
      const previous = queryClient.getQueryData<IChecklistItem[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          queryKey,
          previous.filter((item) => !item.isCompleted),
        )
      }
      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all })
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return await checklistApi.clearAll()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.all })
      const previous = queryClient.getQueryData<IChecklistItem[]>(queryKey)
      queryClient.setQueryData<IChecklistItem[]>(queryKey, [])
      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all })
    },
  })

  const setAllCompletionMutation = useMutation({
    mutationFn: async (isCompleted: boolean) => {
      return await checklistApi.setAllCompletion(isCompleted)
    },
    onMutate: async (isCompleted: boolean) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.all })
      const previous = queryClient.getQueryData<IChecklistItem[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          queryKey,
          previous.map((item) => ({ ...item, isCompleted })),
        )
      }
      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all })
    },
  })

  const checklist = query.data || []
  const isLoading =
    (!!currentUid && query.isLoading) || (!!currentUid && query.isPending && !query.data)

  const checklistItemMap = useMemo(() => {
    const map = new Map<string, IChecklistItem>()
    checklist.forEach((item) => {
      const key = item.itemId || item.id
      if (key) map.set(key, item)
      if (item.itemId) map.set(item.itemId, item)
      if (item.id) map.set(item.id, item)
    })
    return map
  }, [checklist])

  const isItemInChecklist = useCallback(
    (itemId?: string) => {
      if (!itemId) return false
      return checklistItemMap.has(itemId)
    },
    [checklistItemMap],
  )

  const toggleChecklist = useCallback(
    async (item: IItem) => {
      const targetId = item.id
      if (!targetId) {
        return { isSuccess: false, message: 'Invalid item ID' }
      }

      if (isItemInChecklist(targetId)) {
        const existing = checklistItemMap.get(targetId)
        if (existing?.checklistId) {
          await removeMutation.mutateAsync(existing.checklistId)
        } else {
          await removeByItemIdMutation.mutateAsync(targetId)
        }
        return { isSuccess: true, message: `Removed "${item.origin}" from checklist` }
      } else {
        return await addMutation.mutateAsync(item)
      }
    },
    [isItemInChecklist, checklistItemMap, removeMutation, removeByItemIdMutation, addMutation],
  )

  return {
    checklist,
    isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleItem: (checklistId: string, isCompleted: boolean) =>
      toggleMutation.mutate({ checklistId, isCompleted }),
    removeItem: (checklistId: string) => removeMutation.mutateAsync(checklistId),
    removeItemByItemId: (itemId: string) => removeByItemIdMutation.mutateAsync(itemId),
    addItem: (item: IItem) => addMutation.mutateAsync(item),
    clearCompleted: () => clearCompletedMutation.mutateAsync(),
    isClearingCompleted: clearCompletedMutation.isPending,
    clearAll: () => clearAllMutation.mutateAsync(),
    isClearingAll: clearAllMutation.isPending,
    setAllCompletion: (isCompleted: boolean) => setAllCompletionMutation.mutateAsync(isCompleted),
    isSettingAllCompletion: setAllCompletionMutation.isPending,
    isItemInChecklist,
    toggleChecklist,
  }
}
