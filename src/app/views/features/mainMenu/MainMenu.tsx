import { Menu } from 'antd'
import styles from './style.module.scss'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { authMenus, keyPaths, menus, menusExt } from './Menus'
import classNames from 'clsx'
import type { MenuProps } from 'antd'
import { settingAction } from '@/store/reducers/setting.reducer'
import { appConfig, EAppType } from '@/config/appConfig'
import { EPageExt, EViewPort } from '@/models/app.model'

type TDirection = 'horizontal' | 'vertical'

interface IPros {
  direction: TDirection
  onPageChange?: (page: EPageExt) => void
}

export const MainMenu: React.FC<IPros> = ({ direction, onPageChange }: IPros) => {
  const [menu, setMenu] = useState<MenuProps['items']>([])
  const [current, setCurrent] = useState('1')

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const location = useLocation()

  const { isAuth } = useSelector((state) => state.auth)
  const { drawer, isSidebarOpened, viewPort } = useSelector((state) => state.setting)

  const redirect = (key: string, cb: (path: string) => void) => {
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
      if (drawer && isSidebarOpened) {
        dispatch(settingAction.toggleSidebar())
      }
      if (!drawer && viewPort === EViewPort.XS && isSidebarOpened) {
        dispatch(settingAction.toggleSidebar())
      }
    }
  }

  useEffect(() => {
    if (appConfig.appType === EAppType.EXTENSION) {
      setMenu(menusExt)
    } else {
      isAuth ? setMenu(menus) : setMenu(authMenus)
    }
  }, [isAuth])

  useEffect(() => {
    const item = keyPaths.find((item) => item.path.includes(location.pathname))
    item ? setCurrent(item.key) : setCurrent('-1')
  }, [location])

  return (
    <div
      className={classNames(
        styles.mainNavMenu,
        direction === 'horizontal' ? `${styles.horizontalMenu} horizontal` : '',
      )}
    >
      <Menu
        mode={direction === 'horizontal' ? 'horizontal' : 'inline'}
        selectedKeys={[current]}
        defaultSelectedKeys={['1']}
        items={menu}
        onClick={onItemClick}
      />
    </div>
  )
}
