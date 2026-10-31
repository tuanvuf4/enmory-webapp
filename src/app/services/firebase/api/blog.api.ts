import {
  addDoc,
  collection,
  deleteField,
  doc,
  DocumentData,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db, dbCollections } from '@/config/firebaseConfig'
import { IBlogItem } from '@/models/blog.model'
import { firebaseAuthService } from '@/services/firebase/authService'

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
  tag?: string
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

  // Filter by tag/category if provided
  const filterTag = params.tag
  if (filterTag) {
    constraints.push(where('tags', 'array-contains', filterTag))
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
 * Helper to normalize article tags
 */
const normalizeArticleTags = (data: any): string[] => {
  if (Array.isArray(data.tags)) {
    return Array.from(new Set(data.tags.map((t: any) => String(t || '').trim()).filter(Boolean)))
  }
  if (data.category_id && typeof data.category_id === 'string' && data.category_id.trim()) {
    return [data.category_id.trim()]
  }
  return []
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

      const constraints: QueryConstraint[] = buildQueryConstraints(params)

      // Handle pagination - startAfter must come after orderBy but before limit
      if (lastDoc) {
        const limitIndex = constraints.length - 1
        constraints.splice(limitIndex, 0, startAfter(lastDoc))
      }

      const q = query(collection(db, dbCollections.blogs || dbCollections.articles), ...constraints)
      const querySnapshot = await getDocs(q)

      let blogs: IBlogItem[] = []
      let newLastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined
      let hasMore = false

      if (querySnapshot.docs.length > 0) {
        if (querySnapshot.docs.length > params.size) {
          hasMore = true
        }

        newLastDoc = querySnapshot.docs[Math.min(params.size - 1, querySnapshot.docs.length - 1)]
        const docsToProcess = querySnapshot.docs.slice(0, params.size)

        blogs = docsToProcess.map((docSnap) => {
          const data = docSnap.data()
          const tags = normalizeArticleTags(data)
          return {
            id: docSnap.id,
            uid: data.uid,
            title: data.title,
            description: data.description,
            relation: data.relation || [],
            tags,
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

      const tags = normalizeArticleTags(data)
      const blogData: Record<string, any> = {
        title: data.title,
        description: data.description,
        relation: data.relation || [],
        tags,
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
  async getBlogsCount(tagOrCategoryId?: string): Promise<number> {
    try {
      const currentUser = firebaseAuthService.getCurrentUser()

      if (!currentUser) {
        return 0
      }

      const constraints: QueryConstraint[] = [where('uid', '==', currentUser.uid)]

      if (tagOrCategoryId) {
        constraints.push(where('tags', 'array-contains', tagOrCategoryId))
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
  async getArticlesCount(tagOrCategoryId?: string): Promise<number> {
    return this.getBlogsCount(tagOrCategoryId)
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
      const tags = normalizeArticleTags(data)

      const blog: IBlogItem = {
        id: docRef.id,
        uid: (data as any).uid,
        title: (data as any).title,
        description: (data as any).description,
        relation: (data as any).relation || [],
        tags,
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

      const tags = normalizeArticleTags(data)
      const blogData: Record<string, any> = {
        title: data.title,
        description: data.description,
        relation: data.relation || [],
        tags,
        category_id: deleteField(),
        last_update: Timestamp.now().toMillis(),
      }

      const docRef = doc(db, dbCollections.blogs || dbCollections.articles, id)
      await updateDoc(docRef, blogData)

      return {
        isSuccess: true,
        message: 'Blog updated successfully',
        content: {
          id,
          uid: currentUser.uid,
          title: data.title,
          description: data.description,
          relation: data.relation || [],
          tags,
          created_date: data.created_date,
          last_update: Date.now(),
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
