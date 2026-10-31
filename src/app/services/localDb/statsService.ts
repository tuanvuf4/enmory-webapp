import { localDb } from './db'
import { firebaseAuthService } from '@/services/firebase/authService'
import { IItem, ECategory, EType } from '@/models/item.model'
import { IHttpResponse } from '@/models/http.model'
import { getType } from '@/helpers/item'
import { tagApi } from '@/services/firebase/api/tag.api'

export interface IChartCategoryItem {
  id: number
  label: string
  data: number[]
}

export interface IOverviewItem {
  id: number
  label: string
  total: number
}

export interface ISummaryStats {
  totalItems: number
  activeItems: number
  archivedItems: number
  favoriteItems: number
  masteredItems: number
  masteredL5Items: number
  learningItems: number
  newItems: number
  masteryRate: number
  totalExamples: number
  itemsThisMonth: number
  itemsThisWeek: number
}

export interface IPartOfSpeechStat {
  typeId: number
  label: string
  abbr: string
  count: number
  percentage: number
}

export interface ITagStat {
  tag: string
  count: number
  percentage: number
}

export interface IMonthlyGrowthItem {
  monthKey: string
  label: string
  from: number
  to: number
  total: number
  byCategory: Record<number, number>
}

// Category definition helper
export const DEFAULT_CATEGORIES = [
  { id: ECategory.WORD, label: 'Word' },
  { id: ECategory.PHRASE, label: 'Phrase' },
  { id: ECategory.IDIOM, label: 'Idiom' },
  { id: ECategory.SLANG, label: 'Slang' },
  { id: ECategory.COLLOCATION, label: 'Collocation' },
  { id: ECategory.SENTENCE, label: 'Sentence' },
]

/**
 * Fetch non-deleted items from local Dexie database for current user,
 * with fallback to all non-deleted items if user uid is not set or not matched.
 */
export const getLocalItemsForStats = async (): Promise<IItem[]> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    const uid = currentUser?.uid

    let query = localDb.items.toCollection()
    if (uid) {
      query = localDb.items.where('uid').equals(uid)
    }

    let items = await query.toArray()

    // If no user is logged in (offline/demo mode) and query returned 0 items, check if any items exist locally
    if (items.length === 0 && !uid) {
      const anyItems = await localDb.items.toArray()
      if (anyItems.length > 0) {
        items = anyItems
      }
    }

    return items
  } catch (error) {
    console.error('Error querying local items for stats:', error)
    return []
  }
}

/**
 * Get overall summary stats (totals, mastery, favorites, active/archived, recent activity)
 */
export const getSummaryStats = async (): Promise<IHttpResponse<ISummaryStats>> => {
  try {
    const items = await getLocalItemsForStats()
    const now = Date.now()

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    const startOfWeek = now - 7 * 24 * 60 * 60 * 1000

    let totalExamples = 0
    for (const item of items) {
      for (const m of item.meanings || []) {
        totalExamples += (m.examples || []).length
      }
    }

    let activeItems = 0
    let archivedItems = 0
    let favoriteItems = 0
    let masteredItems = 0 // level >= 4
    let masteredL5Items = 0 // level === 5
    let learningItems = 0 // level 1..3
    let newItems = 0 // level === 0
    let itemsThisMonth = 0
    let itemsThisWeek = 0

    items.forEach((item) => {
      const isArchived = !!item.archive
      if (isArchived) {
        archivedItems++
      } else {
        activeItems++

        const lvl = typeof item.level === 'number' ? item.level : 0
        if (lvl >= 4) {
          masteredItems++
          if (lvl === 5) masteredL5Items++
        } else if (lvl >= 1) {
          learningItems++
        } else {
          newItems++
        }
      }

      if (item.favorite) {
        favoriteItems++
      }

      const created = item.created_date || 0
      if (created >= startOfMonth) {
        itemsThisMonth++
      }
      if (created >= startOfWeek) {
        itemsThisWeek++
      }
    })

    const totalItems = items.length
    const masteryRate = activeItems > 0 ? Math.round((masteredItems / activeItems) * 100) : 0

    return {
      isSuccess: true,
      message: 'Summary stats retrieved from local database',
      content: {
        totalItems,
        activeItems,
        archivedItems,
        favoriteItems,
        masteredItems,
        masteredL5Items,
        learningItems,
        newItems,
        masteryRate,
        totalExamples,
        itemsThisMonth,
        itemsThisWeek,
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error calculating summary stats:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to calculate summary stats',
      content: {
        totalItems: 0,
        activeItems: 0,
        archivedItems: 0,
        favoriteItems: 0,
        masteredItems: 0,
        masteredL5Items: 0,
        learningItems: 0,
        newItems: 0,
        masteryRate: 0,
        totalExamples: 0,
        itemsThisMonth: 0,
        itemsThisWeek: 0,
      },
      statusCode: 500,
    }
  }
}

/**
 * Get item count overview by category (enabled items only)
 */
export const getOverviewItems = async (): Promise<IHttpResponse<IOverviewItem[]>> => {
  try {
    const items = await getLocalItemsForStats()
    const overviewData = DEFAULT_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      total: 0,
    }))

    items.forEach((item) => {
      if (item.archive) return // Enabled items only

      const catIndex = overviewData.findIndex((c) => c.id === item.catId)
      if (catIndex !== -1) {
        overviewData[catIndex].total++
      }
    })

    return {
      isSuccess: true,
      message: 'Overview data retrieved from local database',
      content: overviewData,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error calculating overview items from localDb:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to calculate overview',
      content: DEFAULT_CATEGORIES.map((c) => ({ id: c.id, label: c.label, total: 0 })),
      statusCode: 500,
    }
  }
}

