import React from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import styles from './sideBarMain.module.scss'
import { MainMenu } from '../mainMenu/MainMenu'
import { useSelector } from '@/core/hooks'

export const SideBarMain: React.FC = () => {
  const { isSidebarOpened, drawer } = useSelector((state) => state.setting)

  return (
    <div className={styles.aside}>
      <div className={styles.logo}>
        <Link to={'/'}>
          <img src={logo} alt='' />
          {drawer && <span className={styles.brandName}>Enmory</span>}

          {isSidebarOpened && !drawer && <span className={styles.brandName}>Enmory</span>}
        </Link>
      </div>

      {/* <div className={styles.slogan}>
        <h2>
          <span>Learn English</span> <br /> the way you like!
        </h2>
      </div> */}

      <MainMenu direction='vertical' />
    </div>
  )
}
