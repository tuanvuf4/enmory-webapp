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
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore'

export interface IBlogCategory {
  id?: string
  uid?: string
  name: string
  description?: string
  category_type?: 'blog' | 'posts' | 'articles' | string
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
const buildQueryConstraints = (params: IBlogCategoryRequestParams): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []
  const currentUser = firebaseAuthService.getCurrentUser()

  // Filter by current user
  if (currentUser) {
    constraints.push(where('uid', '==', currentUser.uid))
  }

  // Order by
  const orderByField = params.orderBy || 'created_date'
  const orderDirection = params.order === 'DESC' ? 'desc' : 'asc'
  constraints.push(orderBy(orderByField, orderDirection))

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
    params: IBlogCategoryRequestParams,
  ): Promise<IBlogCategoryResponse<IBlogCategory[]>> {
    try {
      const currentUser = firebaseAuthService.getCurrentUser()

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const constraints: QueryConstraint[] = buildQueryConstraints(params)

      const q = query(collection(db, dbCollections.blog_categories || dbCollections.article_categories), ...constraints)
      const querySnapshot = await getDocs(q)

      const categories = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          uid: data.uid,
          name: data.name,
          description: data.description,
          category_type: data.category_type,
          color: data.color,
          order: data.order,
          created_date: data.created_date,
          last_update: data.last_update,
        } as IBlogCategory
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
        description: data.description,
        color: data.color,
        order: data.order,
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
  async createCategory(
    data: IBlogCategory,
  ): Promise<IBlogCategoryResponse<IBlogCategory>> {
    try {
      const currentUser = firebaseAuthService.getCurrentUser()

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const categoryData: IBlogCategory = {
        ...data,
        uid: currentUser.uid,
        created_date: Timestamp.now().toMillis(),
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = await addDoc(collection(db, dbCollections.blog_categories || dbCollections.article_categories), categoryData)

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
      const currentUser = firebaseAuthService.getCurrentUser()

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
        }
      }

      const categoryData = {
        name: data.name,
        description: data.description,
        category_type: data.category_type,
        color: data.color,
        order: data.order,
        last_update: Timestamp.now().toMillis(),
      }

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
      const currentUser = firebaseAuthService.getCurrentUser()

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

