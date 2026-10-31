import {
  addDoc,
  collection,
  deleteDoc,
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
  orderBy?: 'created_date' | 'last_update' | 'title'
  order?: 'ASC' | 'DESC'
}

export type IArticleRequestParams = IBlogRequestParams

/**
 * Helper to generate tag variations for querying (e.g. 'tech_blog' -> ['tech_blog', 'tech blog', 'Tech Blog', 'Tech blog'])
 */
export const getTagVariants = (tag: string): string[] => {
  const clean = tag.trim()
  if (!clean) return []

  const variants = new Set<string>()
  variants.add(clean)

  // slugified: 'tech_blog'
  const slug = clean.toLowerCase().replace(/\s+/g, '_')
  variants.add(slug)

  // space-separated: 'tech blog'
  const withSpaces = clean.replace(/_/g, ' ').replace(/-/g, ' ')
  variants.add(withSpaces)

  // Title Case: 'Tech Blog'
  const titleCase = withSpaces.replace(/\b\w/g, (c) => c.toUpperCase())
  variants.add(titleCase)

  // Capitalized first letter: 'Tech blog'
  const capFirst = withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
  variants.add(capFirst)

  // hyphenated: 'tech-blog'
  variants.add(clean.replace(/_/g, '-'))

  return Array.from(variants).filter(Boolean)
}

/**
 * Helper function to build Firestore query constraints for blogs
 */
const buildQueryConstraints = (params: IBlogRequestParams, currentUser: any): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []

  // Filter by current user
  if (currentUser) {
    constraints.push(where('uid', '==', currentUser.uid))
  }

  // Filter by tag if provided
  const filterTag = params.tag
  if (filterTag) {
    const variants = getTagVariants(filterTag)
    if (variants.length === 1) {
      constraints.push(where('tags', 'array-contains', variants[0]))
    } else if (variants.length > 1) {
      constraints.push(where('tags', 'array-contains-any', variants.slice(0, 10)))
    }
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
  return []
}

/**
 * Helper to safely extract a timestamp (milliseconds number) from various date/timestamp formats
 */
export const normalizeBlogTimestamp = (val: any): number | undefined => {
  if (val === null || val === undefined) return undefined
  if (typeof val === 'number') {
    // If it's in seconds instead of milliseconds (e.g. 10 digits vs 13 digits)
    if (val > 0 && val < 10000000000) {
      return val * 1000
    }
    return val
  }
  if (typeof val?.toMillis === 'function') {
    return val.toMillis()
  }
  if (typeof val?.toDate === 'function') {
    return val.toDate().getTime()
  }
  if (typeof val?.seconds === 'number') {
    return Math.round(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000)
  }
  if (val instanceof Date) {
    return val.getTime()
  }
  if (typeof val === 'string') {
    const num = Number(val)
    if (!isNaN(num) && num > 0) {
      return num < 10000000000 ? num * 1000 : num
    }
    const parsed = Date.parse(val)
    if (!isNaN(parsed)) return parsed
  }
  return undefined
}

/**
 * Extract last_update with fallbacks across possible field names and created_date
 */
export const extractLastUpdate = (data: any): number | undefined => {
  if (!data) return undefined
  const raw =
    data.last_update ??
    data.last_updated ??
    data.lastUpdate ??
    data.updated_at ??
    data.updatedAt ??
    data.modified_date ??
    data.modify_date ??
    data.created_date ??
    data.createdAt ??
    data.created_at
  return normalizeBlogTimestamp(raw)
}

/**
 * Extract created_date with fallbacks
 */
export const extractCreatedDate = (data: any): number | undefined => {
  if (!data) return undefined
  const raw =
    data.created_date ??
    data.createdAt ??
    data.created_at ??
    data.create_date ??
    data.last_update ??
    data.last_updated
  return normalizeBlogTimestamp(raw)
}

/**
 * Map Firestore doc snapshot to normalized IBlogItem
 */
