import { theme } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import styles from './style'
import { MainMenu } from '../mainMenu/MainMenu'
import { useSelector } from '@/core/hooks'

export const SideBarMain: React.FC = () => {
  const { isSidebarOpened, drawer } = useSelector((state) => state.setting)
  const { token } = theme.useToken()
  const classes = styles(token)

  return (
    <div className={classes.aside}>
      <div className={classes.logo}>
        <Link to={'/'}>
          <img src={logo} alt='' />
          {drawer && <span className={classes.brandName}>Enmory</span>}

          {isSidebarOpened && !drawer && <span className={classes.brandName}>Enmory</span>}
        </Link>
      </div>

      {/* <div className={classes.slogan}>
        <h2>
          <span>Learn English</span> <br /> the way you like!
        </h2>
      </div> */}

      <MainMenu direction='vertical' />
    </div>
  )
}
