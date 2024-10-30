import { DownOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Dropdown, Layout, MenuProps, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { items } from './menus'
import styles from './style'
import gStyles from 'src/style/appStyle'
import { useEffect, useState } from 'react'
import { IUser } from 'src/app/models/user.model'
import { apiAuth } from 'src/app/services/api/auth.api'
import { EPageExt } from 'src/app/models/app.model'
import logo from 'src/assets/img/logo.png'
import { Link } from 'react-router-dom'
import { addNewType } from '../header/menus'
interface IHeaderExt {
  isAuth: boolean
  onPageChange: (page: EPageExt) => void
}

export const HeaderExt: React.FC<IHeaderExt> = ({ isAuth, onPageChange }) => {
  const { token } = theme.useToken()
  const classes = styles(token)
  const gClasses = gStyles(token)

  const [userInfo, setUserInfo] = useState<IUser<string>>()

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
      onPageChange(EPageExt.ADDEX)
    }
  }

  const menuAddProps = {
    items: addNewType,
    onClick: handleAddMenuClick,
  }

  useEffect(() => {
    const getUserInfo = async () => {
      const { content } = await apiAuth.getUserInfo()
      setUserInfo(content)
    }

    getUserInfo()
  }, [])

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
