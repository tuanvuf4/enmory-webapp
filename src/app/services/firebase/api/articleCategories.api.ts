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

export interface IArticleCategory {
  id?: string
  uid?: string
  name: string
  description?: string
  color?: string
  order?: number
  created_date?: number
  last_update?: number
}

interface IArticleCategoryResponse<T> {
  isSuccess: boolean
  message: string
  content: T | null
  statusCode: number
}

export interface IArticleCategoryRequestParams {
  orderBy?: 'created_date' | 'name' | 'order'
  order?: 'ASC' | 'DESC'
}

/**
 * Helper function to build Firestore query constraints for article categories
 */
const buildQueryConstraints = (params: IArticleCategoryRequestParams): QueryConstraint[] => {
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
 * Article Categories API
 */
export const articleCategoriesApi = {
  /**
   * Fetch article categories list
   */
  async getCategories(
    params: IArticleCategoryRequestParams,
  ): Promise<IArticleCategoryResponse<IArticleCategory[]>> {
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

      const q = query(collection(db, dbCollections.article_categories), ...constraints)
      const querySnapshot = await getDocs(q)

      const categories = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          uid: data.uid,
          name: data.name,
          description: data.description,
          color: data.color,
          order: data.order,
          created_date: data.created_date,
          last_update: data.last_update,
        } as IArticleCategory
      })

      return {
        isSuccess: true,
        message: 'Success',
        content: categories,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error fetching article categories:', error)
      return {
        isSuccess: false,
        message: 'Error fetching article categories',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Get single article category by id
   */
  async getCategoryById(id: string): Promise<IArticleCategoryResponse<IArticleCategory>> {
    try {
      if (!id) {
        return {
          isSuccess: false,
          message: 'Invalid id',
          content: null,
          statusCode: 400,
        }
      }

      const docRef = doc(db, dbCollections.article_categories, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          isSuccess: false,
          message: 'Article category not found',
          content: null,
          statusCode: 404,
        }
      }

      const data = docSnap.data()

      const category: IArticleCategory = {
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
      console.error('Error fetching article category by id:', error)
      return {
        isSuccess: false,
        message: 'Error fetching article category',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Create a new article category
   */
  async createCategory(
    data: IArticleCategory,
  ): Promise<IArticleCategoryResponse<IArticleCategory>> {
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

      const categoryData: IArticleCategory = {
        ...data,
        uid: currentUser.uid,
        created_date: Timestamp.now().toMillis(),
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = await addDoc(collection(db, dbCollections.article_categories), categoryData)

      return {
        isSuccess: true,
        message: 'Article category created successfully',
        content: {
          id: docRef.id,
          ...categoryData,
        } as IArticleCategory,
        statusCode: 201,
      }
    } catch (error) {
      console.error('Error creating article category:', error)
      return {
        isSuccess: false,
        message: 'Error creating article category',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Update an existing article category
   */
  async updateCategory(
    id: string,
    data: IArticleCategory,
  ): Promise<IArticleCategoryResponse<IArticleCategory>> {
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
        color: data.color,
        order: data.order,
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = doc(db, dbCollections.article_categories, id)
      await updateDoc(docRef, categoryData)

      return {
        isSuccess: true,
        message: 'Article category updated successfully',
        content: {
          id,
          uid: currentUser.uid,
          ...categoryData,
        } as IArticleCategory,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error updating article category:', error)
      return {
        isSuccess: false,
        message: 'Error updating article category',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Delete an article category
   */
  async deleteCategory(id: string): Promise<IArticleCategoryResponse<null>> {
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

      const docRef = doc(db, dbCollections.article_categories, id)
      await deleteDoc(docRef)

      return {
        isSuccess: true,
        message: 'Article category deleted successfully',
        content: null,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error deleting article category:', error)
      return {
        isSuccess: false,
        message: 'Error deleting article category',
        content: null,
        statusCode: 500,
      }
    }
  },
}
