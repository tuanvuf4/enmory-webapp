import { db } from '@/config/firebaseConfig'
import { IHttpResponse } from '@/models/http.model'
import { IItem } from '@/models/item.model'
import {
  ITag,
  ITagEntity,
  ITagDto,
  DEFAULT_TAG_COLOR,
  DEFAULT_TAG_ORDER,
  normalizeTag,
  normalizeTagList,
} from '@/models/tag.model'
import { firebaseAuthService } from '@/services/firebase/authService'
import { localDb } from '@/services/localDb/db'
import { invalidateSearchIndex } from '@/services/localDb/searchEngine'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export type { ITagEntity, ITagDto, ITag }

/**
 * Remove a deleted tag from items in local database only.
 */
const removeTagFromLocalItems = async (uid: string, targetTagLower: string): Promise<number> => {
  if (!uid || !targetTagLower) return 0

  const now = Date.now()
  let modifiedCount = 0

  try {
    const localItems = await localDb.items.where('uid').equals(uid).toArray()
    const updatedLocalItems: IItem[] = []

    for (const item of localItems) {
      const itemTags = item.tags || []
      const itemTagsLower =
        item.tags_lowercase || itemTags.map((t: string) => String(t).trim().toLowerCase())

      const hasTag =
        itemTagsLower.some((t: string) => String(t).trim().toLowerCase() === targetTagLower) ||
        itemTags.some((t: string) => String(t).trim().toLowerCase() === targetTagLower)

      if (hasTag) {
        updatedLocalItems.push({
          ...item,
          tags: itemTags.filter((t: string) => String(t).trim().toLowerCase() !== targetTagLower),
          tags_lowercase: itemTagsLower.filter(
            (t: string) => String(t).trim().toLowerCase() !== targetTagLower,
          ),
          last_update: now,
        })
      }
    }

    if (updatedLocalItems.length > 0) {
      await localDb.items.bulkPut(updatedLocalItems)
      invalidateSearchIndex()
      modifiedCount = updatedLocalItems.length
    }
  } catch (localErr) {
    console.warn('Failed to remove tag from localDb items:', localErr)
  }

  return modifiedCount
}

/**
 * Replace an updated tag in items in local database.
 */
const replaceTagInLocalItems = async (
  uid: string,
  oldTagLower: string,
  newTag: string,
): Promise<number> => {
  if (!uid || !oldTagLower || !newTag) return 0

  const now = Date.now()
  let modifiedCount = 0

  try {
    const localItems = await localDb.items.where('uid').equals(uid).toArray()
    const updatedLocalItems: IItem[] = []

    for (const item of localItems) {
      const itemTags = item.tags || []
      const itemTagsLower =
        item.tags_lowercase || itemTags.map((t: string) => String(t).trim().toLowerCase())

      const hasTag =
        itemTagsLower.some((t: string) => String(t).trim().toLowerCase() === oldTagLower) ||
        itemTags.some((t: string) => String(t).trim().toLowerCase() === oldTagLower)

      if (hasTag) {
        const nextTags = Array.from(
          new Set(
            itemTags.map((t: string) =>
              String(t).trim().toLowerCase() === oldTagLower ? newTag : t,
            ),
          ),
        )
        updatedLocalItems.push({
          ...item,
          tags: nextTags,
          tags_lowercase: nextTags.map((t) => t.toLowerCase()),
          last_update: now,
        })
      }
    }

    if (updatedLocalItems.length > 0) {
      await localDb.items.bulkPut(updatedLocalItems)
      invalidateSearchIndex()
      modifiedCount = updatedLocalItems.length
    }
  } catch (localErr) {
    console.warn('Failed to replace tag in localDb items:', localErr)
  }

  return modifiedCount
}

const recordPendingDeletedTag = async (_uid: string, _targetTagLower: string): Promise<void> => {}
const getPendingDeletedTags = async (_uid: string): Promise<string[]> => []
const clearPendingDeletedTags = async (_uid: string): Promise<void> => {}
const syncDeletedTagsToServer = async (
  _uid: string,
  _deletedTagLowers: string[],
  _onProgress?: (step: string) => void,
): Promise<number> => 0

/**
 * Helper to get current itemTags from user configuration in Firestore
 */
const getItemTagsFromUser = async (uid: string): Promise<ITag[]> => {
  try {
    const userDocRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userDocRef)
    if (userDoc.exists()) {
      const data = userDoc.data()
      const rawTags = data?.configuration?.itemTags
      if (Array.isArray(rawTags)) {
        return normalizeTagList(rawTags)
      }
    }
  } catch (err) {
    console.warn('Failed to get itemTags from Firestore user doc:', err)
  }
  return []
}

