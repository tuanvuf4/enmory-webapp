import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import { MainMenu } from '../mainMenu/MainMenu'
import { useSelector, useDispatch } from '@/core/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'
import { signOutUser } from '@/store/reducers/auth.reducer'
import { Avatar, Button, Divider, Flex, Tooltip, Typography, theme } from 'antd'
import {
  SyncOutlined,
  SunOutlined,
  MoonOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useManualSync } from '@/services/localDb'
import moment from 'moment'

export const SideBarMain: React.FC = () => {
  const { isSidebarOpened, drawer, themeMode } = useSelector((state) => state.setting)
  const { isAuth, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = theme.useToken()

  const { isSyncing, lastSyncTime, syncNow } = useManualSync()

  const isCollapsed = !drawer && !isSidebarOpened

  const handleLogout = async () => {
    await dispatch(signOutUser())
    navigate('/login')
  }

  // Lấy chữ cái đầu từ displayName hoặc email để làm avatar fallback
  const avatarChar = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U'

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      style={{ paddingTop: 8, paddingBottom: 8 }}
    >
      {/* ── Logo Section ── */}
      <Link
        to={'/'}
        className='flex items-center no-underline'
        style={{
          padding: isCollapsed ? '12px 0' : '12px 20px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          marginBottom: 4,
          transition: 'padding 0.2s ease',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: token.colorBgContainer,
            boxShadow: `0 1px 4px ${token.colorBorder}`,
          }}
        >
          <img src={logo} alt='Enmory' style={{ width: 28, height: 28, objectFit: 'contain' }} />
        </div>

        {!isCollapsed && (
          <Typography.Text
            strong
            style={{
              fontSize: 18,
              marginLeft: 10,
              letterSpacing: '-0.3px',
              color: token.colorText,
              fontStyle: 'italic',
            }}
          >
            Enmory
          </Typography.Text>
        )}
      </Link>

      {/* ── Navigation Menu ── */}
      <div className='flex-1 overflow-y-auto' style={{ overflowX: 'hidden' }}>
        <MainMenu direction='vertical' />
      </div>

      {/* ── Bottom Actions ── */}
      <div style={{ padding: isCollapsed ? '8px 6px' : '8px 12px' }}>
        <Divider style={{ margin: '0 0 10px 0', opacity: 0.5 }} />

        <Flex vertical gap={4} align={isCollapsed ? 'center' : 'stretch'}>
          {/* Sync Button */}
          {isAuth && (
            <Tooltip
              title={isCollapsed ? (isSyncing ? 'Syncing...' : 'Sync data') : ''}
              placement='right'
            >
              <Button
                type='text'
                icon={
                  isSyncing ? (
                    <SyncOutlined spin style={{ color: token.colorPrimary }} />
                  ) : lastSyncTime ? (
                    <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                  ) : (
                    <SyncOutlined style={{ color: token.colorPrimary }} />
                  )
                }
                onClick={() => syncNow(false)}
                loading={isSyncing}
                style={{
                  width: '100%',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: token.borderRadiusLG,
                  height: 36,
                  paddingInline: isCollapsed ? 0 : 12,
                  color: token.colorTextSecondary,
                  fontWeight: 400,
                }}
              >
                {!isCollapsed && (
                  <Flex vertical gap={0} align='flex-start' style={{ lineHeight: 1.2 }}>
                    <span style={{ fontSize: 13 }}>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
                    {lastSyncTime && (
                      <span style={{ fontSize: 10, color: token.colorTextQuaternary }}>
                        {moment(lastSyncTime).fromNow()}
                      </span>
                    )}
                  </Flex>
                )}
              </Button>
            </Tooltip>
          )}

          {/* Theme Toggle */}
          <Tooltip
            title={isCollapsed ? (themeMode === 'dark' ? 'Light mode' : 'Dark mode') : ''}
            placement='right'
          >
            <Button
              type='text'
              icon={
                themeMode === 'dark' ? (
                  <SunOutlined style={{ color: token.colorWarning, fontSize: 15 }} />
                ) : (
                  <MoonOutlined style={{ color: token.colorPrimary, fontSize: 15 }} />
                )
              }
              onClick={() => dispatch(settingAction.toggleTheme())}
              style={{
                width: '100%',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderRadius: token.borderRadiusLG,
                height: 36,
                paddingInline: isCollapsed ? 0 : 12,
                color: token.colorTextSecondary,
              }}
            >
              {!isCollapsed && (
                <span style={{ fontSize: 13 }}>
                  {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
                </span>
              )}
            </Button>
          </Tooltip>
        </Flex>

        {/* ── User Profile Card ── */}
        {isAuth && user && (
          <>
            <Divider style={{ margin: '10px 0', opacity: 0.5 }} />

            <Flex
              align='center'
              gap={isCollapsed ? 0 : 10}
              justify={isCollapsed ? 'center' : 'space-between'}
              style={{
                padding: isCollapsed ? '4px 0' : '6px 4px',
                borderRadius: token.borderRadiusLG,
                cursor: 'default',
              }}
            >
              <Flex align='center' gap={10} style={{ minWidth: 0, flex: 1 }}>
                <Tooltip
                  title={isCollapsed ? user.displayName || user.email || '' : ''}
                  placement='right'
                >
                  <Avatar
                    size={32}
                    src={user.photoURL}
                    style={{
                      backgroundColor: token.colorPrimary,
                      flexShrink: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'default',
                    }}
                    icon={!user.photoURL ? <UserOutlined /> : undefined}
                  >
                    {!user.photoURL ? avatarChar : undefined}
                  </Avatar>
                </Tooltip>

                {!isCollapsed && (
                  <Flex vertical gap={0} style={{ minWidth: 0, lineHeight: 1.3 }}>
                    <Typography.Text strong ellipsis style={{ fontSize: 13, maxWidth: 120 }}>
                      {user.displayName || 'User'}
                    </Typography.Text>
                    <Typography.Text
                      type='secondary'
                      ellipsis
                      style={{ fontSize: 11, maxWidth: 120 }}
                    >
                      {user.email}
                    </Typography.Text>
                  </Flex>
                )}
              </Flex>

              {!isCollapsed && (
                <Tooltip title='Sign out'>
                  <Button
                    type='text'
                    size='small'
                    icon={<LogoutOutlined style={{ fontSize: 13 }} />}
                    onClick={handleLogout}
                    style={{
                      flexShrink: 0,
                      color: token.colorTextTertiary,
                      padding: '0 6px',
                    }}
                  />
                </Tooltip>
              )}
            </Flex>
          </>
        )}
      </div>
    </div>
  )
}
