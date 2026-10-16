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
  addDoc,
  updateDoc,
  Timestamp,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { IExample } from '@/models/item.model'
import { toWildString } from '@/helpers/item'
import { commonApi } from './common.api'
import { categories, types } from '@/constant/index'
import { shuffleArray } from '@/helpers/mics'
import {
  localDb,
  queryLocalItems,
  invalidateSearchIndex,
  populateItemExamples,
} from '@/services/localDb'

export interface IItemRequestParams {
  keyword: string
  tags?: string[]
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

const normalizeTags = (tags: string[] = []) => {
  const cleanTags = tags.map((tag) => tag.trim()).filter(Boolean)
  return Array.from(new Set(cleanTags))
}

const normalizeLowercaseTags = (tags: string[] = []) => {
  const normalized = normalizeTags(tags).map((tag) => tag.toLowerCase())
  return Array.from(new Set(normalized))
}

/**
 * Helper function to fetch examples by their IDs from the local database
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
    const examples = await localDb.examples.where('id').anyOf(validIds).toArray()
    return examples.filter((ex: any) => !ex.is_deleted)
  } catch (error) {
    console.error('Error fetching examples from localDb:', error)
    return []
  }
}

/**
 * Get items with pagination
 */
const getItems = async (
  params: IItemRequestParams,
  _lastDoc?: QueryDocumentSnapshot<DocumentData>,
): Promise<IHttpResponse<IItem[]> & { lastDoc?: QueryDocumentSnapshot<DocumentData> }> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser?.uid) {
      return {
        isSuccess: true,
        message: 'No authenticated user',
        content: [],
        paging: {
          page: params.page || 0,
          size: params.size || 20,
          total: 0,
          totalPage: 1,
        },
        statusCode: 200,
      }
    }

    return await queryLocalItems(params, currentUser.uid)
  } catch (error) {
    console.error('Error fetching items:', error)
    throw error
  }
}

/**
 * Get items for autocomplete
 */
const getItemAutoComplete = async (params: IItemRequestParams): Promise<IHttpResponse<IItem[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser?.uid) {
      return {
        isSuccess: true,
        message: 'No authenticated user',
        content: [],
        paging: { page: 0, size: params.size || 10, total: 0, totalPage: 1 },
        statusCode: 200,
      }
    }

    // Strict local-only: query from localDb
    const localResult = await queryLocalItems(params, currentUser.uid)
    return {
      isSuccess: true,
      message: 'Autocomplete items fetched from local database',
      content: localResult.content,
      paging: localResult.paging,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching autocomplete items from localDb:', error)
    throw error
  }
}

/**
 * Get single item by ID
 */
const getItemById = async (id: string): Promise<IHttpResponse<IItem>> => {
  try {
    if (!id) {
      return {
        isSuccess: false,
        message: 'Invalid item ID',
        content: null,
        statusCode: 400,
      }
    }

    const localItem = await localDb.items.get(id)
    if (localItem && !localItem.is_deleted) {
      const [populated] = await populateItemExamples([localItem])
      return {
        isSuccess: true,
        message: 'Item fetched from local database',
        content: populated,
        statusCode: 200,
      }
    }

    return {
      isSuccess: false,
      message: 'Item not found in local database',
      content: null,
      statusCode: 404,
    }
  } catch (error) {
    console.error('Error fetching item from localDb:', error)
    throw error
  }
}

const getEligibleItemsInCategory = async (catId: number): Promise<IItem[]> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    const allLocalItems = await localDb.items.where('catId').equals(catId).toArray()

    const userItems = allLocalItems.filter(
      (item) =>
        !item.is_deleted && (!currentUser?.uid || !item.uid || item.uid === currentUser.uid),
    )

    return userItems.filter((item) => {
      const meanings = item.meanings || []
      return meanings.some((meaning: any) => {
        return (
          (meaning.definition && meaning.definition.trim() !== '') ||
          (meaning.translation && meaning.translation.trim() !== '')
        )
      })
    })
  } catch (err) {
    console.error('Error fetching items for category from localDb:', err)
    return []
  }
}

