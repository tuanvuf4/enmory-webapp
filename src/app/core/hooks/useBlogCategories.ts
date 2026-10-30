import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from '@/core/hooks'
import { authAction } from '@/store/reducers/auth.reducer'
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
export const useBlogCategories = (params: IBlogCategoryRequestParams = {}) => {
  const queryParams: IBlogCategoryRequestParams = {
    orderBy: 'order',
    order: 'ASC',
    ...params,
  }
  return useQuery({
    queryKey: blogCategoryKeys.list(queryParams),
    queryFn: async () => {
      const response = await blogCategoriesApi.getCategories(queryParams)
      if (!response.isSuccess) {
        throw new Error(response.message || 'Failed to fetch blog categories')
      }
      return response.content || []
    },
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      if (!response.isSuccess) {
        throw new Error(response.message || 'Failed to fetch blog category')
      }
      return response.content
    },
    enabled: enabled && !!id,
    retry: 2,
  })
}

export const useArticleCategory = useBlogCategory

/**
 * Create blog category mutation
 */
export const useCreateBlogCategory = () => {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (data: IBlogCategory) => {
      const response = await blogCategoriesApi.createCategory(data)
      return response.content
    },
    onSuccess: async () => {
      queryClient.refetchQueries({
        queryKey: blogCategoryKeys.lists(),
        type: 'active',
      })
      const res = await blogCategoriesApi.getCategories()
      if (res.isSuccess && res.content) {
        dispatch(authAction.updateBlogTags(res.content))
      }
    },
  })
}

export const useCreateArticleCategory = useCreateBlogCategory

/**
 * Update blog category mutation
 */
export const useUpdateBlogCategory = () => {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IBlogCategory }) => {
      const response = await blogCategoriesApi.updateCategory(id, data)
      return response.content
    },
    onSuccess: async (updatedCategory) => {
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
      const res = await blogCategoriesApi.getCategories()
      if (res.isSuccess && res.content) {
        dispatch(authAction.updateBlogTags(res.content))
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
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await blogCategoriesApi.deleteCategory(id)
      return response
    },
    onSuccess: async () => {
      queryClient.refetchQueries({
        queryKey: blogCategoryKeys.lists(),
        type: 'active',
      })
      const res = await blogCategoriesApi.getCategories()
      if (res.isSuccess && res.content) {
        dispatch(authAction.updateBlogTags(res.content))
      }
    },
  })
}

export const useDeleteArticleCategory = useDeleteBlogCategory

export const useBlogTags = useBlogCategories
export const useBlogTag = useBlogCategory
export const useCreateBlogTag = useCreateBlogCategory
export const useUpdateBlogTag = useUpdateBlogCategory
export const useDeleteBlogTag = useDeleteBlogCategory
export const blogTagKeys = blogCategoryKeys
