import { useQuery } from '@tanstack/react-query'
import { commonApi } from '@/services/firebase/api/common.api'
import { IIotdRequest, ECategory, IIotd } from '@/models/item.model'
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from './redux'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { getIotdFromRedux, isIotdFromToday } from '@/helpers/dataTime'

// Query keys
export const commonKeys = {
  all: ['common'] as const,
  categories: () => [...commonKeys.all, 'categories'] as const,
  types: () => [...commonKeys.all, 'types'] as const,
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
export const useIotd = ({ catId, generate = false }: IIotdRequest, enabled = true) => {
  const dispatch = useDispatch()
  const reduxIotd = useSelector((state) => getIotdFromRedux(state, catId))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

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
  const isValidIotd = isIotdFromToday(reduxIotd, todayStart, todayEnd)

  useEffect(() => {
    // If already have valid data or disabled, skip
    if (isValidIotd || !enabled) {
      return
    }

    // Fetch new IOTD
    const fetchIotd = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { isSuccess, content: iotd } = await commonApi.getItemOfTheDayByCatId({
          catId,
          generate,
        })
        if (isSuccess && iotd) {
          dispatch(iotdAction.setIotd(iotd as unknown as IIotd<string[]>))
        }
      } catch (err) {
        setError(err as Error)
        console.error(`[IOTD] Error fetching IOTD for category ${catId}:`, err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIotd()
  }, [catId, generate, isValidIotd, enabled, dispatch])

  return {
    data: reduxIotd,
    isLoading,
    error,
    isError: !!error,
  }
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
  const dispatch = useDispatch()

  return useCallback(
    async (catId: number) => {
      // Clear Redux state for this category
      dispatch(iotdAction.clearIotd(catId))

      // Fetch new IOTD
      try {
        const { isSuccess, content: iotd } = await commonApi.getItemOfTheDayByCatId({
          catId,
          generate: true,
        })
        if (isSuccess && iotd) {
          dispatch(iotdAction.setIotd(iotd as unknown as IIotd<string[]>))
        }
      } catch (err) {
        console.error(`[IOTD] Error refetching IOTD for category ${catId}:`, err)
      }
    },
    [dispatch],
  )
}
