import { useDispatch, useSelector } from '@/core/hooks'
import { useAuthInit } from '@/core/hooks/useAuthInit'
import { AppLayout } from '@/views/features/layout/Layout'
import { useEffect, useState } from 'react'
import { RouterElement } from './router'
import moment from 'moment'
import { Loading } from './views/features/loading/Loading'
import { useCategories, useTypes, usePrefetchAllIotd } from '@/core/hooks/useCommon'
import { configAction } from '@/store/reducers/config.reducer'

export const App = () => {
  const [isInitializing, setIsInitializing] = useState(true)

  // Initialize Firebase auth
  useAuthInit()

  const { isAuth } = useSelector((state) => state.auth)
  const dispatch = useDispatch()

  // Fetch categories and types using React Query
  const { data: categories } = useCategories()
  const { data: types } = useTypes()
  const prefetchAllIotd = usePrefetchAllIotd()

  // Set initialization complete after brief delay to ensure auth is checked
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  moment.locale('en', {
    week: {
      dow: 1,
    },
  })

  // Update Redux store when categories and types are fetched
  useEffect(() => {
    if (categories) {
      dispatch(configAction.setCategories(categories))
    }
  }, [categories, dispatch])

  useEffect(() => {
    if (types) {
      dispatch(configAction.setTypes(types))
    }
  }, [types, dispatch])

  // Prefetch IOTD when authenticated and categories are loaded
  useEffect(() => {
    if (isAuth && !isInitializing && categories && categories.length > 0) {
      prefetchAllIotd(categories)
    }
  }, [isAuth, isInitializing, categories, prefetchAllIotd])

  if (isInitializing) {
    return <Loading />
  }

  return (
    <>
      <AppLayout>
        <RouterElement />
      </AppLayout>
    </>
  )
}
