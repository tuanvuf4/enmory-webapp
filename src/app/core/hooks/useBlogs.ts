import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blogApi, IBlogRequestParams } from '@/services/firebase/api/blog.api'
import { IBlogItem } from '@/models/blog.model'
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'

// Query keys
export const blogKeys = {
  all: ['blogs'] as const,
  lists: () => [...blogKeys.all, 'list'] as const,
  list: (filters: IBlogRequestParams) => [...blogKeys.lists(), filters] as const,
  details: () => [...blogKeys.all, 'detail'] as const,
  detail: (id: string) => [...blogKeys.details(), id] as const,
  counts: () => [...blogKeys.all, 'count'] as const,
}

export const articleKeys = blogKeys

// Store for lastDoc cursors (page -> lastDoc mapping)
const lastDocStore = new Map<string, Map<number, QueryDocumentSnapshot<DocumentData>>>()

// Function to clear lastDoc store for a specific query config
export const clearLastBlogDocStore = (queryConfigKey?: string) => {
  if (queryConfigKey) {
    lastDocStore.delete(queryConfigKey)
  } else {
    lastDocStore.clear()
  }
}

export const clearLastArticleDocStore = clearLastBlogDocStore

/**
 * Fetch blogs list with pagination support
 */
export const useBlogs = (params: IBlogRequestParams) => {
  // Create a unique key for this query configuration (excluding page)
  const queryConfigKey = JSON.stringify({
    keyword: params.keyword,
    tag: params.tag || params.categoryId,
    orderBy: params.orderBy,
    order: params.order,
  })

  return useQuery({
    queryKey: blogKeys.list(params),
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
          // Return empty for this page, user should navigate back to page 0
          return []
        }
      }

      const response = await blogApi.getBlogs(params, lastDoc)

      // Check if API call was successful
      if (!response.isSuccess) {
        throw new Error(response.message || 'Failed to fetch blogs')
      }

      // Store the lastDoc for this page for future navigation
      if (response.lastDoc) {
        pageMap.set(params.page, response.lastDoc)
      }

      return response.content || []
    },
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export const useArticles = useBlogs

// Fetch single blog by id
export const useBlog = (id: string, enabled = true) => {
  return useQuery({
    queryKey: blogKeys.detail(id),
    queryFn: async () => {
      const response = await blogApi.getBlogById(id)
      return response.content
    },
    enabled: enabled && !!id,
  })
}

export const useArticle = useBlog

/**
 * Create blog mutation
 */
export const useCreateBlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: IBlogItem) => {
      const response = await blogApi.createBlog(data)
      return response.content
    },
    onSuccess: () => {
      // Clear all lastDoc cursors since data has changed
      clearLastBlogDocStore()
      // Invalidate all blog lists to refetch
      queryClient.invalidateQueries({
        queryKey: blogKeys.lists(),
      })
    },
  })
}

export const useCreateArticle = useCreateBlog

/**
 * Update blog mutation
 */
export const useUpdateBlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IBlogItem }) => {
      const response = await blogApi.updateBlog(id, data)
      return response.content
    },
    onSuccess: (updatedBlog) => {
      // Invalidate blog lists to refetch (don't clear cursors to preserve pagination)
      queryClient.invalidateQueries({
        queryKey: blogKeys.lists(),
      })
      // Invalidate blog counts (in case category changed)
      queryClient.invalidateQueries({
        queryKey: blogKeys.counts(),
      })
      // Invalidate specific blog detail cache
      if (updatedBlog?.id) {
        queryClient.invalidateQueries({
          queryKey: blogKeys.detail(updatedBlog.id),
        })
      }
    },
  })
}

export const useUpdateArticle = useUpdateBlog

/**
 * Fetch total count of blogs
 */
export const useBlogsCount = (categoryId?: string) => {
  return useQuery({
    queryKey: [...blogKeys.counts(), categoryId],
    queryFn: async () => {
      const count = await blogApi.getBlogsCount(categoryId)
      return count
    },
    refetchOnWindowFocus: false,
  })
}

export const useArticlesCount = useBlogsCount
