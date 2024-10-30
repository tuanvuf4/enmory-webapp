import { createAsyncThunk } from '@reduxjs/toolkit'
import { transformItemModelToClient } from 'src/app/helpers/item'
import { IHttpResponse } from 'src/app/models/http.model'
import { IIotd } from 'src/app/models/item.model'
import { appApi } from 'src/app/services/api/app.api'

const fetchCategories = createAsyncThunk('categories/fetchCategories', async () => {
  const cats = await appApi.getCategories()
  if (cats.isSuccess)
    return {
      ...cats,
      content: cats.content.map((cat) => ({ ...cat, value: cat.id })),
    }
  return cats
})

const fetchTypes = createAsyncThunk('type/fetchTypes', async () => {
  const types = await appApi.getTypes()
  if (types.isSuccess)
    return {
      ...types,
      content: types.content.map((cat) => {
        return {
          ...cat,
          value: cat.id,
        }
      }),
    }
  return types
})

const fetchIotd = createAsyncThunk('iotd/fetchIotd', async (catId: number) => {
  const iotd = await appApi.getItemOfTheDayByCatId(catId)
  return {
    ...iotd,
    content: {
      ...iotd.content,
      item: { ...transformItemModelToClient(iotd.content.item) },
    },
  }
})

export const actionAsyncApp = {
  fetchCategories,
  fetchTypes,
  fetchIotd,
}
