import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  QueryConstraint,
  doc,
  getDoc,
} from 'firebase/firestore'

export interface IBlogCategory {
  id?: string
  uid?: string
  name: string
  color?: string
  order?: number
  created_date?: number
  last_update?: number
}

export type IArticleCategory = IBlogCategory

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
 * Helper function to build Firestore query constraints for blog categories
 */
const buildQueryConstraints = (uid?: string): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []

  // Filter by current user
  if (uid) {
    constraints.push(where('uid', '==', uid))
  }

  return constraints
}

/**
 * Blog Categories API
 */
export const blogCategoriesApi = {
  /**
   * Fetch blog categories list
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

      const constraints: QueryConstraint[] = buildQueryConstraints(currentUser.uid)

      const q = query(
        collection(db, dbCollections.blog_categories || dbCollections.article_categories),
        ...constraints,
      )
      const querySnapshot = await getDocs(q)

      const categories = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          uid: data.uid,
          name: data.name,
          color: data.color,
          order: typeof data.order === 'number' ? data.order : 0,
          created_date: data.created_date,
          last_update: data.last_update,
        } as IBlogCategory
      })

      // Sort in-memory to avoid Firestore composite index requirement and handle missing created_date
      const orderByField = params.orderBy || 'order'
      const orderDirection = params.order === 'DESC' ? 'desc' : 'asc'

      categories.sort((a, b) => {
        if (orderByField === 'order') {
          const orderA = typeof a.order === 'number' ? a.order : 0
          const orderB = typeof b.order === 'number' ? b.order : 0
          if (orderA !== orderB) {
            return orderDirection === 'desc' ? orderB - orderA : orderA - orderB
          }
          const timeA = a.created_date || 0
          const timeB = b.created_date || 0
          if (timeA !== timeB) {
            return timeA - timeB
          }
          return (a.name || '').localeCompare(b.name || '')
        }
        if (orderByField === 'name') {
          const nameA = (a.name || '').toLowerCase()
          const nameB = (b.name || '').toLowerCase()
          const comp = nameA.localeCompare(nameB)
          return orderDirection === 'desc' ? -comp : comp
        }

        const timeA = a.created_date || 0
        const timeB = b.created_date || 0
        if (timeA !== timeB) {
          return orderDirection === 'desc' ? timeB - timeA : timeA - timeB
        }
        return (a.name || '').localeCompare(b.name || '')
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
   * Get single blog category by id
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

      const docRef = doc(db, dbCollections.blog_categories || dbCollections.article_categories, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          isSuccess: false,
          message: 'Blog category not found',
          content: null,
          statusCode: 404,
        }
      }

      const data = docSnap.data()

      const category: IBlogCategory = {
        id: docSnap.id,
        uid: data.uid,
        name: data.name,
        color: data.color,
        order: typeof data.order === 'number' ? data.order : 0,
        created_date: data.created_date,
        last_update: data.last_update,
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: category,
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
   * Create a new blog category
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

      const now = Timestamp.now().toMillis()
      const categoryData: Record<string, any> = {
        uid: currentUser.uid,
        name: data.name || '',
        color: data.color ?? '',
        order: typeof data.order === 'number' ? data.order : 0,
        created_date: data.created_date || now,
        last_update: now,
      }

      const docRef = await addDoc(
        collection(db, dbCollections.blog_categories || dbCollections.article_categories),
        categoryData,
      )

      return {
        isSuccess: true,
        message: 'Blog category created successfully',
        content: {
          id: docRef.id,
          ...categoryData,
        } as IBlogCategory,
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
   * Update an existing blog category
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

      const categoryData: Record<string, any> = {
        last_update: Timestamp.now().toMillis(),
      }
      if (data.name !== undefined) categoryData.name = data.name
      if (data.color !== undefined) categoryData.color = data.color
      if (data.order !== undefined) categoryData.order = typeof data.order === 'number' ? data.order : 0

      const docRef = doc(db, dbCollections.blog_categories || dbCollections.article_categories, id)
      await updateDoc(docRef, categoryData)

      return {
        isSuccess: true,
        message: 'Blog category updated successfully',
        content: {
          id,
          uid: currentUser.uid,
          ...categoryData,
        } as IBlogCategory,
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
   * Delete a blog category
   */
  async deleteCategory(id: string): Promise<IBlogCategoryResponse<null>> {
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

      const docRef = doc(db, dbCollections.blog_categories || dbCollections.article_categories, id)
      await deleteDoc(docRef)

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

export const articleCategoriesApi = blogCategoriesApi
