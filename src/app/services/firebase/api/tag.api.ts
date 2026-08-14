import { db, dbCollections } from '@/config/firebaseConfig'
import { IHttpResponse } from '@/models/http.model'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

interface ITagEntity {
  id?: string
  uid: string
  value: string
  value_lowercase: string
  created_date: number
  last_update: number
}

export interface ITagDto {
  id: string
  value: string
  value_lowercase: string
}

const normalizeTags = (tags: string[] = []) => {
  const cleanTags = tags.map((tag) => tag.trim()).filter(Boolean)
  return Array.from(new Set(cleanTags))
}

const ensureTagsExist = async (tags: string[]): Promise<IHttpResponse<string[]>> => {
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

    const normalizedTags = normalizeTags(tags)

    if (normalizedTags.length === 0) {
      return {
        isSuccess: true,
        message: 'No tags to sync',
        content: [],
        statusCode: 200,
      }
    }

    for (const tag of normalizedTags) {
      const lower = tag.toLowerCase()

      const q = query(
        collection(db, dbCollections.tags),
        where('uid', '==', currentUser.uid),
        where('value_lowercase', '==', lower),
        limit(1),
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        const now = Timestamp.now().toMillis()

        const payload: ITagEntity = {
          uid: currentUser.uid,
          value: tag,
          value_lowercase: lower,
          created_date: now,
          last_update: now,
        }

        await addDoc(collection(db, dbCollections.tags), payload)
      }
    }

    return {
      isSuccess: true,
      message: 'Tags synced successfully',
      content: normalizedTags,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error syncing tags:', error)

    return {
      isSuccess: false,
      message: 'Failed to sync tags',
      content: [],
      statusCode: 500,
    }
  }
}

