import { db, dbCollections } from '@/config/firebaseConfig'
import {
  ITag,
  DEFAULT_TAG_COLOR,
  DEFAULT_TAG_ORDER,
  normalizeTag,
  normalizeTagList,
} from '@/models/tag.model'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

export interface IBlogCategory extends ITag {
  uid?: string
  id?: string
}

/**
 * Format blog category name into value slug (e.g. "Tech Talk" => 'tech_talk')
 */
export const formatBlogCategoryValue = (name: string): string => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export interface IBlogCategoryResponse<T> {
  isSuccess: boolean
  message: string
  content: T | null
  statusCode: number
}

export type IArticleCategoryResponse<T> = IBlogCategoryResponse<T>

export interface IBlogCategoryRequestParams {
  orderBy?: 'created_date' | 'name' | 'order'
  order?: 'ASC' | 'DESC'
}

export type IArticleCategoryRequestParams = IBlogCategoryRequestParams

/**
 * Helper to get current blogTags from user configuration in Firestore
 */
const getBlogTagsFromUser = async (uid: string): Promise<ITag[]> => {
  try {
    const userDocRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userDocRef)
    if (userDoc.exists()) {
      const data = userDoc.data()
      const rawTags = data?.configuration?.blogTags
      if (Array.isArray(rawTags)) {
        return normalizeTagList(rawTags)
      }
    }
  } catch (err) {
    console.warn('Failed to get blogTags from Firestore user doc:', err)
  }
  return []
}

/**
 * Helper to save blogTags to user configuration in Firestore
 */
const saveBlogTagsToUser = async (uid: string, tags: ITag[]): Promise<ITag[]> => {
  const normalized = normalizeTagList(tags)
  const userDocRef = doc(db, 'users', uid)
  await setDoc(
    userDocRef,
    {
      configuration: { blogTags: normalized },
      updatedAt: Date.now(),
    },
    { merge: true },
  )
  return normalized
}

/**
 * Blog Tags (Categories) API using user configuration
 */
