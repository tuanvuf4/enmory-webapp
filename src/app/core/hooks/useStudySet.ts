import { useQuery } from '@tanstack/react-query'
import { itemApi } from '@/services/firebase/api/item.api'
import { GetStudySetByCatId } from '@/models/studySet.model'
import { IOption } from '@/models/item.model'

// Query keys
export const studySetKeys = {
  all: ['studySet'] as const,
  list: (params: GetStudySetByCatId[]) => [...studySetKeys.all, 'list', params] as const,
}

// Fetch study set
export const useStudySet = (params: GetStudySetByCatId[]) => {
  return useQuery({
    queryKey: studySetKeys.list(params),
    queryFn: async () => {
      const response = await itemApi.getStudySet(params)
      if (!response.content || response.content.length === 0) {
        return []
      }
      return response.content.map((item) => {
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
    },
    enabled: false,
    staleTime: 0,
  })
}
