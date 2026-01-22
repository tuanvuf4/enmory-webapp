import { useDispatch } from '@/core/hooks'
import { useAuthInit } from '@/core/hooks/useAuthInit'
import { AppLayout } from '@/views/features/layout/Layout'
import { useEffect, useState } from 'react'
import { RouterElement } from './router'
import moment from 'moment'
import { Loading } from './views/features/loading/Loading'
import { useCategories, useTypes } from '@/core/hooks/useCommon'
import { settingAction } from '@/store/reducers/setting.reducer'

export const App = () => {
  const [isInitializing, setIsInitializing] = useState(true)

  const dispatch = useDispatch()

  useAuthInit()

  // Fetch categories and types using React Query
  const { data: categories } = useCategories()
  const { data: types } = useTypes()

  // Set initialization complete after brief delay to ensure auth is checked
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  moment.locale('en', { week: { dow: 1 } })

  // Update Redux store when categories and types are fetched
  useEffect(() => {
    if (categories) {
      dispatch(settingAction.setCategories(categories))
    }
  }, [categories, dispatch])

  useEffect(() => {
    if (types) {
      dispatch(settingAction.setTypes(types))
    }
  }, [types, dispatch])

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
