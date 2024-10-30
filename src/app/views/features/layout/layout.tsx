import { PropsWithChildren, useEffect } from 'react'
import { AppFooter } from '../footer/footer'
import { AppHeader } from '../header/header'
import { Drawer, FloatButton, Layout, theme } from 'antd'
import { useAppDispatch, useAppSelector } from 'src/app/core/hooks/redux'
import { ArrowUpOutlined } from '@ant-design/icons'
import { appTheme } from 'src/style/theme'
import styles from './style'
import gStyles, { appStyleConfig } from 'src/style/appStyle'
import { ItemModal } from '../modals/itemModal/itemModal'
import { SideBarMain } from '../sideBar/main/sideBarMain'
import { Loading } from '../loading/loading'
import { ViewItemModal } from '../modals/viewItemModal/viewItemModal'
import { DeleteItemModal } from '../modals/deleteItemModal/deleteItemModal'
import { Notification } from '../../components/notification/notification'
import { configAction } from 'src/app/store/reducers/config.reducer'
import { MediaUploadModal } from '../modals/mediaUploadModal/mediaUploadModal'
import { useLocation, useNavigate } from 'react-router-dom'
import { EViewPort } from 'src/app/models/app.model'
import { FormProvider, useForm } from 'react-hook-form'
import { IItem } from 'src/app/models/item.model'
import { initItem } from '../modals/itemModal'
import { ExModal } from '../modals/exModal/exModal'
import { DeleteExModal } from '../modals/deleteExModal/deleteExModal'
import { LoadingBar } from '../loading/loadingBar'
import { useAxiosLoader } from 'src/app/core/hooks/axiosHttpCounter'

export const AppLayout: React.FC<PropsWithChildren> = (props) => {
  const { token } = theme.useToken()
  const classes = styles(token)
  const gClasses = gStyles(token)

  const {
    isShowViewItemModal,
    isShowItemModal,
    isShowExModal,
    isShowDeleteExModal,
    isShowDeleteItemModal,
    isShowMediaUploadForm,
  } = useAppSelector((state) => state.setting)
  const { viewMode, isSidebarOpened, drawer } = useAppSelector((state) => state.config)
  const { isAuth } = useAppSelector((state) => state.auth)

  const dispatch = useAppDispatch()

  const location = useLocation()
  const navigate = useNavigate()

  const [active] = useAxiosLoader()

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
      navigate('/login')
    }
  }, [location, isAuth])

  return (
    <>
      <Layout className={classes.wrapper}>
        {!drawer && (
          <Layout.Sider
            width={appStyleConfig.sider.width}
            trigger={null}
            collapsible
            collapsed={isSidebarOpened}
            className={classes.sider}
          >
            <SideBarMain></SideBarMain>
          </Layout.Sider>
        )}

        {drawer && (
          <Drawer
            placement={'left'}
            width={appStyleConfig.sider.width}
            onClose={() => dispatch(configAction.toggleSidebar())}
            open={isSidebarOpened}
            closable={false}
            destroyOnClose={true}
          >
            <SideBarMain></SideBarMain>
          </Drawer>
        )}

        <Layout style={{ paddingLeft: drawer ? 0 : appStyleConfig.sider.width }}>
          <AppHeader></AppHeader>

          <Layout.Content className={classes.contentStyle}>
            <div className={classes.main}>{props.children}</div>
          </Layout.Content>

          <AppFooter></AppFooter>
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

          {isShowExModal && <ExModal open={isShowExModal} />}

          {isShowDeleteExModal && <DeleteExModal />}

          {isShowViewItemModal && <ViewItemModal open={isShowViewItemModal} />}

          {isShowDeleteItemModal && <DeleteItemModal />}

          {isShowMediaUploadForm && <MediaUploadModal open={isShowMediaUploadForm} />}
        </>
      )}
    </>
  )
}
