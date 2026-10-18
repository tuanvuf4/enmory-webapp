import { IBlogItem } from '@/models/blog.model'
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

export interface IBlogResponse<T> {
  isSuccess: boolean
  message: string
  content: T | null
  statusCode: number
  lastDoc?: QueryDocumentSnapshot<DocumentData>
  hasMore?: boolean
}

export type IArticleResponse<T> = IBlogResponse<T>

export interface IBlogRequestParams {
  keyword?: string
  categoryId?: string
  page: number
  size: number
  orderBy?: 'created_date' | 'title'
  order?: 'ASC' | 'DESC'
}

export type IArticleRequestParams = IBlogRequestParams

/**
 * Helper function to build Firestore query constraints for blogs
 */
const buildQueryConstraints = (params: IBlogRequestParams): QueryConstraint[] => {
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
 * Get blogs list with pagination support
 */
export const blogApi = {
  /**
   * Fetch blogs list
   */
  async getBlogs(
    params: IBlogRequestParams,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
  ): Promise<IBlogResponse<IBlogItem[]>> {
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

      const q = query(collection(db, dbCollections.blogs || dbCollections.articles), ...constraints)
      const querySnapshot = await getDocs(q)

      let blogs: IBlogItem[] = []
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

        blogs = docsToProcess.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            uid: data.uid,
            title: data.title,
            description: data.description,
            category_id: data.category_id,
            relation: data.relation || [],
            tags: data.tags || [],
            created_date: data.created_date,
            last_update: data.last_update,
          } as IBlogItem
        })
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: blogs,
        statusCode: 200,
        lastDoc: newLastDoc,
        hasMore,
      }
    } catch (error) {
      console.error('Error fetching blogs:', error)
      return {
        isSuccess: false,
        message: 'Error fetching blogs',
        content: null,
        statusCode: 500,
        lastDoc: undefined,
        hasMore: false,
      }
    }
  },

  /**
   * Alias for getBlogs
   */
  async getArticles(
    params: IBlogRequestParams,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
  ): Promise<IBlogResponse<IBlogItem[]>> {
    return this.getBlogs(params, lastDoc)
  },

  /**
   * Create a new blog
   */
  async createBlog(data: IBlogItem): Promise<IBlogResponse<IBlogItem>> {
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

      const blogData: IBlogItem = {
        ...data,
        relation: data.relation || [],
        tags: data.tags || [],
        uid: currentUser.uid,
        created_date: Timestamp.now().toMillis(),
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = await addDoc(
        collection(db, dbCollections.blogs || dbCollections.articles),
        blogData,
      )

      return {
        isSuccess: true,
        message: 'Blog created successfully',
        content: {
          id: docRef.id,
          ...blogData,
        } as IBlogItem,
        statusCode: 201,
      }
    } catch (error) {
      console.error('Error creating blog:', error)
      return {
        isSuccess: false,
        message: 'Error creating blog',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Alias for createBlog
   */
  async createArticle(data: IBlogItem): Promise<IBlogResponse<IBlogItem>> {
    return this.createBlog(data)
  },

  /**
   * Get total count of blogs for current user
   */
  async getBlogsCount(categoryId?: string): Promise<number> {
    try {
      const currentUser = firebaseAuthService.getCurrentUser()

      if (!currentUser) {
        return 0
      }

      const constraints: QueryConstraint[] = [where('uid', '==', currentUser.uid)]

      if (categoryId) {
        constraints.push(where('category_id', '==', categoryId))
      }

      const q = query(collection(db, dbCollections.blogs || dbCollections.articles), ...constraints)

      const countSnapshot = await getCountFromServer(q)
      return countSnapshot.data().count
    } catch (error) {
      console.error('Error getting blogs count:', error)
      return 0
    }
  },

  /**
   * Alias for getBlogsCount
   */
  async getArticlesCount(categoryId?: string): Promise<number> {
    return this.getBlogsCount(categoryId)
  },

  /**
   * Get single blog by id
   */
  async getBlogById(id: string): Promise<IBlogResponse<IBlogItem>> {
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
        getDoc(doc(db, dbCollections.blogs || dbCollections.articles, id)),
      )

      if (!docRef.exists()) {
        return {
          isSuccess: false,
          message: 'Blog not found',
          content: null,
          statusCode: 404,
        }
      }

      const data = docRef.data()

      const blog: IBlogItem = {
        id: docRef.id,
        uid: (data as any).uid,
        title: (data as any).title,
        description: (data as any).description,
        category_id: (data as any).category_id,
        relation: (data as any).relation || [],
        tags: (data as any).tags || [],
        created_date: (data as any).created_date,
        last_update: (data as any).last_update,
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: blog,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error fetching blog by id:', error)
      return {
        isSuccess: false,
        message: 'Error fetching blog',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Alias for getBlogById
   */
  async getArticleById(id: string): Promise<IBlogResponse<IBlogItem>> {
    return this.getBlogById(id)
  },

  /**
   * Update an existing blog
   */
  async updateBlog(id: string, data: IBlogItem): Promise<IBlogResponse<IBlogItem>> {
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

      const blogData = {
        title: data.title,
        description: data.description,
        category_id: data.category_id || null,
        relation: data.relation || [],
        tags: data.tags || [],
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = doc(db, dbCollections.blogs || dbCollections.articles, id)
      await updateDoc(docRef, blogData)

      return {
        isSuccess: true,
        message: 'Blog updated successfully',
        content: {
          id,
          ...data,
          ...blogData,
        } as IBlogItem,
        statusCode: 200,
      }
    } catch (error) {
      console.error('Error updating blog:', error)
      return {
        isSuccess: false,
        message: 'Error updating blog',
        content: null,
        statusCode: 500,
      }
    }
  },

  /**
   * Alias for updateBlog
   */
  async updateArticle(id: string, data: IBlogItem): Promise<IBlogResponse<IBlogItem>> {
    return this.updateBlog(id, data)
  },
}

export const articleApi = blogApi