/**
 * Helper to save itemTags to user configuration in Firestore
 */
const saveItemTagsToUser = async (uid: string, tags: ITag[]): Promise<ITag[]> => {
  const normalized = normalizeTagList(tags)
  const userDocRef = doc(db, 'users', uid)
  await setDoc(
    userDocRef,
    {
      configuration: { itemTags: normalized },
      updatedAt: Date.now(),
    },
    { merge: true },
  )

  // Helper to save itemTags to user configuration in Firestore
  return normalized
}

/**
 * Fetch all tags for current user from user configuration (no separate Firestore collection query)
 */
const getTags = async (keyword = ''): Promise<IHttpResponse<ITagDto[]>> => {
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

    const normalizedKeyword = keyword.trim().toLowerCase()
    let rawTags = await getItemTagsFromUser(currentUser.uid)

    let tags: ITagDto[] = rawTags.map((tag) => ({
      ...tag,
      id: tag.name,
      value: tag.name,
      value_lowercase: tag.name.toLowerCase(),
    }))

    if (normalizedKeyword) {
      tags = tags.filter((t) => t.value_lowercase.includes(normalizedKeyword))
    }

    tags.sort((a, b) => {
      const orderDiff = (a.order ?? DEFAULT_TAG_ORDER) - (b.order ?? DEFAULT_TAG_ORDER)
      if (orderDiff !== 0) return orderDiff
      return a.value_lowercase.localeCompare(b.value_lowercase)
    })

    return {
      isSuccess: true,
      message: 'Tags fetched successfully',
      content: tags,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching tags:', error)
    return {
      isSuccess: false,
      message: 'Failed to fetch tags',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Create a new tag in user configuration
 */
const createTag = async (
  tagData: string | Partial<ITag>,
): Promise<IHttpResponse<ITagDto | null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null,
        statusCode: 401,
      }
    }

    const normalized = normalizeTag(tagData)
    if (!normalized || !normalized.name) {
      return {
        isSuccess: false,
        message: 'Tag name is required',
        content: null,
        statusCode: 400,
      }
    }

    const currentTags = await getItemTagsFromUser(currentUser.uid)
    const exists = currentTags.some((t) => t.name.toLowerCase() === normalized.name.toLowerCase())

    if (exists) {
      const existing = currentTags.find(
        (t) => t.name.toLowerCase() === normalized.name.toLowerCase(),
      )!
      return {
        isSuccess: false,
        message: 'Tag already exists',
        content: {
          ...existing,
          id: existing.name,
          value: existing.name,
          value_lowercase: existing.name.toLowerCase(),
        },
        statusCode: 409,
      }
    }

    const newTag: ITag = {
      ...normalized,
      order:
        typeof tagData === 'object' && typeof tagData.order === 'number'
          ? tagData.order
          : currentTags.length > 0
            ? Math.max(...currentTags.map((t) => t.order ?? 1)) + 1
            : 1,
      created_date: Date.now(),
      last_update: Date.now(),
    }

    const nextTags = [...currentTags, newTag]
    await saveItemTagsToUser(currentUser.uid, nextTags)

    return {
      isSuccess: true,
      message: 'Tag created successfully',
      content: {
        ...newTag,
        id: newTag.name,
        value: newTag.name,
        value_lowercase: newTag.name.toLowerCase(),
      },
      statusCode: 201,
    }
  } catch (error) {
    console.error('Error creating tag:', error)
    return {
      isSuccess: false,
      message: 'Failed to create tag',
      content: null,
      statusCode: 500,
    }
  }
}

/**
 * Create multiple tags in user configuration
 */
const createTags = async (
  tags: Array<string | Partial<ITag>>,
): Promise<IHttpResponse<ITagDto[]>> => {
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

    const normalizedList = normalizeTagList(tags)
    if (normalizedList.length === 0) {
      return {
        isSuccess: true,
        message: 'No tags to create',
        content: [],
        statusCode: 200,
      }
    }

    const currentTags = await getItemTagsFromUser(currentUser.uid)
    const currentLowers = new Set(currentTags.map((t) => t.name.toLowerCase()))
    let maxOrder = currentTags.length > 0 ? Math.max(...currentTags.map((t) => t.order ?? 1)) : 0

    const tagsToAdd: ITag[] = []
    normalizedList.forEach((tag) => {
      if (!currentLowers.has(tag.name.toLowerCase())) {
        maxOrder += 1
        tagsToAdd.push({
          ...tag,
          order: typeof tag.order === 'number' ? tag.order : maxOrder,
          created_date: Date.now(),
          last_update: Date.now(),
        })
        currentLowers.add(tag.name.toLowerCase())
      }
    })

    if (tagsToAdd.length > 0) {
      const nextTags = [...currentTags, ...tagsToAdd]
      await saveItemTagsToUser(currentUser.uid, nextTags)
    }

    const result: ITagDto[] = tagsToAdd.map((t) => ({
      ...t,
      id: t.name,
      value: t.name,
      value_lowercase: t.name.toLowerCase(),
    }))

    return {
      isSuccess: true,
      message: 'Tags created successfully',
      content: result,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error creating tags:', error)
    return {
      isSuccess: false,
      message: 'Failed to create tags',
      content: [],
      statusCode: 500,
    }
  }
}

