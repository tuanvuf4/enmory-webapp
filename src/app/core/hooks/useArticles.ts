import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articleApi, IArticleRequestParams } from '@/services/firebase/api/article.api'
import { IArticleItem } from '@/models/article.model'
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'

// Query keys
export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (filters: IArticleRequestParams) => [...articleKeys.lists(), filters] as const,
  details: () => [...articleKeys.all, 'detail'] as const,
  detail: (id: string) => [...articleKeys.details(), id] as const,
  counts: () => [...articleKeys.all, 'count'] as const,
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

/**
 * Fetch articles list with pagination support
 */
export const useArticles = (params: IArticleRequestParams) => {
  // Create a unique key for this query configuration (excluding page)
  const queryConfigKey = JSON.stringify({
    keyword: params.keyword,
    orderBy: params.orderBy,
    order: params.order,
  })

  return useQuery({
    queryKey: articleKeys.list(params),
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

      const response = await articleApi.getArticles(params, lastDoc)

      // Store the lastDoc for this page for future navigation
      if (response.lastDoc) {
        pageMap.set(params.page, response.lastDoc)
      }

      return response.content || []
    },
    refetchOnWindowFocus: false,
  })
}

// Fetch single article by id
export const useArticle = (id: string, enabled = true) => {
  return useQuery({
    queryKey: articleKeys.detail(id),
    queryFn: async () => {
      const response = await articleApi.getArticleById(id)
      return response.content
    },
    enabled: enabled && !!id,
  })
}

/**
 * Create article mutation
 */
export const useCreateArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: IArticleItem) => {
      const response = await articleApi.createArticle(data)
      return response.content
    },
    onSuccess: () => {
      // Clear all lastDoc cursors since data has changed
      clearLastDocStore()
      // Invalidate all article lists to refetch
      queryClient.invalidateQueries({
        queryKey: articleKeys.lists(),
      })
    },
  })
}

/**
 * Update article mutation
 */
export const useUpdateArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IArticleItem }) => {
      const response = await articleApi.updateArticle(id, data)
      return response.content
    },
    onSuccess: (updatedArticle) => {
      // Clear all lastDoc cursors since data has changed
      clearLastDocStore()
      // Invalidate article lists to refetch
      queryClient.invalidateQueries({
        queryKey: articleKeys.lists(),
      })
      // Invalidate specific article detail cache
      if (updatedArticle?.id) {
        queryClient.invalidateQueries({
          queryKey: articleKeys.detail(updatedArticle.id),
        })
      }
    },
  })
}

/**
 * Fetch total count of articles
 */
export const useArticlesCount = () => {
  return useQuery({
    queryKey: articleKeys.counts(),
    queryFn: async () => {
      const count = await articleApi.getArticlesCount()
      return count
    },
    refetchOnWindowFocus: false,
  })
}
