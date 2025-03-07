import React, { useEffect, useMemo, useState } from 'react'
import { RouteObject, useRoutes } from 'react-router-dom'
import { useAppSelector } from './core/hooks/redux'
import { PageNotFound } from './views/pages/pageNotFound/notFound'

export function lazyLoadRoutes(componentName: string) {
  const LazyElement = React.lazy(
    () => import(`./views/pages/${componentName}/${componentName}.tsx`),
  )

  return (
    <React.Suspense
    // fallback={<PageNotFound />}
    >
      <LazyElement />
    </React.Suspense>
  )
}

export const RouterElement = () => {
  const [router, setRouter] = useState<RouteObject[]>([])

  const { isAuth } = useAppSelector((state) => state.auth)

  const route = useMemo(() => {
    return [
      // {
      //   path: '/',
      //   element: lazyLoadRoutes('home'),
      // },
      {
        path: '/login',
        element: lazyLoadRoutes('login'),
      },
      {
        path: '/register',
        element: lazyLoadRoutes('register'),
      },
      {
        path: '/about',
        element: lazyLoadRoutes('about'),
      },
      {
        path: '*',
        element: <PageNotFound />,
      },
    ]
  }, [])

  const authRoute = useMemo(() => {
    return [
      {
        path: '/',
        element: lazyLoadRoutes('home'),
      },
      {
        path: '/library',
        element: lazyLoadRoutes('library'),
      },
      {
        path: '/example',
        element: lazyLoadRoutes('example'),
      },
      {
        path: '/listening',
        element: lazyLoadRoutes('listening'),
      },
      {
        path: '/statistic',
        element: lazyLoadRoutes('statistic'),
      },
      {
        path: '/schedule',
        element: lazyLoadRoutes('schedule'),
      },
      {
        path: '/about',
        element: lazyLoadRoutes('about'),
      },
      {
        path: '/setting',
        element: lazyLoadRoutes('setting'),
      },
      {
        path: '/profile',
        element: lazyLoadRoutes('profile'),
      },
      {
        path: '*',
        element: <PageNotFound />,
      },
    ]
  }, [])

  useEffect(() => {
    isAuth ? setRouter(authRoute) : setRouter(route)
  }, [isAuth, authRoute, route])

  return useRoutes(router)
}
