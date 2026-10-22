import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemApi, IItemRequestParams } from '@/services/firebase/api/item.api'
import { IItem } from '@/models/item.model'
import { localDb, invalidateSearchIndex } from '@/services/localDb'
import { checklistKeys } from './useChecklist'
import { useDispatch } from './redux'
import { iotdAction } from '@/store/reducers/iotd.reducer'

// Query keys
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: IItemRequestParams) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
}

// Legacy helper for clearing query cursor caches if any
export const clearLastDocStore = (_queryConfigKey?: string) => {}

// Fetch items list
export const useItems = (params: IItemRequestParams) => {
  return useQuery({
    queryKey: itemKeys.list(params),
    queryFn: async () => {
      return await itemApi.getItems(params)
    },
    refetchOnWindowFocus: false,
  })
}

// Fetch single item by ID
export const useItem = (id: string, enabled = true) => {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => {
      const response = await itemApi.getItemById(id)
      return response.content
    },
    enabled: enabled && !!id,
  })
}

// Create item mutation
export const useCreateItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: IItem) => {
      return await itemApi.createItem(data)
    },
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: itemKeys.lists() })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(itemKeys.lists())

      // Do not optimistically update the full list since we don't know page position
      // Instead, just clear cursors to refetch on success
      clearLastDocStore()

      return { previousData }
    },
    onSuccess: (response) => {
      if (response?.content && response.content.id) {
        localDb.items.put(response.content)
        invalidateSearchIndex()
      }
      // Invalidate all item lists to refetch with new item
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
    },
    onError: (_err, _variables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(itemKeys.lists(), context.previousData)
      }
    },
  })
}

// Update item mutation
export const useUpdateItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IItem> }) => {
      return await itemApi.updateItem(id, data)
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: itemKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: itemKeys.lists() })

      // Snapshot previous data
      const previousDetail = queryClient.getQueryData(itemKeys.detail(variables.id))

      // Optimistically update the detail view with new data
      queryClient.setQueryData(itemKeys.detail(variables.id), (old: IItem | undefined) => ({
        ...old,
        ...variables.data,
        id: variables.id,
      }))

      clearLastDocStore()

      return { previousDetail }
    },
    onSuccess: async (response, variables) => {
      if (response?.content && response.content.id) {
        await localDb.items.put(response.content)
        invalidateSearchIndex()
        queryClient.setQueryData(itemKeys.detail(variables.id), response.content)
      }
      // Invalidate lists and detail to refetch
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) })
      // Invalidate checklist as well so updated item properties appear
      await queryClient.invalidateQueries({ queryKey: checklistKeys.all })
    },
    onError: (_err, variables, context: any) => {
      // Rollback on error
      if (context?.previousDetail) {
        queryClient.setQueryData(itemKeys.detail(variables.id), context.previousDetail)
      }
    },
  })
}

// Delete item mutation
export const useDeleteItem = () => {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (id: string) => {
      return await itemApi.deleteItem(id)
    },
    onSuccess: async (_response, id) => {
      await localDb.items.delete(id)
      invalidateSearchIndex()
      // Clear all lastDoc cursors since data has changed
      clearLastDocStore()
      // Invalidate all item lists to refetch
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      queryClient.removeQueries({ queryKey: itemKeys.detail(id) })
      await queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) })
      // Invalidate checklist as well
      await queryClient.invalidateQueries({ queryKey: checklistKeys.all })
      dispatch(iotdAction.removeItem(id))
    },
  })
}
