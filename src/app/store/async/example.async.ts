import { IExampleQuery } from "@/app/models/example.model"
import { exampleApi } from "@/app/services/api/example.api"
import { createAsyncThunk } from "@reduxjs/toolkit"


const fetchRandomExample = createAsyncThunk(
  'example/fetchRandomExample',
  async (query: Omit<IExampleQuery, 'keyword'>) => {
    const examples = await exampleApi.getRandomExamples(query)
    if (examples.isSuccess)
      return {
        ...examples,
        content: examples.content.map((example) => ({ ...example })),
      }
    return examples
  },
)

const fetchExamples = createAsyncThunk('example/fetchExamples', async (query: IExampleQuery) => {
  const response = await exampleApi.getExamples(query)
  return {
    ...response,
    content: {
      data: response.content.data.map((example) => ({ ...example })),
      paging: response.content.paging,
    },
  }
})

export const exampleAsync = {
  fetchRandomExample,
  fetchExamples,
}
