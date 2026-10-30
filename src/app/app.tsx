import { useDispatch, useSelector } from '@/core/hooks'
import { useAuthInit } from '@/core/hooks/useAuthInit'
import { AppLayout } from '@/views/features/layout/Layout'
import { useEffect, useState } from 'react'
import { RouterElement } from './router'
import moment from 'moment'
import { Loading } from './views/features/loading/Loading'
import { useCategories, useTypes } from '@/core/hooks/useCommon'
import { settingAction } from '@/store/reducers/setting.reducer'
import { actionAsyncApp } from '@/store/asyncActions'
import { useLoading } from './helpers'

export const App = () => {
  const [isInitializing, setIsInitializing] = useState(true)

  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const { hideLoading } = useLoading()

  useAuthInit()

  // Fetch categories and types using React Query
  const { data: categories } = useCategories()
  const { data: types } = useTypes()

  // Set initialization complete after brief delay to ensure auth is checked
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false)
      hideLoading()
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  moment.locale('en', { week: { dow: 1 } })

  // Update Redux store when categories and types are fetched
  useEffect(() => {
    if (categories) dispatch(settingAction.setCategories(categories))
  }, [categories, dispatch])

  useEffect(() => {
    if (types) dispatch(settingAction.setTypes(types))
  }, [types, dispatch])

  useEffect(() => {
    if (user?.configuration?.itemTags) {
      const formattedTags = (user.configuration.itemTags || []).map((tag: any) => {
        const tagName =
          typeof tag === 'string' ? tag : String(tag.name || tag.label || tag.value || '')
        const tagColor = typeof tag === 'string' ? '#1890ff' : tag.color || '#1890ff'
        const tagOrder = typeof tag === 'string' ? 1 : (tag.order ?? 1)
        return {
          id: tagName,
          label: tagName,
          value: tagName,
          name: tagName,
          color: tagColor,
          order: tagOrder,
        }
      })
      dispatch(settingAction.setTags(formattedTags))
    } else if (user?.uid) {
      dispatch(actionAsyncApp.fetchTags())
    } else {
      dispatch(settingAction.setTags([]))
    }
  }, [user?.uid, user?.configuration?.itemTags, dispatch])

  if (isInitializing) {
    return <Loading show={isInitializing} />
  }

  return (
    <AppLayout>
      <RouterElement />
    </AppLayout>
  )
}
