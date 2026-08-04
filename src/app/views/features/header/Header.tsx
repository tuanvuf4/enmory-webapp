import appStyle from '@/style/appStyle.module.scss'
import {
  MenuOutlined,
  SearchOutlined,
  PlusOutlined,
  DownOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons'
import { useSelector, useDispatch } from '@/core/hooks'
import { useAuthLogout } from '@/core/hooks/useAuthLogout'
import { settingAction } from '@/store/reducers/setting.reducer'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { theme, MenuProps, Row, Col, Button, Dropdown, Space, Layout } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import { MainMenu } from '../mainMenu/MainMenu'
import { menu, addNewType } from './Menu'
import { useExampleModal, useItemModal } from '@/helpers/hooks'
import { exampleAction } from '@/store/reducers/example.reducer'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'
import { Toolbar } from '../toolbar'
import { CSSProperties } from 'react'
import { initExampleData } from '@/constant/example'

interface IAppHeader {
  styles?: CSSProperties
}

export const AppHeader = ({ styles: customStyles }: IAppHeader) => {
  const { token } = theme.useToken()

  const { isAuth, user } = useSelector((state) => state.auth)
  const { drawer, isShowSearchFormItem, themeMode } = useSelector((state) => state.setting)

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
      openExampleModal('add', initExampleData)
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
    <Layout.Header
      style={{
        ...customStyles,
        height: isShowSearchFormItem ? 'auto' : 60,
        minHeight: 60,
        minWidth: 320,
        width: '100%',
        lineHeight: '60px',
        borderBottom: `1px solid ${token.colorBorder}`,
        zIndex: 999,
        backdropFilter: 'blur(24px)',
      }}
      className='sticky top-0 left-0 w-full !p-0'
    >
      <div className={appStyle.containerFluid}>
        <Row
          gutter={[token.size, token.size * 2]}
          justify={'space-between'}
          style={{
            margin: `0 -${token.size}px`,
            minHeight: 60,
          }}
        >
          <Col xs={10} md={4}>
            {drawer && (
              <div className='h-full flex items-center justify-start gap-2'>
                <Button
                  type='text'
                  shape='default'
                  style={{
                    minWidth: 38,
                    paddingInlineStart: token.size * 0.5,
                    paddingInlineEnd: token.size * 0.5,
                  }}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(settingAction.toggleSidebar())
                  }}
                />

                <div className='capitalize italic'>
                  <h1 className='m-0 not-italic flex items-center justify-center'>
                    <Link to={'/'}>
                      <img src={logo} alt='' className='block w-10' />
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
              <div className='h-full flex items-center justify-start gap-2'>
                <Button
                  type='text'
                  shape='default'
                  style={{
                    minWidth: 38,
                    paddingInlineStart: token.size * 0.5,
                    paddingInlineEnd: token.size * 0.5,
                  }}
                  icon={<MenuOutlined style={{ color: token.colorTextBase }} />}
                  onClick={() => {
                    dispatch(settingAction.toggleSidebar())
                  }}
                />
              </div>
            )}
          </Col>

          {isAuth && (
            <Col xs={12} md={16} className={appStyle.fromTablet}>
              <MainMenu direction='horizontal' />
            </Col>
          )}

          <Col xs={14} md={isAuth ? 4 : 18}>
            {isAuth && (
              <div
                className='flex items-center justify-end h-full'
                style={{
                  gap: token.size,
                }}
              >
                <Button
                  type='text'
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 36,
                    borderRadius: '50%',
                    color: themeMode === 'dark' ? token.colorWarning : token.colorPrimary,
                  }}
                  icon={
                    themeMode === 'dark' ? (
                      <SunOutlined style={{ fontSize: 18 }} />
                    ) : (
                      <MoonOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                    )
                  }
                  onClick={() => dispatch(settingAction.toggleTheme())}
                />

                <Dropdown trigger={['click']} menu={menuAddProps} placement='bottomLeft' arrow>
                  <Button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
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
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
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
              <div
                className='flex items-center justify-end h-full'
                style={{
                  gap: token.size,
                }}
              >
                <Button
                  type='text'
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 36,
                    borderRadius: '50%',
                    color: themeMode === 'dark' ? token.colorWarning : token.colorPrimary,
                  }}
                  icon={
                    themeMode === 'dark' ? (
                      <SunOutlined style={{ fontSize: 18 }} />
                    ) : (
                      <MoonOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                    )
                  }
                  onClick={() => dispatch(settingAction.toggleTheme())}
                />

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

        {isAuth && <Toolbar pagination={undefined} />}
      </div>
    </Layout.Header>
  )
}
