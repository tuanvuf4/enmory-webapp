import { IHttpResponse } from '@/app/models/http.model'
import { IItemQuiz, TQuiz, IQuiz, IPair } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { itemAsync } from '../async/item.async'

export interface IStudySetStatus {
  currentIndex: number
  inProgress: boolean
  isDone: boolean
}

export interface IStudySet {
  status: IStudySetStatus
  list: IItemQuiz<TQuiz, string[]>[]
  isSubmit: boolean
  respond: string | number | null
}

export const initialState: IStudySet = {
  status: {
    currentIndex: 0,
    inProgress: false,
    isDone: false,
  },
  list: [],
  isSubmit: false,
  respond: null,
}

export const studySetReducer = createSlice({
  name: 'studySet',
  initialState,
  reducers: {
    setCurrentIndex(state: IStudySet, action: PayloadAction<number>) {
      state.status.currentIndex = action.payload
    },
    onSubmitAnswer(state: IStudySet, action: PayloadAction<boolean>) {
      state.isSubmit = action.payload
    },
    updateProgress(state: IStudySet, action: PayloadAction<Partial<IStudySetStatus>>) {
      state.status = {
        ...state.status,
        ...action.payload,
      }
    },
    update(state: IStudySet, action: PayloadAction<Partial<IItemQuiz<TQuiz, string[]>>>) {
      const map = state.list.map((item) =>
        item.id === action.payload.id ? { ...item, ...action.payload } : { ...item },
      )
      state.list = map
    },
    updateQuiz(state: IStudySet, action: PayloadAction<Partial<IQuiz<string>>>) {
      state.list[state.status.currentIndex] = {
        ...state.list[state.status.currentIndex],
        quiz: {
          ...state.list[state.status.currentIndex].quiz,
          ...action.payload,
        },
      }
    },
    onSelectAnswer(state: IStudySet, action: PayloadAction<Partial<IPair<string, boolean>>>) {
      state.list[state.status.currentIndex] = {
        ...state.list[state.status.currentIndex],
        quiz: {
          ...state.list[state.status.currentIndex].quiz,
          answer: [
            ...(
              state.list[state.status.currentIndex].quiz.answer as Partial<IPair<string, boolean>>[]
            ).map((item) => {
              if (item.id === action.payload.id) {
                return { ...action.payload }
              }
              return { ...item, value: false }
            }),
          ],
        },
      }
    },
    updateUserRespond(state: IStudySet, action: PayloadAction<string | number | null>) {
      state.respond = action.payload
    },
    resetStudySet() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        itemAsync.fetchStudySet.fulfilled,
        (state: IStudySet, action: PayloadAction<IHttpResponse<IItemQuiz<TQuiz, string[]>[]>>) => {
          state.list = action.payload.content
        },
      )
      .addCase(itemAsync.fetchStudySet.rejected, (state: IStudySet) => {
        state.list = []
      })
  },
})

export const studySetAction = studySetReducer.actions
