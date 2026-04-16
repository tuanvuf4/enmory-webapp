import { IArticleItem } from '@/models/article.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  QueryConstraint,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getCountFromServer,
  doc,
  updateDoc,
} from 'firebase/firestore'

interface IArticleResponse<T> {
  isSuccess: boolean
  message: string
  content: T | null
  statusCode: number
  lastDoc?: QueryDocumentSnapshot<DocumentData>
  hasMore?: boolean
}

export interface IArticleRequestParams {
  keyword?: string
  categoryId?: string
  page: number
  size: number
  orderBy?: 'created_date' | 'title'
  order?: 'ASC' | 'DESC'
}

/**
 * Helper function to build Firestore query constraints for articles
 */
const buildQueryConstraints = (params: IArticleRequestParams): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []
  const currentUser = firebaseAuthService.getCurrentUser()

  // Filter by current user
  if (currentUser) {
    constraints.push(where('uid', '==', currentUser.uid))
  }

  // Filter by category if provided
  if (params.categoryId) {
    constraints.push(where('category_id', '==', params.categoryId))
  }

  // Order by
  const orderByField = params.orderBy || 'created_date'
  const orderDirection = params.order === 'DESC' ? 'desc' : 'asc'
  constraints.push(orderBy(orderByField, orderDirection))

  // Limit results + 1 to check if there are more pages
  constraints.push(limit(params.size + 1))

  return constraints
}

/**
 * Get articles list with pagination support
 */
export const articleApi = {
  /**
   * Fetch articles list
   */
  async getArticles(
    params: IArticleRequestParams,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
  ): Promise<IArticleResponse<IArticleItem[]>> {
    try {
      const currentUser = firebaseAuthService.getCurrentUser()

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: null,
          statusCode: 401,
          lastDoc: undefined,
          hasMore: false,
        }
      }

      let constraints: QueryConstraint[] = buildQueryConstraints(params)

      // Handle pagination - startAfter must come after orderBy but before limit
      if (lastDoc) {
        // Insert startAfter before the limit constraint
        // buildQueryConstraints returns: [where, where, orderBy, limit]
        // We need: [where, where, orderBy, startAfter, limit]
        const limitIndex = constraints.length - 1 // limit is always last
        constraints.splice(limitIndex, 0, startAfter(lastDoc))
      }

      const q = query(collection(db, dbCollections.articles), ...constraints)
      const querySnapshot = await getDocs(q)

      let articles: IArticleItem[] = []
      let newLastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined
      let hasMore = false

      if (querySnapshot.docs.length > 0) {
        // If we fetched size + 1 docs, it means there are more pages
        if (querySnapshot.docs.length > params.size) {
          hasMore = true
        }

        // Get the last document of the valid items (before the extra one)
        newLastDoc = querySnapshot.docs[Math.min(params.size - 1, querySnapshot.docs.length - 1)]

        // Slice to get only the requested number of documents
        const docsToProcess = querySnapshot.docs.slice(0, params.size)

        articles = docsToProcess.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            uid: data.uid,
            title: data.title,
            description: data.description,
            category_id: data.category_id,
            created_date: data.created_date,
            last_update: data.last_update,
          } as IArticleItem
        })
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: articles,
        statusCode: 200,
        lastDoc: newLastDoc,
        hasMore,
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
      return {
        isSuccess: false,
        message: 'Error fetching articles',
        content: null,
        statusCode: 500,
        lastDoc: undefined,
        hasMore: false,
      }
    }
  },

  /**
   * Create a new article
   */
  async createArticle(data: IArticleItem): Promise<IArticleResponse<IArticleItem>> {
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

      const articleData: IArticleItem = {
        ...data,
        uid: currentUser.uid,
        created_date: Timestamp.now().toMillis(),
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = await addDoc(collection(db, dbCollections.articles), articleData)

      return {
        isSuccess: true,
        message: 'Article created successfully',
        content: {
          id: docRef.id,
          ...articleData,
        } as IArticleItem,
        statusCode: 201,
      }
    } catch (error) {
      console.error('Error creating article:', error)
      return {
        isSuccess: false,
        message: 'Error creating article',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Get total count of articles for current user
   */
  async getArticlesCount(categoryId?: string): Promise<number> {
    try {
      const currentUser = firebaseAuthService.getCurrentUser()

      if (!currentUser) {
        return 0
      }

      const constraints: QueryConstraint[] = [where('uid', '==', currentUser.uid)]

      if (categoryId) {
        constraints.push(where('category_id', '==', categoryId))
      }

      const q = query(collection(db, dbCollections.articles), ...constraints)

      const countSnapshot = await getCountFromServer(q)
      return countSnapshot.data().count
    } catch (error) {
      console.error('Error getting articles count:', error)
      return 0
    }
  },

  /**
   * Get single article by id
   */
  async getArticleById(id: string): Promise<IArticleResponse<IArticleItem>> {
    try {
      if (!id) {
        return {
          isSuccess: false,
          message: 'Invalid id',
          content: null,
          statusCode: 400,
        }
      }

      const docRef = await import('firebase/firestore').then(({ doc, getDoc }) =>
        getDoc(doc(db, dbCollections.articles, id)),
      )

      if (!docRef.exists()) {
        return {
          isSuccess: false,
          message: 'Article not found',
          content: null,
          statusCode: 404,
        }
      }

      const data = docRef.data()

      const article: IArticleItem = {
        id: docRef.id,
        uid: (data as any).uid,
        title: (data as any).title,
        description: (data as any).description,
        category_id: (data as any).category_id,
        created_date: (data as any).created_date,
        last_update: (data as any).last_update,
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: article,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error fetching article by id:', error)
      return {
        isSuccess: false,
        message: 'Error fetching article',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Update an existing article
   */
  async updateArticle(id: string, data: IArticleItem): Promise<IArticleResponse<IArticleItem>> {
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

      const articleData = {
        title: data.title,
        description: data.description,
        category_id: data.category_id || null,
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = doc(db, dbCollections.articles, id)
      await updateDoc(docRef, articleData)

      return {
        isSuccess: true,
        message: 'Article updated successfully',
        content: {
          id,
          ...data,
          ...articleData,
        } as IArticleItem,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error updating article:', error)
      return {
        isSuccess: false,
        message: 'Error updating article',
        content: null,
        statusCode: 500,
      }
    }
  },
}
