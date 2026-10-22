import { IHttpResponse } from '@/models/http.model'
import { IExample } from '@/models/item.model'
import { IExampleQuery } from '@/models/example.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import { requireAuth, getRequiredCurrentUser } from '@/services/firebase/authService'
import { removeLineBreaks } from '@/core/utils'
import {
  localDb,
  queryLocalExamples,
  getRandomLocalExamples,
  invalidateSearchIndex,
} from '@/services/localDb'
import { collection, doc } from 'firebase/firestore'

/**
 * Create a new example (Strict Local-Only)
 */
const createExample = async (body: IExample): Promise<IHttpResponse<IExample>> => {
  try {
    const currentUser = getRequiredCurrentUser()

    const origin = removeLineBreaks(body.origin)
    const translation = removeLineBreaks(body.translation)
    const now = Date.now()
    const id = body.id || doc(collection(db, dbCollections.items)).id

    const newExample: IExample = {
      ...body,
      id,
      origin,
      translation,
      uid: currentUser.uid,
      created_date: body.created_date || now,
      last_update: now,
      randomIndex: body.randomIndex ?? Math.random(),
    }

    invalidateSearchIndex()

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

    const targetId = String(id)
    const items = await localDb.items.toArray()
    for (const item of items) {
      for (const m of item.meanings || []) {
        for (const ex of (m.examples || []) as any[]) {
          if (ex && typeof ex === 'object' && String(ex.id) === targetId) {
            return {
              isSuccess: true,
              message: 'Example fetched from local items',
              content: ex as IExample,
              statusCode: 200,
            }
          }
        }
      }
    }

    return {
      isSuccess: false,
      message: 'Example not found in local items',
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
    const { user, error } = requireAuth<IExample[]>([])
    if (error) return error

    return await queryLocalExamples(querySearch, user.uid)
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
    const { user, error } = requireAuth<IExample[]>([])
    if (error) return error

    return await getRandomLocalExamples(size, user.uid)
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
 * Update example (Strict Local-Only)
 */
const updateExample = async (body: Partial<IExample>): Promise<IHttpResponse<IExample>> => {
  try {
    if (!body.id) {
      throw new Error('Example ID is required')
    }

    const targetId = String(body.id)
    const now = Date.now()
    const updateData: Partial<IExample> = {
      ...body,
      last_update: now,
    }

    if (body.origin !== undefined) {
      updateData.origin = removeLineBreaks(body.origin)
    }

    if (body.translation !== undefined) {
      updateData.translation = removeLineBreaks(body.translation)
    }

    let updatedExample: IExample | null = null
    const items = await localDb.items.toArray()
    for (const item of items) {
      let changed = false
      const newMeanings = (item.meanings || []).map((m) => {
        const newExamples = (m.examples || []).map((ex: any) => {
          if (ex && typeof ex === 'object' && String(ex.id) === targetId) {
            changed = true
            updatedExample = {
              ...ex,
              ...updateData,
              id: targetId,
            } as IExample
            return updatedExample
          }
          return ex
        })
        return { ...m, examples: newExamples }
      })

      if (changed && item.id) {
        await localDb.items.put({ ...item, meanings: newMeanings })
        break
      }
    }
    invalidateSearchIndex()

    return {
      isSuccess: true,
      message: 'Example updated successfully in items',
      content: updatedExample || ({ ...body, id: targetId } as IExample),
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating example:', error)
    throw error
  }
}

/**
 * Delete example (Strict Local-Only)
 */
const deleteExample = async (id: string): Promise<IHttpResponse<IExample>> => {
  try {
    const targetId = String(id)
    const items = await localDb.items.toArray()
    for (const item of items) {
      let changed = false
      const newMeanings = (item.meanings || []).map((m) => {
        const remaining = (m.examples || []).filter((ex: any) => String(ex?.id) !== targetId)
        if (remaining.length !== (m.examples || []).length) {
          changed = true
          return { ...m, examples: remaining }
        }
        return m
      })
      if (changed && item.id) {
        await localDb.items.put({ ...item, meanings: newMeanings })
        break
      }
    }
    invalidateSearchIndex()

    return {
      isSuccess: true,
      message: 'Example deleted successfully from items',
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
