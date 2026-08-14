import { createAsyncThunk } from '@reduxjs/toolkit'
import { commonApi } from '@/services/firebase/api/common.api'
import { tagApi } from '@/services/firebase/api/tag.api'
import { IIotdRequest } from '@/models/item.model'

const fetchCategories = createAsyncThunk('categories/fetchCategories', async () => {
  const cats = await commonApi.getCategories()
  if (cats.isSuccess)
    return {
      ...cats,
      content: cats.content?.map((cat) => ({ ...cat, value: cat.id })),
    }
  return cats
})

const fetchTypes = createAsyncThunk('type/fetchTypes', async () => {
  const types = await commonApi.getTypes()
  if (types.isSuccess)
    return {
      ...types,
      content: types.content?.map((cat) => {
        return {
          ...cat,
          value: cat.id,
        }
      }),
    }
  return types
})

const fetchTags = createAsyncThunk('tags/fetchTags', async () => {
  const tags = await tagApi.getTags('')
  if (tags.isSuccess) {
    return {
      ...tags,
      content:
        tags.content?.map((tag) => ({
          id: tag.id,
          label: tag.value,
          value: tag.value,
        })) || [],
    }
  }

  return {
    ...tags,
    content: [],
  }
})

const fetchIotd = createAsyncThunk('iotd/fetchIotd', async (data: IIotdRequest) => {
  const iotd = await commonApi.getIotdByCatId(data)
  return iotd
})

export const actionAsyncApp = {
  fetchCategories,
  fetchTypes,
  fetchTags,
  fetchIotd,
}
