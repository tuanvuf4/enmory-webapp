import React, { useEffect, useMemo, useState } from 'react'
import { RouteObject, useRoutes } from 'react-router-dom'
import { useSelector } from './core/hooks/redux'
import { NotFound } from './views/pages/notFound/NotFound'

export function lazyLoadRoutes(componentName: string) {
  // Capitalize first letter for PascalCase file names
  const fileName = componentName.charAt(0).toUpperCase() + componentName.slice(1)
  const LazyElement = React.lazy(() => import(`./views/pages/${componentName}/${fileName}.tsx`))

  return (
    <React.Suspense
    // fallback={<NotFound />}
    >
      <LazyElement />
    </React.Suspense>
  )
}

export const RouterElement = () => {
  const [router, setRouter] = useState<RouteObject[]>([])

  const { isAuth } = useSelector((state) => state.auth)

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
        element: <NotFound />,
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
      // {
      //   path: '/marker',
      //   element: lazyLoadRoutes('marker'),
      // },
      // {
      //   path: '/schedule',
      //   element: lazyLoadRoutes('schedule'),
      // },
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
        element: lazyLoadRoutes('home'),
      },
    ],
    [],
  )

  useEffect(() => {
    isAuth ? setRouter(authRoute) : setRouter(route)
  }, [isAuth, authRoute, route])

  return useRoutes(router)
}
