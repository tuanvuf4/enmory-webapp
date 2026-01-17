import { transformItemModelToClient } from '@/helpers/item'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { commonApi } from '@/services/firebase/api/common.api'
import { IIotdRequest } from '@/models/item.model'

const fetchCategories = createAsyncThunk('categories/fetchCategories', async () => {
  const cats = await commonApi.getCategories()
  if (cats.isSuccess)
    return {
      ...cats,
      content: cats.content.map((cat) => ({ ...cat, value: cat.id })),
    }
  return cats
})

const fetchTypes = createAsyncThunk('type/fetchTypes', async () => {
  const types = await commonApi.getTypes()
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

const fetchIotd = createAsyncThunk('iotd/fetchIotd', async (data: IIotdRequest) => {
  const iotd = await commonApi.getItemOfTheDayByCatId(data)
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
