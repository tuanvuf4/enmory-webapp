import { IOption } from '@/app/models/item.model'
import { GetStudySetByCatId } from '@/app/models/studySet.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { createAsyncThunk } from '@reduxjs/toolkit'

const fetchStudySet = createAsyncThunk('item/fetchStudySet', async (size: GetStudySetByCatId[]) => {
  const response = await itemApi.getStudySet(size)
  return {
    ...response,
    content: response.content
      ? response.content.map((item) => {
          return {
            ...item,
            quiz: {
              ...item.quiz,
              answer:
                typeof item.quiz.answer === 'string'
                  ? item.quiz.answer
                  : (item.quiz.answer as IOption<string, boolean>[]).map((ans) => ({
                      ...ans,
                      value: false,
                    })),
              result: false,
            },
          }
        })
      : [],
  }
})

export const itemAsync = {
  fetchStudySet,
}
