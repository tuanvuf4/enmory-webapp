import { IItemQuiz, IQuiz, IOption } from '@/app/models/item.model'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface IStudySetStatus {
  currentIndex: number
  inProgress: boolean
  isDone: boolean
}

export interface IStudySet {
  status: IStudySetStatus
  list: IItemQuiz[]
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
    isSubmitAnswer(state: IStudySet, action: PayloadAction<boolean>) {
      state.isSubmit = action.payload
    },
    updateProgress(state: IStudySet, action: PayloadAction<Partial<IStudySetStatus>>) {
      state.status = {
        ...state.status,
        ...action.payload,
      }
    },
    update(state: IStudySet, action: PayloadAction<Partial<IItemQuiz>>) {
      state.list = state.list.map((item) =>
        item.id === action.payload.id ? { ...item, ...action.payload } : { ...item },
      )
    },
    updateQuiz(
      state: IStudySet,
      action: PayloadAction<Partial<IQuiz<string | Partial<IOption<string, boolean>>[]>>>,
    ) {
      state.list[state.status.currentIndex] = {
        ...state.list[state.status.currentIndex],
        quiz: {
          ...state.list[state.status.currentIndex].quiz,
          ...action.payload,
        },
      }
    },
    updateQuizAnswer(state: IStudySet) {
      state.list[state.status.currentIndex] = {
        ...state.list[state.status.currentIndex],
        quiz: {
          ...state.list[state.status.currentIndex].quiz,
          answer: [
            ...(
              state.list[state.status.currentIndex].quiz.answer as Partial<
                IOption<string, boolean>
              >[]
            ).map((item) => {
              if (item.id === 2673) {
                return {
                  ...item,
                  label: '<ul><li>tấm thảm</li><li>tấm thảm</li></ul>',
                }
              }
              return item
            }),
          ],
        },
      }
    },
    onSelectAnswer(state: IStudySet, action: PayloadAction<Partial<IOption<string, boolean>>>) {
      state.list[state.status.currentIndex] = {
        ...state.list[state.status.currentIndex],
        quiz: {
          ...state.list[state.status.currentIndex].quiz,
          answer: [
            ...(
              state.list[state.status.currentIndex].quiz.answer as Partial<
                IOption<string, boolean>
              >[]
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
    setList(state: IStudySet, action: PayloadAction<IItemQuiz[]>) {
      state.list = action.payload
    },
    resetStudySet() {
      return initialState
    },
  },
})

export const studySetAction = studySetReducer.actions
