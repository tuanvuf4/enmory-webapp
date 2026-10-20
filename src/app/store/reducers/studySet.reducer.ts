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
      state.list = state.list.map((item) => {
        if (String(item.id) !== String(action.payload.id)) return item
        return {
          ...item,
          ...action.payload,
          quiz: action.payload.quiz ? { ...item.quiz, ...action.payload.quiz } : item.quiz,
        }
      })
    },
    updateQuiz(
      state: IStudySet,
      action: PayloadAction<Partial<IQuiz<string | Partial<IOption<string, boolean>>[]>>>,
    ) {
      if (!state.list[state.status.currentIndex]) return
      state.list[state.status.currentIndex] = {
        ...state.list[state.status.currentIndex],
        quiz: {
          ...state.list[state.status.currentIndex].quiz,
          ...action.payload,
        },
      }
    },
    onSelectAnswer(state: IStudySet, action: PayloadAction<Partial<IOption<string, boolean>>>) {
      const currentItem = state.list[state.status.currentIndex]
      if (!currentItem?.quiz || !Array.isArray(currentItem.quiz.answer)) return

      currentItem.quiz.answer = currentItem.quiz.answer.map((item) => {
        if (String(item.id) === String(action.payload.id)) {
          return { ...item, ...action.payload, value: true }
        }
        return { ...item, value: false }
      })
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
