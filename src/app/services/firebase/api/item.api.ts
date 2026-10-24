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
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { IExample } from '@/models/item.model'
import { toWildString, hasValidMeaning } from '@/helpers/item'
import { commonApi } from './common.api'
import { categories, types } from '@/constant/index'
import { shuffleArray } from '@/helpers/mics'
import { getDueItemsFromLocalDb } from '@/services/srs/srs.service'
import { checklistApi } from './checklist.api'
import { localDb, queryLocalItems, invalidateSearchIndex, statsService } from '@/services/localDb'
import {
  sanitizeItemForFirestore,
  hydrateItemsWithExamples,
  purgeDeletedItemsFromFirebaseDb,
} from '@/services/firebase/dbIntegration'

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
 * Helper function to fetch examples by their IDs from the local database,
 * falling back to Firestore examples collection if missing.
 */
const getExamplesByIds = async (exampleIds: string[]): Promise<IExample[]> => {
  if (!exampleIds || exampleIds.length === 0) return []
  const targetIds = new Set(exampleIds.filter((id) => Boolean(id) && typeof id === 'string'))
  if (targetIds.size === 0) return []

  try {
    const items = await localDb.items.toArray()
    const found: IExample[] = []
    for (const item of items) {
      for (const meaning of item.meanings || []) {
        for (const ex of (meaning.examples || []) as any[]) {
          if (ex && typeof ex === 'object' && ex.id && targetIds.has(ex.id)) {
            found.push(ex as IExample)
            targetIds.delete(ex.id)
            if (targetIds.size === 0) break
          }
        }
      }
      if (targetIds.size === 0) break
    }
    return found
  } catch (error) {
    console.error('Error finding examples in local items:', error)
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
 * Get single item by ID with Firestore fallback and dynamic example hydration
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

    let item: IItem | null = null

    // 1. Try localDb first
    const localItem = await localDb.items.get(id)
    if (localItem) {
      delete (localItem as any).quiz
      item = localItem
    } else {
      // 2. Fallback to Firestore if not present in localDb (e.g. cross-device, fresh session)
      try {
        const itemDoc = await getDoc(doc(db, dbCollections.items, id))
        if (itemDoc.exists()) {
          const data = itemDoc.data()
          item = { id: itemDoc.id, ...data } as IItem
          delete (item as any).quiz
          await localDb.items.put(item)
        }
      } catch (firestoreErr) {
        console.warn('Fallback to Firestore for getItemById failed:', firestoreErr)
      }
    }

    if (!item) {
      return {
        isSuccess: false,
        message: 'Item not found in local database or cloud',
        content: null,
        statusCode: 404,
      }
    }

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

const getEligibleItemsInCategory = async (catId: number): Promise<IItem[]> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    // Load items strictly from local database
    let allLocalItems = await localDb.items.where('catId').equals(catId).toArray()

    const userItems = allLocalItems.filter(
      (item) => item.catId === catId && currentUser && item.uid === currentUser.uid,
    )

    // console.log(`*** allLocalItems *** `, allLocalItems)
    // console.log(`*** userItems *** `, userItems)

    const eligible = userItems.filter(hasValidMeaning)

    // Filter items that have examples
    const itemsWithExamples = eligible.filter((item) => {
      const meanings = (item.meanings || []).filter((m) => {
        const def = m?.definition && typeof m.definition === 'string' ? m.definition.trim() : ''
        const trans =
          m?.translation && typeof m.translation === 'string' ? m.translation.trim() : ''
        return def.length > 0 || trans.length > 0
      })
      return meanings.some((meaning: any) => meaning.examples && meaning.examples.length > 0)
    })

    return itemsWithExamples.length > 0 ? itemsWithExamples : eligible
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
/**
 * Reusable helper to generate quiz questions for a list of items.
 */
export const generateQuizzesForItems = async (
  items: IItem[],
  poolItems: IItem[] = [],
  categoryItemsMap?: Map<number, IItem[]>,
): Promise<IItemQuiz[]> => {
  const validItems = items.filter(hasValidMeaning)
  const hydratedAllItems = await hydrateItemsWithExamples(validItems)

  return hydratedAllItems.map((item) => {
    // Randomly decide quiz type (50% chance for each type if catId === 1)
    const useFillInBlank = item.catId === 1 && Math.random() < 0.5

    // Get random meaning from meanings array
    const meanings = (item.meanings || []).filter((m) => {
      const def = m?.definition && typeof m.definition === 'string' ? m.definition.trim() : ''
      const trans = m?.translation && typeof m.translation === 'string' ? m.translation.trim() : ''
      return def.length > 0 || trans.length > 0
    })
    const randomMeaningIndex = meanings.length > 0 ? Math.floor(Math.random() * meanings.length) : 0
    const selectedMeaning = meanings[randomMeaningIndex]

    // Get definition/translation from meaning
    const definition =
      selectedMeaning?.definition?.trim() || selectedMeaning?.translation?.trim() || ''

    // Get hint: if word (catId=1) show type, otherwise show category
    let hint = ''
    if (item.catId === 1) {
      const typeLabels = types.filter((type) => type.id !== 0 && type.id == selectedMeaning?.typeId)
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
      (item.catId !== undefined ? categoryItemsMap?.get(item.catId) : undefined) ||
      (poolItems.length > 0 ? poolItems : items)
    const wrongAnswers = pool
      .filter(
        (otherItem) =>
          otherItem.id !== item.id &&
          Number(otherItem.catId) === Number(item.catId) &&
          hasValidMeaning(otherItem),
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    if (wrongAnswers.length < 3) {
      const remaining = 3 - wrongAnswers.length
      const extraWrong = pool
        .filter(
          (other) =>
            other.id !== item.id &&
            hasValidMeaning(other) &&
            !wrongAnswers.some((w) => w.id === other.id),
        )
        .sort(() => Math.random() - 0.5)
        .slice(0, remaining)
      wrongAnswers.push(...extraWrong)
    }

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
}

/**
 * Get study set specifically for items due under Spaced Repetition (SRS).
 */
const getDueStudySet = async (limit = 15): Promise<IHttpResponse<IItemQuiz[]>> => {
  try {
    commonApi.checkAuth()
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const dueItems = await getDueItemsFromLocalDb(currentUser.uid)

    if (dueItems.length === 0) {
      return {
        isSuccess: false,
        message: 'Hoan hô! Bạn không có từ nào cần ôn tập hôm nay.',
        content: [],
        statusCode: 404,
      }
    }

    const selectedDue = dueItems.slice(0, limit)
    const allLocalItems = await localDb.items.toArray()
    const pool = allLocalItems.filter(
      (item) => item.uid === currentUser.uid && !item.archive && hasValidMeaning(item),
    )

    const itemsWithQuiz = await generateQuizzesForItems(selectedDue, pool)
    const shuffledItemsWithQuiz = shuffleArray(itemsWithQuiz)

    return {
      isSuccess: true,
      message: 'Due study set fetched successfully',
      content: shuffledItemsWithQuiz,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching due study set from localDb:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch due study set',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Get study set specifically for checklist items.
 */
const getChecklistStudySet = async (customItems?: IItem[]): Promise<IHttpResponse<IItemQuiz[]>> => {
  try {
    commonApi.checkAuth()
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    let itemsToStudy = customItems ? customItems.filter(hasValidMeaning) : []
    if (!itemsToStudy || itemsToStudy.length === 0) {
      const checklist = await checklistApi.getChecklist()
      const validChecklist = checklist.filter(hasValidMeaning)
      const toLearn = validChecklist.filter((item) => !item.isCompleted)
      itemsToStudy = toLearn.length > 0 ? toLearn : validChecklist
    }

    if (!itemsToStudy || itemsToStudy.length === 0) {
      return {
        isSuccess: false,
        message: 'Không có từ nào có định nghĩa hoặc nghĩa trong Checklist để luyện tập.',
        content: [],
        statusCode: 404,
      }
    }

    const allLocalItems = await localDb.items.toArray()
    const pool = allLocalItems.filter(
      (item) => item.uid === currentUser.uid && !item.archive && hasValidMeaning(item),
    )

    const itemsWithQuiz = await generateQuizzesForItems(
      itemsToStudy,
      pool.length > 0 ? pool : itemsToStudy,
    )
    const shuffledItemsWithQuiz = shuffleArray(itemsWithQuiz)

    return {
      isSuccess: true,
      message: 'Checklist study set fetched successfully',
      content: shuffledItemsWithQuiz,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching checklist study set:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch checklist study set',
      content: [],
      statusCode: 500,
    }
  }
}

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
      const eligibleItems = await getItemsInCategory(studySet.id, studySet.size)
      allCategoryItemsMap.set(studySet.id, eligibleItems)

      allItems.push(...eligibleItems)
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

    // Generate quiz data using shared helper
    const itemsWithQuiz = await generateQuizzesForItems(allItems, allItems, allCategoryItemsMap)
    const shuffledItemsWithQuiz = shuffleArray(itemsWithQuiz)

    return {
      isSuccess: true,
      message: 'Study set fetched successfully',
      content: shuffledItemsWithQuiz,
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
      randomIndex: Math.random(), // For efficient random queries
    }
    delete (newItem as any).quiz

    const itemsRef = collection(db, dbCollections.items)
    const docRef = await addDoc(itemsRef, sanitizeItemForFirestore(newItem))
    const createdItem = {
      id: docRef.id,
      ...newItem,
    } as unknown as IItem
    delete (createdItem as any).quiz

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
        randomIndex: Math.random(), // For efficient random queries
      }
      delete (newItem as any).quiz

      const itemsRef = collection(db, dbCollections.items)
      const docRef = await addDoc(itemsRef, sanitizeItemForFirestore(newItem))

      const created = {
        id: docRef.id,
        ...newItem,
      } as unknown as IItem
      delete (created as any).quiz
      createdItems.push(created)
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
        delete (existing as any).quiz
        updatedItem = { ...existing, ...updateData, id }
      } else {
        updatedItem = { ...updateData, id } as IItem
      }
      delete (updatedItem as any).quiz
      await localDb.items.put(updatedItem)
      invalidateSearchIndex()
    } catch (localErr) {
      console.warn('Failed to update item in localDb:', localErr)
      updatedItem = { ...updateData, id } as IItem
      delete (updatedItem as any).quiz
    }

    // 2. Update Firebase DB in parallel
    try {
      const itemDocRef = doc(db, dbCollections.items, id)
      const { id: _docId, quiz: _quiz, ...firestorePayload } = updateData
      delete firestorePayload.quiz
      await updateDoc(itemDocRef, sanitizeItemForFirestore(firestorePayload))
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
 * Delete an item directly from Firestore and local database,
 * recording deletion into deleted_records collection for multi-device sync
 */
const deleteItem = async (id: string): Promise<IHttpResponse<boolean>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const itemDocRef = doc(db, dbCollections.items, id)
    const deletedRecordRef = doc(db, dbCollections.deleted_records, `${currentUser.uid}_${id}`)

    // Execute atomic batch: delete item from items & record deletion into deleted_records
    const batch = writeBatch(db)
    batch.delete(itemDocRef)
    batch.set(deletedRecordRef, {
      uid: currentUser.uid,
      recordId: id,
      collectionName: dbCollections.items,
      deleted_at: Timestamp.now(),
    })
    await batch.commit()

    // Also remove item from checklist in Firebase DB if present
    try {
      const checklistQuery = query(
        collection(db, dbCollections.checklists),
        where('uid', '==', currentUser.uid),
        where('itemId', '==', id),
      )
      const checklistSnap = await getDocs(checklistQuery)
      checklistSnap.forEach((docSnap) => {
        deleteDoc(docSnap.ref).catch(() => {})
      })
    } catch (checklistErr) {
      console.warn('Failed to clean up checklist entry for deleted item:', checklistErr)
    }

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
const getNewAddedItemByPeriod = statsService.getNewAddedItemByPeriod
const getItemsByLevel = statsService.getItemsByLevel
const getOverviewItems = statsService.getOverviewItems

export const itemApi = {
  getItems,
  getItemAutoComplete,
  getItemById,
  createItem,
  createItems,
  updateItem,
  deleteItem,
  getStudySet,
  getDueStudySet,
  getChecklistStudySet,
  getNewAddedItemByPeriod,
  getItemsByLevel,
  getOverviewItems,
  getSummaryStats: statsService.getSummaryStats,
  getMonthlyGrowthStats: statsService.getMonthlyGrowthStats,
  getPartOfSpeechStats: statsService.getPartOfSpeechStats,
  getTopTagsStats: statsService.getTopTagsStats,
  getItemsInCategory,
  getExamplesByIds,
  purgeDeletedItems: purgeDeletedItemsFromFirebaseDb,
}
