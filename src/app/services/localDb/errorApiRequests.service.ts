import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { IErrorApiRequest, localDb } from './db'

export const ERROR_API_REQUESTS_CHANGED_EVENT = 'error_api_requests_changed'

const notifyChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ERROR_API_REQUESTS_CHANGED_EVENT))
  }
}

/**
 * Sanitize headers to remove circular structures or sensitive tokens if needed,
 * keeping useful debugging info.
 */
const sanitizeHeaders = (headers: any): Record<string, string> => {
  if (!headers || typeof headers !== 'object') return {}
  const clean: Record<string, string> = {}
  try {
    for (const key of Object.keys(headers)) {
      const val = headers[key]
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        clean[key] = String(val)
      }
    }
  } catch {
    // Ignore serialization issues
  }
  return clean
}

/**
 * Safely parse data payload
 */
const safeParseData = (data: any) => {
  if (data === null || data === undefined) return undefined
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
  return data
}

export const errorApiRequestsService = {
  /**
   * Get all stored error API requests sorted by timestamp descending
   */
  async getAll(): Promise<IErrorApiRequest[]> {
    try {
      const list = await localDb.errorApiRequests.toArray()
      return list.sort((a, b) => b.timestamp - a.timestamp)
    } catch (err) {
      console.error('Failed to get error API requests from localDb:', err)
      return []
    }
  },

  /**
   * Get single error API request by ID
   */
  async getById(id: string): Promise<IErrorApiRequest | undefined> {
    try {
      return await localDb.errorApiRequests.get(id)
    } catch (err) {
      console.error(`Failed to get error API request [${id}]:`, err)
      return undefined
    }
  },

  /**
   * Record a custom or generic error API request
   */
  async recordError(
    entry: Partial<IErrorApiRequest> & { url: string; method?: string },
  ): Promise<IErrorApiRequest> {
    const id = entry.id || `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const record: IErrorApiRequest = {
      id,
      url: entry.url,
      baseURL: entry.baseURL || '',
      method: (entry.method || 'GET').toUpperCase(),
      headers: sanitizeHeaders(entry.headers),
      params: safeParseData(entry.params),
      body: safeParseData(entry.body),
      status: entry.status ?? 0,
      statusText: entry.statusText || 'Error',
      errorMessage: entry.errorMessage || 'Unknown API Error',
      errorDetails: entry.errorDetails || null,
      responseBody: safeParseData(entry.responseBody),
      timestamp: entry.timestamp || Date.now(),
      retryCount: entry.retryCount ?? 0,
      lastRetryAt: entry.lastRetryAt,
      lastStatus: entry.lastStatus || 'failed',
      source: entry.source || 'manual',
    }

    try {
      await localDb.errorApiRequests.put(record)
      notifyChange()
    } catch (err) {
      console.error('Failed to save error API request:', err)
    }

    return record
  },

  /**
   * Automatically record an Axios error from interceptors or catch blocks
   */
  async recordAxiosError(error: AxiosError | any): Promise<IErrorApiRequest | null> {
    if (!error) return null

    const config: AxiosRequestConfig & { __isRetry?: boolean; __retryId?: string } =
      error.config || {}

    // If this failure came from retrying an existing request, update that record instead of creating duplicate
    if (config.__isRetry && config.__retryId) {
      try {
        const existing = await localDb.errorApiRequests.get(config.__retryId)
        if (existing) {
          const updated: IErrorApiRequest = {
            ...existing,
            status: error.response?.status || 0,
            statusText: error.response?.statusText || error.code || 'Network Error',
            errorMessage: error.message || existing.errorMessage,
            errorDetails: error.stack || (error.toJSON ? error.toJSON() : null),
            responseBody: safeParseData(error.response?.data),
            lastRetryAt: Date.now(),
            retryCount: (existing.retryCount || 0) + 1,
            lastStatus: 'failed',
          }
          await localDb.errorApiRequests.put(updated)
          notifyChange()
          return updated
        }
      } catch (err) {
        console.error('Failed to update retried API error record:', err)
      }
    }

    const url = config.url || ''
    if (!url) return null

    const id = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const record: IErrorApiRequest = {
      id,
      url,
      baseURL: config.baseURL || '',
      method: (config.method || 'GET').toUpperCase(),
      headers: sanitizeHeaders(config.headers),
      params: safeParseData(config.params),
      body: safeParseData(config.data),
      status: error.response?.status || 0,
      statusText: error.response?.statusText || (error.code ? String(error.code) : 'Network Error'),
      errorMessage: error.message || 'Request failed',
      errorDetails: error.stack || (error.toJSON ? error.toJSON() : null),
      responseBody: safeParseData(error.response?.data),
      timestamp: Date.now(),
      retryCount: 0,
      lastStatus: 'failed',
      source: 'axios',
    }

    try {
      await localDb.errorApiRequests.put(record)
      notifyChange()
      return record
    } catch (err) {
      console.error('Failed to save Axios error to localDb:', err)
      return null
    }
  },

  /**
   * Re-execute an error API request with exact method, URL, headers, params and body
   */
  async retryRequest(
    request: IErrorApiRequest,
  ): Promise<{ success: boolean; status?: number; data?: any; error?: string }> {
    try {
      // Mark as retrying
      await localDb.errorApiRequests.update(request.id, {
        lastStatus: 'retrying',
      })
      notifyChange()

      // Resolve full target URL
      let targetUrl = request.url
      if (
        request.baseURL &&
        !request.url.startsWith('http://') &&
        !request.url.startsWith('https://')
      ) {
        targetUrl = `${request.baseURL.replace(/\/$/, '')}/${request.url.replace(/^\//, '')}`
      }

      // Execute request with standalone axios
      const response = await axios.request({
        url: targetUrl,
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        params: request.params,
        data: request.body,
        validateStatus: () => true, // Don't throw so we can inspect actual status code
      })

      const isSuccess = response.status >= 200 && response.status < 300

      const updatedRecord: Partial<IErrorApiRequest> = {
        lastStatus: isSuccess ? 'success' : 'failed',
        retryCount: (request.retryCount || 0) + 1,
        lastRetryAt: Date.now(),
        status: response.status,
        statusText: response.statusText,
        responseBody: safeParseData(response.data),
      }

      if (!isSuccess) {
        updatedRecord.errorMessage = `HTTP ${response.status}: ${response.statusText || 'Error response'}`
      }

      await localDb.errorApiRequests.update(request.id, updatedRecord)
      notifyChange()

      if (isSuccess) {
        return {
          success: true,
          status: response.status,
          data: response.data,
        }
      } else {
        return {
          success: false,
          status: response.status,
          data: response.data,
          error: `HTTP ${response.status} ${response.statusText}`,
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network / connection error while replaying request'
      try {
        await localDb.errorApiRequests.update(request.id, {
          lastStatus: 'failed',
          retryCount: (request.retryCount || 0) + 1,
          lastRetryAt: Date.now(),
          errorMessage: errorMsg,
          errorDetails: err?.stack || String(err),
        })
        notifyChange()
      } catch (saveErr) {
        console.error('Failed to update record on retry error:', saveErr)
      }

      return {
        success: false,
        status: 0,
        error: errorMsg,
      }
    }
  },

  /**
   * Retry all stored error API requests
   */
  async retryAll(): Promise<{ total: number; succeeded: number; failed: number }> {
    const list = await this.getAll()
    let succeeded = 0
    let failed = 0

    for (const item of list) {
      const res = await this.retryRequest(item)
      if (res.success) {
        succeeded++
      } else {
        failed++
      }
    }

    return { total: list.length, succeeded, failed }
  },

  /**
   * Delete an error API request by ID
   */
  async delete(id: string): Promise<void> {
    try {
      await localDb.errorApiRequests.delete(id)
      notifyChange()
    } catch (err) {
      console.error(`Failed to delete error request [${id}]:`, err)
    }
  },

  /**
   * Clear all stored error API requests
   */
  async clearAll(): Promise<void> {
    try {
      await localDb.errorApiRequests.clear()
      notifyChange()
    } catch (err) {
      console.error('Failed to clear error API requests:', err)
    }
  },

  /**
   * Simulate sample error API requests for quick developer testing & debugging
   */
  async simulateError(
    type: '404' | '500' | 'network' | 'custom' = '404',
    customData?: Partial<IErrorApiRequest>,
  ): Promise<IErrorApiRequest> {
    if (type === '404') {
      return this.recordError({
        url: 'https://jsonplaceholder.typicode.com/posts/invalid-id-99999',
        method: 'GET',
        status: 404,
        statusText: 'Not Found',
        errorMessage: 'Request failed with status code 404 (Not Found)',
        responseBody: {},
        source: 'simulation',
        ...customData,
      })
    }

    if (type === '500') {
      return this.recordError({
        url: 'https://httpbin.org/status/500',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { debugKey: 'test_item_creation', timestamp: Date.now() },
        status: 500,
        statusText: 'Internal Server Error',
        errorMessage: 'Request failed with status code 500 (Internal Server Error)',
        responseBody: { error: 'Simulated backend crash' },
        source: 'simulation',
        ...customData,
      })
    }

    if (type === 'network') {
      return this.recordError({
        url: 'https://nonexistent-sample-domain-12345.xyz/api/v1/sync',
        method: 'GET',
        status: 0,
        statusText: 'Network Error',
        errorMessage: 'Network Error: Failed to resolve host or connect',
        source: 'simulation',
        ...customData,
      })
    }

    return this.recordError({
      url: customData?.url || 'https://jsonplaceholder.typicode.com/posts',
      method: customData?.method || 'POST',
      status: customData?.status || 400,
      statusText: customData?.statusText || 'Bad Request',
      errorMessage: customData?.errorMessage || 'Validation Error: Missing required fields',
      body: customData?.body || { title: '' },
      source: 'simulation',
      ...customData,
    })
  },
}
