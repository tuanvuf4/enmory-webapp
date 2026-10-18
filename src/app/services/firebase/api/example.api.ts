import { IHttpResponse } from '@/models/http.model'
import { IExample } from '@/models/item.model'
import { IExampleQuery } from '@/models/example.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { removeLineBreaks } from '@/core/utils'
import {
  localDb,
  queryLocalExamples,
  getRandomLocalExamples,
  invalidateSearchIndex,
} from '@/services/localDb'
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
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
    }

    const docRef = await addDoc(collection(db, dbCollections.examples), exampleData)
    const newExample = { ...exampleData, id: docRef.id }

    // Modify local DB as well
    try {
      await localDb.examples.put(newExample)
      invalidateSearchIndex()
    } catch (localErr) {
      console.warn('Failed to save example to localDb:', localErr)
    }

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
 * Get example by ID (Strict Local-Only)
 */
const getExampleById = async (id: string | number): Promise<IHttpResponse<IExample>> => {
  try {
    if (!id) {
      throw new Error('Example ID is required')
    }

    const localExample = await localDb.examples.get(String(id))
    if (localExample) {
      return {
        isSuccess: true,
        message: 'Example fetched from local database',
        content: localExample,
        statusCode: 200,
      }
    }

    return {
      isSuccess: false,
      message: 'Example not found in local database',
      content: null as any,
      statusCode: 404,
    }
  } catch (error) {
    console.error('Error fetching example from localDb:', error)
    throw error
  }
}

/**
 * Get examples with query (Strict Local-Only)
 */
const getExamples = async (querySearch: IExampleQuery): Promise<IHttpResponse<IExample[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser?.uid) {
      return {
        isSuccess: true,
        message: 'No authenticated user',
        content: [],
        statusCode: 200,
      }
    }

    return await queryLocalExamples(querySearch, currentUser.uid)
  } catch (error) {
    console.error('Error fetching examples from localDb:', error)
    throw error
  }
}

/**
 * Get random examples (Strict Local-Only)
 */
const getRandomExamples = async (size: number): Promise<IHttpResponse<IExample[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser?.uid) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: [],
        statusCode: 401,
      }
    }

    return await getRandomLocalExamples(size, currentUser.uid)
  } catch (error) {
    console.error('Error fetching random examples from localDb:', error)
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

    // Modify local DB as well
    try {
      await localDb.examples.put(updatedExample)
      invalidateSearchIndex()
    } catch (localErr) {
      console.warn('Failed to update example in localDb:', localErr)
    }

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

    // Modify local DB as well
    try {
      await localDb.examples.delete(String(id))
      invalidateSearchIndex()
    } catch (localErr) {
      console.warn('Failed to delete example from localDb:', localErr)
    }

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