/**
 * Ensure all given tags exist in user configuration
 */
const ensureTagsExist = async (
  tags: Array<string | Partial<ITag>>,
): Promise<IHttpResponse<ITagDto[]>> => {
  return createTags(tags)
}

/**
 * Update a tag in user configuration
 */
const updateTag = async (
  tagIdOrName: string,
  updatedData: string | Partial<ITag>,
): Promise<IHttpResponse<ITagDto | null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null,
        statusCode: 401,
      }
    }

    const oldName = String(tagIdOrName || '').trim()
    const nextTag = typeof updatedData === 'string' ? { name: updatedData.trim() } : updatedData

    const newName = String(nextTag.name || oldName).trim()

    if (!oldName || !newName) {
      return {
        isSuccess: false,
        message: 'Tag name is required',
        content: null,
        statusCode: 400,
      }
    }

    const currentTags = await getItemTagsFromUser(currentUser.uid)
    const oldIndex = currentTags.findIndex((t) => t.name.toLowerCase() === oldName.toLowerCase())

    if (oldIndex === -1) {
      return {
        isSuccess: false,
        message: 'Tag not found',
        content: null,
        statusCode: 404,
      }
    }

    const duplicateExists = currentTags.some(
      (t, idx) => idx !== oldIndex && t.name.toLowerCase() === newName.toLowerCase(),
    )
    if (duplicateExists) {
      return {
        isSuccess: false,
        message: 'Tag already exists',
        content: null,
        statusCode: 409,
      }
    }

    const existing = currentTags[oldIndex]
    const mergedTag: ITag = {
      ...existing,
      ...nextTag,
      name: newName,
      value: nextTag.value !== undefined ? String(nextTag.value) : (existing.value ?? ''),
      color: nextTag.color || existing.color || DEFAULT_TAG_COLOR,
      order: typeof nextTag.order === 'number' ? nextTag.order : (existing.order ?? 1),
      last_update: Date.now(),
    }

    const updatedTags = [...currentTags]
    updatedTags[oldIndex] = mergedTag
    await saveItemTagsToUser(currentUser.uid, updatedTags)

    // If tag name changed, update local items using old tag
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      await replaceTagInLocalItems(currentUser.uid, oldName.toLowerCase(), newName)
    }

    return {
      isSuccess: true,
      message: 'Tag updated successfully',
      content: {
        ...mergedTag,
        id: mergedTag.name,
        value: mergedTag.name,
        value_lowercase: mergedTag.name.toLowerCase(),
      },
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating tag:', error)
    return {
      isSuccess: false,
      message: 'Failed to update tag',
      content: null,
      statusCode: 500,
    }
  }
}

/**
 * Delete a tag from user configuration and update items
 */
const deleteTag = async (tagIdOrName: string, tagValue?: string): Promise<IHttpResponse<null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()

    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null,
        statusCode: 401,
      }
    }

    const targetTag = String(tagValue || tagIdOrName || '').trim()
    if (!targetTag) {
      return {
        isSuccess: false,
        message: 'Invalid tag',
        content: null,
        statusCode: 400,
      }
    }

    const targetLower = targetTag.toLowerCase()
    const currentTags = await getItemTagsFromUser(currentUser.uid)
    const nextTags = currentTags.filter((t) => t.name.toLowerCase() !== targetLower)

    await saveItemTagsToUser(currentUser.uid, nextTags)

    // Remove tag from items in local database
    await removeTagFromLocalItems(currentUser.uid, targetLower)

    return {
      isSuccess: true,
      message: 'Tag deleted successfully',
      content: null,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error deleting tag:', error)
    return {
      isSuccess: false,
      message: 'Failed to delete tag',
      content: null,
      statusCode: 500,
    }
  }
}

export const tagApi = {
  ensureTagsExist,
  createTags,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  removeTagFromLocalItems,
  replaceTagInLocalItems,
  recordPendingDeletedTag,
  getPendingDeletedTags,
  clearPendingDeletedTags,
  syncDeletedTagsToServer,
}