export const mapDocToBlogItem = (docSnap: any): IBlogItem => {
  const data = docSnap.data() || {}
  const tags = normalizeArticleTags(data)
  const created_date = extractCreatedDate(data)
  const last_update = extractLastUpdate(data) || created_date

  return {
    ...data,
    id: docSnap.id,
    uid: data.uid,
    title: data.title,
    description: data.description,
    relation: data.relation || [],
    tags,
    created_date,
    last_update,
  } as IBlogItem
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
          lastDoc: undefined,
          hasMore: false,
        }
      }

      const constraints: QueryConstraint[] = buildQueryConstraints(params, currentUser)

      // Handle pagination - startAfter must come after orderBy but before limit
      if (lastDoc) {
        const limitIndex = constraints.length - 1
        constraints.splice(limitIndex, 0, startAfter(lastDoc))
      }

      let querySnapshot: any
      try {
        const q = query(
          collection(db, dbCollections.blogs || dbCollections.articles),
          ...constraints,
        )
        querySnapshot = await getDocs(q)
      } catch (queryErr: any) {
        console.warn('Primary blog query failed, executing fallback in-memory query:', queryErr)
        // Fallback for missing composite index or query limitation
        const fallbackQ = query(
          collection(db, dbCollections.blogs || dbCollections.articles),
          where('uid', '==', currentUser.uid),
        )
        const allDocsSnapshot = await getDocs(fallbackQ)
        const filterTag = (params.tag || '').trim().toLowerCase()
        const variants = filterTag ? getTagVariants(filterTag).map((v) => v.toLowerCase()) : []

        let filteredDocs = allDocsSnapshot.docs.filter((docSnap: any) => {
          if (!filterTag) return true
          const data = docSnap.data()
          const tags = normalizeArticleTags(data).map((t) => t.toLowerCase())
          return tags.some((t) => variants.includes(t) || t === filterTag)
        })

        // Sort in memory for fallback query
        const orderByField = params.orderBy || 'created_date'
        const isDesc = params.order !== 'ASC'
        filteredDocs.sort((a: any, b: any) => {
          const dataA = a.data() || {}
          const dataB = b.data() || {}
          let valA: any
          let valB: any

          if (orderByField === 'last_update') {
            valA = extractLastUpdate(dataA) || 0
            valB = extractLastUpdate(dataB) || 0
          } else if (orderByField === 'created_date') {
            valA = extractCreatedDate(dataA) || 0
            valB = extractCreatedDate(dataB) || 0
          } else {
            valA = (dataA[orderByField] || '').toString().toLowerCase()
            valB = (dataB[orderByField] || '').toString().toLowerCase()
          }

          if (valA < valB) return isDesc ? 1 : -1
          if (valA > valB) return isDesc ? -1 : 1
          return 0
        })

        const startIdx = params.page * params.size
        const pagedDocs = filteredDocs.slice(startIdx, startIdx + params.size)
        const hasMore = filteredDocs.length > startIdx + params.size
        const newLastDoc = pagedDocs.length > 0 ? pagedDocs[pagedDocs.length - 1] : undefined

        const blogs: IBlogItem[] = pagedDocs.map(mapDocToBlogItem)

        return {
          isSuccess: true,
          message: 'Success',
          content: blogs,
          statusCode: 200,
          lastDoc: newLastDoc,
          hasMore,
        }
      }

      let blogs: IBlogItem[] = []
      let newLastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined
      let hasMore = false

      if (querySnapshot.docs.length > 0) {
        if (querySnapshot.docs.length > params.size) {
          hasMore = true
        }

        newLastDoc = querySnapshot.docs[Math.min(params.size - 1, querySnapshot.docs.length - 1)]
        const docsToProcess = querySnapshot.docs.slice(0, params.size)

        blogs = docsToProcess.map(mapDocToBlogItem)
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: blogs,
        statusCode: 200,
        lastDoc: newLastDoc,
        hasMore,
      }
    } catch (error: any) {
      console.error('Error fetching blogs:', error)
      return {
        isSuccess: false,
        message: error?.message || 'Error fetching blogs',
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
      const tags = normalizeArticleTags(data)
      const created_date = extractCreatedDate(data) || now
      const last_update = now

      const blogData: Record<string, any> = {
        title: data.title,
        description: data.description,
        relation: data.relation || [],
        tags,
        uid: currentUser.uid,
        created_date,
        last_update,
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
    } catch (error: any) {
      console.error('Error creating blog:', error)
      return {
        isSuccess: false,
        message: error?.message || 'Error creating blog',
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
  async getBlogsCount(tag?: string): Promise<number> {
    try {
      let currentUser = firebaseAuthService.getCurrentUser()
      if (!currentUser) {
        currentUser = await firebaseAuthService.waitForUser()
      }

      if (!currentUser) {
        return 0
      }

      const constraints: QueryConstraint[] = [where('uid', '==', currentUser.uid)]

      if (tag) {
        const variants = getTagVariants(tag)
        if (variants.length === 1) {
          constraints.push(where('tags', 'array-contains', variants[0]))
        } else if (variants.length > 1) {
          constraints.push(where('tags', 'array-contains-any', variants.slice(0, 10)))
        }
      }

      try {
        const q = query(
          collection(db, dbCollections.blogs || dbCollections.articles),
          ...constraints,
        )
        const countSnapshot = await getCountFromServer(q)
        return countSnapshot.data().count
      } catch (err) {
        console.warn('getBlogsCount query failed, fallback counting:', err)
        const fallbackQ = query(
          collection(db, dbCollections.blogs || dbCollections.articles),
          where('uid', '==', currentUser.uid),
        )
        const allDocsSnapshot = await getDocs(fallbackQ)
        if (!tag) return allDocsSnapshot.docs.length

        const target = tag.trim().toLowerCase()
        const variants = getTagVariants(target).map((v) => v.toLowerCase())

        return allDocsSnapshot.docs.filter((docSnap: any) => {
          const data = docSnap.data()
          const tags = normalizeArticleTags(data).map((t) => t.toLowerCase())
          return tags.some((t) => variants.includes(t) || t === target)
        }).length
      }
    } catch (error) {
      console.error('Error getting blogs count:', error)
      return 0
    }
  },

  /**
   * Alias for getBlogsCount
   */
  async getArticlesCount(tag?: string): Promise<number> {
    return this.getBlogsCount(tag)
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

      const blog = mapDocToBlogItem(docRef)

      return {
        isSuccess: true,
        message: 'Success',
        content: blog,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('Error fetching blog by id:', error)
      return {
        isSuccess: false,
        message: error?.message || 'Error fetching blog',
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
      const tags = normalizeArticleTags(data)
      const blogData: Record<string, any> = {
        title: data.title,
        description: data.description,
        relation: data.relation || [],
        tags,
        last_update: now,
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
          created_date: extractCreatedDate(data),
          last_update: now,
        } as IBlogItem,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('Error updating blog:', error)
      return {
        isSuccess: false,
        message: error?.message || 'Error updating blog',
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

  /**
   * Delete an existing blog
   */
  async deleteBlog(id: string): Promise<IBlogResponse<boolean>> {
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

      const docRef = doc(db, dbCollections.blogs || dbCollections.articles, id)
      await deleteDoc(docRef)

      return {
        isSuccess: true,
        message: 'Blog deleted successfully',
        content: true,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('Error deleting blog:', error)
      return {
        isSuccess: false,
        message: error?.message || 'Error deleting blog',
        content: false,
        statusCode: 500,
      }
    }
  },

  /**
   * Alias for deleteBlog
   */
  async deleteArticle(id: string): Promise<IBlogResponse<boolean>> {
    return this.deleteBlog(id)
  },
}

export const articleApi = blogApi
