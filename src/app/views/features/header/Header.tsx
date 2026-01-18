import globalStyle from '@/style/appStyle'
import { MenuOutlined, SearchOutlined, PlusOutlined, DownOutlined } from '@ant-design/icons'
import { useSelector, useDispatch } from '@/core/hooks'
import { useAuthLogout } from '@/core/hooks/useAuthLogout'
import { configAction } from '@/store/reducers/config.reducer'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { mediaAction } from '@/store/reducers/media.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { theme, MenuProps, Layout, Row, Col, Button, Dropdown, Space } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import { MainMenu } from '../mainMenu/MainMenu'
import { items, addNewType } from './Menus'
import styles from './style'
import clsx from 'clsx'
import { FormSearchItem } from '../formSearchItem/FormSearchItem'

export const AppHeader = () => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const { isAuth, user } = useSelector((state) => state.auth)
  const { drawer } = useSelector((state) => state.config)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)

  const dispatch = useDispatch()
  const { logout } = useAuthLogout()

  const navigate = useNavigate()

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    switch (e.key) {
      case 'profile':
        navigate('/Profile')
        break

      case 'setting':
        navigate('/Setting')
        break

      case 'logout':
        // Clear Redux state before logout
        dispatch(studySetAction.resetStudySet())
        dispatch(iotdAction.resetIotd())
        dispatch(mediaAction.reset())
        // Call complete logout (Firebase + auth state + redirect)
        await logout()
        break

      default:
        break
    }
  }

  const menuProps = {
    items,
    onClick: handleMenuClick,
  }

  const handleAddMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'addItem') {
      dispatch(settingAction.toggleItemModal())
    }

    if (e.key === 'addEx') {
      dispatch(settingAction.toggleExModal())
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
          style={{ height: 60 }}
        >
          <Col xs={10} md={4}>
            {drawer && (
              <div className={classes.toogleSidebarBtn}>
                <Button
                  type='text'
                  shape='default'
                  className={classes.btnToggle}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(configAction.toggleSidebar())
                  }}
                />

                <div className={classes.logo}>
                  <h1 className={classes.brandName}>
                    <Link to={'/'}>
                      <img src={logo} alt='' />{' '}
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
                >
                  {/* <span style={{ fontWeight: '500' }}>Look</span> */}
                </Button>
              </div>
            )}

            {!drawer && (
              <div className={classes.toogleSidebarBtn}>
                <Button
                  type='text'
                  shape='default'
                  className={classes.btnToggle}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(configAction.toggleSidebar())
                  }}
                />
              </div>
            )}
          </Col>

          {isAuth && (
            <Col xs={12} md={16} className={gClasses.fromTablet}>
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
                      {`Hi,` + ' ' + user?.displayName + '!'}
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>
              </div>
            )}

            {!isAuth && (
              <div className={classes.userContainer}>
                {/* <Button onClick={() => googleLogin}>Sign in with Google 🚀 </Button> */}

                <Button type='primary' onClick={() => navigate('/Login')}>
                  Login
                </Button>

                <Button type='default' onClick={() => navigate('/Register')}>
                  Register
                </Button>
              </div>
            )}
          </Col>
        </Row>
      </div>

      {isShowSearchFormItem && (
        <div className={gClasses.stickyBar}>
          <div className={gClasses.container}>
            <FormSearchItem filter={false} submit={true} />
          </div>
        </div>
      )}
    </Layout.Header>
  )
}
