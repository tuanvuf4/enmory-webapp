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

  const route: RouteObject[] = useMemo(
    () => [
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
    ],
    [],
  )

  const authRoute: RouteObject[] = useMemo(
    (): RouteObject[] => [
      {
        path: '/',
        element: lazyLoadRoutes('home'),
        handle: () => {},
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
        path: '/progress',
        element: lazyLoadRoutes('progress'),
      },
      {
        path: '/schedule',
        element: lazyLoadRoutes('schedule'),
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
    ],
    [],
  )

  useEffect(() => {
    isAuth ? setRouter(authRoute) : setRouter(route)
  }, [isAuth, authRoute, route])

  return useRoutes(router)
}
