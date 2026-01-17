import { IHttpResponse } from '@/models/http.model'
import { IExample } from '@/models/item.model'
import { IExampleQuery } from '@/models/example.model'
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
  deleteDoc,
  Timestamp,
  limit,
  QueryConstraint,
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

    const exampleData = {
      ...body,
      userId: currentUser.uid,
      created_date: Timestamp.now().toMillis(),
      last_update: Timestamp.now().toMillis(),
    }

    const docRef = await addDoc(collection(db, 'examples'), exampleData)
    const newExample = { ...exampleData, id: Number(docRef.id) }

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
const getExampleById = async (id: number | string): Promise<IHttpResponse<IExample>> => {
  try {
    const exampleDocRef = doc(db, 'examples', String(id))
    const exampleDoc = await getDoc(exampleDocRef)

    if (!exampleDoc.exists()) {
      throw new Error('Example not found')
    }

    const example = {
      id: Number(exampleDoc.id),
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
      constraints.push(where('userId', '==', currentUser.uid))
    }

    if (querySearch.itemId) {
      constraints.push(where('itemId', '==', querySearch.itemId))
    }

    constraints.push(limit(querySearch.size || 10))

    const examplesQuery = query(collection(db, 'examples'), ...constraints)
    const snapshot = await getDocs(examplesQuery)

    let examples = snapshot.docs.map((doc) => ({
      id: Number(doc.id),
      ...doc.data(),
    })) as IExample[]

    // Filter by keyword if provided
    if (querySearch.keyword) {
      examples = examples.filter(
        (example) =>
          example.original.toLowerCase().includes(querySearch.keyword.toLowerCase()) ||
          example.translation.toLowerCase().includes(querySearch.keyword.toLowerCase()),
      )
    }

    return {
      isSuccess: true,
      message: 'Examples fetched successfully',
      content: examples,
      paging: {
        page: querySearch.page || 1,
        size: querySearch.size || 10,
        total: examples.length,
        totalPage: Math.ceil(examples.length / (querySearch.size || 10)),
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching examples:', error)
    throw error
  }
}

/**
 * Get random examples
 */
const getRandomExamples = async (
  querySearch: Omit<IExampleQuery, 'keyword'>,
): Promise<IHttpResponse<IExample[]>> => {
  try {
    const constraints: QueryConstraint[] = []
    const currentUser = firebaseAuthService.getCurrentUser()

    if (currentUser) {
      constraints.push(where('userId', '==', currentUser.uid))
    }

    if (querySearch.itemId) {
      constraints.push(where('itemId', '==', querySearch.itemId))
    }

    const random = Math.floor(Math.random() * 1000001)
    constraints.push(where('random', '==', random))

    // Fetch all examples and randomize on client side for better random distribution
    const examplesQuery = query(collection(db, 'examples'), ...constraints)
    const snapshot = await getDocs(examplesQuery)

    let examples = snapshot.docs.map((doc) => ({
      id: Number(doc.id),
      ...doc.data(),
    })) as IExample[]

    // Fisher-Yates shuffle for better randomization
    for (let i = examples.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[examples[i], examples[j]] = [examples[j], examples[i]]
    }

    // Limit to requested size
    const randomExamples = examples.slice(0, querySearch.size || 5)

    return {
      isSuccess: true,
      message: 'Random examples fetched successfully',
      content: randomExamples,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching random examples:', error)
    throw error
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

    const exampleDocRef = doc(db, 'examples', String(body.id))
    const updateData = {
      ...body,
      last_update: Timestamp.now().toMillis(),
    }

    await updateDoc(exampleDocRef, updateData)

    const updatedDoc = await getDoc(exampleDocRef)
    const updatedExample = {
      id: Number(updatedDoc.id),
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
const deleteExample = async (id: number): Promise<IHttpResponse<IExample>> => {
  try {
    const exampleDocRef = doc(db, 'examples', String(id))
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
