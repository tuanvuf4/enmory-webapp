import { AppOrderQuery, AppOrderByQuery } from '@/models/app.model'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IItemQuiz, IAnswer, EQuiz } from '@/models/item.model'
import { GetStudySetByCatId } from '@/models/studySet.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
  limit,
  QueryConstraint,
  orderBy,
  documentId,
  startAt,
  endAt,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getCountFromServer,
} from 'firebase/firestore'
import { IExample } from '@/models/item.model'
import { toWildString } from '@/helpers/item'

export interface IItemRequestParams {
  keyword: string
  page: number
  size: number
  cat?: number
  archive?: boolean
  favorite?: boolean
  exact?: boolean
  order?: AppOrderQuery
  orderBy?: AppOrderByQuery
  lastDocId?: string // For cursor-based pagination
}

/**
 * Helper function to build Firestore query constraints
 */
const buildQueryConstraints = (params: IItemRequestParams): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []
  const currentUser = firebaseAuthService.getCurrentUser()

  // Filter by current user
  if (currentUser) {
    constraints.push(where('uid', '==', currentUser.uid))
  }

  // Filter by category (0 means ALL, so skip filter)
  if (params.cat) {
    constraints.push(where('catId', '==', params.cat))
  }

  // Filter by archive status
  if (params.archive) {
    constraints.push(where('archive', '==', params.archive))
  }

  // Filter by favorite status
  if (params.favorite) {
    constraints.push(where('favorite', '==', params.favorite))
  }

  // Filter by deleted status
  constraints.push(where('is_deleted', '==', false))

  const orderByField = params.orderBy || 'created_date'
  const orderDirection = params.order === 'DESC' ? 'desc' : 'asc'

  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()

    if (params.exact) {
      constraints.push(where('origin', '==', keyword))
      constraints.push(orderBy(orderByField, orderDirection))
    } else {
      constraints.push(orderBy('origin', 'asc'))
      constraints.push(startAt(keyword))
      constraints.push(endAt(keyword + '\uf8ff'))
    }
  } else {
    constraints.push(orderBy(orderByField, orderDirection))
  }

  return constraints
}

/**
 * Helper function to build Firestore query constraints for autocomplete
 * Autocomplete has simpler filtering - no exact keyword match, different ordering
 */
const buildQueryConstraintsForAutocomplete = (params: IItemRequestParams): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []
  const currentUser = firebaseAuthService.getCurrentUser()

  // Filter by current user
  if (currentUser) {
    constraints.push(where('uid', '==', currentUser.uid))
  }

  // Filter by deleted status
  constraints.push(where('is_deleted', '==', false))

  // For autocomplete, always order by 'origin' for better search results
  constraints.push(orderBy('origin', 'asc'))

  // Use startAt/endAt for keyword prefix search on 'origin' field
  // This works because we're ordering by 'origin' and can use range queries
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    constraints.push(startAt(keyword))
    constraints.push(endAt(keyword + '\uf8ff'))
  }

  return constraints
}

/**
 * Helper function to fetch examples by their IDs from the examples collection
 * Handles batch fetching since Firestore 'in' query supports up to 10 items at a time
 */
const getExamplesByIds = async (exampleIds: string[]): Promise<IExample[]> => {
  if (!exampleIds || exampleIds.length === 0) {
    return []
  }

  // Filter out any non-string values and ensure we have valid IDs
  const validIds = exampleIds.filter((id) => id && typeof id === 'string')

  if (validIds.length === 0) {
    return []
  }

  try {
    // Firestore 'in' query supports up to 10 items at a time
    const batchSize = 10
    const batches: string[][] = []

    for (let i = 0; i < validIds.length; i += batchSize) {
      batches.push(validIds.slice(i, i + batchSize))
    }

    const examplePromises = batches.map(async (batch) => {
      const examplesQuery = query(collection(db, 'examples'), where(documentId(), 'in', batch))
      const snapshot = await getDocs(examplesQuery)
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as IExample[]
    })

    const results = await Promise.all(examplePromises)
    return results.flat()
  } catch (error) {
    console.error('Error fetching examples:', error)
    return []
  }
}

/**
 * Get items with pagination
 */
