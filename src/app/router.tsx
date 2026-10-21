import React, { useEffect, useState } from 'react'
import { RouteObject, useRoutes } from 'react-router-dom'
import { useSelector } from './core/hooks/redux'

export function lazyLoadRoutes(componentName: string) {
  // Capitalize first letter for PascalCase file names
  const fileName = componentName.charAt(0).toUpperCase() + componentName.slice(1)
  const LazyElement = React.lazy(() => import(`./views/pages/${componentName}/${fileName}.tsx`))

  return (
    // <React.Suspense fallback={<PageNotFound />}>
    <React.Suspense>
      <LazyElement />
    </React.Suspense>
  )
}

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      { path: '/local-db', element: lazyLoadRoutes('localDb') },
      { path: '/local_db', element: lazyLoadRoutes('localDb') },
    ]
  : []

export const publicRoute: RouteObject[] = [
  { path: '/about', element: lazyLoadRoutes('about') },
  { path: '/page_not_found', element: lazyLoadRoutes('pageNotFound') },
  ...devRoutes,
]

export const authRouterPath: RouteObject[] = [
  { path: '/login', element: lazyLoadRoutes('login') },
  { path: '/register', element: lazyLoadRoutes('register') },
  ...publicRoute,
  { path: '*', element: lazyLoadRoutes('pageNotFound') },
]

export const routerPath: RouteObject[] = [
  { path: '/', element: lazyLoadRoutes('home') },
  { path: '/library', element: lazyLoadRoutes('library') },
  // { path: '/example', element: lazyLoadRoutes('example') },
  { path: '/listening', element: lazyLoadRoutes('listening') },
  { path: '/blog', element: lazyLoadRoutes('blog') },
  { path: '/blog/:id', element: lazyLoadRoutes('blogDetail') },
  { path: '/statistic', element: lazyLoadRoutes('statistic') },
  // { path: '/marker', element: lazyLoadRoutes('marker') },
  // { path: '/schedule', element: lazyLoadRoutes('schedule') },
  { path: '/setting', element: lazyLoadRoutes('setting') },
  { path: '/profile', element: lazyLoadRoutes('profile') },
  ...publicRoute,
  { path: '*', element: lazyLoadRoutes('pageNotFound') },
]

export const RouterElement = () => {
  const [router, setRouter] = useState<RouteObject[]>([])

  const { isAuth } = useSelector((state) => state.auth)

  useEffect(() => {
    isAuth ? setRouter(routerPath) : setRouter(authRouterPath)
  }, [isAuth])

  return useRoutes(router)
}