const getItemsInCategory = async (catId: number, size: number): Promise<IItem[]> => {
  const eligible = await getEligibleItemsInCategory(catId)
  return shuffleArray([...eligible]).slice(0, size)
}

/**
 * Get study set items loaded from local database
 */
const getStudySet = async (
  studySets: GetStudySetByCatId[],
): Promise<IHttpResponse<IItemQuiz[]>> => {
  try {
    commonApi.checkAuth()

    if (!studySets || studySets.length === 0) {
      return {
        isSuccess: false,
        message: 'No study set parameters provided',
        content: [],
        statusCode: 400,
      }
    }

    const allItems: IItem[] = []
    const allCategoryItemsMap = new Map<number, IItem[]>()

    // Fetch all eligible items for each requested category from localDb
    for (const studySet of studySets) {
      if (studySet.size === 0 || !studySet.size) {
        continue
      }
      const eligibleItems = await getEligibleItemsInCategory(studySet.id)
      allCategoryItemsMap.set(studySet.id, eligibleItems)

      const selected = shuffleArray([...eligibleItems]).slice(0, studySet.size)
      allItems.push(...selected)
    }

    if (allItems.length === 0) {
      const totalCount = await localDb.items.count()
      const message =
        totalCount === 0
          ? 'Local database is empty. Please sync your data from the Profile page first.'
          : 'No eligible items found for study set in your local database.'
      return {
        isSuccess: false,
        message,
        content: [],
        statusCode: 404,
      }
    }

    // Populate examples for all items from localDb
    const itemsWithExamples = await Promise.all(
      allItems.map(async (item) => {
        const meanings = item.meanings || []

        const meaningsWithExamples = await Promise.all(
          meanings.map(async (meaning: any) => {
            const exampleIds = meaning.examples || []

            if (!Array.isArray(exampleIds) || exampleIds.length === 0) {
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
      // Randomly decide quiz type (50% chance for each type if catId === 1)
      const useFillInBlank = item.catId === 1 && Math.random() < 0.5

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
        const typeLabels = types.filter(
          (type) => type.id !== 0 && type.id == selectedMeaning?.typeId,
        )
        hint = typeLabels[0]?.label?.origin || ''
      } else {
        const restCategoryLabels = categories.filter(
          (cat) => cat.id !== 0 && cat.id !== 1 && cat.id === item.catId,
        )
        hint = restCategoryLabels[0]?.label || ''
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
            hint: hint ? `(${hint.toLowerCase()})` : '',
            result: false,
          },
        } as unknown as IItemQuiz
      }

      const pool =
        (item.catId !== undefined ? allCategoryItemsMap.get(item.catId) : undefined) || allItems
      const wrongAnswers = pool
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
          key: selectedMeaning?.translation || '',
        },
        ...wrongAnswers.map((wrongItem) => {
          const randomMeaningIndex =
            wrongItem.meanings && wrongItem.meanings?.length > 0
              ? Math.floor(Math.random() * wrongItem.meanings.length)
              : 0
          const selected = wrongItem?.meanings?.[randomMeaningIndex]

          return {
            id: wrongItem.id as string,
            label: wrongItem.origin,
            value: false,
            typeId: selected?.typeId || 0,
            key: selected?.translation || '',
          }
        }),
      ]

      // Shuffle answers
      const shuffledAnswers = answers.sort(() => Math.random() - 0.5)

      return {
        ...item,
        quiz: {
          title: definition,
          question: '',
          answer: shuffledAnswers,
          type: EQuiz.MULTI_CHOICE,
          hint: hint ? `(${hint.toLowerCase()})` : '',
          result: false,
        },
      } as unknown as IItemQuiz
    })

    return {
      isSuccess: true,
      message: 'Study set fetched successfully',
      content: shuffleArray(itemsWithQuiz),
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching study set from localDb:', error)
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
    const normalizedTags = normalizeTags(item.tags || [])

    const newItem = {
      ...item,
      tags: normalizedTags,
      tags_lowercase: normalizeLowercaseTags(normalizedTags),
      uid: currentUser.uid,
      created_date: now,
      last_update: now,
      is_deleted: false,
      randomIndex: Math.random(), // For efficient random queries
      origin_lowercase: item.origin?.toLowerCase() || '', // For case-insensitive search
    }

    const itemsRef = collection(db, dbCollections.items)
    const docRef = await addDoc(itemsRef, newItem)
    const createdItem = {
      id: docRef.id,
      ...newItem,
    } as unknown as IItem

    // Modify local DB as well
    try {
      await localDb.items.put(createdItem)
      invalidateSearchIndex()
    } catch (localErr) {
      console.warn('Failed to save created item to localDb:', localErr)
    }

    return {
      isSuccess: true,
      message: 'Item created successfully',
      content: createdItem,
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
      const normalizedTags = normalizeTags(item.tags || [])

      const newItem = {
        ...item,
        tags: normalizedTags,
        tags_lowercase: normalizeLowercaseTags(normalizedTags),
        uid: currentUser.uid,
        created_date: now,
        last_update: now,
        is_deleted: false,
        randomIndex: Math.random(), // For efficient random queries
        origin_lowercase: item.origin?.toLowerCase() || '', // For case-insensitive search
      }

      const itemsRef = collection(db, dbCollections.items)
      const docRef = await addDoc(itemsRef, newItem)

      createdItems.push({
        id: docRef.id,
        ...newItem,
      } as unknown as IItem)
    }

    // Modify local DB as well
    try {
      if (createdItems.length > 0) {
        await localDb.items.bulkPut(createdItems)
        invalidateSearchIndex()
      }
    } catch (localErr) {
      console.warn('Failed to bulk-save created items to localDb:', localErr)
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

    const now = Timestamp.now().toMillis()
    const updateData: any = {
      ...item,
      last_update: now,
    }

    // Clean up temporary UI quiz property if passed from studySet
    delete updateData.quiz

    if (item.origin !== undefined) {
      updateData.origin_lowercase = item.origin.toLowerCase()
    }

    if (item.tags !== undefined) {
      const normalizedTags = normalizeTags(item.tags)
      updateData.tags = normalizedTags
      updateData.tags_lowercase = normalizeLowercaseTags(normalizedTags)
    }

    // 1. Update local DB immediately
    let updatedItem: IItem
    try {
      const existing = await localDb.items.get(id)
      if (existing) {
        updatedItem = { ...existing, ...updateData, id }
      } else {
        updatedItem = { ...updateData, id } as IItem
      }
      await localDb.items.put(updatedItem)
      invalidateSearchIndex()
    } catch (localErr) {
      console.warn('Failed to update item in localDb:', localErr)
      updatedItem = { ...updateData, id } as IItem
    }

    // 2. Update Firebase DB in parallel
    try {
      const itemDocRef = doc(db, dbCollections.items, id)
      const { id: _docId, ...firestorePayload } = updateData
      await updateDoc(itemDocRef, firestorePayload)
    } catch (firebaseErr) {
      console.error('Failed to update item in Firestore:', firebaseErr)
    }

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
    const now = Timestamp.now().toMillis()
    await updateDoc(itemDocRef, {
      is_deleted: true,
      deleted_date: now,
      last_update: now,
    })

    // Modify local DB as well
    try {
      await localDb.items.delete(id)
      invalidateSearchIndex()
    } catch (localErr) {
      console.warn('Failed to delete item from localDb:', localErr)
    }

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
  getItemsInCategory,
  getExamplesByIds,
}
