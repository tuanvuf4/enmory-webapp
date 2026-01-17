import { IExampleQuery } from '@/app/models/example.model'
import { apiFactory } from '@/app/services/api/apiFactory'
import { createAsyncThunk } from '@reduxjs/toolkit'

const fetchRandomExample = createAsyncThunk(
  'example/fetchRandomExample',
  async (query: Omit<IExampleQuery, 'keyword'>) => {
    const examples = await apiFactory.example.getRandomExamples(query)
    if (examples.isSuccess)
      return {
        ...examples,
        content: examples.content.map((example) => ({ ...example })),
      }
    return examples
  },
)

const fetchExamples = createAsyncThunk('example/fetchExamples', async (query: IExampleQuery) => {
  const response = await apiFactory.example.getExamples(query)
  return {
    ...response,
    content: response.content.map((example) => ({ ...example })),
  }
})

export const exampleAsync = {
  fetchRandomExample,
  fetchExamples,
}
