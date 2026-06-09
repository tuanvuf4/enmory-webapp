import { DownOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Dropdown, Layout, MenuProps, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { addNewTypeExtension, menuExtension } from './Menu'
import styles from './style.module.scss'
import appStyle from '@/style/appStyle.module.scss'
import { EPageExt } from '@/models/app.model'
import logo from '@/assets/img/logo.png'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from '@/core/hooks'
import { firebaseAuthService } from '@/services/firebase'
import { authAction } from '@/store/reducers/auth.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { exampleAction } from '@/store/reducers/example.reducer'

interface IHeaderExt {
  isAuth: boolean
  onPageChange: (page: EPageExt) => void
}

export const HeaderExtension: React.FC<IHeaderExt> = ({ isAuth, onPageChange }) => {
  const { token } = theme.useToken()

  const dispatch = useDispatch()

  // Get user info directly from Redux (Firebase auth state)
  const user = useSelector((state) => state.auth.user)

  const handleLogout = async () => {
    try {
      if (firebaseAuthService.isAuthenticated()) {
        await firebaseAuthService.signOut()
      }
    } catch (error) {
      console.error('[HeaderExtension] Logout error:', error)
    } finally {
      // Clear Redux state so the popup falls back to the login screen
      dispatch(authAction.logOut())
      dispatch(studySetAction.resetStudySet())
      dispatch(iotdAction.resetIotd())
      dispatch(exampleAction.reset())
    }
  }

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    if (e.key === 'logout') {
      await handleLogout()
    }
  }

  const menuProps = {
    items: menuExtension,
    onClick: handleMenuClick,
  }

  const handleAddMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'ADD_ITEM') {
      onPageChange(EPageExt.ADD)
    }

    if (e.key === 'ADD_EXAMPLE') {
      onPageChange(EPageExt.ADD_EX)
    }
  }

  const menuAddProps = {
    items: addNewTypeExtension,
    onClick: handleAddMenuClick,
  }

  return (
    <Layout.Header className={styles.header} style={{ backgroundColor: token.colorBgContainer }}>
      <div className={appStyle.containerFluid}>
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
                      {`Hi ${user?.firstName || user?.displayName || ''}!`}
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