/**
 * Get items grouped by level (0-5) for each category (enabled items only)
 */
export const getItemsByLevel = async (): Promise<IHttpResponse<IChartCategoryItem[]>> => {
  try {
    const items = await getLocalItemsForStats()
    const chartData: IChartCategoryItem[] = DEFAULT_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      data: new Array(6).fill(0),
    }))

    items.forEach((item) => {
      if (item.archive) return // Enabled items only

      const catIndex = chartData.findIndex((c) => c.id === item.catId)
      if (catIndex !== -1) {
        const lvl = typeof item.level === 'number' ? Math.max(0, Math.min(5, item.level)) : 0
        chartData[catIndex].data[lvl]++
      }
    })

    return {
      isSuccess: true,
      message: 'Items by level retrieved from local database',
      content: chartData,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error calculating items by level from localDb:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to calculate items by level',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Get newly added items grouped by period (enabled items only)
 */
export const getNewAddedItemByPeriod = async (
  periods: Array<{ id: number; label: string; from: number; to: number }>,
): Promise<IHttpResponse<IChartCategoryItem[]>> => {
  try {
    const items = await getLocalItemsForStats()
    const chartData: IChartCategoryItem[] = DEFAULT_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      data: new Array(periods.length).fill(0),
    }))

    periods.forEach((period, periodIndex) => {
      items.forEach((item) => {
        if (item.archive) return // Enabled items only

        const itemDate = item.created_date || 0
        if (itemDate >= period.from && itemDate <= period.to) {
          const catIndex = chartData.findIndex((c) => c.id === item.catId)
          if (catIndex !== -1) {
            chartData[catIndex].data[periodIndex]++
          }
        }
      })
    })

    return {
      isSuccess: true,
      message: 'Period chart data retrieved from local database',
      content: chartData,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error calculating new added items by period from localDb:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to calculate items by period',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Get monthly growth trend over the last N months (individual consecutive months, not overlapping)
 */
export const getMonthlyGrowthStats = async (
  monthCount = 6,
): Promise<IHttpResponse<IMonthlyGrowthItem[]>> => {
  try {
    const items = await getLocalItemsForStats()
    const months: IMonthlyGrowthItem[] = []
    const now = new Date()

    for (let i = monthCount - 1; i >= 0; i--) {
      const year = now.getFullYear()
      const month = now.getMonth() - i
      const dStart = new Date(year, month, 1, 0, 0, 0, 0)
      const dEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)

      const monthName = dStart.toLocaleString('default', { month: 'short' })
      const yearShort = dStart.getFullYear().toString().slice(-2)

      months.push({
        monthKey: `${dStart.getFullYear()}-${dStart.getMonth() + 1}`,
        label: `${monthName} '${yearShort}`,
        from: dStart.getTime(),
        to: dEnd.getTime(),
        total: 0,
        byCategory: {
          [ECategory.WORD]: 0,
          [ECategory.PHRASE]: 0,
          [ECategory.IDIOM]: 0,
          [ECategory.SLANG]: 0,
          [ECategory.COLLOCATION]: 0,
          [ECategory.SENTENCE]: 0,
        },
      })
    }

    items.forEach((item) => {
      if (item.archive) return
      const created = item.created_date || 0
      for (const m of months) {
        if (created >= m.from && created <= m.to) {
          m.total++
          if (item.catId && m.byCategory[item.catId] !== undefined) {
            m.byCategory[item.catId]++
          }
          break
        }
      }
    })

    return {
      isSuccess: true,
      message: 'Monthly growth stats retrieved from local database',
      content: months,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error calculating monthly growth from localDb:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to calculate monthly growth',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Get Part of Speech (Noun, Verb, Adjective, etc.) breakdown from item meanings
 */
export const getPartOfSpeechStats = async (): Promise<IHttpResponse<IPartOfSpeechStat[]>> => {
  try {
    const items = await getLocalItemsForStats()
    const countMap: Record<number, number> = {}

    let totalMeanings = 0

    items.forEach((item) => {
      if (item.archive) return
      const meanings = item.meanings || []
      meanings.forEach((m) => {
        const typeId = m.typeId
        if (typeId && (typeId as any) !== EType.ALL) {
          countMap[typeId] = (countMap[typeId] || 0) + 1
          totalMeanings++
        }
      })
    })

    // Recognized types to show
    const typeList = [
      EType.NOUN,
      EType.VERB,
      EType.ADJECTIVE,
      EType.ADVERB,
      EType.PREPOSITION,
      EType.CONJUNCTION,
      EType.PRONOUN,
      EType.INTERJECTION,
    ]

    const stats: IPartOfSpeechStat[] = typeList
      .map((t) => {
        const typeInfo = getType(t)
        const count = countMap[t] || 0
        const percentage = totalMeanings > 0 ? Math.round((count / totalMeanings) * 100) : 0
        return {
          typeId: t,
          label: typeInfo.origin,
          abbr: typeInfo.abbr,
          count,
          percentage,
        }
      })
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)

    return {
      isSuccess: true,
      message: 'Part of speech stats retrieved from local database',
      content: stats,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error calculating part of speech stats from localDb:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to calculate part of speech stats',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Get top used tags across vocabulary items,
 * ONLY including tags that exist on Firestore DB.
 */
export const getTopTagsStats = async (limit = 8): Promise<IHttpResponse<ITagStat[]>> => {
  try {
    const user = firebaseAuthService.getCurrentUser()
    if (!user?.uid) {
      return {
        isSuccess: true,
        message: 'No authenticated user',
        content: [],
        statusCode: 200,
      }
    }

    // 1. Fetch tags that exist on Firestore DB
    let firestoreTags: Array<{ id?: string; value: string; value_lowercase: string }> = []

    try {
      const tagsRes = await tagApi.getTags('')
      if (tagsRes.isSuccess && tagsRes.content) {
        firestoreTags = tagsRes.content.map((t) => ({
          id: t.id,
          value: t.name || t.value || '',
          value_lowercase: (t.name || t.value || '').toLowerCase(),
        }))
      }
    } catch (tagErr) {
      console.warn('Failed to fetch tags from tagApi:', tagErr)
    }

    // If there are no tags in Firestore DB, return empty list
    if (firestoreTags.length === 0) {
      return {
        isSuccess: true,
        message: 'No tags found on Firestore DB',
        content: [],
        statusCode: 200,
      }
    }

    // Build map of valid tags that exist on Firestore DB (keyed by lowercase)
    const validTagsMap = new Map<string, { tag: string; count: number }>()
    firestoreTags.forEach((ft) => {
      const key = ft.value_lowercase || ft.value.toLowerCase()
      if (!validTagsMap.has(key)) {
        validTagsMap.set(key, { tag: ft.value, count: 0 })
      }
    })

    // 2. Count occurrences in local vocabulary items ONLY for tags that exist on Firestore DB
    const items = await getLocalItemsForStats()
    let totalTagOccurrences = 0

    items.forEach((item) => {
      const tags = item.tags || []
      // Deduplicate tags per item (case-insensitive) so an item isn't double-counted for the same tag
      const itemTagsLower = Array.from(
        new Set(tags.map((rawTag) => String(rawTag).trim().toLowerCase()).filter(Boolean)),
      )

      itemTagsLower.forEach((lowerTag) => {
        const target = validTagsMap.get(lowerTag)
        if (target) {
          target.count += 1
          totalTagOccurrences++
        }
      })
    })

    const sortedTags: ITagStat[] = Array.from(validTagsMap.values())
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((entry) => ({
        tag: entry.tag,
        count: entry.count,
        percentage:
          totalTagOccurrences > 0 ? Math.round((entry.count / totalTagOccurrences) * 100) : 0,
      }))

    return {
      isSuccess: true,
      message: 'Top tags retrieved successfully from Firestore DB tags',
      content: sortedTags,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error calculating top tags from Firestore tags and local items:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to calculate top tags',
      content: [],
      statusCode: 500,
    }
  }
}

export const statsService = {
  getLocalItemsForStats,
  getSummaryStats,
  getOverviewItems,
  getItemsByLevel,
  getNewAddedItemByPeriod,
  getMonthlyGrowthStats,
  getPartOfSpeechStats,
  getTopTagsStats,
}
