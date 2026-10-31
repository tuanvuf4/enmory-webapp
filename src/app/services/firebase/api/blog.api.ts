import { addDoc, collection, doc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore'

import { db, dbCollections } from '@/config/firebaseConfig'
import { IBlogItem } from '@/models/blog.model'
import { firebaseAuthService } from '@/services/firebase/authService'
import { localDb } from '@/services/localDb/db'

export interface IBlogResponse<T> {
  isSuccess: boolean
  message: string
  content: T | null
  statusCode: number
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
 * Blog API:
 * - Read operations (getBlogs, getBlogsCount, getBlogById) ONLY read from localDb.
 * - Write operations (createBlog, updateBlog, deleteBlog) write to both localDb and Firestore.
 */
export const blogApi = {
  /**
   * Fetch blogs list exclusively from localDb
   */
  async getBlogs(params: IBlogRequestParams): Promise<IBlogResponse<IBlogItem[]>> {
    try {
      let currentUser = firebaseAuthService.getCurrentUser()
      if (!currentUser) {
        currentUser = await firebaseAuthService.waitForUser()
      }

      if (!currentUser) {
        return {
          isSuccess: false,
          message: 'Unauthorized',
          content: [],
          statusCode: 401,
          hasMore: false,
        }
      }

      let userBlogs = await localDb.blogs.where('uid').equals(currentUser.uid).toArray()

      // Filter by tag if provided
      if (params.tag) {
        const variants = getTagVariants(params.tag).map((v) => v.toLowerCase())
        userBlogs = userBlogs.filter((b) => {
          const bTags = (b.tags || []).map((t) => String(t).trim().toLowerCase())
          return bTags.some((t) => variants.includes(t))
        })
      }

      // Filter by keyword if provided
      if (params.keyword) {
        const kw = params.keyword.trim().toLowerCase()
        userBlogs = userBlogs.filter(
          (b) =>
            (b.title || '').toLowerCase().includes(kw) ||
            (b.description || '').toLowerCase().includes(kw),
        )
      }

      // Sort
      const orderByField = params.orderBy || 'created_date'
      const isDesc = params.order !== 'ASC'
      userBlogs.sort((a: any, b: any) => {
        let valA = a[orderByField] ?? 0
        let valB = b[orderByField] ?? 0
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA < valB) return isDesc ? 1 : -1
        if (valA > valB) return isDesc ? -1 : 1
        return 0
      })

      const pageSize = params.size || 10
      const pageNum = params.page || 0
      const startIdx = pageNum * pageSize
      const pagedBlogs = userBlogs.slice(startIdx, startIdx + pageSize)
      const hasMore = userBlogs.length > startIdx + pageSize

      return {
        isSuccess: true,
        message: 'Success',
        content: pagedBlogs,
        statusCode: 200,
        hasMore,
      }
    } catch (error: any) {
      console.error('Error fetching blogs from localDb:', error)
      return {
        isSuccess: false,
        message: error?.message || 'Error fetching blogs',
        content: [],
        statusCode: 500,
        hasMore: false,
      }
    }
  },

  /**
   * Alias for getBlogs
   */
  async getArticles(params: IBlogRequestParams): Promise<IBlogResponse<IBlogItem[]>> {
    return this.getBlogs(params)
  },

  /**
   * Create a new blog: saves to both Firestore and localDb
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

      // 1. Create in Firestore
      const docRef = await addDoc(
        collection(db, dbCollections.blogs || dbCollections.articles),
        blogData,
      )

      const createdBlog = {
        id: docRef.id,
        ...blogData,
      } as IBlogItem

      // 2. Save in Local DB
      try {
        await localDb.blogs.put(createdBlog)
      } catch (localErr) {
        console.warn('Failed to save created blog to localDb:', localErr)
      }

      return {
        isSuccess: true,
        message: 'Blog created successfully',
        content: createdBlog,
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
   * Get total count of blogs for current user exclusively from localDb
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

      let userBlogs = await localDb.blogs.where('uid').equals(currentUser.uid).toArray()
      if (tag) {
        const variants = getTagVariants(tag).map((v) => v.toLowerCase())
        userBlogs = userBlogs.filter((b) => {
          const bTags = (b.tags || []).map((t) => String(t).trim().toLowerCase())
          return bTags.some((t) => variants.includes(t))
        })
      }
      return userBlogs.length
    } catch (error) {
      console.error('Error counting blogs from localDb:', error)
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
   * Get single blog by id exclusively from localDb
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

      const localBlog = await localDb.blogs.get(id)
      if (!localBlog) {
        return {
          isSuccess: false,
          message: 'Blog not found',
          content: null,
          statusCode: 404,
        }
      }

      return {
        isSuccess: true,
        message: 'Success',
        content: localBlog,
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('Error fetching blog from localDb by id:', error)
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
   * Update an existing blog: updates in both Firestore and localDb
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

      // 1. Update in Firestore
      const docRef = doc(db, dbCollections.blogs || dbCollections.articles, id)
      await updateDoc(docRef, blogData)

      const updatedBlog = {
        id,
        uid: currentUser.uid,
        title: data.title,
        description: data.description,
        relation: data.relation || [],
        tags,
        created_date: extractCreatedDate(data),
        last_update: now,
      } as IBlogItem

      // 2. Update in Local DB
      try {
        await localDb.blogs.put(updatedBlog)
      } catch (localErr) {
        console.warn('Failed to update blog in localDb:', localErr)
      }

      return {
        isSuccess: true,
        message: 'Blog updated successfully',
        content: updatedBlog,
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
   * Delete an existing blog: deletes from both Firestore and localDb, recording into deleted_records
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

      // 1. Delete from Firestore and record deletion into deleted_records
      const docRef = doc(db, dbCollections.blogs || dbCollections.articles, id)
      const deletedRecordRef = doc(db, dbCollections.deleted_records, `${currentUser.uid}_${id}`)

      const batch = writeBatch(db)
      batch.delete(docRef)
      batch.set(deletedRecordRef, {
        uid: currentUser.uid,
        recordId: id,
        collectionName: dbCollections.blogs || 'articles',
        deleted_at: Timestamp.now(),
      })
      await batch.commit()

      // 2. Delete from Local DB
      try {
        await localDb.blogs.delete(id)
      } catch (localErr) {
        console.warn('Failed to delete blog from localDb:', localErr)
      }

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
