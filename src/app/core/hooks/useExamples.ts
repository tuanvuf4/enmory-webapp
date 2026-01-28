import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { exampleApi } from '@/services/firebase/api/example.api'
import { IExample } from '@/models/item.model'
import { IExampleQuery } from '@/models/example.model'

// Query keys
export const exampleKeys = {
  all: ['examples'] as const,
  lists: () => [...exampleKeys.all, 'list'] as const,
  list: (params: IExampleQuery) => [...exampleKeys.lists(), params] as const,
  details: () => [...exampleKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...exampleKeys.details(), id] as const,
  random: () => [...exampleKeys.all, 'random'] as const,
  randomByItem: () => [...exampleKeys.random()] as const,
}

// Fetch examples with query
export const useExamples = (params: IExampleQuery) => {
  return useQuery({
    queryKey: exampleKeys.list(params),
    queryFn: async () => {
      const response = await exampleApi.getExamples(params)
      return response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch single example by ID
export const useExample = (id: string | number, enabled = true) => {
  return useQuery({
    queryKey: exampleKeys.detail(id),
    queryFn: async () => {
      const response = await exampleApi.getExampleById(id)
      return response.content
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch random examples
export const useRandomExamples = (params: Omit<IExampleQuery, 'keyword'>, enabled = true) => {
  return useQuery({
    queryKey: exampleKeys.randomByItem(),
    queryFn: async () => {
      const response = await exampleApi.getRandomExamples(params.page)
      return response.content
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

// Create example mutation
export const useCreateExample = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (example: IExample) => {
      const response = await exampleApi.createExample(example)
      return response.content
    },
    onSuccess: () => {
      // Invalidate all example lists to refetch
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: exampleKeys.random() })
    },
  })
}

// Update example mutation
export const useUpdateExample = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (example: Partial<IExample>) => {
      const response = await exampleApi.updateExample(example)
      return response.content
    },
    onSuccess: (updatedExample) => {
      // Invalidate lists and the specific detail
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: exampleKeys.random() })
      if (updatedExample?.id) {
        queryClient.invalidateQueries({ queryKey: exampleKeys.detail(updatedExample.id) })
      }
    },
  })
}

// Delete example mutation
export const useDeleteExample = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number | string) => {
      await exampleApi.deleteExample(Number(id))
      return id
    },
    onSuccess: (deletedId) => {
      // Invalidate lists and remove the detail from cache
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: exampleKeys.random() })
      queryClient.removeQueries({ queryKey: exampleKeys.detail(deletedId) })
    },
  })
}
