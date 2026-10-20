import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistApi } from '@/services/firebase/api/checklist.api'
import { IItem } from '@/models/item.model'
import { IChecklistItem } from '@/models/checklist.model'
import { useMemo, useCallback } from 'react'

export const checklistKeys = {
  all: ['checklist'] as const,
  list: () => [...checklistKeys.all, 'list'] as const,
}

export const useChecklist = () => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: checklistKeys.list(),
    queryFn: async () => {
      return await checklistApi.getChecklist()
    },
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
      await queryClient.cancelQueries({ queryKey: checklistKeys.list() })
      const previous = queryClient.getQueryData<IChecklistItem[]>(checklistKeys.list())

      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          checklistKeys.list(),
          previous.map((item) =>
            item.checklistId === checklistId || item.id === checklistId
              ? { ...item, isCompleted }
              : item,
          ),
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(checklistKeys.list(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.list() })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      return await checklistApi.remove(checklistId)
    },
    onMutate: async (checklistId: string) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.list() })
      const previous = queryClient.getQueryData<IChecklistItem[]>(checklistKeys.list())

      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          checklistKeys.list(),
          previous.filter((item) => item.checklistId !== checklistId && item.id !== checklistId),
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(checklistKeys.list(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.list() })
    },
  })

  const removeByItemIdMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await checklistApi.removeByItemId(itemId)
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.list() })
      const previous = queryClient.getQueryData<IChecklistItem[]>(checklistKeys.list())

      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          checklistKeys.list(),
          previous.filter((item) => item.itemId !== itemId && item.id !== itemId),
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(checklistKeys.list(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.list() })
    },
  })

  const addMutation = useMutation({
    mutationFn: async (item: IItem) => {
      return await checklistApi.addFromItem(item)
    },
    onSuccess: (result) => {
      if (result.isSuccess) {
        queryClient.invalidateQueries({ queryKey: checklistKeys.list() })
      }
    },
  })

  const checklist = query.data || []

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
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    toggleItem: (checklistId: string, isCompleted: boolean) =>
      toggleMutation.mutate({ checklistId, isCompleted }),
    removeItem: (checklistId: string) => removeMutation.mutateAsync(checklistId),
    removeItemByItemId: (itemId: string) => removeByItemIdMutation.mutateAsync(itemId),
    addItem: (item: IItem) => addMutation.mutateAsync(item),
    isItemInChecklist,
    toggleChecklist,
  }
}
