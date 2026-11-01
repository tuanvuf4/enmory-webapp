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

export const RouterElement = () => {
  const [router, setRouter] = useState<RouteObject[]>([])

  const { isAuth, user } = useSelector((state) => state.auth)

  const devRoutes: RouteObject[] =
    import.meta.env.DEV || user?.configuration?.role === 'admin'
      ? [
          { path: '/developer', element: lazyLoadRoutes('developer') },
          { path: '/dev', element: lazyLoadRoutes('developer') },
        ]
      : []

  const publicRoute: RouteObject[] = [
    ...devRoutes,
    { path: '/about', element: lazyLoadRoutes('about') },
    { path: '/page_not_found', element: lazyLoadRoutes('pageNotFound') },
  ]

  const authRouterPath: RouteObject[] = [
    ...publicRoute,
    { path: '/login', element: lazyLoadRoutes('login') },
    { path: '/register', element: lazyLoadRoutes('register') },
    { path: '*', element: lazyLoadRoutes('pageNotFound') },
  ]

  const routerPath: RouteObject[] = [
    ...publicRoute,
    { path: '/', element: lazyLoadRoutes('home') },
    { path: '/library', element: lazyLoadRoutes('library') },
    { path: '/listening', element: lazyLoadRoutes('listening') },
    { path: '/blog', element: lazyLoadRoutes('blog') },
    { path: '/blog/:id', element: lazyLoadRoutes('blogDetail') },
    { path: '/statistic', element: lazyLoadRoutes('statistic') },
    { path: '/setting', element: lazyLoadRoutes('setting') },
    { path: '/profile', element: lazyLoadRoutes('profile') },
    { path: '*', element: lazyLoadRoutes('pageNotFound') },
  ]

  useEffect(() => {
    isAuth ? setRouter(routerPath) : setRouter(authRouterPath)
  }, [isAuth])

  return useRoutes(router)
}
