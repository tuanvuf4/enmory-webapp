import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  articleCategoriesApi,
  IArticleCategoryRequestParams,
} from '@/services/firebase/api/articleCategories.api'
import { IArticleCategory } from '@/services/firebase/api/articleCategories.api'

// Query keys
export const articleCategoryKeys = {
  all: ['article_categories'] as const,
  lists: () => [...articleCategoryKeys.all, 'list'] as const,
  list: (filters: IArticleCategoryRequestParams) =>
    [...articleCategoryKeys.lists(), filters] as const,
  details: () => [...articleCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...articleCategoryKeys.details(), id] as const,
}

/**
 * Fetch all article categories
 */
export const useArticleCategories = (params: IArticleCategoryRequestParams) => {
  return useQuery({
    queryKey: articleCategoryKeys.list(params),
    queryFn: async () => {
      const response = await articleCategoriesApi.getCategories(params)
      return response.content || []
    },
    refetchOnWindowFocus: false,
  })
}

/**
 * Fetch single article category by id
 */
export const useArticleCategory = (id: string, enabled = true) => {
  return useQuery({
    queryKey: articleCategoryKeys.detail(id),
    queryFn: async () => {
      const response = await articleCategoriesApi.getCategoryById(id)
      return response.content
    },
    enabled: enabled && !!id,
  })
}

/**
 * Create article category mutation
 */
export const useCreateArticleCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: IArticleCategory) => {
      const response = await articleCategoriesApi.createCategory(data)
      return response.content
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: articleCategoryKeys.lists(),
        type: 'active',
      })
    },
  })
}

/**
 * Update article category mutation
 */
export const useUpdateArticleCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IArticleCategory }) => {
      const response = await articleCategoriesApi.updateCategory(id, data)
      return response.content
    },
    onSuccess: (updatedCategory) => {
      queryClient.refetchQueries({
        queryKey: articleCategoryKeys.lists(),
        type: 'active',
      })
      if (updatedCategory?.id) {
        queryClient.refetchQueries({
          queryKey: articleCategoryKeys.detail(updatedCategory.id),
          type: 'active',
        })
      }
    },
  })
}

/**
 * Delete article category mutation
 */
export const useDeleteArticleCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await articleCategoriesApi.deleteCategory(id)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: articleCategoryKeys.lists(),
      })
    },
  })
}
