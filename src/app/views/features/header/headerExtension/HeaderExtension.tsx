import { DownOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Dropdown, Layout, MenuProps, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { menuExtension } from './Menu'
import styles from './style.module.scss'
import globalStyles from '@/style/appStyle.module.scss'
import { useEffect, useState } from 'react'
import { IUser } from '@/models/user.model'
import { EPageExt } from '@/models/app.model'
import logo from '@/assets/img/logo.png'
import { Link } from 'react-router-dom'
import { addNewType } from '../Menu'
import { useSelector } from '@/core/hooks'
interface IHeaderExt {
  isAuth: boolean
  onPageChange: (page: EPageExt) => void
}

export const HeaderExtension: React.FC<IHeaderExt> = ({ isAuth, onPageChange }) => {
  const { token } = theme.useToken()

  
  

  // Get user info from Redux state (Firebase auth)
  const authUser = useSelector((state) => state.auth.user)
  const [userInfo, setUserInfo] = useState<IUser>()

  useEffect(() => {
    if (authUser) {
      setUserInfo(authUser as IUser)
    }
  }, [authUser])

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      onPageChange(EPageExt.LOGIN)
    }
  }

  const menuProps = {
    items: menuExtension,
    onClick: handleMenuClick,
  }

  const handleAddMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'addItem') {
      onPageChange(EPageExt.ADD)
    }

    if (e.key === 'addEx') {
      onPageChange(EPageExt.ADD_EX)
    }
  }

  const menuAddProps = {
    items: addNewType,
    onClick: handleAddMenuClick,
  }

  return (
    <Layout.Header className={styles.header}>
      <div className={globalStyles.containerFluid}>
        <Row
          gutter={[token.size, token.size * 2]}
          justify={'space-between'}
          className={styles.rowHeader}
        >
          <Col xs={12}>
            <div className={styles.logo}>
              <h1 className={styles.brandName}>
                <Link to={'/'}>
                  <img src={logo} alt='' />
                </Link>
              </h1>
            </div>
          </Col>

          {/* {isAuth && (
            <Col xs={12}>
              <MainMenu direction={'horizontal'} onPageChange={onPageChange} />
            </Col>
          )} */}

          {isAuth && (
            <Col xs={12}>
              <div className={classNames(styles.userContainer)}>
                <Dropdown trigger={['click']} menu={menuAddProps} placement='bottomLeft' arrow>
                  <Button
                    className={classNames(styles.btnAddNew)}
                    icon={
                      <PlusOutlined
                        style={{
                          fontSize: token.fontSizeHeading4,
                        }}
                        color={token.colorPrimary}
                      />
                    }
                    onClick={(e) => e.preventDefault()}
                  >
                    Add
                  </Button>
                </Dropdown>

                <Dropdown trigger={['click']} menu={menuProps} placement='bottomLeft' arrow>
                  <Button type='text' onClick={(e) => e.preventDefault()}>
                    <Space>
                      {`Hi ${userInfo?.firstName || ''}!`}
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>
              </div>
            </Col>
          )}

          {!isAuth && (
            <Col xs={12}>
              <div className={styles.userContainer}>
                <Button type='primary' onClick={() => onPageChange(EPageExt.LOGIN)}>
                  Login
                </Button>

                <Button type='default' onClick={() => onPageChange(EPageExt.REGISTER)}>
                  Register
                </Button>
              </div>
            </Col>
          )}
        </Row>
      </div>
    </Layout.Header>
  )
}
