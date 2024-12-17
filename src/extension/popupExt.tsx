import useErrorHandlerRequest from '@/core/hooks/axiosErrorHandleRequest'
import useHandleAuthRequest from '@/core/hooks/axiosHandleAuthRequest'
import { EPageExt } from '@/models/app.model'
import { IHttpResponse } from '@/models/http.model'
import { ECategory, EType, IExample, IItem, IPair } from '@/models/item.model'
import { ILoginResponse } from '@/models/user.model'
import { appApi } from '@/services/api'
import { ExampleForm } from '@/views/features/exampleOverview/exampleFormAdd'
import { HeaderExt } from '@/views/features/headerExt/header'
import { LoginForm } from '@/views/features/loginForm/loginForm'
import { initItem } from '@/views/features/modals/itemModal'
import { ItemFormExt } from '@/views/features/modals/itemModal/ItemFormExt'
import { RegisterForm } from '@/views/pages/registerForm/registerForm'
import { theme } from 'antd'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { chromeStorage } from './storageService'
import styles from './style'
import { LoadingBar } from '@/views/features/loading/loadingBar'

export const PopupExt = () => {
  const { token } = theme.useToken()

  const classes = styles()

  const [isLogin, setIsLogin] = useState<boolean>(true)
  const [cats, setCats] = useState<IPair<string, ECategory>[]>([])
  const [types, setTypes] = useState<IPair<string, EType>[]>([])
  const [currentPage, setCurrentPage] = useState<EPageExt>(EPageExt.ADD)

  const methods = useForm<IItem>({ defaultValues: initItem })

  useErrorHandlerRequest()
  useHandleAuthRequest()

  const onLogin = async ({ isSuccess, content }: IHttpResponse<ILoginResponse>) => {
    if (isSuccess) {
      // save auth info
      await chromeStorage.set(content)
      // set isAuth to storage
      await chromeStorage.set({ isAuth: true })
      setIsLogin(true)
      getStaticData()
      setCurrentPage(EPageExt.ADD)
    }
  }

  const getStaticData = async () => {
    let cats = (await chromeStorage.get(['cats'])).cats as IPair<string, ECategory>[]
    let types = (await chromeStorage.get(['types'])).types as IPair<string, EType>[]

    if (!cats) cats = (await appApi.getCategories()).content
    if (!types) types = (await appApi.getTypes()).content

    console.log(`cats: `, cats)
    console.log(`types: `, types)

    setCats(cats.map((cat) => ({ ...cat, value: cat.id })))
    setTypes(types.map((type) => ({ ...type, value: type.id })))
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
      <HeaderExt isAuth={isLogin} onPageChange={onPageChange} />

      {!isLogin && (
        <>
          {currentPage === EPageExt.LOGIN && (
            <div className={classes.loginForm}>
              <LoginForm onLogin={onLogin} showBanner={false} />
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
                <ItemFormExt categories={cats} types={types} />
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
