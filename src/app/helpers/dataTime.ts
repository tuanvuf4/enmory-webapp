import { ECategory, IIotd } from '../models'

/**
 * Get today's date string in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Check if IOTD is from today
export const isIotdFromToday = (
  iotd: IIotd<string[]> | null,
  todayStart: number,
  todayEnd: number,
): boolean => {
  if (!iotd || !iotd.first_of_date) return false
  return iotd.first_of_date >= todayStart && iotd.first_of_date <= todayEnd
}

// Helper to get IOTD from Redux by category
export const getIotdFromRedux = (state: any, catId: number): IIotd<string[]> | null => {
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
