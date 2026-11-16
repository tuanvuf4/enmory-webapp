import { IItem, IExample, IMeaning } from '@/models/item.model'
import type { IItemRequestParams } from '@/services/firebase/api/item.api'
import type { IExampleQuery } from '@/models/example.model'
import type { IHttpResponse } from '@/models/http.model'
import { localDb } from './db'

export interface ILocalSearchResponse extends IHttpResponse<IItem[]> {
  isSuccess: boolean
  message: string
  content: IItem[]
  paging: {
    page: number
    size: number
    total: number
    totalPage: number
  }
  statusCode: number
}

/**
 * Strips HTML tags and normalizes special characters / whitespace for search comparisons.
 */
export const cleanSearchText = (text?: string): string => {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Removes Vietnamese diacritical marks (tone folding) for accent-insensitive search.
 * e.g., "Quả táo" -> "qua tao", "từ điển" -> "tu dien", "đỗ đại học" -> "do dai hoc"
 */
export const removeVietnameseTones = (str: string): string => {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/**
 * Normalizes text to NFC, strips HTML, trims, and converts to lowercase.
 */
export const normalizeSearchText = (str: string): string => {
  if (!str) return ''
  return cleanSearchText(str).normalize('NFC').toLowerCase().trim()
}

/**
 * Checks if a search keyword occurs at a unicode word boundary in the target text.
 */
export const isWordBoundaryMatch = (text: string, term: string): boolean => {
  if (!text || !term) return false
  try {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu')
    return regex.test(text)
  } catch {
    return text.includes(term)
  }
}

/**
 * Finds the most relevant meaning for an item given the search keyword,
 * prioritising matches in translation and definition.
 */
export const findBestMatchingMeaning = (item: IItem, keyword?: string): IMeaning | undefined => {
  const meanings = item.meanings || []
  if (meanings.length === 0) return undefined
  if (!keyword || !keyword.trim()) {
    return meanings.find((m) => m.common) || meanings[0]
  }

  const rawKw = cleanSearchText(keyword).toLowerCase()
  const foldedKw = removeVietnameseTones(rawKw)

  let bestM: IMeaning = meanings[0]
  let highestScore = -1

  for (const m of meanings) {
    let score = 0
    const transRaw = cleanSearchText(m.translation || '').toLowerCase()
    const transFolded = removeVietnameseTones(transRaw)
    const defRaw = cleanSearchText(m.definition || '').toLowerCase()
    const defFolded = removeVietnameseTones(defRaw)

    // Check translation
    if (transRaw === rawKw || transFolded === foldedKw) {
      score += 200
    } else if (transRaw.startsWith(rawKw) || transFolded.startsWith(foldedKw)) {
      score += 150
    } else if (isWordBoundaryMatch(transRaw, rawKw) || isWordBoundaryMatch(transFolded, foldedKw)) {
      score += 120
    } else if (transRaw.includes(rawKw) || transFolded.includes(foldedKw)) {
      score += 80
    }

    // Check definition
    if (defRaw === rawKw || defFolded === foldedKw) {
      score += 120
    } else if (defRaw.startsWith(rawKw) || defFolded.startsWith(foldedKw)) {
      score += 90
    } else if (isWordBoundaryMatch(defRaw, rawKw) || isWordBoundaryMatch(defFolded, foldedKw)) {
      score += 70
    } else if (defRaw.includes(rawKw) || defFolded.includes(foldedKw)) {
      score += 50
    }

    // Check collocations
    const collocRaw = cleanSearchText(m.collocations || '').toLowerCase()
    const collocFolded = removeVietnameseTones(collocRaw)
    if (collocRaw) {
      if (collocRaw === rawKw || collocFolded === foldedKw) {
        score += 100
      } else if (collocRaw.startsWith(rawKw) || collocFolded.startsWith(foldedKw)) {
        score += 80
      } else if (
        isWordBoundaryMatch(collocRaw, rawKw) ||
        isWordBoundaryMatch(collocFolded, foldedKw)
      ) {
        score += 60
      } else if (collocRaw.includes(rawKw) || collocFolded.includes(foldedKw)) {
        score += 40
      }
    }

    if (m.common) {
      score += 15
    }

    if (score > highestScore) {
      highestScore = score
      bestM = m
    }
  }

  return bestM
}

/**
 * Invalidate the search index cache (e.g. after database updates/sync)
 * Kept for backward compatibility.
 */
export const invalidateSearchIndex = () => {
  // No-op: search queries directly evaluate origin, translation, and definition
}

/**
 * Executes an optimized local search and filter query against IndexedDB.
 * Precision matching across origin, translation, definition, and collocations with Vietnamese tone-insensitivity.
 */
export const queryLocalItems = async (
  params: IItemRequestParams,
  uid?: string,
): Promise<ILocalSearchResponse> => {
  // 1. Fetch items for this user from local IndexedDB
  const allItems = await localDb.items.toArray()
  const rawItems = uid ? allItems.filter((item) => !item.uid || item.uid === uid) : allItems

  // 2. Keyword Search & Precision Ranking (Origin, Translation, Definition, Collocations)
  let candidateItems = rawItems
  const rawKeyword = (params.keyword || '').trim()

  if (rawKeyword) {
    const lowerKw = rawKeyword.toLowerCase()
    const foldedKw = removeVietnameseTones(lowerKw)

    if (params.exact) {
      candidateItems = rawItems.filter((item) => {
        const origLower = cleanSearchText(item.origin || '').toLowerCase()
        const origFolded = removeVietnameseTones(origLower)
        return origLower === lowerKw || origFolded === foldedKw
      })
    } else {
      const scoredItems: { item: IItem; score: number }[] = []

      for (const item of rawItems) {
        if (!item.id) continue

        const origRaw = cleanSearchText(item.origin || '')
        const origLower = origRaw.toLowerCase()
        const origFolded = removeVietnameseTones(origLower)

        let itemScore = 0
        let hasMatch = false
        let matchType: 'origin' | 'translation' | 'definition' | 'collocation' | 'none' = 'none'

        // A. Match against origin
        if (origLower === lowerKw) {
          itemScore += 2000
          hasMatch = true
          matchType = 'origin'
        } else if (origFolded === foldedKw) {
          itemScore += 1600
          hasMatch = true
          matchType = 'origin'
        } else if (origLower.startsWith(lowerKw)) {
          itemScore += 1000
          hasMatch = true
          matchType = 'origin'
        } else if (origFolded.startsWith(foldedKw)) {
          itemScore += 800
          hasMatch = true
          matchType = 'origin'
        } else if (isWordBoundaryMatch(origLower, lowerKw)) {
          itemScore += 600
          hasMatch = true
          matchType = 'origin'
        } else if (origLower.includes(lowerKw)) {
          itemScore += 400
          hasMatch = true
          matchType = 'origin'
        } else if (origFolded.includes(foldedKw)) {
          itemScore += 300
          hasMatch = true
          matchType = 'origin'
        }

        // B. Match against translations
        let bestTransScore = 0
        for (const m of item.meanings || []) {
          const transRaw = cleanSearchText(m.translation || '')
          if (!transRaw) continue
          const transLower = transRaw.toLowerCase()
          const transFolded = removeVietnameseTones(transLower)
          const segments = transLower
            .split(/[,;/+]+/)
            .map((s) => s.trim())
            .filter(Boolean)
          const segmentsFolded = transFolded
            .split(/[,;/+]+/)
            .map((s) => s.trim())
            .filter(Boolean)

          let mScore = 0
          if (transLower === lowerKw || segments.includes(lowerKw)) {
            mScore = 1200
          } else if (transFolded === foldedKw || segmentsFolded.includes(foldedKw)) {
            mScore = 1000
          } else if (
            transLower.startsWith(lowerKw) ||
            segments.some((s) => s.startsWith(lowerKw))
          ) {
            mScore = 750
          } else if (
            transFolded.startsWith(foldedKw) ||
            segmentsFolded.some((s) => s.startsWith(foldedKw))
          ) {
            mScore = 600
          } else if (
            isWordBoundaryMatch(transLower, lowerKw) ||
            segments.some((s) => isWordBoundaryMatch(s, lowerKw))
          ) {
            mScore = 500
          } else if (
            isWordBoundaryMatch(transFolded, foldedKw) ||
            segmentsFolded.some((s) => isWordBoundaryMatch(s, foldedKw))
          ) {
            mScore = 400
          } else if (transLower.includes(lowerKw)) {
            mScore = 300
          } else if (transFolded.includes(foldedKw)) {
            mScore = 220
          }

          if (m.common && mScore > 0) mScore += 25
          if (mScore > bestTransScore) bestTransScore = mScore
        }

        if (bestTransScore > 0) {
          itemScore += bestTransScore
          hasMatch = true
          if (matchType !== 'origin' || bestTransScore >= 1000) {
            matchType = 'translation'
          }
        }

        // C. Match against definitions
        let bestDefScore = 0
        for (const m of item.meanings || []) {
          const defRaw = cleanSearchText(m.definition || '')
          if (!defRaw) continue
          const defLower = defRaw.toLowerCase()
          const defFolded = removeVietnameseTones(defLower)

          let mScore = 0
          if (defLower === lowerKw) {
            mScore = 800
          } else if (defLower.startsWith(lowerKw)) {
            mScore = 550
          } else if (isWordBoundaryMatch(defLower, lowerKw)) {
            mScore = 350
          } else if (defLower.includes(lowerKw)) {
            mScore = 200
          } else if (defFolded.includes(foldedKw)) {
            mScore = 150
          }

          if (m.common && mScore > 0) mScore += 15
          if (mScore > bestDefScore) bestDefScore = mScore
        }

        if (bestDefScore > 0) {
          itemScore += bestDefScore
          hasMatch = true
          if (matchType === 'none') {
            matchType = 'definition'
          }
        }

        // D. Match against collocations (both item-level and meaning-level)
        let bestCollocScore = 0
        const rawCollocList: string[] = []

        if (Array.isArray(item.collocations)) {
          rawCollocList.push(...item.collocations)
        } else if (typeof item.collocations === 'string' && item.collocations) {
          rawCollocList.push(item.collocations)
        }

        for (const m of item.meanings || []) {
          if (m.collocations) {
            rawCollocList.push(m.collocations)
          }
        }

        for (const rawColloc of rawCollocList) {
          if (!rawColloc) continue
          // Separate list tags, line breaks, and punctuation into segments
          const normalized = String(rawColloc)
            .replace(/<\/li>/gi, ' | ')
            .replace(/<br\s*\/?>/gi, ' | ')
            .replace(/[\n\r]+/g, ' | ')
          const cleanColloc = cleanSearchText(normalized)
          if (!cleanColloc) continue

          const segments = cleanColloc
            .split(/[|;,]+/)
            .map((s) => s.trim())
            .filter(Boolean)

          for (const seg of segments) {
            const segLower = seg.toLowerCase()
            const segFolded = removeVietnameseTones(segLower)

            let cScore = 0
            if (segLower === lowerKw) {
              cScore = 750
            } else if (segFolded === foldedKw) {
              cScore = 650
            } else if (segLower.startsWith(lowerKw)) {
              cScore = 500
            } else if (segFolded.startsWith(foldedKw)) {
              cScore = 400
            } else if (isWordBoundaryMatch(segLower, lowerKw)) {
              cScore = 320
            } else if (isWordBoundaryMatch(segFolded, foldedKw)) {
              cScore = 250
            } else if (segLower.includes(lowerKw)) {
              cScore = 180
            } else if (segFolded.includes(foldedKw)) {
              cScore = 120
            }

            if (cScore > bestCollocScore) bestCollocScore = cScore
          }
        }

        if (bestCollocScore > 0) {
          itemScore += bestCollocScore
          hasMatch = true
          if (matchType === 'none') {
            matchType = 'collocation'
          }
        }

        // E. Proximity tie-breaker for origin matches
        if (matchType === 'origin' || origLower.includes(lowerKw)) {
          const lenDiff = Math.abs(origLower.length - lowerKw.length)
          itemScore += Math.max(0, 30 - lenDiff)
        }

        if (hasMatch) {
          scoredItems.push({ item, score: itemScore })
        }
      }

      scoredItems.sort((a, b) => b.score - a.score)
      candidateItems = scoredItems.map((si) => si.item)
    }
  }

  // 3. Apply structured filters (cat, archive, favorite, tags)
  let filtered = candidateItems

  if (params.cat && params.cat !== 0) {
    filtered = filtered.filter((item) => item.catId === params.cat)
  }

  if (params.archive) {
    filtered = filtered.filter((item) => !!item.archive)
  }

  if (params.favorite !== undefined && params.favorite) {
    filtered = filtered.filter((item) => !!item.favorite)
  }

  if (params.tags) {
    const rawTags = Array.isArray(params.tags) ? params.tags : [params.tags]
    const filterTags = rawTags
      .map((t) =>
        String(t || '')
          .replace(/^#+/, '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean)

    if (filterTags.length > 0) {
      filtered = filtered.filter((item) => {
        const rawItemTags = Array.isArray(item.tags)
          ? item.tags
          : typeof (item as any)?.tags === 'string'
            ? [(item as any).tags]
            : []
        const rawItemTagsLower = Array.isArray(item.tags_lowercase)
          ? item.tags_lowercase
          : typeof (item as any)?.tags_lowercase === 'string'
            ? [(item as any).tags_lowercase]
            : []

        const allItemTags = Array.from(new Set([...rawItemTags, ...rawItemTagsLower]))
          .map((t) =>
            String(t || '')
              .replace(/^#+/, '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean)

        return filterTags.some((ft) => allItemTags.includes(ft))
      })
    }
  }

  // 4. Default sort when no keyword search is active
  if (!rawKeyword) {
    const orderByField = params.orderBy || 'created_date'
    const isDesc = params.order !== 'ASC'

    filtered.sort((a: any, b: any) => {
      const valA = a[orderByField] ?? 0
      const valB = b[orderByField] ?? 0
      if (typeof valA === 'string' && typeof valB === 'string') {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB)
      }
      return isDesc ? (valB > valA ? 1 : -1) : valA > valB ? 1 : -1
    })
  }

  // 5. Pagination
  const total = filtered.length
  const size = params.size || 20
  const totalPage = Math.max(1, Math.ceil(total / size))
  const page = Math.min(params.page || 0, Math.max(0, totalPage - 1))

  const pagedItems = filtered.slice(page * size, (page + 1) * size)

  return {
    isSuccess: true,
    message: 'Items fetched from local database',
    content: pagedItems,
    paging: {
      page,
      size,
      total,
      totalPage,
    },
    statusCode: 200,
  }
}

/**
 * Extracts all embedded examples from local items in IndexedDB.
 */
export const extractAllLocalExamples = async (uid?: string): Promise<IExample[]> => {
  let query = localDb.items.toCollection()
  if (uid) {
    query = localDb.items.where('uid').equals(uid)
  }

  let items = await query.toArray()
  // Fallback to all local items if query by uid returned nothing
  if (items.length === 0 && uid) {
    items = await localDb.items.toArray()
  }
  const examplesMap = new Map<string, IExample>()

  for (const item of items) {
    for (const meaning of item.meanings || []) {
      for (const ex of (meaning.examples || []) as any[]) {
        if (ex && typeof ex === 'object' && ex.origin && ex.origin.trim()) {
          const key = ex.id || `${item.id || ''}_${ex.origin.trim()}`
          if (!examplesMap.has(key)) {
            examplesMap.set(key, {
              ...ex,
              id: ex.id || key,
              uid: ex.uid || item.uid,
              itemId: item.id,
              itemOrigin: item.origin,
              catId: item.catId,
            } as IExample)
          }
        }
      }
    }
  }

  return Array.from(examplesMap.values())
}

/**
 * Retrieves local examples by an array of IDs.
 */
export const getPinnedLocalExamples = async (
  pinnedIds: string[],
  uid?: string,
): Promise<IHttpResponse<IExample[]>> => {
  if (!pinnedIds || pinnedIds.length === 0) {
    return {
      isSuccess: true,
      message: 'No pinned IDs',
      content: [],
      statusCode: 200,
    }
  }

  const idSet = new Set(pinnedIds)
  const allExamples = await extractAllLocalExamples(uid)
  const pinnedExamples = allExamples.filter((ex) => ex.id && idSet.has(ex.id))

  return {
    isSuccess: true,
    message: 'Pinned examples fetched',
    content: pinnedExamples,
    statusCode: 200,
  }
}

/**
 * Executes an optimized local search and filter query for examples derived from items.
 * Supports Vietnamese accent-folding for both origin, translation, and item origin.
 */
export const queryLocalExamples = async (
  querySearch: IExampleQuery,
  uid?: string,
): Promise<IHttpResponse<IExample[]>> => {
  let examples = await extractAllLocalExamples(uid)

  if (querySearch.keyword && querySearch.keyword.trim()) {
    const kw = querySearch.keyword.trim().toLowerCase()
    const foldedKw = removeVietnameseTones(kw)

    examples = examples.filter((ex) => {
      const origLower = cleanSearchText(ex.origin || '').toLowerCase()
      const origFolded = removeVietnameseTones(origLower)
      const transLower = cleanSearchText(ex.translation || '').toLowerCase()
      const transFolded = removeVietnameseTones(transLower)
      const noteLower = cleanSearchText(ex.note || '').toLowerCase()
      const noteFolded = removeVietnameseTones(noteLower)
      const itemOrigLower = cleanSearchText(ex.itemOrigin || '').toLowerCase()
      const itemOrigFolded = removeVietnameseTones(itemOrigLower)

      return (
        origLower.includes(kw) ||
        origFolded.includes(foldedKw) ||
        transLower.includes(kw) ||
        transFolded.includes(foldedKw) ||
        noteLower.includes(kw) ||
        noteFolded.includes(foldedKw) ||
        itemOrigLower.includes(kw) ||
        itemOrigFolded.includes(foldedKw)
      )
    })
  }

  const orderByField = querySearch.orderBy || 'created_date'
  const isDesc = querySearch.order === 'DESC'

  examples.sort((a: any, b: any) => {
    const valA = a[orderByField] ?? 0
    const valB = b[orderByField] ?? 0
    if (typeof valA === 'string' && typeof valB === 'string') {
      return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB)
    }
    return isDesc ? (valB > valA ? 1 : -1) : valA > valB ? 1 : -1
  })

  const size = querySearch.size || 10
  const page = querySearch.page || 0
  const paged = examples.slice(page * size, (page + 1) * size)

  return {
    isSuccess: true,
    message: 'Examples fetched from local items',
    content: paged,
    paging: {
      page,
      size,
      total: examples.length,
      totalPage: Math.ceil(examples.length / size),
    },
    statusCode: 200,
  }
}

/**
 * Retrieves random examples derived from local items.
 */
export const getRandomLocalExamples = async (
  size: number,
  uid?: string,
): Promise<IHttpResponse<IExample[]>> => {
  const examples = await extractAllLocalExamples(uid)
  const shuffled = [...examples].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, size)

  return {
    isSuccess: true,
    message: 'Random examples fetched from local items',
    content: selected,
    statusCode: 200,
  }
}
