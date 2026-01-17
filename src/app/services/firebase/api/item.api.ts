import { AppOrderQuery, AppOrderByQuery } from '@/models/app.model'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IItemQuiz } from '@/models/item.model'
import { GetStudySetByCatId } from '@/models/studySet.model'
import { db } from '@/config/firebaseConfig'
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
} from 'firebase/firestore'

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
    constraints.push(where('userId', '==', currentUser.uid))
  }

  // Filter by category
  if (params.cat) {
    constraints.push(where('catId', '==', params.cat))
  }

  // Filter by keyword (search in original field)
  if (params.keyword && params.exact) {
    constraints.push(where('original', '==', params.keyword))
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
 * Get items with pagination
 */
const getItems = async (params: IItemRequestData): Promise<IHttpResponse<IItem<string>[]>> => {
  try {
    const constraints = buildQueryConstraints(params)

    // Add pagination
    constraints.push(limit(params.size))

    const itemsQuery = query(collection(db, 'items'), ...constraints)
    const snapshot = await getDocs(itemsQuery)

    // Handle keyword search for non-exact matches
    let items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as IItem<string>[]

    if (params.keyword && !params.exact) {
      items = items.filter((item) =>
        item.original.toLowerCase().includes(params.keyword.toLowerCase()),
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

    const itemsQuery = query(collection(db, 'items'), ...constraints)
    const snapshot = await getDocs(itemsQuery)

    let items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as IItem<string>[]

    // Filter by keyword
    if (params.keyword) {
      items = items.filter((item) =>
        item.original.toLowerCase().includes(params.keyword.toLowerCase()),
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
const getItemById = async (itemId: string): Promise<IHttpResponse<IItem<string>>> => {
  try {
    const itemDocRef = doc(db, 'items', itemId)
    const itemDoc = await getDoc(itemDocRef)

    if (!itemDoc.exists()) {
      throw new Error('Item not found')
    }

    const item = {
      id: itemDoc.id,
      ...itemDoc.data(),
    } as unknown as IItem<string>

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
        constraints.push(where('userId', '==', currentUser.uid))
      }

      constraints.push(where('is_deleted', '==', false))
      constraints.push(limit(studySet.size || 10))

      const itemsQuery = query(collection(db, 'items'), ...constraints)
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
const createItem = async (item: IItem<string>): Promise<IHttpResponse<IItem<string>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const now = Timestamp.now().toMillis()
    const newItem = {
      ...item,
      userId: currentUser.uid,
      created_date: now,
      last_update: now,
      is_deleted: false,
    }

    const itemsRef = collection(db, 'items')
    const docRef = await addDoc(itemsRef, newItem)

    return {
      isSuccess: true,
      message: 'Item created successfully',
      content: {
        id: docRef.id,
        ...newItem,
      } as unknown as IItem<string>,
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
const createItems = async (items: IItem<string>[]): Promise<IHttpResponse<IItem<string>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const now = Timestamp.now().toMillis()
    const createdItems: IItem<string>[] = []

    for (const item of items) {
      const newItem = {
        ...item,
        userId: currentUser.uid,
        created_date: now,
        last_update: now,
        is_deleted: false,
      }

      const itemsRef = collection(db, 'items')
      const docRef = await addDoc(itemsRef, newItem)

      createdItems.push({
        id: docRef.id,
        ...newItem,
      } as unknown as IItem<string>)
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
const updateItem = async (
  id: string,
  item: Partial<IItem<string>>,
): Promise<IHttpResponse<IItem<string>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const itemDocRef = doc(db, 'items', id)
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
    } as unknown as IItem<string>

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

    const itemDocRef = doc(db, 'items', id)
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
