import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  blogCategoriesApi,
  IBlogCategoryRequestParams,
  IBlogCategory,
} from '@/services/firebase/api/blogCategories.api'

// Query keys
export const blogCategoryKeys = {
  all: ['blog_categories'] as const,
  lists: () => [...blogCategoryKeys.all, 'list'] as const,
  list: (filters: IBlogCategoryRequestParams) => [...blogCategoryKeys.lists(), filters] as const,
  details: () => [...blogCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...blogCategoryKeys.details(), id] as const,
}

export const articleCategoryKeys = blogCategoryKeys

/**
 * Fetch all blog categories
 */
export const useBlogCategories = (params: IBlogCategoryRequestParams) => {
  return useQuery({
    queryKey: blogCategoryKeys.list(params),
    queryFn: async () => {
      const response = await blogCategoriesApi.getCategories(params)
      return response.content || []
    },
    refetchOnWindowFocus: false,
  })
}

export const useArticleCategories = useBlogCategories

/**
 * Fetch single blog category by id
 */
export const useBlogCategory = (id: string, enabled = true) => {
  return useQuery({
    queryKey: blogCategoryKeys.detail(id),
    queryFn: async () => {
      const response = await blogCategoriesApi.getCategoryById(id)
      return response.content
    },
    enabled: enabled && !!id,
  })
}

export const useArticleCategory = useBlogCategory

/**
 * Create blog category mutation
 */
export const useCreateBlogCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: IBlogCategory) => {
      const response = await blogCategoriesApi.createCategory(data)
      return response.content
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: blogCategoryKeys.lists(),
        type: 'active',
      })
    },
  })
}

export const useCreateArticleCategory = useCreateBlogCategory

/**
 * Update blog category mutation
 */
export const useUpdateBlogCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IBlogCategory }) => {
      const response = await blogCategoriesApi.updateCategory(id, data)
      return response.content
    },
    onSuccess: (updatedCategory) => {
      queryClient.refetchQueries({
        queryKey: blogCategoryKeys.lists(),
        type: 'active',
      })
      if (updatedCategory?.id) {
        queryClient.refetchQueries({
          queryKey: blogCategoryKeys.detail(updatedCategory.id),
          type: 'active',
        })
      }
    },
  })
}

export const useUpdateArticleCategory = useUpdateBlogCategory

/**
 * Delete blog category mutation
 */
export const useDeleteBlogCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await blogCategoriesApi.deleteCategory(id)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: blogCategoryKeys.lists(),
      })
    },
  })
}

export const useDeleteArticleCategory = useDeleteBlogCategory
