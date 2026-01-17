import { useDispatch, useSelector } from '@/core/hooks'
import { useAuthInit } from '@/core/hooks/useAuthInit'
import { IHttpResponse } from '@/models/http.model'
import { ECategory, IPair } from '@/models/item.model'
import { actionAsyncApp } from '@/store/async/app.async'
import { AppLayout } from '@/views/features/layout/layout'
import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { RouterElement } from './router'
import moment from 'moment'

export const App = () => {
  const [isInitializing, setIsInitializing] = useState(true)

  // Initialize Firebase auth
  useAuthInit()

  // Removed axios interceptors - not needed since using Firebase SDK directly

  const { isAuth } = useSelector((state) => state.auth)
  const dispatch = useDispatch()

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

  const getCats = async (cats: IPair<string, ECategory>[]) => {
    cats.map(async (cat) => await dispatch(actionAsyncApp.fetchIotd({ catId: cat.id })))
  }

  useEffect(() => {
    if (isAuth && !isInitializing) {
      // User info is handled through Firebase Auth
      dispatch(actionAsyncApp.fetchTypes())
      dispatch(actionAsyncApp.fetchCategories()).then((response) => {
        const payload = response.payload as IHttpResponse<IPair<string, ECategory>[]>
        if (payload && payload.isSuccess) getCats(payload.content)
      })
    }
  }, [isAuth, isInitializing])

  if (isInitializing) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
      </div>
    )
  }

  return (
    <>
      <BrowserRouter data-testid='browser-router-element'>
        <AppLayout>
          <RouterElement />
        </AppLayout>
      </BrowserRouter>
    </>
  )
}
