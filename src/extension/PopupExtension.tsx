import { EPageExt } from '@/models/app.model'
import { IExample, IItem } from '@/models/item.model'
import { IUser } from '@/models/user.model'
import { initItem } from '@/views/features/modals/itemModal/data'
import { theme } from 'antd'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { chromeStorage } from './storageService'
import styles from './style'
import { ExampleForm, HeaderExtension, LoginForm, RegisterForm, LoadingBar } from '@/views/features'
import { ItemForm } from '@/views/features/modals/itemModal'
import { useCategories, useTypes } from '@/core/hooks'

export const PopupExtension = () => {
  const { token } = theme.useToken()

  const classes = styles()

  const [isLogin, setIsLogin] = useState<boolean>(true)

  const [currentPage, setCurrentPage] = useState<EPageExt>(EPageExt.ADD)

  useCategories()
  useTypes()

  const methods = useForm<IItem>({ defaultValues: initItem })

  // Removed axios interceptors - not needed since using Firebase SDK directly

  const onLogin = async (uid: IUser) => {
    // save auth info
    await chromeStorage.set(uid)
    // set isAuth to storage
    await chromeStorage.set({ isAuth: true })
    setIsLogin(true)
    getStaticData()
    setCurrentPage(EPageExt.ADD)
  }

  const getStaticData = async () => {
    // let cats = (await chromeStorage.get(['cats'])).cats as IOption<string, ECategory>[]
    // let types = (await chromeStorage.get(['types'])).types as IOption<string, EType>[]
    // if (!cats) cats = (await commonApi.getCategories()).content
    // if (!types) types = (await commonApi.getTypes()).content
    // setCats(cats.map((cat) => ({ ...cat, value: cat.id })))
    // setTypes(types.map((type) => ({ ...type, value: type.id })))
  }

  const onPageChange = async (page: EPageExt) => {
    setCurrentPage(+page)
    if (page === EPageExt.LOGIN || page === EPageExt.REGISTER) {
      await chromeStorage.set({ isAuth: false })
      setIsLogin(false)
    }
  }

  const onSuccess = (data: IExample) => {
    console.log(`data: `, data)
  }

  useEffect(() => {
    const checkLogin = async () => {
      const loggedIn = (await chromeStorage.get(['isAuth'])).isAuth
      setIsLogin(loggedIn)
      await getStaticData()
    }

    checkLogin()
  }, [])

  return (
    <div className={classes.ext}>
      <HeaderExtension isAuth={isLogin} onPageChange={onPageChange} />

      {!isLogin && (
        <>
          {currentPage === EPageExt.LOGIN && (
            <div className={classes.loginForm}>
              <LoginForm onLoginSuccess={onLogin} showBanner={false} />
            </div>
          )}

          {currentPage === EPageExt.REGISTER && <RegisterForm showBanner={false} />}
        </>
      )}

      {isLogin && (
        <>
          {currentPage === EPageExt.ADD && (
            <div className={classes.cruForm}>
              <FormProvider {...methods}>
                <ItemForm item={initItem} mode={'add'} />
              </FormProvider>
            </div>
          )}

          {currentPage === EPageExt.ADD_EX && (
            <div style={{ padding: (token.size / 4) * 3 }}>
              <h2 style={{ fontWeight: 'normal' }}>Add a Example</h2>
              <ExampleForm themeMode={'light'} onSuccess={onSuccess} />
            </div>
          )}

          {/* {currentPage === EPageExt.SEARCH && <FormSearchItem filter={false} submit={false} />} */}
        </>
      )}

      <LoadingBar />
    </div>
  )
}
