import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemApi, IItemRequestParams } from '@/services/firebase/api/item.api'
import { IItem } from '@/models/item.model'
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'

// Query keys
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: IItemRequestParams) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
}

// Store for lastDoc cursors (page -> lastDoc mapping)
const lastDocStore = new Map<string, Map<number, QueryDocumentSnapshot<DocumentData>>>()

// Function to clear lastDoc store for a specific query config
export const clearLastDocStore = (queryConfigKey?: string) => {
  if (queryConfigKey) {
    lastDocStore.delete(queryConfigKey)
  } else {
    lastDocStore.clear()
  }
}

// Fetch items list
export const useItems = (params: IItemRequestParams) => {
  // Create a unique key for this query configuration (excluding page)
  const queryConfigKey = JSON.stringify({
    keyword: params.keyword,
    cat: params.cat,
    archive: params.archive,
    favorite: params.favorite,
    orderBy: params.orderBy,
    order: params.order,
  })

  return useQuery({
    queryKey: itemKeys.list(params),
    queryFn: async () => {
      // Get or create the page map for this query config
      if (!lastDocStore.has(queryConfigKey)) {
        lastDocStore.set(queryConfigKey, new Map())
      }
      const pageMap = lastDocStore.get(queryConfigKey)!

      // For page 0, no cursor needed
      // For page N, we need to navigate through all previous pages to get the correct cursor
      let lastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined

      if (params.page > 0) {
        // Check if we have the cursor for the previous page
        lastDoc = pageMap.get(params.page - 1)

        // If cursor is missing for previous page, we need to fetch from page 0
        if (!lastDoc) {
          console.warn(`Missing cursor for page ${params.page - 1}, pagination may be inconsistent`)
          // Clear the store for this query to force refetch from beginning
          pageMap.clear()
        }
      }

      const response = await itemApi.getItems(params, lastDoc)

      // Store the lastDoc for this page for future navigation
      if (response.lastDoc) {
        pageMap.set(params.page, response.lastDoc)
      }

      return response
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
    onSuccess: () => {
      // Clear all lastDoc cursors since data has changed
      clearLastDocStore()
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
      // Clear all lastDoc cursors since data has changed
      clearLastDocStore()
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
      // Clear all lastDoc cursors since data has changed
      clearLastDocStore()
      // Invalidate all item lists to refetch
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
    },
  })
}
