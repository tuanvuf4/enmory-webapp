import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blogApi, IBlogRequestParams } from '@/services/firebase/api/blog.api'
import { IBlogItem } from '@/models/blog.model'
import { localDb } from '@/services/localDb'

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

// Helper for clearing query cursor caches (no-op since querying from localDb)
export const clearLastBlogDocStore = (_queryConfigKey?: string) => {}
export const clearLastArticleDocStore = clearLastBlogDocStore

/**
 * Fetch blogs list exclusively from localDb
 */
export const useBlogs = (params: IBlogRequestParams, enabled = true) => {
  return useQuery({
    queryKey: blogKeys.list(params),
    queryFn: async () => {
      const response = await blogApi.getBlogs(params)
      if (!response.isSuccess) {
        throw new Error(response.message || 'Failed to fetch blogs')
      }
      return response.content || []
    },
    enabled,
    refetchOnWindowFocus: false,
  })
}

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
 * Create blog mutation (both localDb and Firestore)
 */
export const useCreateBlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: IBlogItem) => {
      const response = await blogApi.createBlog(data)
      return response.content
    },
    onSuccess: (createdBlog) => {
      if (createdBlog?.id) {
        localDb.blogs.put(createdBlog)
      }
      queryClient.invalidateQueries({
        queryKey: blogKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: blogKeys.counts(),
      })
    },
  })
}

export const useCreateArticle = useCreateBlog

/**
 * Update blog mutation (both localDb and Firestore)
 */
export const useUpdateBlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IBlogItem }) => {
      const response = await blogApi.updateBlog(id, data)
      return response.content
    },
    onSuccess: (updatedBlog) => {
      if (updatedBlog?.id) {
        localDb.blogs.put(updatedBlog)
        queryClient.setQueryData(blogKeys.detail(updatedBlog.id), updatedBlog)
      }
      queryClient.invalidateQueries({
        queryKey: blogKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: blogKeys.counts(),
      })
      if (updatedBlog?.id) {
        queryClient.invalidateQueries({
          queryKey: blogKeys.detail(updatedBlog.id),
        })
      }
    },
  })
}

/**
 * Delete blog mutation (both localDb and Firestore)
 */
export const useDeleteBlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await blogApi.deleteBlog(id)
      if (!response.isSuccess) {
        throw new Error(response.message || 'Failed to delete blog')
      }
      return id
    },
    onSuccess: async (deletedId) => {
      if (deletedId) {
        await localDb.blogs.delete(deletedId)
        queryClient.removeQueries({
          queryKey: blogKeys.detail(deletedId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: blogKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: blogKeys.counts(),
      })
      if (deletedId) {
        queryClient.invalidateQueries({
          queryKey: blogKeys.detail(deletedId),
        })
      }
    },
  })
}

export const useDeleteArticle = useDeleteBlog

/**
 * Fetch total count of blogs exclusively from localDb
 */
export const useBlogsCount = (tag?: string, enabled = true) => {
  return useQuery({
    queryKey: [...blogKeys.counts(), tag],
    queryFn: async () => {
      return await blogApi.getBlogsCount(tag)
    },
    enabled,
    refetchOnWindowFocus: false,
  })
}
