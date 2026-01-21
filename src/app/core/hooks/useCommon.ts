import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commonApi } from '@/services/firebase/api/common.api'
import { IIotdRequest, ECategory } from '@/models/item.model'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { iotdAction } from '@/store/reducers/iotd.reducer'

// Query keys
export const commonKeys = {
  all: ['common'] as const,
  categories: () => [...commonKeys.all, 'categories'] as const,
  types: () => [...commonKeys.all, 'types'] as const,
  iotd: () => [...commonKeys.all, 'iotd'] as const,
  iotdByCategory: (catId: number) => [...commonKeys.iotd(), catId] as const,
}

// Fetch categories
export const useCategories = () => {
  return useQuery({
    queryKey: commonKeys.categories(),
    queryFn: async () => {
      const { isSuccess, content: cats } = await commonApi.getCategories()
      if (isSuccess && cats) {
        return cats
      }
      return []
    },
    staleTime: Infinity, // Categories rarely change
  })
}

// Fetch types
export const useTypes = () => {
  return useQuery({
    queryKey: commonKeys.types(),
    queryFn: async () => {
      const { isSuccess, content: types } = await commonApi.getTypes()
      if (isSuccess && types) {
        return types
      }
      return []
    },
    staleTime: Infinity, // Types rarely change
  })
}

// Fetch item of the day by category
export const useIotd = (data: IIotdRequest, enabled = true) => {
  const dispatch = useDispatch()

  const query = useQuery({
    queryKey: commonKeys.iotdByCategory(data.catId),
    queryFn: async () => {
      const { isSuccess, content: iotd } = await commonApi.getItemOfTheDayByCatId(data)
      if (isSuccess && iotd) {
        return {
          ...iotd,
          item: iotd.item,
        }
      }
      return null
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Sync with Redux store
  useEffect(() => {
    if (query.data) {
      dispatch(iotdAction.setIotd(query.data))
    }
  }, [query.data, dispatch])

  return query
}

// Hook to fetch and sync all IOTD categories
export const useAllIotd = (enabled = true) => {
  const results = {
    [ECategory.WORD]: useIotd({ catId: ECategory.WORD }, enabled),
    [ECategory.PHRASE]: useIotd({ catId: ECategory.PHRASE }, enabled),
    [ECategory.IDIOM]: useIotd({ catId: ECategory.IDIOM }, enabled),
    [ECategory.SLANG]: useIotd({ catId: ECategory.SLANG }, enabled),
    [ECategory.COLLOCATION]: useIotd({ catId: ECategory.COLLOCATION }, enabled),
    [ECategory.SENTENCE]: useIotd({ catId: ECategory.SENTENCE }, enabled),
  }

  return {
    isLoading: Object.values(results).some((r) => r.isLoading),
    isError: Object.values(results).some((r) => r.isError),
    results,
  }
}

// Prefetch all IOTD categories
export const usePrefetchAllIotd = () => {
  const queryClient = useQueryClient()

  return (categories: Array<{ id: number }>) => {
    categories.forEach((cat) => {
      queryClient.prefetchQuery({
        queryKey: commonKeys.iotdByCategory(cat.id),
        queryFn: async () => {
          const iotd = await commonApi.getItemOfTheDayByCatId({ catId: cat.id })
          return {
            ...iotd.content,
            item: iotd.content.item,
          }
        },
      })
    })
  }
}

// Refetch IOTD for specific category
export const useRefetchIotd = () => {
  const queryClient = useQueryClient()

  return (catId: number) => {
    queryClient.invalidateQueries({ queryKey: commonKeys.iotdByCategory(catId) })
  }
}