const getItems = async (
  params: IItemRequestParams,
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
): Promise<IHttpResponse<IItem[]> & { lastDoc?: QueryDocumentSnapshot<DocumentData> }> => {
  try {
    let constraints = buildQueryConstraints(params)

    if (lastDoc && (!params.keyword || params.exact)) {
      constraints.push(startAfter(lastDoc))
    }

    // Add limit last
    constraints.push(limit(params.size + 1))

    const itemsQuery = query(collection(db, dbCollections.items), ...constraints)
    const snapshot = await getDocs(itemsQuery)

    // We fetched one extra to optimize pagination, slice to get actual page items
    const itemDocs = snapshot.docs.slice(0, params.size)

    // Process items and fetch examples
    const itemsPromises = itemDocs.map(async (doc) => {
      const itemData = doc.data()
      const meanings = itemData.meanings || []

      // Fetch examples for each meaning
      const meaningsWithExamples = await Promise.all(
        meanings.map(async (meaning: any) => {
          const exampleIds = meaning.examples || []

          if (!Array.isArray(exampleIds)) {
            console.warn('Example IDs is not an array:', exampleIds)
            return {
              ...meaning,
              examples: [],
            }
          }

          return {
            ...meaning,
            examples: await getExamplesByIds(exampleIds),
          }
        }),
      )

      return {
        ...itemData,
        id: doc.id,
        meanings: meaningsWithExamples,
      } as IItem
    })

    const items: IItem[] = await Promise.all(itemsPromises)

    // Get last document for next page cursor
    const newLastDoc = itemDocs.length > 0 ? itemDocs[itemDocs.length - 1] : undefined

    // Get total count using efficient count query (server-side)
    let total = 0
    try {
      const countConstraints = buildQueryConstraints(params)
      const countQuery = query(collection(db, dbCollections.items), ...countConstraints)
      const countSnapshot = await getCountFromServer(countQuery)
      total = countSnapshot.data().count
    } catch (error) {
      console.warn('Error getting total count:', error)
      // If count fails, continue without total count
    }

    return {
      isSuccess: true,
      message: 'Items fetched successfully',
      content: items,
      lastDoc: newLastDoc,
      paging: {
        page: params.page,
        size: params.size,
        total: total,
        totalPage: total > 0 ? Math.ceil(total / params.size) : 0,
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching items:', error)
    throw error
  }
}

/**
 * Get items for autocomplete
 */
const getItemAutoComplete = async (
  params: IItemRequestParams,
): Promise<IHttpResponse<IItem<string>[]>> => {
  try {
    const constraints = buildQueryConstraintsForAutocomplete(params)
    constraints.push(limit(params.size)) // Limit for autocomplete

    const itemsQuery = query(collection(db, dbCollections.items), ...constraints)
    const snapshot = await getDocs(itemsQuery)

    let items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as IItem<string>[]

    // Note: Keyword filtering is now done server-side via startAt/endAt
    // No need for additional client-side filtering

    return {
      isSuccess: true,
      message: 'Autocomplete items fetched successfully',
      content: items,
      paging: {
        page: 1,
        size: 20,
        total: items.length,
        totalPage: 1,
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching autocomplete items:', error)
    throw error
  }
}

/**
 * Get single item by ID
 */
const getItemById = async (itemId: string): Promise<IHttpResponse<IItem>> => {
  try {
    const itemDocRef = doc(db, dbCollections.items, itemId)
    const itemDoc = await getDoc(itemDocRef)

    if (!itemDoc.exists()) {
      return {
        isSuccess: false,
        message: 'Item not found',
        content: null,
        statusCode: 200,
      }
    }

    const itemData = itemDoc.data()
    const meanings = itemData.meanings || []

    // Fetch examples for each meaning
    const meaningsWithExamples = await Promise.all(
      meanings.map(async (meaning: any) => {
        const exampleIds = meaning.examples || []
        const examples = await getExamplesByIds(exampleIds)
        return {
          ...meaning,
          examples: examples,
        }
      }),
    )

    const item = {
      id: itemDoc.id,
      ...itemData,
      meanings: meaningsWithExamples,
    } as unknown as IItem

    return {
      isSuccess: true,
      message: 'Item fetched successfully',
      content: item,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching item:', error)
    throw error
  }
}

/**
 * Get study set items
 */
const getStudySet = async (
  studySets: GetStudySetByCatId[],
): Promise<IHttpResponse<IItemQuiz[]>> => {
  try {
    const allItems: IItem[] = []
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: [],
        statusCode: 401,
      }
    }

    if (!studySets || studySets.length === 0) {
      return {
        isSuccess: false,
        message: 'No study set parameters provided',
        content: [],
        statusCode: 400,
      }
    }

    const getItemsInCategory = async (catId: number, size: number): Promise<IItem[]> => {
      const constraints: QueryConstraint[] = [
        where('catId', '==', catId),
        where('uid', '==', currentUser.uid),
        where('is_deleted', '==', false),
        where('randomIndex', '>=', Math.random()),
        limit(size),
      ]

      const itemsQuery = query(collection(db, dbCollections.items), ...constraints)
      const snapshot = await getDocs(itemsQuery)

      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as IItem[]

      // Filter items that have meanings with definition or translation
      const itemsWithMeanings = items.filter((item) => {
        const meanings = item.meanings || []
        return meanings.some((meaning: any) => {
          return (
            (meaning.definition && meaning.definition.trim() !== '') ||
            (meaning.translation && meaning.translation.trim() !== '')
          )
        })
      })
      return await Promise.all(itemsWithMeanings)
    }

    // First, fetch all items for all categories
    for (const studySet of studySets) {
      const itemsWithMeanings = await getItemsInCategory(studySet.id, studySet.size)

      const requestedSize = studySet.size || 10
      const availableCount = itemsWithMeanings.length

      if (availableCount < requestedSize) {
        itemsWithMeanings.push(
          ...(await getItemsInCategory(studySet.id, requestedSize - availableCount)),
        )
        console.warn(
          `Category ${studySet.id}: Only ${availableCount} items available, but ${requestedSize} requested`,
        )
      }

      // Randomly select items from this category
      const selectedItems = itemsWithMeanings
        .sort(() => Math.random() - 0.5)
        .slice(0, requestedSize)

      allItems.push(...selectedItems)
    }

    // Fetch examples for all items
    const itemsWithExamples = await Promise.all(
      allItems.map(async (item) => {
        const meanings = item.meanings || []

        // Fetch examples for each meaning
        const meaningsWithExamples = await Promise.all(
          meanings.map(async (meaning: any) => {
            const exampleIds = meaning.examples || []

            // Check if exampleIds is actually an array of strings
            if (!Array.isArray(exampleIds)) {
              console.warn('Example IDs is not an array:', exampleIds)
              return {
                ...meaning,
                examples: [],
              }
            }

            const examples = await getExamplesByIds(exampleIds)
            return {
              ...meaning,
              examples: examples,
            }
          }),
        )

        return {
          ...item,
          meanings: meaningsWithExamples,
        }
      }),
    )

    // Generate quiz data for each item
    const itemsWithQuiz: IItemQuiz[] = itemsWithExamples.map((item) => {
      // Randomly decide quiz type (50% chance for each type)
      const useFillInBlank = item.catId !== 6 && Math.random() < 0.5

      // Get random meaning from meanings array
      const meanings = item.meanings || []
      const randomMeaningIndex =
        meanings.length > 0 ? Math.floor(Math.random() * meanings.length) : 0
      const selectedMeaning = meanings[randomMeaningIndex]

      // Get definition/translation from meaning
      const definition = selectedMeaning?.definition || selectedMeaning?.translation || ''

      // Get hint: if word (catId=1) show type, otherwise show category
      let hint = ''
      if (item.catId === 1) {
        // Word category - show type (NOUN, VERB, etc.)
        const typeLabels = [
          'ALL',
          'NOUN',
          'VERB',
          'ADJECTIVE',
          'ADVERB',
          'PREPOSITION',
          'CONJUNCTION',
          'PRONOUN',
          'ARTICLE',
          'DETERMINER',
          'INTERJECTION',
        ]
        hint = typeLabels[selectedMeaning?.typeId || 0] || ''
      } else {
        // Other categories - show category name
        const categoryLabels: Record<number, string> = {
          2: 'PHRASE',
          3: 'IDIOM',
          4: 'SLANG',
          5: 'COLLOCATION',
          6: 'SENTENCE',
        }
        hint = categoryLabels[item.catId || 0] || ''
      }

      // For fill in the blank
      if (useFillInBlank) {
        return {
          ...item,
          quiz: {
            title: definition,
            question: toWildString(item.origin || ''),
            answer: item.origin,
            type: EQuiz.FILL_IN_BLANK,
            hint: `(${hint.toLowerCase()})`,
            result: false,
          },
        } as unknown as IItemQuiz
      }

      // For multiple choice
      // Generate 3 random wrong answers from other items in the same category
      const wrongAnswers = allItems
        .filter((otherItem) => otherItem.id !== item.id && otherItem.catId === item.catId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)

      // Create answer options
      const answers: IAnswer<string, boolean>[] = [
        {
          id: item.id as string,
          label: item.origin,
          value: false,
          typeId: selectedMeaning?.typeId || 0,
          key: 'A',
        },
        ...wrongAnswers.map((wrongItem, index) => ({
          id: wrongItem.id as string,
          label: wrongItem.origin,
          value: false,
          typeId: wrongItem.meanings?.[0]?.typeId || 0,
          key: String.fromCharCode(66 + index), // B, C, D
        })),
      ]

      // Shuffle answers
      const shuffledAnswers = answers.sort(() => Math.random() - 0.5)

      return {
        ...item,
        quiz: {
          title: '',
          question: definition,
          answer: shuffledAnswers,
          type: EQuiz.MULTI_CHOICE,
          hint: `(${hint.toLowerCase()})`,
          result: false,
        },
      } as unknown as IItemQuiz
    })

    return {
      isSuccess: true,
      message: 'Study set fetched successfully',
      content: itemsWithQuiz,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching study set:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch study set',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Create a new item
 */
const createItem = async (item: IItem): Promise<IHttpResponse<IItem>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const now = Timestamp.now().toMillis()
    const newItem = {
      ...item,
      uid: currentUser.uid,
      created_date: now,
      last_update: now,
      is_deleted: false,
      randomIndex: Math.random(), // For efficient random queries
    }

    const itemsRef = collection(db, dbCollections.items)
    const docRef = await addDoc(itemsRef, newItem)

    return {
      isSuccess: true,
      message: 'Item created successfully',
      content: {
        id: docRef.id,
        ...newItem,
      } as unknown as IItem,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}

/**
 * Create multiple items (batch)
 */
const createItems = async (items: IItem[]): Promise<IHttpResponse<IItem>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const now = Timestamp.now().toMillis()
    const createdItems: IItem[] = []

    for (const item of items) {
      const newItem = {
        ...item,
        uid: currentUser.uid,
        created_date: now,
        last_update: now,
        is_deleted: false,
        randomIndex: Math.random(), // For efficient random queries
      }

      const itemsRef = collection(db, dbCollections.items)
      const docRef = await addDoc(itemsRef, newItem)

      createdItems.push({
        id: docRef.id,
        ...newItem,
      } as unknown as IItem)
    }

    return {
      isSuccess: true,
      message: 'Items created successfully',
      content: createdItems[0], // Return first item as per original API
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error creating items:', error)
    throw error
  }
}

/**
 * Update an existing item
 */
const updateItem = async (id: string, item: Partial<IItem>): Promise<IHttpResponse<IItem>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const itemDocRef = doc(db, dbCollections.items, id)
    const updateData = {
      ...item,
      last_update: Timestamp.now().toMillis(),
    }

    await updateDoc(itemDocRef, updateData)

    // Fetch updated item
    const updatedDoc = await getDoc(itemDocRef)
    const updatedItem = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as unknown as IItem

    return {
      isSuccess: true,
      message: 'Item updated successfully',
      content: updatedItem,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating item:', error)
    throw error
  }
}

/**
 * Delete an item (soft delete)
 */
const deleteItem = async (id: string): Promise<IHttpResponse<boolean>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const itemDocRef = doc(db, dbCollections.items, id)
    await updateDoc(itemDocRef, {
      is_deleted: true,
      deleted_date: Timestamp.now().toMillis(),
    })

    return {
      isSuccess: true,
      message: 'Item deleted successfully',
      content: true,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

/**
 * Get new added items by period for chart data
 * Groups items by category and time period
 */
const getNewAddedItemByPeriod = async (
  periods: Array<{ id: number; label: string; from: number; to: number }>,
): Promise<IHttpResponse<Array<{ id: number; label: string; data: number[] }>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Define all categories
    const categories = [
      { id: 1, label: 'Word' },
      { id: 2, label: 'Phrase' },
      { id: 3, label: 'Idiom' },
      { id: 4, label: 'Slang' },
      { id: 5, label: 'Collocation' },
      { id: 6, label: 'Sentence' },
    ]

    // Initialize result structure
    const chartData = categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      data: new Array(periods.length).fill(0),
    }))

    // Fetch all non-deleted items for the user
    const itemsRef = collection(db, dbCollections.items)
    const constraints: QueryConstraint[] = [
      where('uid', '==', currentUser.uid),
      where('is_deleted', '==', false),
    ]

    const q = query(itemsRef, ...constraints)
    const querySnapshot = await getDocs(q)

    // Get all items
    const allItems = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Process each period
    periods.forEach((period, periodIndex) => {
      // Filter items for this period
      const periodItems = allItems.filter((item: any) => {
        const itemDate = item.created_date || 0
        return (
          itemDate >= period.from && itemDate <= period.to && item.archive === false // Only count enabled items
        )
      })

      // Count by category
      periodItems.forEach((item: any) => {
        const catId = item.catId
        const categoryIndex = chartData.findIndex((cat) => cat.id === catId)
        if (categoryIndex !== -1) {
          chartData[categoryIndex].data[periodIndex]++
        }
      })
    })

    return {
      isSuccess: true,
      message: 'Chart data fetched successfully',
      content: chartData,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch chart data',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Get items grouped by level for progress chart
 * Returns count of items at each level (0-5) for each category
 */
const getItemsByLevel = async (): Promise<
  IHttpResponse<Array<{ id: number; label: string; data: number[] }>>
> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Define all categories
    const categories = [
      { id: 1, label: 'Word' },
      { id: 2, label: 'Phrase' },
      { id: 3, label: 'Idiom' },
      { id: 4, label: 'Slang' },
      { id: 5, label: 'Collocation' },
      { id: 6, label: 'Sentence' },
    ]

    // Initialize result structure - 6 levels (0-5)
    const chartData = categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      data: new Array(6).fill(0),
    }))

    // Fetch all non-deleted, enabled items for the user
    const itemsRef = collection(db, dbCollections.items)
    const constraints: QueryConstraint[] = [
      where('uid', '==', currentUser.uid),
      where('is_deleted', '==', false),
      where('archive', '==', false), // Only count enabled items
    ]

    const q = query(itemsRef, ...constraints)
    const querySnapshot = await getDocs(q)

    // Count items by category and level
    querySnapshot.docs.forEach((doc) => {
      const itemData = doc.data()
      const catId = itemData.catId
      const level = itemData.level || 0

      // Find the category in chartData
      const categoryIndex = chartData.findIndex((cat) => cat.id === catId)
      if (categoryIndex !== -1 && level >= 0 && level <= 5) {
        chartData[categoryIndex].data[level]++
      }
    })

    return {
      isSuccess: true,
      message: 'Progress chart data fetched successfully',
      content: chartData,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching progress chart data:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch progress chart data',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Get overview of items grouped by category
 * Returns count of items for each category
 */
const getOverviewItems = async (): Promise<
  IHttpResponse<Array<{ id: number; label: string; total: number }>>
> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Define all categories
    const categories = [
      { id: 1, label: 'Word' },
      { id: 2, label: 'Phrase' },
      { id: 3, label: 'Idiom' },
      { id: 4, label: 'Slang' },
      { id: 5, label: 'Collocation' },
      { id: 6, label: 'Sentence' },
    ]

    // Initialize result structure
    const overviewData = categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      total: 0,
    }))

    // Fetch all non-deleted, enabled items for the user
    const itemsRef = collection(db, dbCollections.items)
    const constraints: QueryConstraint[] = [
      where('uid', '==', currentUser.uid),
      where('is_deleted', '==', false),
      where('archive', '==', false), // Only count enabled items
    ]

    const q = query(itemsRef, ...constraints)
    const querySnapshot = await getDocs(q)

    // Count items by category
    querySnapshot.docs.forEach((doc) => {
      const itemData = doc.data()
      const catId = itemData.catId

      const categoryIndex = overviewData.findIndex((cat) => cat.id === catId)
      if (categoryIndex !== -1) {
        overviewData[categoryIndex].total++
      }
    })

    return {
      isSuccess: true,
      message: 'Overview data fetched successfully',
      content: overviewData,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching overview data:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch overview data',
      content: [],
      statusCode: 500,
    }
  }
}

export const itemApi = {
  getItems,
  getItemAutoComplete,
  getItemById,
  createItem,
  createItems,
  updateItem,
  deleteItem,
  getStudySet,
  getNewAddedItemByPeriod,
  getItemsByLevel,
  getOverviewItems,
}
