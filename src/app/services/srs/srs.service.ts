import { IItem, EQuiz } from '@/models/item.model'
import { localDb } from '@/services/localDb'
import { hasValidMeaning } from '@/helpers/item'

/**
 * Spaced Repetition System (SRS) intervals based on Leitner / SuperMemo model:
 * Level 0: 0 days (New or Relearning - due immediately)
 * Level 1: 1 day (Review after 24 hours)
 * Level 2: 3 days
 * Level 3: 7 days (1 week)
 * Level 4: 14 days (2 weeks)
 * Level 5: 30 days (Mastered / 1 month)
 */
export const SRS_INTERVALS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
}

const ONE_DAY_MS = 86400000 // 24 * 60 * 60 * 1000

export interface ISRSUpdateResult {
  nextLevel: number
  intervalDays: number
  nextReviewDate: number
  lastReviewed: number
  levelChanged: number
}

export interface IDueStats {
  totalDue: number
  byCategory: Record<number, number>
  byLevel: Record<number, number>
  overdueCount: number
  dueTodayCount: number
}

/**
 * Calculates or retrieves the exact timestamp when an item is scheduled for review.
 * For legacy items without `next_review_date`, derives the review time from `level` and `last_update`/`created_date`.
 */
export const getNextReviewDate = (item: IItem): number => {
  if (typeof item.next_review_date === 'number' && item.next_review_date > 0) {
    return item.next_review_date
  }

  const level = typeof item.level === 'number' ? Math.max(0, Math.min(5, item.level)) : 0
  const intervalDays = SRS_INTERVALS[level] ?? 0
  const baseTime = item.last_update || item.created_date || 0

  return baseTime + intervalDays * ONE_DAY_MS
}

/**
 * Checks whether an item is currently due for review.
 * Items that are archived or deleted are never due.
 */
export const isItemDue = (item: IItem, now = Date.now()): boolean => {
  if (item.archive || !hasValidMeaning(item)) {
    return false
  }

  const reviewTime = getNextReviewDate(item)
  return reviewTime <= now
}

/**
 * Returns human-friendly text describing when an item is due or overdue.
 */
export const getDueDurationText = (item: IItem, now = Date.now()): string => {
  if (item.archive) return 'Archived'

  const reviewTime = getNextReviewDate(item)
  const diffMs = reviewTime - now

  if (diffMs <= 0) {
    const overdueDays = Math.floor(Math.abs(diffMs) / ONE_DAY_MS)
    if (overdueDays === 0) {
      return 'Cần ôn hôm nay'
    }
    return `Quá hạn ${overdueDays} ngày`
  }

  const dueInDays = Math.ceil(diffMs / ONE_DAY_MS)
  if (dueInDays === 1) {
    return 'Ngày mai'
  }
  return `Sau ${dueInDays} ngày`
}

/**
 * Calculates new SRS level, interval days, and next review date following a quiz answer.
 */
export const calculateSRSUpdate = (
  currentLevel: number,
  isCorrect: boolean,
  quizType?: EQuiz,
): ISRSUpdateResult => {
  const safeCurrentLevel =
    typeof currentLevel === 'number' ? Math.max(0, Math.min(5, currentLevel)) : 0
  const now = Date.now()

  if (isCorrect) {
    const nextLevel = Math.min(5, safeCurrentLevel + 1)
    const intervalDays = SRS_INTERVALS[nextLevel] ?? 1
    const nextReviewDate = now + intervalDays * ONE_DAY_MS

    return {
      nextLevel,
      intervalDays,
      nextReviewDate,
      lastReviewed: now,
      levelChanged: nextLevel - safeCurrentLevel,
    }
  }

  // When incorrect:
  // For Fill-In-The-Blank (spelling fail), reset to Level 0
  // For Multiple-Choice, drop by 1 level
  const nextLevel = quizType === EQuiz.FILL_IN_BLANK ? 0 : Math.max(0, safeCurrentLevel - 1)
  const intervalDays = 0
  const nextReviewDate = now // Due immediately

  return {
    nextLevel,
    intervalDays,
    nextReviewDate,
    lastReviewed: now,
    levelChanged: nextLevel - safeCurrentLevel,
  }
}

/**
 * Calculates aggregated due statistics for a set of items.
 */
export const getDueStats = (items: IItem[], now = Date.now()): IDueStats => {
  const byCategory: Record<number, number> = {}
  const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let totalDue = 0
  let overdueCount = 0
  let dueTodayCount = 0

  for (const item of items) {
    if (isItemDue(item, now)) {
      totalDue++
      const catId = item.catId ?? 0
      byCategory[catId] = (byCategory[catId] || 0) + 1

      const lvl = typeof item.level === 'number' ? Math.max(0, Math.min(5, item.level)) : 0
      byLevel[lvl] = (byLevel[lvl] || 0) + 1

      const reviewTime = getNextReviewDate(item)
      const diffMs = now - reviewTime
      if (diffMs > ONE_DAY_MS) {
        overdueCount++
      } else {
        dueTodayCount++
      }
    }
  }

  return {
    totalDue,
    byCategory,
    byLevel,
    overdueCount,
    dueTodayCount,
  }
}

/**
 * Loads all items due for review from the local database for a given user.
 * Sorted by priority:
 * 1. Lower levels first (Level 0 and 1 are high priority)
 * 2. Oldest review date first (overdue items first)
 */
export const getDueItemsFromLocalDb = async (uid?: string): Promise<IItem[]> => {
  if (!uid) return []

  const allItems = await localDb.items.toArray()
  const userItems = allItems.filter(
    (item) => item.uid === uid && !item.archive && hasValidMeaning(item),
  )

  const dueItems = userItems.filter((item) => isItemDue(item))

  return dueItems.sort((a, b) => {
    const levelDiff = (a.level || 0) - (b.level || 0)
    if (levelDiff !== 0) return levelDiff

    const aTime = getNextReviewDate(a)
    const bTime = getNextReviewDate(b)
    return aTime - bTime
  })
}
