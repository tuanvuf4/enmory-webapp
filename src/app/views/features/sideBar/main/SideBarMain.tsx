import { theme } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import styles from './style'
import { MainMenu } from '../../mainMenu/MainMenu'

export const SideBarMain: React.FC = () => {
  const { token } = theme.useToken()
  const classes = styles(token)

  return (
    <div className={classes.aside}>
      <div className={classes.logo}>
        <Link to={'/'}>
          <img src={logo} alt='' />
          <span className={classes.brandName}>Enmory</span>
        </Link>
      </div>

      {/* <div className={classes.slogan}>
        <h2>
          <span>Learn English</span> <br /> the way you like!
        </h2>
      </div> */}

      <MainMenu direction='vertical' toggleDrawler></MainMenu>
    </div>
  )
}
