import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemApi, IItemRequestData } from '@/services/firebase/api/item.api'
import { IItem } from '@/models/item.model'

// Query keys
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: IItemRequestData) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
}

// Fetch items list
export const useItems = (params: IItemRequestData) => {
  return useQuery({
    queryKey: itemKeys.list(params),
    queryFn: async () => {
      const response = await itemApi.getItems(params)
      return response
    },
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
    onSuccess: () => {
      // Invalidate all item lists to refetch
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
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
    onSuccess: (_response, variables) => {
      // Invalidate all item lists
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      // Invalidate the specific item detail
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) })
    },
  })
}

// Delete item mutation
export const useDeleteItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return await itemApi.deleteItem(id)
    },
    onSuccess: () => {
      // Invalidate all item lists to refetch
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
    },
  })
}
