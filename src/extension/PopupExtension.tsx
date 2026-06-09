import { EPageExt } from '@/models/app.model'
import { IExample, IItem } from '@/models/item.model'
import { initItem } from '@/views/features/modals/itemModal/data'
import { theme } from 'antd'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import styles from './style.module.scss'
import { ExampleForm, HeaderExtension, LoginForm, RegisterForm, LoadingBar } from '@/views/features'
import { ItemForm } from '@/views/features/modals/itemModal'
import { useAuthInit, useCategories, useDispatch, useSelector, useTypes } from '@/core/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'

export const PopupExtension = () => {
  const { token } = theme.useToken()

  const dispatch = useDispatch()

  // Auth state now comes from Redux. Firebase persists the session itself
  // (browserLocalPersistence) and redux-persist rehydrates the slice across popup reopens.
  const isAuth = useSelector((state) => state.auth.isAuth)

  // Bootstrap Firebase auth state on popup mount (mirrors the web App)
  useAuthInit()

  const [currentPage, setCurrentPage] = useState<EPageExt>(() =>
    isAuth ? EPageExt.ADD : EPageExt.LOGIN,
  )

  // Fetch categories/types via React Query and propagate to Redux so shared
  // forms (ItemForm, MeaningItemForm) can read them from state.setting.
  const { data: categories } = useCategories()
  const { data: types } = useTypes()

  useEffect(() => {
    if (categories) dispatch(settingAction.setCategories(categories))
  }, [categories, dispatch])

  useEffect(() => {
    if (types) dispatch(settingAction.setTypes(types))
  }, [types, dispatch])

  // React to login/logout: the page switches automatically based on auth state
  useEffect(() => {
    setCurrentPage((page) => {
      if (isAuth) {
        // After login, land on the quick-add page unless the user is already
        // on a different authenticated page.
        return page === EPageExt.LOGIN || page === EPageExt.REGISTER ? EPageExt.ADD : page
      }
      // After logout, fall back to the login screen.
      return EPageExt.LOGIN
    })
  }, [isAuth])

  const methods = useForm<IItem>({ defaultValues: initItem })

  const onPageChange = (page: EPageExt) => setCurrentPage(+page)

  const onSuccess = (data: IExample) => {
    console.log(`data: `, data)
  }

  return (
    <div className={styles.ext}>
      <HeaderExtension isAuth={isAuth} onPageChange={onPageChange} />

      {!isAuth && (
        <>
          {currentPage === EPageExt.LOGIN && (
            <div className={styles.loginForm}>
              <LoginForm showBanner={false} />
            </div>
          )}

          {currentPage === EPageExt.REGISTER && <RegisterForm showBanner={false} />}
        </>
      )}

      {isAuth && (
        <>
          {currentPage === EPageExt.ADD && (
            <div className={styles.cruForm}>
              <FormProvider {...methods}>
                <ItemForm item={initItem} />
              </FormProvider>
            </div>
          )}

          {currentPage === EPageExt.ADD_EX && (
            <div style={{ padding: (token.size / 4) * 3 }}>
              <h2 style={{ fontWeight: 'normal' }}>Add a Example</h2>
              <ExampleForm onSuccess={onSuccess} />
            </div>
          )}

          {/* {currentPage === EPageExt.SEARCH && <FormSearchItem filter={false} submit={false} />} */}
        </>
      )}

      <LoadingBar />
    </div>
  )
}
