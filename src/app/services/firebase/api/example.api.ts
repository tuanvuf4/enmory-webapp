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
  getPinnedLocalExamples,
  invalidateSearchIndex,
} from '@/services/localDb'
import { collection, doc, updateDoc } from 'firebase/firestore'

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
    console.error('Error creating example in localDb:', error)
    throw error
  }
}

/**
 * Get example by ID (Strict Local-Only)
 * Resolves example and attaches parent item context (itemId, itemOrigin, catId).
 */
const getExampleById = async (id: string | number): Promise<IHttpResponse<IExample>> => {
  try {
    if (!id) {
      throw new Error('Example ID is required')
    }

    const targetId = String(id).trim()
    const items = await localDb.items.toArray()
    for (const item of items) {
      for (const m of item.meanings || []) {
        for (const ex of (m.examples || []) as any[]) {
          if (ex && typeof ex === 'object') {
            const currentExId = ex.id || `${item.id || ''}_${(ex.origin || '').trim()}`
            if (String(currentExId) === targetId || String(ex.id) === targetId) {
              return {
                isSuccess: true,
                message: 'Example fetched from local items',
                content: {
                  ...ex,
                  id: currentExId,
                  itemId: item.id,
                  itemOrigin: item.origin,
                  catId: item.catId,
                  uid: ex.uid || item.uid,
                } as IExample,
                statusCode: 200,
              }
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
 * Updates the example within its parent item in localDb and Firestore,
 * preserving parent item metadata (itemId, itemOrigin, catId).
 */
const updateExample = async (body: Partial<IExample>): Promise<IHttpResponse<IExample>> => {
  try {
    if (!body.id) {
      throw new Error('Example ID is required')
    }

    const targetId = String(body.id).trim()
    const now = Date.now()
    const updateData: Partial<IExample> = {
      ...body,
      last_update: now,
    }

    if (body.origin !== undefined) {
      updateData.origin = removeLineBreaks(body.origin).trim()
    }

    if (body.translation !== undefined) {
      updateData.translation = removeLineBreaks(body.translation).trim()
    }

    let updatedExample: IExample | null = null
    const items = await localDb.items.toArray()

    for (const item of items) {
      let changed = false
      const newMeanings = (item.meanings || []).map((m: any) => {
        const newExamples = (m.examples || []).map((ex: any) => {
          if (ex && typeof ex === 'object') {
            const exId = ex.id || `${item.id || ''}_${(ex.origin || '').trim()}`
            if (String(exId) === targetId || String(ex.id) === targetId) {
              changed = true
              const finalId = ex.id || targetId
              const origin = updateData.origin !== undefined ? updateData.origin : ex.origin
              const translation =
                updateData.translation !== undefined ? updateData.translation : ex.translation
              const note = updateData.note !== undefined ? updateData.note : ex.note

              const mergedEmbedded = {
                ...ex,
                ...updateData,
                id: finalId,
                origin,
                translation,
                note,
                last_update: now,
              }

              updatedExample = {
                ...mergedEmbedded,
                itemId: item.id,
                itemOrigin: item.origin,
                catId: item.catId,
              } as IExample

              return mergedEmbedded
            }
          }
          return ex
        })
        return { ...m, examples: newExamples }
      })

      if (changed && item.id) {
        await localDb.items.put({ ...item, meanings: newMeanings })
        try {
          const itemRef = doc(db, dbCollections.items, item.id)
          await updateDoc(itemRef, {
            meanings: newMeanings,
            last_update: Date.now(),
          })
        } catch (cloudErr) {
          console.warn('Failed to sync updated example to Firestore:', cloudErr)
        }
        break
      }
    }
    invalidateSearchIndex()

    const result = updatedExample || ({ ...body, id: targetId } as IExample)

    return {
      isSuccess: true,
      message: 'Example updated successfully in items',
      content: result,
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
    const targetId = String(id).trim()
    const items = await localDb.items.toArray()
    for (const item of items) {
      let changed = false
      const newMeanings = (item.meanings || []).map((m: any) => {
        const remaining = (m.examples || []).filter((ex: any) => {
          if (!ex || typeof ex !== 'object') return false
          const exId = ex.id || `${item.id || ''}_${(ex.origin || '').trim()}`
          return String(exId) !== targetId && String(ex.id) !== targetId
        })
        if (remaining.length !== (m.examples || []).length) {
          changed = true
          return { ...m, examples: remaining }
        }
        return m
      })
      if (changed && item.id) {
        await localDb.items.put({ ...item, meanings: newMeanings })
        try {
          const itemRef = doc(db, dbCollections.items, item.id)
          await updateDoc(itemRef, {
            meanings: newMeanings,
            last_update: Date.now(),
          })
        } catch (cloudErr) {
          console.warn('Failed to sync deleted example to Firestore:', cloudErr)
        }
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

/**
 * Get pinned examples by their IDs (Strict Local-Only)
 */
const getPinnedExamples = async (pinnedIds: string[]): Promise<IHttpResponse<IExample[]>> => {
  try {
    const { user, error } = requireAuth<IExample[]>([])
    if (error) return error

    return await getPinnedLocalExamples(pinnedIds, user.uid)
  } catch (error) {
    console.error('Error fetching pinned examples:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch pinned examples',
      content: [],
      statusCode: 500,
    }
  }
}

export const exampleApi = {
  createExample,
  getExampleById,
  getExamples,
  getRandomExamples,
  getPinnedExamples,
  updateExample,
  deleteExample,
}
