import { GoogleGenAI } from '@google/genai'
import { useEffect, useState } from 'react'

export interface IGeminiRequestLog {
  id: string
  timestamp: number
  service: string
  model: string
  promptTokens: number
  candidatesTokens: number
  totalTokens: number
  durationMs: number
  status: 'success' | 'error'
  errorMessage?: string
}

export interface IGeminiStatItem {
  requests: number
  successRequests: number
  failedRequests: number
  promptTokens: number
  candidatesTokens: number
  totalTokens: number
}

export interface IGeminiUsageStats {
  totalRequests: number
  successRequests: number
  failedRequests: number
  promptTokens: number
  candidatesTokens: number
  totalTokens: number
  byModel: Record<string, IGeminiStatItem>
  byService: Record<string, IGeminiStatItem>
  recentLogs: IGeminiRequestLog[]
  lastUpdated: number
}

export interface IGeminiLimits {
  maxRequests: number
  maxTokens: number
}

export const DEFAULT_GEMINI_LIMITS: IGeminiLimits = {
  maxRequests: 1500, // 1,500 requests (Google AI Studio Free Tier RPD)
  maxTokens: 1000000, // 1,000,000 tokens (1M tokens limit)
}

const STORAGE_KEY = 'enmory_gemini_tracker_stats'
const STATS_CHANGE_EVENT = 'enmory_gemini_stats_changed'
const LIMITS_STORAGE_KEY = 'enmory_gemini_tracker_limits'
const LIMITS_CHANGE_EVENT = 'enmory_gemini_limits_changed'
const MAX_RECENT_LOGS = 100

const defaultStats: IGeminiUsageStats = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  promptTokens: 0,
  candidatesTokens: 0,
  totalTokens: 0,
  byModel: {},
  byService: {},
  recentLogs: [],
  lastUpdated: Date.now(),
}

export const getGeminiStats = (): IGeminiUsageStats => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultStats }
    const parsed = JSON.parse(raw)
    return {
      totalRequests: Number(parsed.totalRequests) || 0,
      successRequests: Number(parsed.successRequests) || 0,
      failedRequests: Number(parsed.failedRequests) || 0,
      promptTokens: Number(parsed.promptTokens) || 0,
      candidatesTokens: Number(parsed.candidatesTokens) || 0,
      totalTokens: Number(parsed.totalTokens) || 0,
      byModel: parsed.byModel || {},
      byService: parsed.byService || {},
      recentLogs: Array.isArray(parsed.recentLogs) ? parsed.recentLogs : [],
      lastUpdated: Number(parsed.lastUpdated) || Date.now(),
    }
  } catch (err) {
    console.error('Failed to parse Gemini usage stats:', err)
    return { ...defaultStats }
  }
}

export const saveGeminiStats = (stats: IGeminiUsageStats): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
    window.dispatchEvent(new CustomEvent(STATS_CHANGE_EVENT, { detail: stats }))
  } catch (err) {
    console.error('Failed to save Gemini usage stats:', err)
  }
}

export const clearGeminiStats = (): void => {
  const reset: IGeminiUsageStats = {
    ...defaultStats,
    lastUpdated: Date.now(),
  }
  saveGeminiStats(reset)
}

export const getGeminiLimits = (): IGeminiLimits => {
  try {
    const raw = localStorage.getItem(LIMITS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_GEMINI_LIMITS }
    const parsed = JSON.parse(raw)
    return {
      maxRequests:
        Number(parsed.maxRequests) > 0
          ? Number(parsed.maxRequests)
          : DEFAULT_GEMINI_LIMITS.maxRequests,
      maxTokens:
        Number(parsed.maxTokens) > 0 ? Number(parsed.maxTokens) : DEFAULT_GEMINI_LIMITS.maxTokens,
    }
  } catch (err) {
    console.error('Failed to parse Gemini limits:', err)
    return { ...DEFAULT_GEMINI_LIMITS }
  }
}

export const saveGeminiLimits = (limits: Partial<IGeminiLimits>): IGeminiLimits => {
  try {
    const current = getGeminiLimits()
    const updated: IGeminiLimits = {
      maxRequests:
        Number(limits.maxRequests) > 0 ? Number(limits.maxRequests) : current.maxRequests,
      maxTokens: Number(limits.maxTokens) > 0 ? Number(limits.maxTokens) : current.maxTokens,
    }
    localStorage.setItem(LIMITS_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent(LIMITS_CHANGE_EVENT, { detail: updated }))
    return updated
  } catch (err) {
    console.error('Failed to save Gemini limits:', err)
    return getGeminiLimits()
  }
}

export const resetGeminiLimits = (): IGeminiLimits => {
  return saveGeminiLimits(DEFAULT_GEMINI_LIMITS)
}

const updateStatItem = (
  item: IGeminiStatItem | undefined,
  isSuccess: boolean,
  promptTokens: number,
  candidatesTokens: number,
  totalTokens: number,
): IGeminiStatItem => {
  const current = item || {
    requests: 0,
    successRequests: 0,
    failedRequests: 0,
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
  }

  return {
    requests: current.requests + 1,
    successRequests: current.successRequests + (isSuccess ? 1 : 0),
    failedRequests: current.failedRequests + (isSuccess ? 0 : 1),
    promptTokens: current.promptTokens + promptTokens,
    candidatesTokens: current.candidatesTokens + candidatesTokens,
    totalTokens: current.totalTokens + totalTokens,
  }
}

