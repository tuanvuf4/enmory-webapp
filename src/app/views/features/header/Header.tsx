import globalStyle from '@/style/appStyle'
import { MenuOutlined, SearchOutlined, PlusOutlined, DownOutlined } from '@ant-design/icons'
import { useSelector, useDispatch } from '@/core/hooks'
import { useAuthLogout } from '@/core/hooks/useAuthLogout'
import { settingAction } from '@/store/reducers/setting.reducer'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { theme, MenuProps, Row, Col, Button, Dropdown, Space } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import { MainMenu } from '../mainMenu/MainMenu'
import { menu, addNewType } from './Menu'
import styles from './style'
import clsx from 'clsx'
import { useExampleModal, useItemModal } from '@/helpers/hooks'
import { Header } from 'antd/es/layout/layout'

export const AppHeader = () => {
  const { token } = theme.useToken()
  const classes = styles()
  const globalClasses = globalStyle()

  const { isAuth, user } = useSelector((state) => state.auth)
  const { drawer } = useSelector((state) => state.setting)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)

  const dispatch = useDispatch()
  const { logout } = useAuthLogout()

  const navigate = useNavigate()

  const { openItemModal } = useItemModal()
  const { openExampleModal } = useExampleModal()

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    switch (e.key) {
      case 'profile':
        navigate('/profile')
        break

      case 'setting':
        navigate('/setting')
        break

      case 'logout':
        // Clear Redux state before logout
        dispatch(studySetAction.resetStudySet())
        dispatch(iotdAction.resetIotd())
        // Call complete logout (Firebase + auth state + redirect)
        await logout()
        break

      default:
        break
    }
  }

  const menuProps = {
    items: menu,
    onClick: handleMenuClick,
  }

  const handleAddMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'ADD_ITEM') {
      openItemModal('add')
    }

    if (e.key === 'ADD_EXAMPLE') {
      openExampleModal('add')
    }
  }

  const menuAddProps = {
    items: addNewType,
    onClick: handleAddMenuClick,
  }

  return (
    <Header className={clsx(classes.header, isShowSearchFormItem ? 'active' : '')}>
      <div className={globalClasses.containerFluid}>
        <Row
          gutter={[token.size, token.size * 2]}
          justify={'space-between'}
          className={classes.rowHeader}
          style={{ height: 60 }}
        >
          <Col xs={10} md={4}>
            {drawer && (
              <div className={classes.toggleSidebarBtn}>
                <Button
                  type='text'
                  shape='default'
                  className={classes.btnToggle}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(settingAction.toggleSidebar())
                  }}
                />

                <div className={classes.logo}>
                  <h1 className={classes.brandName}>
                    <Link to={'/'}>
                      <img src={logo} alt='' />
                    </Link>
                  </h1>
                </div>

                <Button
                  type={'text'}
                  size={'large'}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  icon={<SearchOutlined style={{ fontSize: 22, color: token.colorPrimary }} />}
                  onClick={() => dispatch(settingAction.toggleSearchFormItem())}
                />
              </div>
            )}

            {!drawer && (
              <div className={classes.toggleSidebarBtn}>
                <Button
                  type='text'
                  shape='default'
                  className={classes.btnToggle}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(settingAction.toggleSidebar())
                  }}
                />
              </div>
            )}
          </Col>

          {isAuth && (
            <Col xs={12} md={16} className={globalClasses.fromTablet}>
              <MainMenu direction='horizontal' />
            </Col>
          )}

          <Col xs={14} md={isAuth ? 4 : 18}>
            {isAuth && (
              <div className={clsx(classes.userContainer)}>
                <Dropdown trigger={['click']} menu={menuAddProps} placement='bottomLeft' arrow>
                  <Button
                    className={clsx(classes.btnAddNew)}
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
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt='avatar'
                          className={classes.avatar}
                          width={32}
                          height={32}
                        />
                      ) : null}

                      {!user?.photoURL && <span>{`Hi,` + ' ' + user?.displayName + '!'}</span>}
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>
              </div>
            )}

            {!isAuth && (
              <div className={classes.userContainer}>
                <Button type='primary' onClick={() => navigate('/login')} style={{ minWidth: 100 }}>
                  Login
                </Button>

                <Button
                  type='default'
                  onClick={() => navigate('/register')}
                  style={{ minWidth: 100 }}
                >
                  Register
                </Button>
              </div>
            )}
          </Col>
        </Row>
      </div>
    </Header>
  )
}
