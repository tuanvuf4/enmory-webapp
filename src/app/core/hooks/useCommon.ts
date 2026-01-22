import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commonApi } from '@/services/firebase/api/common.api'
import { IIotdRequest, ECategory, IIotd } from '@/models/item.model'
import { useEffect } from 'react'
import { useDispatch, useSelector } from './redux'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { getTodayDateString } from '@/helpers/dataTime'

// Query keys
export const commonKeys = {
  all: ['common'] as const,
  categories: () => [...commonKeys.all, 'categories'] as const,
  types: () => [...commonKeys.all, 'types'] as const,
  iotd: () => [...commonKeys.all, 'iotd'] as const,
  iotdByCategory: (catId: number, date?: string) => [...commonKeys.iotd(), catId, date] as const,
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

// Helper to get IOTD from Redux by category
const getIotdFromRedux = (state: any, catId: number): IIotd<string[]> | null => {
  switch (catId) {
    case ECategory.WORD:
      return state.iotd.word
    case ECategory.PHRASE:
      return state.iotd.phrase
    case ECategory.IDIOM:
      return state.iotd.idiom
    case ECategory.SLANG:
      return state.iotd.slang
    case ECategory.COLLOCATION:
      return state.iotd.collocation
    case ECategory.SENTENCE:
      return state.iotd.sentence
    default:
      return null
  }
}

// Check if IOTD is from today
const isIotdFromToday = (
  iotd: IIotd<string[]> | null,
  todayStart: number,
  todayEnd: number,
): boolean => {
  if (!iotd || !iotd.first_of_date) return false
  return iotd.first_of_date >= todayStart && iotd.first_of_date <= todayEnd
}

// Fetch item of the day by category
export const useIotd = (data: IIotdRequest, enabled = true) => {
  const dispatch = useDispatch()
  const today = getTodayDateString()
  const reduxIotd = useSelector((state) => getIotdFromRedux(state, data.catId))

  // Get today's date range
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).getTime()

  // Check if Redux has valid IOTD for today
  const hasValidReduxIotd = isIotdFromToday(reduxIotd, todayStart, todayEnd)

  const query = useQuery({
    queryKey: commonKeys.iotdByCategory(data.catId, today),
    queryFn: async () => {
      // If Redux has valid IOTD, return it immediately
      if (hasValidReduxIotd && reduxIotd) {
        console.log(`[IOTD] Using cached IOTD from Redux for category ${data.catId}`)
        return reduxIotd
      }

      console.log(`[IOTD] Fetching new IOTD from API for category ${data.catId}`)
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
    staleTime: 60 * 60 * 1000, // 1 hour - data is fresh for an hour
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })

  // Sync with Redux store when data changes
  useEffect(() => {
    if (query.data && !hasValidReduxIotd) {
      dispatch(iotdAction.setIotd(query.data as unknown as IIotd<string[]>))
    }
  }, [query.data, dispatch, hasValidReduxIotd])

  return query
}

// Hook to fetch and sync all IOTD categories
export const usePrefetchAllIotd = (enabled = true) => {
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

// Refetch IOTD for specific category
export const useRefetchIotd = () => {
  const queryClient = useQueryClient()
  const today = getTodayDateString()

  return (catId: number) => {
    queryClient.invalidateQueries({ queryKey: commonKeys.iotdByCategory(catId, today) })
  }
}
