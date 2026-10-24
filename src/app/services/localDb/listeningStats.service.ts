import { localDb, IListeningHistoryItem } from './db'
import moment from 'moment'

export interface IListeningSummary {
  totalPracticed: number
  perfectCount: number
  avgAccuracy: number
  todayCount: number
  recentSessions: IListeningHistoryItem[]
}

export interface IListeningTimelineData {
  labels: string[]
  counts: number[]
  avgAccuracies: number[]
}

export const listeningStatsService = {
  /**
   * Record a completed listening / dictation sentence result.
   */
  async recordPractice(
    item: Omit<IListeningHistoryItem, 'id' | 'timestamp' | 'date'>,
  ): Promise<number | undefined> {
    try {
      const now = new Date()
      const dateStr = moment(now).format('YYYY-MM-DD')
      const record: IListeningHistoryItem = {
        ...item,
        timestamp: now.getTime(),
        date: dateStr,
      }
      return await localDb.listeningHistory.add(record)
    } catch (err) {
      console.warn('Failed to save listening practice record:', err)
      return undefined
    }
  },

  /**
   * Fetch aggregated summary stats for listening practice.
   */
  async getListeningSummary(): Promise<IListeningSummary> {
    try {
      const allRecords = await localDb.listeningHistory.toArray()
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
        if (r.isPerfect || r.accuracy >= 100) perfectCount++
        totalAcc += r.accuracy || 0
        if (r.date === todayStr) todayCount++
      }

      const avgAccuracy = Math.round(totalAcc / total)
      // Sort descending by timestamp, take top 10
      const recentSessions = allRecords
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
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
   * Fetch timeline practice data for chart rendering (last N days).
   */
  async getTimelineChartData(days = 7): Promise<IListeningTimelineData> {
    try {
      const allRecords = await localDb.listeningHistory.toArray()
      const labels: string[] = []
      const counts: number[] = []
      const avgAccuracies: number[] = []

      for (let i = days - 1; i >= 0; i--) {
        const d = moment().subtract(i, 'days')
        const dateStr = d.format('YYYY-MM-DD')
        const label = d.format('DD/MM')
        labels.push(label)

        const dayRecords = allRecords.filter((r) => r.date === dateStr)
        counts.push(dayRecords.length)

        if (dayRecords.length > 0) {
          const sumAcc = dayRecords.reduce((acc, cur) => acc + (cur.accuracy || 0), 0)
          avgAccuracies.push(Math.round(sumAcc / dayRecords.length))
        } else {
          avgAccuracies.push(0)
        }
      }

      return {
        labels,
        counts,
        avgAccuracies,
      }
    } catch (err) {
      console.error('Error fetching timeline chart data:', err)
      return { labels: [], counts: [], avgAccuracies: [] }
    }
  },
}
