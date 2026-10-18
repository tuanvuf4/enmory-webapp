import MiniSearch from 'minisearch'
import { IItem, IExample } from '@/models/item.model'
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

let cachedSearchIndex: MiniSearch<IItem> | null = null
let cachedIndexItemCount = 0

/**
 * Builds or retrieves the MiniSearch inverted index for the provided items.
 */
export const getOrBuildSearchIndex = (items: IItem[]): MiniSearch<IItem> => {
  if (cachedSearchIndex && cachedIndexItemCount === items.length) {
    return cachedSearchIndex
  }

  const miniSearch = new MiniSearch<IItem>({
    fields: ['origin', 'meaningsText', 'examplesText', 'tagsText', 'notesText'],
    storeFields: ['id'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { origin: 3, tagsText: 2 },
    },
    extractField: (document: IItem, fieldName: string) => {
      if (fieldName === 'meaningsText') {
        return (document.meanings || [])
          .map(
            (m) =>
              `${m.definition || ''} ${m.translation || ''} ${m.note || ''} ${m.collocations || ''} ${(m.synonyms || []).join(' ')}`,
          )
          .join(' ')
      }
      if (fieldName === 'examplesText') {
        const textParts: string[] = []
        for (const m of document.meanings || []) {
          for (const ex of (m.examples || []) as any[]) {
            if (typeof ex === 'string') {
              textParts.push(ex)
            } else if (ex && typeof ex === 'object') {
              textParts.push(`${ex.origin || ''} ${ex.translation || ''}`)
            }
          }
        }
        return textParts.join(' ')
      }
      if (fieldName === 'tagsText') {
        return (document.tags || []).join(' ')
      }
      if (fieldName === 'notesText') {
        return `${(document.forms || []).join(' ')} ${(document.word_family || []).join(' ')} ${(document.collocations || []).join(' ')}`
      }
      return (document as any)[fieldName] || ''
    },
  })

  const validItems = items.filter((item): item is IItem & { id: string } => !!item.id)
  miniSearch.addAll(validItems)

  cachedSearchIndex = miniSearch
  cachedIndexItemCount = items.length

  return miniSearch
}

/**
 * Invalidate the search index cache (e.g. after database updates/sync)
 */
export const invalidateSearchIndex = () => {
  cachedSearchIndex = null
  cachedIndexItemCount = 0
}

export const populateItemExamples = async (items: IItem[]): Promise<IItem[]> => {
  const exampleIdSet = new Set<string>()

  for (const item of items) {
    for (const meaning of item.meanings || []) {
      for (const example of (meaning.examples || []) as unknown[]) {
        if (typeof example === 'string' && example.trim()) {
          exampleIdSet.add(example)
        }
      }
    }
  }

  const exampleIds = Array.from(exampleIdSet)
  const foundExamples = await localDb.examples.bulkGet(exampleIds)
  const exampleMap = new Map<string, IExample>()
  foundExamples.forEach((example) => {
    if (example?.id) exampleMap.set(example.id, example)
  })

  return items.map((item) => {
    if (!item.meanings || item.meanings.length === 0) return item

    const populatedMeanings = item.meanings.map((meaning) => {
      if (!meaning.examples || meaning.examples.length === 0) return meaning
      const resolvedExamples = (meaning.examples as unknown[]).flatMap((example) => {
        if (typeof example === 'string') {
          const resolvedExample = exampleMap.get(example)
          return resolvedExample ? [resolvedExample] : []
        }
        return [example as IExample]
      })
      return { ...meaning, examples: resolvedExamples }
    })

    return { ...item, meanings: populatedMeanings }
  })
}

/**
 * Executes a dynamic local search and filter query against IndexedDB.
 */
