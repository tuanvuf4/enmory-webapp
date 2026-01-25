import { PropsWithChildren, useEffect } from 'react'
import { AppFooter } from '../footer/Footer'
import { AppHeader } from '../header/Header'
import { Drawer, Layout } from 'antd'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import styles from './style'
import { styleConfig } from '@/style/appStyle'
import { SideBarMain } from '../sideBar/SideBarMain'
import { settingAction } from '@/store/reducers/setting.reducer'
import { useNavigate } from 'react-router-dom'
import { LoadingBar } from '../loading/LoadingBar'
import Sider from 'antd/es/layout/Sider'
import { Content } from 'antd/es/layout/layout'
import { EViewPort } from '@/models/app.model'

export const AppLayout: React.FC<PropsWithChildren> = (props) => {
  const classes = styles()

  const { isSidebarOpened, drawer } = useSelector((state) => state.setting)
  const { isAuth } = useSelector((state) => state.auth)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const updateViewMode = (width: number) => {
    if (width < 768) {
      dispatch(settingAction.setViewPort(EViewPort.XS))
    }
    // if (width >= 576) {
    //   dispatch(settingAction.setViewPort(EViewPort.SM))
    // }
    if (width >= 768) {
      dispatch(settingAction.setViewPort(EViewPort.MD))
    }
    // if (width >= 992) {
    //   dispatch(settingAction.setViewPort(EViewPort.LG))
    // }
    // if (width >= 1200) {
    //   dispatch(settingAction.setViewPort(EViewPort.XL))
    // }
  }

  const initLayout = () => {
    updateViewMode(window.innerWidth)
  }

  useEffect(() => {
    window.addEventListener('load', () => updateViewMode(window.innerWidth))
    window.addEventListener('resize', () => updateViewMode(window.innerWidth))

    return () => {
      window.removeEventListener('resize', () => updateViewMode(window.innerWidth))
      window.removeEventListener('load', () => updateViewMode(window.innerWidth))
    }
  }, [window.innerWidth])

  useEffect(() => initLayout(), [])

  useEffect(() => {
    if (!isAuth) navigate('/login')
  }, [isAuth])

  return (
    <>
      <Layout className={classes.wrapper}>
        {!drawer && (
          <Sider
            width={styleConfig.sider.width}
            trigger={null}
            collapsible
            collapsed={!isSidebarOpened}
            className={classes.sider}
          >
            <SideBarMain />
          </Sider>
        )}

        {drawer && (
          <Drawer
            placement={'left'}
            width={styleConfig.sider.width}
            onClose={() => dispatch(settingAction.toggleSidebar())}
            open={isSidebarOpened}
            closable={false}
            destroyOnClose={true}
          >
            <SideBarMain />
          </Drawer>
        )}

        <Layout
          style={{
            paddingLeft: drawer ? 0 : isSidebarOpened ? styleConfig.sider.width : 80,
            overflow: 'hidden',
          }}
        >
          <AppHeader />

          <Content className={classes.contentStyle}>
            <div className={classes.main}>{props.children}</div>
          </Content>

          <AppFooter />
        </Layout>
      </Layout>

      {/* {active && <LoadingBar />} */}

      <LoadingBar />

      {isAuth && (
        <>
          {/* <FloatButton
            shape='circle'
            type='primary'
            style={{
              right: 30,
              bottom: 30,
              width: 50,
              height: 50,
            }}
            className={globalClasses.toSm}
            icon={
              <PlusOutlined
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                color={appTheme.token?.colorPrimary}
              />
            }
          /> */}

          {/* <FloatButton
            shape='circle'
            type='primary'
            style={{
              right: 30,
              bottom: 30,
              width: 50,
              height: 50,
            }}
            icon={
              <ArrowUpOutlined
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                color={appTheme.token?.colorPrimary}
              />
            }
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          /> */}
        </>
      )}
    </>
  )
}
