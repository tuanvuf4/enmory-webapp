import { AppOrderQuery, AppOrderByQuery } from '@/models/app.model'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IItemQuiz } from '@/models/item.model'
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
  orderBy as firestoreOrderBy,
  documentId,
} from 'firebase/firestore'
import { IExample } from '@/models/item.model'

export interface IItemRequestData {
  keyword: string
  page: number
  size: number
  cat?: number | ''
  type?: number | ''
  defect?: boolean | ''
  archive?: boolean | ''
  exact?: boolean
  order?: AppOrderQuery
  orderBy?: AppOrderByQuery
}

/**
 * Helper function to build Firestore query constraints
 */
const buildQueryConstraints = (params: IItemRequestData): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []
  const currentUser = firebaseAuthService.getCurrentUser()

  // Filter by current user
  if (currentUser) {
    constraints.push(where('uid', '==', currentUser.uid))
  }

  // Filter by category
  if (params.cat) {
    constraints.push(where('catId', '==', params.cat))
  }

  // Filter by keyword (search in original field)
  if (params.keyword && params.exact) {
    constraints.push(where('origin', '==', params.keyword))
  }

  // Filter by archive status
  if (params.archive !== '' && params.archive !== undefined) {
    constraints.push(where('archive', '==', params.archive))
  }

  // Filter by deleted status
  constraints.push(where('is_deleted', '==', false))

  // Add ordering
  if (params.orderBy) {
    constraints.push(firestoreOrderBy(params.orderBy, params.order === 'DESC' ? 'desc' : 'asc'))
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
const getItems = async (params: IItemRequestData): Promise<IHttpResponse<IItem[]>> => {
  try {
    const constraints = buildQueryConstraints(params)

    // Add pagination
    constraints.push(limit(params.size))

    const itemsQuery = query(collection(db, dbCollections.items), ...constraints)
    const snapshot = await getDocs(itemsQuery)

    // Handle keyword search for non-exact matches
    const itemsPromises = snapshot.docs.map(async (doc) => {
      const itemData = doc.data()
      const meanings = itemData.meanings || []

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
        id: doc.id,
        ...itemData,
        meanings: meaningsWithExamples,
      } as IItem
    })

    let items: IItem[] = await Promise.all(itemsPromises)

    if (params.keyword && !params.exact) {
      items = items.filter((item) =>
        item.origin.toLowerCase().includes(params.keyword.toLowerCase()),
      )
    }

    return {
      isSuccess: true,
      message: 'Items fetched successfully',
      content: items,
      paging: {
        page: params.page,
        size: params.size,
        total: items.length,
        totalPage: Math.ceil(items.length / params.size),
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
  params: IItemRequestData,
): Promise<IHttpResponse<IItem<string>[]>> => {
  try {
    const constraints = buildQueryConstraints(params)
    constraints.push(limit(20)) // Limit for autocomplete

    const itemsQuery = query(collection(db, dbCollections.items), ...constraints)
    const snapshot = await getDocs(itemsQuery)

    let items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as IItem<string>[]

    // Filter by keyword
    if (params.keyword) {
      items = items.filter((item) =>
        item.origin.toLowerCase().includes(params.keyword.toLowerCase()),
      )
    }

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
    const allItems: IItemQuiz[] = []
    const currentUser = firebaseAuthService.getCurrentUser()

    for (const studySet of studySets) {
      const constraints: QueryConstraint[] = [where('catId', '==', studySet.id)]

      if (currentUser) {
        constraints.push(where('uid', '==', currentUser.uid))
      }

      constraints.push(where('is_deleted', '==', false))
      constraints.push(limit(studySet.size || 10))

      const itemsQuery = query(collection(db, dbCollections.items), ...constraints)
      const snapshot = await getDocs(itemsQuery)

      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as IItemQuiz[]

      allItems.push(...items)
    }

    return {
      isSuccess: true,
      message: 'Study set fetched successfully',
      content: allItems,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching study set:', error)
    throw error
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

export const itemApi = {
  getItems,
  getItemAutoComplete,
  getItemById,
  createItem,
  createItems,
  updateItem,
  deleteItem,
  getStudySet,
}
