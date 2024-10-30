import { useAppDispatch, useAppSelector } from "@/core/hooks"
import useErrorHandlerRequest from "@/core/hooks/axiosErrorHandleRequest"
import useHandleAuthRequest from "@/core/hooks/axiosHandleAuthRequest"
import { IHttpResponse } from "@/models/http.model"
import { ECategory, IPair } from "@/models/item.model"
import { actionAsyncApp } from "@/store/async/app.async"
import { actionAsyncUser } from "@/store/async/user"
import { AppLayout } from "@/views/features/layout/layout"
import { useEffect } from "react"
import { BrowserRouter } from "react-router-dom"
import { RouterElement } from "./router"

export const App = () => {
  const { isAuth } = useAppSelector((state) => state.auth)

  const dispatch = useAppDispatch()

  useErrorHandlerRequest()
  useHandleAuthRequest()

  const getCats = async (cats: IPair<string, ECategory>[]) => {
    cats.map(async (cat) => await dispatch(actionAsyncApp.fetchIotd(cat.id)))
  }

  useEffect(() => {
    if (isAuth) {
      dispatch(actionAsyncUser.getUserInfo())
      dispatch(actionAsyncApp.fetchTypes())
      dispatch(actionAsyncApp.fetchCategories()).then((response) => {
        const payload = response.payload as IHttpResponse<IPair<string, ECategory>[]>
        if (payload && payload.isSuccess) getCats(payload.content)
      })
    }
  }, [isAuth])

  return (
    <>
      <BrowserRouter data-testid='browser-router-element'>
        <AppLayout>
          <RouterElement />
        </AppLayout>
      </BrowserRouter>
    </>
  )
}
