import { transformItemModelToClient } from '@/app/helpers/item'
import { IPair } from '@/app/models/item.model'
import { GetStudySetByCatId } from '@/app/models/studySet.model'
import { IItemRequestData } from '@/app/services/api/item.api'
import { apiFactory } from '@/app/services/api/apiFactory'
import { createAsyncThunk } from '@reduxjs/toolkit'

const fetchItems = createAsyncThunk('item/fetchItems', async (params: IItemRequestData) => {
  const response = await apiFactory.item.getItems({
    ...params,
    cat: params.cat && (params.cat as number) > 0 ? params.cat : '',
    type: params.type && (params.type as number) > 0 ? params.type : '',
  })

  return {
    ...response,
    content: response.content.map((item) => ({
      ...transformItemModelToClient(item),
    })),
  }
})

const fetchStudySet = createAsyncThunk('item/fetchStudySet', async (size: GetStudySetByCatId[]) => {
  const response = await apiFactory.item.getStudySet(size)
  return {
    ...response,
    content: response.content.map((item) => {
      return {
        ...transformItemModelToClient(item),
        quiz: {
          ...item.quiz,
          answer:
            typeof item.quiz.answer === 'string'
              ? item.quiz.answer
              : (item.quiz.answer as IPair<string, boolean>[]).map((ans) => ({
                  ...ans,
                  value: false,
                })),
          result: false,
        },
      }
    }),
  }
})

export const itemAsync = {
  fetchItems,
  fetchStudySet,
}
