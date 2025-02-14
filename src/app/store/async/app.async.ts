import { transformItemModelToClient } from '@/helpers/item'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { appApi } from '@/services/api'

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

const fetchIotd = createAsyncThunk(
  'iotd/fetchIotd',
  async (data: { catId: number; generate?: number }) => {
    const iotd = await appApi.getItemOfTheDayByCatId(data.catId, data.generate)
    return {
      ...iotd,
      content: {
        ...iotd.content,
        item: { ...transformItemModelToClient(iotd.content.item) },
      },
    }
  },
)

export const actionAsyncApp = {
  fetchCategories,
  fetchTypes,
  fetchIotd,
}
