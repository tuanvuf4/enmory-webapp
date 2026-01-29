import { ECategory, IIotd } from '../models'

/**
 * Get today's date string in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Check if IOTD is from today
export const isIotdFromToday = (iotd: IIotd | null): boolean => {
  if (!iotd || !iotd.first_of_date) return false

  // Get current time
  const now = Date.now()

  // Calculate the end of the day when IOTD was created
  const iotdDate = new Date(iotd.first_of_date)
  const endOfIotdDay = new Date(
    iotdDate.getFullYear(),
    iotdDate.getMonth(),
    iotdDate.getDate(),
    23,
    59,
    59,
    999,
  ).getTime()

  // If current time is less than end of IOTD's day, it's still valid
  return now <= endOfIotdDay
}

// Helper to get IOTD from Redux by category
export const getIotdFromRedux = (state: any, catId: number): IIotd | null => {
  switch (catId) {
    case ECategory.WORD:
      return state.iotd.word

    case ECategory.PHRASE:
      return state.iotd.phrase

    case ECategory.IDIOM:
      return state.iotd.idiom

    case ECategory.SLANG:
      return state.iotd.slang

    case ECategory.COLLOCATION:
      return state.iotd.collocation

    case ECategory.SENTENCE:
      return state.iotd.sentence

    default:
      return null
  }
}
