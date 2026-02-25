import globalStyles from '@/style/appStyle.module.scss'
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
import styles from './style.module.scss'
import clsx from 'clsx'
import { useExampleModal, useItemModal } from '@/helpers/hooks'
import { Header } from 'antd/es/layout/layout'
import { exampleAction } from '@/store/reducers/example.reducer'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'

export const AppHeader = () => {
  const { token } = theme.useToken()

  const { isAuth, user } = useSelector((state) => state.auth)
  const { drawer } = useSelector((state) => state.setting)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)

  const dispatch = useDispatch()
  const { logout } = useAuthLogout()

  const navigate = useNavigate()

  const { openItemModal } = useItemModal()
  const { openExampleModal } = useExampleModal()
  const { openArticleModal } = useArticleModal()

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    switch (e.key) {
      case 'profile':
        navigate('/profile')
        break

      case 'setting':
        navigate('/setting')
        break

      case 'logout':
        // Call complete logout (Firebase + auth state + redirect)
        await logout()
        // Clear Redux state
        dispatch(studySetAction.resetStudySet())
        dispatch(iotdAction.resetIotd())
        dispatch(exampleAction.reset())
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

    if (e.key === 'ADD_POST') {
      openArticleModal('add')
    }
  }

  const menuAddProps = {
    items: addNewType,
    onClick: handleAddMenuClick,
  }

  return (
    <Header className={clsx(styles.header, isShowSearchFormItem ? 'active' : '')}>
      <div className={globalStyles.containerFluid}>
        <Row
          gutter={[token.size, token.size * 2]}
          justify={'space-between'}
          className={styles.rowHeader}
          style={{ height: 60 }}
        >
          <Col xs={10} md={4}>
            {drawer && (
              <div className={styles.toggleSidebarBtn}>
                <Button
                  type='text'
                  shape='default'
                  className={styles.btnToggle}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(settingAction.toggleSidebar())
                  }}
                />

                <div className={styles.logo}>
                  <h1 className={styles.brandName}>
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
              <div className={styles.toggleSidebarBtn}>
                <Button
                  type='text'
                  shape='default'
                  className={styles.btnToggle}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(settingAction.toggleSidebar())
                  }}
                />
              </div>
            )}
          </Col>

          {isAuth && (
            <Col xs={12} md={16} className={globalStyles.fromTablet}>
              <MainMenu direction='horizontal' />
            </Col>
          )}

          <Col xs={14} md={isAuth ? 4 : 18}>
            {isAuth && (
              <div className={clsx(styles.userContainer)}>
                <Dropdown trigger={['click']} menu={menuAddProps} placement='bottomLeft' arrow>
                  <Button
                    className={clsx(styles.btnAddNew)}
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
                  <Button
                    type='text'
                    style={{ minWidth: 54, padding: 0 }}
                    onClick={(e) => e.preventDefault()}
                  >
                    <Space>
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt='avatar'
                          className={styles.avatar}
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
              <div className={styles.userContainer}>
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
