import { db, dbCollections } from '@/config/firebaseConfig'
import { IDictationHistoryItem } from '@/models/dictation.model'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  getCountFromServer,
  writeBatch,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore'

const FIRESTORE_BATCH_LIMIT = 400

export const dictationApi = {
  /**
   * Save a single dictation practice record to Firestore
   */
  async addDictation(record: Omit<IDictationHistoryItem, 'id' | 'docId'>): Promise<string | null> {
    try {
      if (!record.uid) return null
      const colRef = collection(db, dbCollections.dictations)
      const now = Date.now()
      const payload = {
        ...record,
        created_date: record.created_date || now,
        last_update: record.last_update || now,
      }
      const docRef = await addDoc(colRef, payload)
      return docRef.id
    } catch (err) {
      console.warn('Failed to save dictation to Firestore:', err)
      return null
    }
  },

  /**
   * Fetch user dictations from Firestore (supports delta via `since` timestamp)
   */
  async getDictations(uid: string, since?: number): Promise<IDictationHistoryItem[]> {
    try {
      if (!uid) return []
      let snapshot: any
      if (since && since > 0) {
        try {
          const q = query(
            collection(db, dbCollections.dictations),
            where('uid', '==', uid),
            where('last_update', '>', since),
          )
          snapshot = await getDocs(q)
        } catch (idxErr) {
          console.warn(
            'Delta dictation query failed (composite index may be missing), falling back to uid query:',
            idxErr,
          )
          const fallbackQ = query(collection(db, dbCollections.dictations), where('uid', '==', uid))
          snapshot = await getDocs(fallbackQ)
        }
      } else {
        const q = query(collection(db, dbCollections.dictations), where('uid', '==', uid))
        snapshot = await getDocs(q)
      }

      const list: IDictationHistoryItem[] = []
      snapshot.forEach((d: any) => {
        const data = d.data()
        list.push({
          docId: d.id,
          uid: data.uid || uid,
          date: data.date,
          timestamp: data.timestamp,
          sentenceId: data.sentenceId,
          sentenceOrigin: data.sentenceOrigin,
          userText: data.userText,
          accuracy: data.accuracy,
          isPerfect: data.isPerfect,
          sourceType: data.sourceType,
          voice: data.voice,
          created_date: data.created_date,
          last_update: data.last_update,
        })
      })
      return list
    } catch (err) {
      console.warn('Failed to fetch dictations from Firestore:', err)
      return []
    }
  },

  /**
   * Count user's total dictation records on Firestore
   */
  async getServerDictationCount(uid: string): Promise<number> {
    try {
      if (!uid) return 0
      const q = query(collection(db, dbCollections.dictations), where('uid', '==', uid))
      const snapshot = await getCountFromServer(q)
      return snapshot.data().count
    } catch (err) {
      console.warn('Failed to get server dictation count:', err)
      return 0
    }
  },

  /**
   * Upload multiple local dictation records that do not have a Firestore docId yet.
   * Returns a map of local `id -> docId`.
   */
  async batchUploadDictations(records: IDictationHistoryItem[]): Promise<Map<number, string>> {
    const uploadedMap = new Map<number, string>()
    if (!records || records.length === 0) return uploadedMap

    const chunks: IDictationHistoryItem[][] = []
    for (let i = 0; i < records.length; i += FIRESTORE_BATCH_LIMIT) {
      chunks.push(records.slice(i, i + FIRESTORE_BATCH_LIMIT))
    }

    const now = Date.now()
    for (const chunk of chunks) {
      const batch = writeBatch(db)
      const localIdDocRefPairs: Array<{ localId?: number; docRef: any }> = []

      for (const item of chunk) {
        const colRef = collection(db, dbCollections.dictations)
        const docRef = doc(colRef)
        const { id, docId: _d, ...cleanItem } = item
        batch.set(docRef, {
          ...cleanItem,
          created_date: cleanItem.created_date || cleanItem.timestamp || now,
          last_update: cleanItem.last_update || cleanItem.timestamp || now,
        })
        localIdDocRefPairs.push({ localId: id, docRef })
      }

      await batch.commit()

      for (const pair of localIdDocRefPairs) {
        if (pair.localId !== undefined) {
          uploadedMap.set(pair.localId, pair.docRef.id)
        }
      }
    }

    return uploadedMap
  },

  /**
   * Delete a single dictation record from Firestore by docId
   */
  async deleteDictation(docId: string): Promise<boolean> {
    try {
      if (!docId) return false
      const docRef = doc(db, dbCollections.dictations, docId)
      await deleteDoc(docRef)
      return true
    } catch (err) {
      console.warn('Failed to delete dictation from Firestore:', err)
      return false
    }
  },

  /**
   * Batch delete dictations from Firestore by an array of docIds
   */
  async batchDeleteDictations(docIds: string[]): Promise<number> {
    try {
      const validDocIds = (docIds || []).filter(Boolean)
      if (validDocIds.length === 0) return 0

      const chunks: string[][] = []
      for (let i = 0; i < validDocIds.length; i += FIRESTORE_BATCH_LIMIT) {
        chunks.push(validDocIds.slice(i, i + FIRESTORE_BATCH_LIMIT))
      }

      let deletedCount = 0
      for (const chunk of chunks) {
        const batch = writeBatch(db)
        for (const docId of chunk) {
          const docRef = doc(db, dbCollections.dictations, docId)
          batch.delete(docRef)
        }
        await batch.commit()
        deletedCount += chunk.length
      }

      return deletedCount
    } catch (err) {
      console.warn('Failed to batch delete dictations from Firestore:', err)
      return 0
    }
  },

  /**
   * Update an existing dictation record on Firestore by docId
   */
  async updateDictation(
    docId: string,
    data: Partial<Omit<IDictationHistoryItem, 'docId' | 'id'>>,
  ): Promise<boolean> {
    try {
      if (!docId) return false
      const docRef = doc(db, dbCollections.dictations, docId)
      await updateDoc(docRef, {
        ...data,
        last_update: Date.now(),
      })
      return true
    } catch (err) {
      console.warn('Failed to update dictation on Firestore:', err)
      return false
    }
  },
}