export const blogCategoriesApi = {
  /**
   * Fetch blog tags/categories list from user configuration
   */
  async getCategories(
    params: IBlogCategoryRequestParams = {},
  ): Promise<IBlogCategoryResponse<IBlogCategory[]>> {
    try {
      let currentUser = firebaseAuthService.getCurrentUser()
      if (!currentUser) {
        currentUser = await firebaseAuthService.waitForUser()
      }

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const rawTags = await getBlogTagsFromUser(currentUser.uid)

      const categories: IBlogCategory[] = rawTags.map((tag) => ({
        ...tag,
        id: tag.name,
        value: tag.value ? formatBlogCategoryValue(tag.value) : formatBlogCategoryValue(tag.name),
        uid: currentUser!.uid,
      }))

      // Sort
      const orderByField = params.orderBy || 'order'
      const orderDirection = params.order === 'DESC' ? 'desc' : 'asc'

      categories.sort((a, b) => {
        if (orderByField === 'name') {
          const comp = a.name.localeCompare(b.name)
          return orderDirection === 'desc' ? -comp : comp
        }
        const diff = (a.order ?? DEFAULT_TAG_ORDER) - (b.order ?? DEFAULT_TAG_ORDER)
        return orderDirection === 'desc' ? -diff : diff
      })

      return {
        isSuccess: true,
        message: 'Success',
        content: categories,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error fetching blog categories:', error)
      return {
        isSuccess: false,
        message: 'Error fetching blog categories',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Get single blog category by name/id
   */
  async getCategoryById(id: string): Promise<IBlogCategoryResponse<IBlogCategory>> {
    try {
      if (!id) {
        return {
          isSuccess: false,
          message: 'Invalid id',
          content: null,
          statusCode: 400,
        }
      }

      let currentUser = firebaseAuthService.getCurrentUser()
      if (!currentUser) {
        currentUser = await firebaseAuthService.waitForUser()
      }

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const tags = await getBlogTagsFromUser(currentUser.uid)
      const matched = tags.find((t) => t.name.toLowerCase() === id.toLowerCase())

      if (!matched) {
        return {
          isSuccess: false,
          message: 'Blog category not found',
          content: null,
          statusCode: 404,
        }
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: {
          ...matched,
          id: matched.name,
          value: matched.value
            ? formatBlogCategoryValue(matched.value)
            : formatBlogCategoryValue(matched.name),
          uid: currentUser.uid,
        },
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error fetching blog category by id:', error)
      return {
        isSuccess: false,
        message: 'Error fetching blog category',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Create a new blog category/tag in user configuration
   */
  async createCategory(data: IBlogCategory): Promise<IBlogCategoryResponse<IBlogCategory>> {
    try {
      let currentUser = firebaseAuthService.getCurrentUser()
      if (!currentUser) {
        currentUser = await firebaseAuthService.waitForUser()
      }

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const normalized = normalizeTag(data)
      if (!normalized || !normalized.name) {
        return {
          isSuccess: false,
          message: 'Category name is required',
          content: null,
          statusCode: 400,
        }
      }

      const currentTags = await getBlogTagsFromUser(currentUser.uid)
      if (currentTags.some((t) => t.name.toLowerCase() === normalized.name.toLowerCase())) {
        const existing = currentTags.find(
          (t) => t.name.toLowerCase() === normalized.name.toLowerCase(),
        )!
        return {
          isSuccess: true,
          message: 'Category already exists',
          content: {
            ...existing,
            id: existing.name,
            value: existing.value
              ? formatBlogCategoryValue(existing.value)
              : formatBlogCategoryValue(existing.name),
            uid: currentUser.uid,
          },
          statusCode: 200,
        }
      }

      const maxOrder =
        currentTags.length > 0 ? Math.max(...currentTags.map((t) => t.order ?? 1)) : 0

      const categoryValue = formatBlogCategoryValue(data.value || normalized.name)

      const newCategory: ITag = {
        ...normalized,
        name: normalized.name,
        value: categoryValue,
        order: typeof data.order === 'number' ? data.order : maxOrder + 1,
        created_date: Date.now(),
        last_update: Date.now(),
      }

      const nextTags = [...currentTags, newCategory]
      await saveBlogTagsToUser(currentUser.uid, nextTags)

      return {
        isSuccess: true,
        message: 'Blog category created successfully',
        content: {
          ...newCategory,
          id: newCategory.name,
          uid: currentUser.uid,
        },
        statusCode: 201,
      }
    } catch (error) {
      console.error('Error creating blog category:', error)
      return {
        isSuccess: false,
        message: 'Error creating blog category',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Update an existing blog category/tag
   */
  async updateCategory(
    id: string,
    data: IBlogCategory,
  ): Promise<IBlogCategoryResponse<IBlogCategory>> {
    try {
      let currentUser = firebaseAuthService.getCurrentUser()
      if (!currentUser) {
        currentUser = await firebaseAuthService.waitForUser()
      }

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const oldName = String(id || '').trim()
      const newName = String(data.name || oldName).trim()

      if (!oldName || !newName) {
        return {
          isSuccess: false,
          message: 'Name is required',
          content: null,
          statusCode: 400,
        }
      }

      const currentTags = await getBlogTagsFromUser(currentUser.uid)
      const oldIndex = currentTags.findIndex((t) => t.name.toLowerCase() === oldName.toLowerCase())

      if (oldIndex === -1) {
        return {
          isSuccess: false,
          message: 'Category not found',
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
          message: 'Category with this name already exists',
          content: null,
          statusCode: 409,
        }
      }

      const existing = currentTags[oldIndex]
      const categoryValue =
        data.value !== undefined && String(data.value).trim() !== ''
          ? formatBlogCategoryValue(data.value)
          : formatBlogCategoryValue(newName)

      const updatedTag: ITag = {
        ...existing,
        ...data,
        name: newName,
        value: categoryValue,
        color: data.color || existing.color || DEFAULT_TAG_COLOR,
        order: typeof data.order === 'number' ? data.order : (existing.order ?? 1),
        last_update: Date.now(),
      }

      const updatedTags = [...currentTags]
      updatedTags[oldIndex] = updatedTag
      await saveBlogTagsToUser(currentUser.uid, updatedTags)

      // Update articles that contain oldName in their tags
      if (oldName.toLowerCase() !== newName.toLowerCase()) {
        try {
          const blogsQuery = query(
            collection(db, dbCollections.blogs || dbCollections.articles),
            where('uid', '==', currentUser.uid),
            where('tags', 'array-contains', oldName),
          )
          const snap = await getDocs(blogsQuery)
          if (!snap.empty) {
            const batch = writeBatch(db)
            snap.docs.forEach((d) => {
              const articleData = d.data()
              const prevTags: string[] = Array.isArray(articleData.tags) ? articleData.tags : []
              const newArticleTags = Array.from(
                new Set(prevTags.map((t) => (t === oldName ? newName : t))),
              )
              batch.update(d.ref, { tags: newArticleTags, last_update: Date.now() })
            })
            await batch.commit()
          }
        } catch (articleErr) {
          console.warn('Failed to update tags in existing articles:', articleErr)
        }
      }

      return {
        isSuccess: true,
        message: 'Blog category updated successfully',
        content: {
          ...updatedTag,
          id: updatedTag.name,
          uid: currentUser.uid,
        },
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error updating blog category:', error)
      return {
        isSuccess: false,
        message: 'Error updating blog category',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Delete a blog category/tag
   */
  async deleteCategory(name: string): Promise<IBlogCategoryResponse<null>> {
    try {
      let currentUser = firebaseAuthService.getCurrentUser()
      if (!currentUser) {
        currentUser = await firebaseAuthService.waitForUser()
      }

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const targetName = String(name || '').trim()
      const currentTags = await getBlogTagsFromUser(currentUser.uid)
      const nextTags = currentTags.filter((t) => t.name.toLowerCase() !== targetName.toLowerCase())

      await saveBlogTagsToUser(currentUser.uid, nextTags)

      // Remove tag from existing articles
      try {
        const blogsQuery = query(
          collection(db, dbCollections.blogs || dbCollections.articles),
          where('uid', '==', currentUser.uid),
          where('tags', 'array-contains', targetName),
        )
        const snap = await getDocs(blogsQuery)
        if (!snap.empty) {
          const batch = writeBatch(db)
          snap.docs.forEach((d) => {
            const articleData = d.data()
            const prevTags: string[] = Array.isArray(articleData.tags) ? articleData.tags : []
            const newTags = prevTags.filter((t) => t !== targetName)
            batch.update(d.ref, { tags: newTags, last_update: Date.now() })
          })
          await batch.commit()
        }
      } catch (articleErr) {
        console.warn('Failed to remove tag from existing articles:', articleErr)
      }

      return {
        isSuccess: true,
        message: 'Blog category deleted successfully',
        content: null,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error deleting blog category:', error)
      return {
        isSuccess: false,
        message: 'Error deleting blog category',
        content: null,
        statusCode: 500,
      }
    }
  },
}
