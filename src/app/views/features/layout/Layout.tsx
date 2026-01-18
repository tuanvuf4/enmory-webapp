import { PropsWithChildren, useEffect } from 'react'
import { AppFooter } from '../footer/Footer'
import { AppHeader } from '../header/Header'
import { Drawer, FloatButton, Layout } from 'antd'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { ArrowUpOutlined } from '@ant-design/icons'
import { appTheme } from '@/style/theme'
import styles from './style'
import { styleConfig } from '@/style/appStyle'
import { ItemModal } from '../modals/itemModal/ItemModal'
import { SideBarMain } from '../sideBar/SideBarMain'
import { ViewItemModal } from '../modals/viewItemModal/ViewItemModal'
import { Notification } from '../../components/notification/Notification'
import { configAction } from '@/store/reducers/config.reducer'
import { MediaUploadModal } from '../modals/mediaUploadModal/MediaUploadModal'
import { useLocation, useNavigate } from 'react-router-dom'
import { EViewPort } from '@/models/app.model'
import { FormProvider, useForm } from 'react-hook-form'
import { IItem } from '@/models/item.model'
import { initItem } from '../modals/itemModal/data'
import { ExampleModal } from '../modals/exampleModal/ExampleModal'
import { LoadingBar } from '../loading/LoadingBar'

export const AppLayout: React.FC<PropsWithChildren> = (props) => {
  const classes = styles()

  const { isShowViewItemModal, isShowItemModal, isShowExModal, isShowMediaUploadForm } =
    useSelector((state) => state.setting)
  const { isSidebarOpened, drawer } = useSelector((state) => state.config)
  const { isAuth } = useSelector((state) => state.auth)

  const dispatch = useDispatch()

  const location = useLocation()
  const navigate = useNavigate()

  const methods = useForm<IItem>({ defaultValues: initItem })

  const updateViewMode = (width: number) => {
    if (width < 576) {
      dispatch(configAction.setViewPort(EViewPort.XS))
    }
    if (width >= 576) {
      dispatch(configAction.setViewPort(EViewPort.SM))
    }
    if (width >= 768) {
      dispatch(configAction.setViewPort(EViewPort.MD))
    }
    if (width >= 992) {
      dispatch(configAction.setViewPort(EViewPort.LG))
    }
    if (width >= 1200) {
      dispatch(configAction.setViewPort(EViewPort.XL))
    }
  }

  // useEffect(() => {
  //   window.addEventListener('resize', () => updateViewMode(window.innerWidth))

  //   return () => {
  //     window.removeEventListener('resize', () => updateViewMode(window.innerWidth))
  //   }
  // }, [window.innerWidth])

  useEffect(() => {
    if (location.pathname === '/' && !isAuth) {
      navigate('/Login')
    }
  }, [location, isAuth])

  return (
    <>
      <Layout className={classes.wrapper}>
        {!drawer && (
          <Layout.Sider
            width={styleConfig.sider.width}
            trigger={null}
            collapsible
            collapsed={isSidebarOpened}
            className={classes.sider}
          >
            <SideBarMain />
          </Layout.Sider>
        )}

        {drawer && (
          <Drawer
            placement={'left'}
            width={styleConfig.sider.width}
            onClose={() => dispatch(configAction.toggleSidebar())}
            open={isSidebarOpened}
            closable={false}
            destroyOnClose={true}
          >
            <SideBarMain />
          </Drawer>
        )}

        <Layout style={{ paddingLeft: drawer ? 0 : styleConfig.sider.width }}>
          <AppHeader />

          <Layout.Content className={classes.contentStyle}>
            <div className={classes.main}>{props.children}</div>
          </Layout.Content>

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
            className={gClasses.toSm}
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
            onClick={() => dispatch(toggleItemModal())}
          /> */}

          <FloatButton
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
          />

          <Notification />

          {isShowItemModal && (
            <FormProvider {...methods}>
              <ItemModal />
            </FormProvider>
          )}

          {isShowExModal && <ExampleModal open={isShowExModal} />}

          {isShowViewItemModal && <ViewItemModal open={isShowViewItemModal} />}

          {isShowMediaUploadForm && <MediaUploadModal open={isShowMediaUploadForm} />}
        </>
      )}
    </>
  )
}