export const recordGeminiCall = (
  params: Omit<IGeminiRequestLog, 'id' | 'timestamp'>,
): IGeminiRequestLog => {
  const currentStats = getGeminiStats()
  const isSuccess = params.status === 'success'

  const promptTokens = Math.max(0, Number(params.promptTokens) || 0)
  const candidatesTokens = Math.max(0, Number(params.candidatesTokens) || 0)
  const totalTokens =
    Math.max(0, Number(params.totalTokens) || 0) || promptTokens + candidatesTokens

  const logEntry: IGeminiRequestLog = {
    id: `gemini_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    service: params.service || 'Unknown',
    model: params.model || 'Unknown',
    promptTokens,
    candidatesTokens,
    totalTokens,
    durationMs: Math.max(0, Number(params.durationMs) || 0),
    status: params.status,
    errorMessage: params.errorMessage,
  }

  const updatedByModel = {
    ...currentStats.byModel,
    [logEntry.model]: updateStatItem(
      currentStats.byModel[logEntry.model],
      isSuccess,
      promptTokens,
      candidatesTokens,
      totalTokens,
    ),
  }

  const updatedByService = {
    ...currentStats.byService,
    [logEntry.service]: updateStatItem(
      currentStats.byService[logEntry.service],
      isSuccess,
      promptTokens,
      candidatesTokens,
      totalTokens,
    ),
  }

  const updatedLogs = [logEntry, ...currentStats.recentLogs].slice(0, MAX_RECENT_LOGS)

  const newStats: IGeminiUsageStats = {
    totalRequests: currentStats.totalRequests + 1,
    successRequests: currentStats.successRequests + (isSuccess ? 1 : 0),
    failedRequests: currentStats.failedRequests + (isSuccess ? 0 : 1),
    promptTokens: currentStats.promptTokens + promptTokens,
    candidatesTokens: currentStats.candidatesTokens + candidatesTokens,
    totalTokens: currentStats.totalTokens + totalTokens,
    byModel: updatedByModel,
    byService: updatedByService,
    recentLogs: updatedLogs,
    lastUpdated: Date.now(),
  }

  saveGeminiStats(newStats)
  return logEntry
}

/**
 * Wrapper for ai.models.generateContent that automatically tracks requests and tokens.
 */
export async function generateContentWithTracking(
  ai: GoogleGenAI,
  serviceName: string,
  requestParams: any,
): Promise<any> {
  const startTime = performance.now()
  const model = requestParams?.model || 'unknown'

  try {
    const response = await ai.models.generateContent(requestParams)
    const durationMs = Math.round(performance.now() - startTime)

    const usage = (response as any)?.usageMetadata
    const promptTokens = Number(usage?.promptTokenCount) || 0
    const candidatesTokens = Number(usage?.candidatesTokenCount) || 0
    const totalTokens = Number(usage?.totalTokenCount) || promptTokens + candidatesTokens

    recordGeminiCall({
      service: serviceName,
      model,
      promptTokens,
      candidatesTokens,
      totalTokens,
      durationMs,
      status: 'success',
    })

    return response
  } catch (error: any) {
    const durationMs = Math.round(performance.now() - startTime)
    recordGeminiCall({
      service: serviceName,
      model,
      promptTokens: 0,
      candidatesTokens: 0,
      totalTokens: 0,
      durationMs,
      status: 'error',
      errorMessage: error?.message || String(error),
    })
    throw error
  }
}

/**
 * React hook to subscribe to real-time Gemini usage statistics
 */
export const useGeminiStats = (): IGeminiUsageStats => {
  const [stats, setStats] = useState<IGeminiUsageStats>(getGeminiStats)

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<IGeminiUsageStats>
      if (customEvent?.detail) {
        setStats(customEvent.detail)
      } else {
        setStats(getGeminiStats())
      }
    }

    window.addEventListener(STATS_CHANGE_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(STATS_CHANGE_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  return stats
}

/**
 * React hook to subscribe to real-time Gemini usage limits
 */
export const useGeminiLimits = (): IGeminiLimits => {
  const [limits, setLimits] = useState<IGeminiLimits>(getGeminiLimits)

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<IGeminiLimits>
      if (customEvent?.detail) {
        setLimits(customEvent.detail)
      } else {
        setLimits(getGeminiLimits())
      }
    }

    window.addEventListener(LIMITS_CHANGE_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(LIMITS_CHANGE_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  return limits
}

export const geminiTrackerService = {
  getStats: getGeminiStats,
  saveStats: saveGeminiStats,
  recordCall: recordGeminiCall,
  clearStats: clearGeminiStats,
  getLimits: getGeminiLimits,
  saveLimits: saveGeminiLimits,
  resetLimits: resetGeminiLimits,
  useGeminiLimits,
  generateContentWithTracking,
}
