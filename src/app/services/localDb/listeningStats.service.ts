import { localDb, IListeningHistoryItem } from './db'
import { dictationApi } from '@/services/firebase/api/dictation.api'
import { firebaseAuthService } from '@/services/firebase/authService'
import moment from 'moment'

export interface IListeningSummary {
  totalPracticed: number
  perfectCount: number
  avgAccuracy: number
  todayCount: number
  recentSessions: IListeningHistoryItem[]
}

export type TListeningTimeRange = 7 | 14 | 30

export interface IListeningTimelineData {
  labels: string[]
  counts: number[]
  avgAccuracies: (number | null)[]
  hasActivityInRange: boolean
  totalPracticedInRange: number
  range: TListeningTimeRange
}

export const normalizeRecordDate = (r: IListeningHistoryItem): string => {
  if (r.date && typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date.trim())) {
    return r.date.trim()
  }
  if (r.timestamp && typeof r.timestamp === 'number') {
    return moment(r.timestamp).format('YYYY-MM-DD')
  }
  if (r.created_date && typeof r.created_date === 'number') {
    return moment(r.created_date).format('YYYY-MM-DD')
  }
  if (r.date) {
    const m = moment(r.date)
    if (m.isValid()) return m.format('YYYY-MM-DD')
  }
  return ''
}

const getRecordsForUser = async (userUid?: string): Promise<IListeningHistoryItem[]> => {
  const uid = userUid || firebaseAuthService.getCurrentUser()?.uid

  if (!uid) {
    return await localDb.listeningHistory.toArray()
  }

  try {
    let records = await localDb.listeningHistory.where('uid').equals(uid).toArray()

    // If no records tagged with this uid, check if there are legacy records without uid
    if (records.length === 0) {
      const allRecords = await localDb.listeningHistory.toArray()
      const unassigned = allRecords.filter((r) => !r.uid)
      if (unassigned.length > 0) {
        await Promise.all(
          unassigned.map((r) => r.id && localDb.listeningHistory.update(r.id, { uid })),
        )
        records = unassigned.map((r) => ({ ...r, uid }))
      }
    }

    // If still empty locally, attempt to load from cloud on-demand so profile has data
    if (records.length === 0) {
      try {
        const cloudRecords = await dictationApi.getDictations(uid)
        if (cloudRecords.length > 0) {
          await localDb.listeningHistory.bulkAdd(
            cloudRecords.map(({ id: _i, ...rest }) => ({
              ...rest,
              uid,
            })),
          )
          records = await localDb.listeningHistory.where('uid').equals(uid).toArray()
        }
      } catch (cloudErr) {
        console.warn('Failed to load initial dictations from cloud:', cloudErr)
      }
    }

    return records
  } catch (err) {
    console.warn('Error fetching listening records for user:', err)
    return await localDb.listeningHistory.toArray()
  }
}

export const listeningStatsService = {
  /**
   * Record a completed listening / dictation sentence result.
   * Saves to local IndexedDB immediately and pushes to Firestore in background.
   */
  async recordPractice(
    item: Omit<IListeningHistoryItem, 'id' | 'timestamp' | 'date'>,
  ): Promise<number | undefined> {
    try {
      const now = new Date()
      const nowTs = now.getTime()
      const dateStr = moment(now).format('YYYY-MM-DD')
      const effectiveUid = item.uid || firebaseAuthService.getCurrentUser()?.uid

      const record: IListeningHistoryItem = {
        ...item,
        uid: effectiveUid,
        timestamp: nowTs,
        date: dateStr,
        created_date: nowTs,
        last_update: nowTs,
      }

      const localId = await localDb.listeningHistory.add(record)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('enmory:dictation-updated', { detail: record }))
      }

      // If user is authenticated, save to Firestore cloud asynchronously
      if (effectiveUid) {
        dictationApi
          .addDictation({
            uid: effectiveUid,
            sentenceId: record.sentenceId,
            sentenceOrigin: record.sentenceOrigin,
            userText: record.userText,
            accuracy: record.accuracy,
            isPerfect: record.isPerfect,
            sourceType: record.sourceType,
            voice: record.voice,
            date: dateStr,
            timestamp: nowTs,
            created_date: nowTs,
            last_update: nowTs,
          })
          .then((docId) => {
            if (docId && localId) {
              localDb.listeningHistory.update(localId, { docId }).catch(() => {})
            }
          })
          .catch((err) => {
            console.warn('Background dictation upload error:', err)
          })
      }

      return localId
    } catch (err) {
      console.warn('Failed to save listening practice record:', err)
      return undefined
    }
  },

  /**
   * Fetch aggregated summary stats for listening practice.
   */
  async getListeningSummary(uid?: string): Promise<IListeningSummary> {
    try {
      const allRecords = await getRecordsForUser(uid)
      const total = allRecords.length
      if (total === 0) {
        return {
          totalPracticed: 0,
          perfectCount: 0,
          avgAccuracy: 0,
          todayCount: 0,
          recentSessions: [],
        }
      }

      const todayStr = moment().format('YYYY-MM-DD')
      let perfectCount = 0
      let totalAcc = 0
      let todayCount = 0

      for (const r of allRecords) {
        if (r.isPerfect || (r.accuracy !== undefined && r.accuracy >= 100)) perfectCount++
        totalAcc += r.accuracy || 0
        const rDate = normalizeRecordDate(r)
        if (rDate === todayStr) todayCount++
      }

      const avgAccuracy = Math.round(totalAcc / total)
      // Sort descending by timestamp or created_date, take top 10
      const recentSessions = [...allRecords]
        .sort((a, b) => (b.timestamp || b.created_date || 0) - (a.timestamp || a.created_date || 0))
        .slice(0, 10)

      return {
        totalPracticed: total,
        perfectCount,
        avgAccuracy,
        todayCount,
        recentSessions,
      }
    } catch (err) {
      console.error('Error fetching listening summary stats:', err)
      return {
        totalPracticed: 0,
        perfectCount: 0,
        avgAccuracy: 0,
        todayCount: 0,
        recentSessions: [],
      }
    }
  },

  /**
   * Fetch timeline practice data for chart rendering.
   * Supports 7, 14, 30 days or 'all'.
   */
  async getTimelineChartData(
    range: TListeningTimeRange = 7,
    uid?: string,
  ): Promise<IListeningTimelineData> {
    try {
      const allRecords = await getRecordsForUser(uid)
      const labels: string[] = []
      const counts: number[] = []
      const avgAccuracies: (number | null)[] = []
      const daysCount: number = range

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = moment().subtract(i, 'days')
        const dateStr = d.format('YYYY-MM-DD')
        const label = d.format('DD/MM')
        labels.push(label)

        const dayRecords = allRecords.filter((r) => normalizeRecordDate(r) === dateStr)
        counts.push(dayRecords.length)

        if (dayRecords.length > 0) {
          const sumAcc = dayRecords.reduce((acc, cur) => acc + (cur.accuracy || 0), 0)
          avgAccuracies.push(Math.round(sumAcc / dayRecords.length))
        } else {
          avgAccuracies.push(null)
        }
      }

      const totalPracticedInRange = counts.reduce((sum, c) => sum + c, 0)
      const hasActivityInRange = totalPracticedInRange > 0

      return {
        labels,
        counts,
        avgAccuracies,
        hasActivityInRange,
        totalPracticedInRange,
        range,
      }
    } catch (err) {
      console.error('Error fetching timeline chart data:', err)
      return {
        labels: [],
        counts: [],
        avgAccuracies: [],
        hasActivityInRange: false,
        totalPracticedInRange: 0,
        range,
      }
    }
  },
}
