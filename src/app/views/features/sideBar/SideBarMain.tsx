import React from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import { MainMenu } from '../mainMenu/MainMenu'
import { useSelector, useDispatch } from '@/core/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Button, Flex, Typography, theme } from 'antd'
import { SyncOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons'
import { useManualSync } from '@/services/localDb'
import moment from 'moment'

export const SideBarMain: React.FC = () => {
  const { isSidebarOpened, drawer, themeMode } = useSelector((state) => state.setting)
  const { isAuth } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const { token } = theme.useToken()

  const { isSyncing, lastSyncTime, syncNow } = useManualSync()

  const isCollapsed = !drawer && !isSidebarOpened

  return (
    <div className='h-full flex flex-col justify-between overflow-hidden py-4'>
      <div className='flex-1 overflow-y-auto'>
        <div className='capitalize italic text-[32px]'>
          <Link to={'/'} className='flex items-center justify-center p-4'>
            <img src={logo} alt='' className='w-[70px]' />
            {drawer && <span className='ml-4'>Enmory</span>}

            {isSidebarOpened && !drawer && <span className='ml-4'>Enmory</span>}
          </Link>
        </div>

        <MainMenu direction='vertical' />
      </div>

      <Flex
        vertical
        align='center'
        justify='center'
        gap={token.sizeXS}
        style={{
          padding: isCollapsed ? '12px 8px' : '16px',
        }}
      >
        {isAuth && (
          <div>
            <Button
              block={!isCollapsed}
              type='default'
              icon={<SyncOutlined spin={isSyncing} style={{ color: token.colorPrimary }} />}
              loading={isSyncing}
              onClick={() => syncNow(false)}
              style={{
                width: '100%',
              }}
            >
              {!isCollapsed && (isSyncing ? 'Syncing...' : 'Quick Sync')}
            </Button>

            {!isCollapsed && lastSyncTime && (
              <Typography.Text
                type='secondary'
                style={{
                  fontSize: 11,
                  textAlign: 'center',
                  display: 'block',
                  marginTop: 4,
                }}
              >
                Last synced: {moment(lastSyncTime).fromNow()}
              </Typography.Text>
            )}
          </div>
        )}

        <Button
          type='text'
          icon={
            themeMode === 'dark' ? (
              <SunOutlined style={{ color: token.colorWarning, fontSize: 16 }} />
            ) : (
              <MoonOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
            )
          }
          onClick={() => dispatch(settingAction.toggleTheme())}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        />
      </Flex>
    </div>
  )
}
