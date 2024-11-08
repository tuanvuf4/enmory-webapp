import { Menu } from 'antd'
import styles from './style'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { authMenus, keyPaths, menus, menusExt } from './menus'
import classNames from 'clsx'
import type { MenuProps } from 'antd'
import { configAction } from '@/store/reducers/config.reducer'
import { appConfig, EAppType } from '@/config/appConfig'
import { EPageExt } from '@/models/app.model'

type TDirection = 'horizontal' | 'vertical'

interface IPros {
  direction: TDirection
  toggleDrawler?: boolean
  onPageChange?: (page: EPageExt) => void
}

export const MainMenu: React.FC<IPros> = ({
  direction,
  toggleDrawler = false,
  onPageChange,
}: IPros) => {
  const classes = styles()

  const [menu, setMenu] = useState<MenuProps['items']>([])
  const [current, setCurrent] = useState('1')

  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const location = useLocation()

  const { isAuth } = useAppSelector((state) => state.auth)

  const redirect = (key: string, cb: (router: string) => void) => {
    const item = keyPaths.find((item) => item.key === key)
    if (item) cb(item.path)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onItemClick = (menu: any) => {
    if (appConfig.appType === EAppType.EXTENSION) {
      if (onPageChange) onPageChange(menu.key)
    } else {
      setCurrent(menu.key)
      redirect(menu.key, navigate)
      if (toggleDrawler) dispatch(configAction.toggleSidebar())
    }
  }

  useEffect(() => {
    if (appConfig.appType === EAppType.EXTENSION) {
      setMenu(menusExt)
    } else {
      isAuth ? setMenu(authMenus) : setMenu(menus)
    }
  }, [isAuth])

  useEffect(() => {
    const item = keyPaths.find((item) => item.path.includes(location.pathname))
    item ? setCurrent(item.key) : setCurrent('-1')
  }, [location])

  return (
    <div
      className={classNames(
        classes.mainNavMenu,
        direction === 'horizontal' ? `${classes.horizontalMenu} horizontal` : '',
      )}
    >
      <Menu
        mode={direction === 'horizontal' ? 'horizontal' : 'inline'}
        // className={direction === 'horizontal' ? 'horizontal' : ''}
        selectedKeys={[current]}
        defaultSelectedKeys={['1']}
        items={menu}
        onClick={onItemClick}
      />
    </div>
  )
}
