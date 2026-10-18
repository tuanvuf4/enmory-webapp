import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistApi } from '@/services/firebase/api/checklist.api'
import { IItem } from '@/models/item.model'
import { IChecklistItem } from '@/models/checklist.model'

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
    mutationFn: async ({ checklistId, isCompleted }: { checklistId: string; isCompleted: boolean }) => {
      return await checklistApi.toggleComplete(checklistId, isCompleted)
    },
    onMutate: async ({ checklistId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.list() })
      const previous = queryClient.getQueryData<IChecklistItem[]>(checklistKeys.list())

      if (previous) {
        queryClient.setQueryData<IChecklistItem[]>(
          checklistKeys.list(),
          previous.map((item) =>
            item.checklistId === checklistId ? { ...item, isCompleted } : item
          )
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
          previous.filter((item) => item.checklistId !== checklistId)
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

  return {
    checklist: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    toggleItem: (checklistId: string, isCompleted: boolean) =>
      toggleMutation.mutate({ checklistId, isCompleted }),
    removeItem: (checklistId: string) => removeMutation.mutateAsync(checklistId),
    addItem: (item: IItem) => addMutation.mutateAsync(item),
  }
}