export const queryLocalItems = async (
  params: IItemRequestParams,
  uid?: string,
): Promise<ILocalSearchResponse> => {
  // 1. Fetch all non-deleted items for this user
  let query = localDb.items.toCollection()
  if (uid) {
    query = localDb.items.where('uid').equals(uid)
  }

  const rawItems = await query.filter((item) => !item.is_deleted).toArray()

  // 2. Apply structured filters (cat, archive, favorite, tags)
  let filtered = rawItems

  if (params.cat && params.cat !== 0) {
    filtered = filtered.filter((item) => item.catId === params.cat)
  }

  if (params.archive !== undefined) {
    filtered = filtered.filter((item) => !!item.archive === params.archive)
  }

  if (params.favorite !== undefined && params.favorite) {
    filtered = filtered.filter((item) => !!item.favorite)
  }

  if (params.tags && params.tags.length > 0) {
    const filterTags = params.tags.map((t) => t.toLowerCase().trim()).filter(Boolean)
    if (filterTags.length > 0) {
      filtered = filtered.filter((item) => {
        const itemTags = item.tags_lowercase || (item.tags || []).map((t) => t.toLowerCase())
        return filterTags.some((ft) => itemTags.includes(ft))
      })
    }
  }

  // 3. Dynamic Keyword Search (Full-text + Substring + Typo-tolerant fuzzy)
  const keyword = params.keyword?.trim()

  if (keyword) {
    const lowerKeyword = keyword.toLowerCase()

    if (params.exact) {
      filtered = filtered.filter((item) => item.origin?.toLowerCase() === lowerKeyword)
    } else {
      // Build search index over the filtered candidates
      const index = getOrBuildSearchIndex(filtered)
      const miniSearchResults = index.search(keyword)

      const scoreMap = new Map<string, number>()
      miniSearchResults.forEach((res) => {
        scoreMap.set(res.id, res.score)
      })

      // Substring bonus: Check if origin or definition includes the substring
      filtered = filtered.filter((item) => {
        const originMatch = item.origin?.toLowerCase().includes(lowerKeyword)
        const meaningsMatch = item.meanings?.some(
          (m) =>
            m.definition?.toLowerCase().includes(lowerKeyword) ||
            m.translation?.toLowerCase().includes(lowerKeyword) ||
            m.note?.toLowerCase().includes(lowerKeyword),
        )
        const inMiniSearch = item.id && scoreMap.has(item.id)

        if (originMatch) {
          // Give significant bonus score for exact origin substring match
          scoreMap.set(item.id!, (scoreMap.get(item.id!) || 0) + 10)
        } else if (meaningsMatch) {
          scoreMap.set(item.id!, (scoreMap.get(item.id!) || 0) + 3)
        }

        return originMatch || meaningsMatch || inMiniSearch
      })

      // Sort by search relevance score
      filtered.sort((a, b) => {
        const scoreA = scoreMap.get(a.id!) || 0
        const scoreB = scoreMap.get(b.id!) || 0
        return scoreB - scoreA
      })
    }
  } else {
    // Sort by requested order when no keyword search is active
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

  // 4. Pagination
  const total = filtered.length
  const size = params.size || 20
  const totalPage = Math.max(1, Math.ceil(total / size))
  const page = Math.min(params.page || 0, Math.max(0, totalPage - 1))

  const pagedItems = filtered.slice(page * size, (page + 1) * size)
  const populatedItems = await populateItemExamples(pagedItems)

  return {
    isSuccess: true,
    message: 'Items fetched from local database',
    content: populatedItems,
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
 * Executes a dynamic local search and filter query against IndexedDB for examples.
 */
export const queryLocalExamples = async (
  querySearch: IExampleQuery,
  uid?: string,
): Promise<IHttpResponse<IExample[]>> => {
  let collection = localDb.examples.toCollection()
  if (uid) {
    collection = localDb.examples.where('uid').equals(uid)
  }

  let examples = await collection.toArray()

  if (querySearch.keyword && querySearch.keyword.trim()) {
    const kw = querySearch.keyword.trim().toLowerCase()
    examples = examples.filter(
      (ex) =>
        ex.origin?.toLowerCase().includes(kw) ||
        ex.translation?.toLowerCase().includes(kw) ||
        ex.note?.toLowerCase().includes(kw),
    )
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
    message: 'Examples fetched from local database',
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
 * Retrieves random examples from local database.
 */
export const getRandomLocalExamples = async (
  size: number,
  uid?: string,
): Promise<IHttpResponse<IExample[]>> => {
  let collection = localDb.examples.toCollection()
  if (uid) {
    collection = localDb.examples.where('uid').equals(uid)
  }

  const examples = await collection.toArray()
  const shuffled = [...examples].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, size)

  return {
    isSuccess: true,
    message: 'Random examples fetched from local database',
    content: selected,
    statusCode: 200,
  }
}