const createTags = async (tags: string[]): Promise<IHttpResponse<string[]>> => {
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

    const normalizedTags = normalizeTags(tags)

    if (normalizedTags.length === 0) {
      return {
        isSuccess: true,
        message: 'No tags to create',
        content: [],
        statusCode: 200,
      }
    }

    for (const tag of normalizedTags) {
      const lower = tag.toLowerCase()
      const now = Timestamp.now().toMillis()

      const payload: ITagEntity = {
        uid: currentUser.uid,
        value: tag,
        value_lowercase: lower,
        created_date: now,
        last_update: now,
      }

      await addDoc(collection(db, dbCollections.tags), payload)
    }

    return {
      isSuccess: true,
      message: 'Tags created successfully',
      content: normalizedTags,
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

    const q = query(
      collection(db, dbCollections.tags),
      where('uid', '==', currentUser.uid),
      orderBy('value_lowercase', 'asc'),
      limit(200),
    )

    const snapshot = await getDocs(q)

    const normalizedKeyword = keyword.trim().toLowerCase()

    let tags = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Partial<ITagEntity>
        return {
          id: doc.id,
          value: String(data.value || '').trim(),
          value_lowercase: String(data.value_lowercase || '').trim(),
        }
      })
      .filter((tag) => tag.value)

    // If keyword is empty, return all tags
    if (normalizedKeyword) {
      tags = tags.filter((tag) => tag.value.toLowerCase().includes(normalizedKeyword))
    }

    const uniqueByLowercase = new Map<string, ITagDto>()
    tags.forEach((tag) => {
      const key = tag.value_lowercase || tag.value.toLowerCase()
      if (!uniqueByLowercase.has(key)) {
        uniqueByLowercase.set(key, {
          id: tag.id,
          value: tag.value,
          value_lowercase: key,
        })
      }
    })

    return {
      isSuccess: true,
      message: 'Tags fetched successfully',
      content: Array.from(uniqueByLowercase.values()),
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

const createTag = async (value: string): Promise<IHttpResponse<ITagDto | null>> => {
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

    const normalizedValue = String(value || '').trim()
    if (!normalizedValue) {
      return {
        isSuccess: false,
        message: 'Tag is required',
        content: null,
        statusCode: 400,
      }
    }

    const normalizedLowercase = normalizedValue.toLowerCase()

    const existsQuery = query(
      collection(db, dbCollections.tags),
      where('uid', '==', currentUser.uid),
      where('value_lowercase', '==', normalizedLowercase),
      limit(1),
    )

    const existsSnapshot = await getDocs(existsQuery)
    if (!existsSnapshot.empty) {
      const existedDoc = existsSnapshot.docs[0]
      return {
        isSuccess: false,
        message: 'Tag already exists',
        content: {
          id: existedDoc.id,
          value: normalizedValue,
          value_lowercase: normalizedLowercase,
        },
        statusCode: 409,
      }
    }

    const now = Timestamp.now().toMillis()
    const payload: ITagEntity = {
      uid: currentUser.uid,
      value: normalizedValue,
      value_lowercase: normalizedLowercase,
      created_date: now,
      last_update: now,
    }

    const createdDoc = await addDoc(collection(db, dbCollections.tags), payload)

    return {
      isSuccess: true,
      message: 'Tag created successfully',
      content: {
        id: createdDoc.id,
        value: normalizedValue,
        value_lowercase: normalizedLowercase,
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

const updateTag = async (tagId: string, value: string): Promise<IHttpResponse<ITagDto | null>> => {
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

    if (!tagId) {
      return {
        isSuccess: false,
        message: 'Invalid tag id',
        content: null,
        statusCode: 400,
      }
    }

    const normalizedValue = String(value || '').trim()
    if (!normalizedValue) {
      return {
        isSuccess: false,
        message: 'Tag is required',
        content: null,
        statusCode: 400,
      }
    }

    const tagRef = doc(db, dbCollections.tags, tagId)
    const tagDoc = await getDoc(tagRef)

    if (!tagDoc.exists()) {
      return {
        isSuccess: false,
        message: 'Tag not found',
        content: null,
        statusCode: 404,
      }
    }

    const existingTag = tagDoc.data() as Partial<ITagEntity>
    if (existingTag.uid !== currentUser.uid) {
      return {
        isSuccess: false,
        message: 'Unauthorized',
        content: null,
        statusCode: 403,
      }
    }

    const normalizedLowercase = normalizedValue.toLowerCase()

    const duplicateQuery = query(
      collection(db, dbCollections.tags),
      where('uid', '==', currentUser.uid),
      where('value_lowercase', '==', normalizedLowercase),
      limit(1),
    )

    const duplicateSnapshot = await getDocs(duplicateQuery)
    if (!duplicateSnapshot.empty && duplicateSnapshot.docs[0].id !== tagId) {
      return {
        isSuccess: false,
        message: 'Tag already exists',
        content: null,
        statusCode: 409,
      }
    }

    await updateDoc(tagRef, {
      value: normalizedValue,
      value_lowercase: normalizedLowercase,
      last_update: Timestamp.now().toMillis(),
    })

    return {
      isSuccess: true,
      message: 'Tag updated successfully',
      content: {
        id: tagId,
        value: normalizedValue,
        value_lowercase: normalizedLowercase,
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

const deleteTag = async (tagId: string): Promise<IHttpResponse<null>> => {
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

    if (!tagId) {
      return {
        isSuccess: false,
        message: 'Invalid tag id',
        content: null,
        statusCode: 400,
      }
    }

    const tagRef = doc(db, dbCollections.tags, tagId)
    const tagDoc = await getDoc(tagRef)

    if (!tagDoc.exists()) {
      return {
        isSuccess: false,
        message: 'Tag not found',
        content: null,
        statusCode: 404,
      }
    }

    const existingTag = tagDoc.data() as Partial<ITagEntity>
    if (existingTag.uid !== currentUser.uid) {
      return {
        isSuccess: false,
        message: 'Unauthorized',
        content: null,
        statusCode: 403,
      }
    }

    await deleteDoc(tagRef)

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
}
