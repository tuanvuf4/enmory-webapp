import { IHttpResponse } from '@/models/http.model'
import { IExample } from '@/models/item.model'
import { IExampleQuery } from '@/models/example.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { removeLineBreaks } from '@/core/utils'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  limit,
  QueryConstraint,
  startAt,
  endAt,
  orderBy,
} from 'firebase/firestore'

/**
 * Create a new example
 */
const createExample = async (body: IExample): Promise<IHttpResponse<IExample>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const origin = removeLineBreaks(body.origin)
    const translation = removeLineBreaks(body.translation)

    const exampleData: IExample = {
      ...body,
      origin,
      translation,
      uid: currentUser.uid,
      created_date: Timestamp.now().toMillis(),
      last_update: Timestamp.now().toMillis(),
      randomIndex: Math.random(), // For efficient random queries
      origin_lowercase: origin.toLowerCase(), // For case-insensitive search
    }

    const docRef = await addDoc(collection(db, dbCollections.examples), exampleData)
    const newExample = { ...exampleData, id: docRef.id }

    return {
      isSuccess: true,
      message: 'Example created successfully',
      content: newExample,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error creating example:', error)
    throw error
  }
}

/**
 * Get example by ID
 */
const getExampleById = async (id: string | number): Promise<IHttpResponse<IExample>> => {
  try {
    const exampleDocRef = doc(db, dbCollections.examples, String(id))
    const exampleDoc = await getDoc(exampleDocRef)

    if (!exampleDoc.exists()) {
      throw new Error('Example not found')
    }

    const example = {
      id: exampleDoc.id,
      ...exampleDoc.data(),
    } as IExample

    return {
      isSuccess: true,
      message: 'Example fetched successfully',
      content: example,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching example:', error)
    throw error
  }
}

/**
 * Get examples with query
 */
const getExamples = async (querySearch: IExampleQuery): Promise<IHttpResponse<IExample[]>> => {
  try {
    const constraints: QueryConstraint[] = []
    const currentUser = firebaseAuthService.getCurrentUser()

    if (currentUser) {
      constraints.push(where('uid', '==', currentUser.uid))
    }

    const orderByField = querySearch.orderBy || 'created_date'
    const orderDirection = querySearch.order === 'DESC' ? 'desc' : 'asc'

    if (querySearch.keyword) {
      const keyword = querySearch.keyword.trim().toLowerCase()

      constraints.push(orderBy('origin_lowercase', 'asc'))
      constraints.push(startAt(keyword))
      constraints.push(endAt(keyword + '\uf8ff'))
    } else {
      constraints.push(orderBy(orderByField, orderDirection))
    }

    constraints.push(limit(querySearch.size || 10))

    const examplesQuery = query(collection(db, dbCollections.examples), ...constraints)
    const snapshot = await getDocs(examplesQuery)

    let examples = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IExample[]

    return {
      isSuccess: true,
      message: 'Examples fetched successfully',
      content: examples,
      // paging: {
      //   page: querySearch.page || 1,
      //   size: querySearch.size || 10,
      //   total: examples.length,
      //   totalPage: Math.ceil(examples.length / (querySearch.size || 10)),
      // },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching examples:', error)
    throw error
  }
}

/**
 * Get random examples
 * Note: This function expects documents to have a 'randomIndex' field (0-1)
 * for efficient random sampling. Add this field when creating examples.
 */
const getRandomExamples = async (size: number): Promise<IHttpResponse<IExample[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: [],
        statusCode: 401,
      }
    }

    const randomStart = Math.random()

    // First query: get documents >= randomStart
    const constraints: QueryConstraint[] = [
      where('uid', '==', currentUser.uid),
      where('randomIndex', '>=', randomStart),
      limit(size),
    ]

    const queryRandom = query(collection(db, dbCollections.examples), ...constraints)
    const snapshot = await getDocs(queryRandom)

    const examples = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IExample[]

    return {
      isSuccess: true,
      message: 'Random examples fetched successfully',
      content: examples,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching random examples:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch random examples',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Update example
 */
const updateExample = async (body: Partial<IExample>): Promise<IHttpResponse<IExample>> => {
  try {
    if (!body.id) {
      throw new Error('Example ID is required')
    }

    const exampleDocRef = doc(db, dbCollections.examples, String(body.id))
    const updateData: any = {
      ...body,
      last_update: Timestamp.now().toMillis(),
    }

    if (body.origin !== undefined) {
      const origin = removeLineBreaks(body.origin)
      updateData.origin = origin
      updateData.origin_lowercase = origin.toLowerCase()
    }

    if (body.translation !== undefined) {
      updateData.translation = removeLineBreaks(body.translation)
    }

    await updateDoc(exampleDocRef, updateData)

    const updatedDoc = await getDoc(exampleDocRef)
    const updatedExample = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as IExample

    return {
      isSuccess: true,
      message: 'Example updated successfully',
      content: updatedExample,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating example:', error)
    throw error
  }
}

/**
 * Delete example
 */
const deleteExample = async (id: string): Promise<IHttpResponse<IExample>> => {
  try {
    const exampleDocRef = doc(db, dbCollections.examples, String(id))
    await deleteDoc(exampleDocRef)

    return {
      isSuccess: true,
      message: 'Example deleted successfully',
      content: {} as IExample,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error deleting example:', error)
    throw error
  }
}

export const exampleApi = {
  createExample,
  getExamples,
  getExampleById,
  getRandomExamples,
  updateExample,
  deleteExample,
}
