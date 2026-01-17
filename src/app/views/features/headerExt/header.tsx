import { DownOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Dropdown, Layout, MenuProps, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { items } from './menus'
import styles from './style'
import globalStyle from '@/style/appStyle'
import { useEffect, useState } from 'react'
import { IUser } from '@/models/user.model'
import { EPageExt } from '@/models/app.model'
import logo from '@/assets/img/logo.png'
import { Link } from 'react-router-dom'
import { addNewType } from '../header/menus'
import { useAppSelector } from '@/core/hooks'
interface IHeaderExt {
  isAuth: boolean
  onPageChange: (page: EPageExt) => void
}

export const HeaderExt: React.FC<IHeaderExt> = ({ isAuth, onPageChange }) => {
  const { token } = theme.useToken()

  const classes = styles()
  const gClasses = globalStyle()

  // Get user info from Redux state (Firebase auth)
  const authUser = useAppSelector((state) => state.auth.user)
  const [userInfo, setUserInfo] = useState<IUser<string>>()

  useEffect(() => {
    if (authUser) {
      setUserInfo(authUser as IUser<string>)
    }
  }, [authUser])

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      onPageChange(EPageExt.LOGIN)
    }
  }

  const menuProps = {
    items,
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
    <Layout.Header className={classes.header}>
      <div className={gClasses.containerFluid}>
        <Row
          gutter={[token.size, token.size * 2]}
          justify={'space-between'}
          className={classes.rowHeader}
        >
          <Col xs={12}>
            <div className={classes.logo}>
              <h1 className={classes.brandName}>
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
              <div className={classNames(classes.userContainer)}>
                <Dropdown trigger={['click']} menu={menuAddProps} placement='bottomLeft' arrow>
                  <Button
                    className={classNames(classes.btnAddNew)}
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
              <div className={classes.userContainer}>
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
