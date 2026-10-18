import { db, dbCollections } from '@/config/firebaseConfig'
import { requireAuth } from '@/services/firebase/authService'
import { IChecklistItem, IChecklistDoc } from '@/models/checklist.model'
import { IItem } from '@/models/item.model'
import { localDb } from '@/services/localDb'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'

export const checklistApi = {
  /**
   * Get all checklist items for the current user.
   * Only item references (itemId) are stored in checklists; here we hydrate with the newest IItem data.
   */
  async getChecklist(): Promise<IChecklistItem[]> {
    const { user, error } = requireAuth()
    if (error || !user) return []

    const q = query(
      collection(db, dbCollections.checklists),
      where('uid', '==', user.uid)
    )

    const snapshot = await getDocs(q)
    const checklistDocs = snapshot.docs.map((docSnap) => ({
      checklistId: docSnap.id,
      ...(docSnap.data() as IChecklistDoc),
    }))

    // Sort descending by added_date in-memory
    checklistDocs.sort((a, b) => (b.added_date || 0) - (a.added_date || 0))

    if (checklistDocs.length === 0) return []

    // Hydrate each checklist entry with the newest item data
    const hydratedList: IChecklistItem[] = await Promise.all(
      checklistDocs.map(async (entry) => {
        const targetItemId = entry.itemId || (entry as any).id
        let item: IItem | null = null

        // 1. Try resolving from localDb (fastest, offline-first)
        if (targetItemId) {
          try {
            const local = await localDb.items.get(targetItemId)
            if (local && !local.is_deleted) {
              item = local
            }
          } catch (e) {
            console.warn('Failed to load item from localDb:', e)
          }
        }

        // 2. Fallback to Firestore items collection
        if (!item && targetItemId) {
          try {
            const itemDoc = await getDoc(doc(db, dbCollections.items, targetItemId))
            if (itemDoc.exists()) {
              item = { id: itemDoc.id, ...itemDoc.data() } as IItem
            }
          } catch (e) {
            console.warn('Failed to load item from Firestore:', e)
          }
        }

        // 3. Fallback to legacy embedded properties if available, or placeholder
        if (!item) {
          const legacy = entry as any
          item = {
            id: targetItemId || '',
            origin: legacy.origin || '(Item not found)',
            level: legacy.level || 0,
            archive: false,
            tags: legacy.tags || [],
            forms: legacy.forms || [],
            collocations: legacy.collocations || [],
            word_family: legacy.word_family || [],
            relation: legacy.relation || [],
            meanings: legacy.meanings || [],
          }
        }

        return {
          ...item,
          checklistId: entry.checklistId,
          itemId: targetItemId,
          isCompleted: !!entry.isCompleted,
          added_date: entry.added_date || Date.now(),
        }
      })
    )

    return hydratedList
  },

  /**
   * Add item ID and checklist metadata to dbCollections.checklists (saving only reference ID)
   */
  async addFromItem(item: IItem): Promise<{ isSuccess: boolean; message: string }> {
    const { user, error } = requireAuth()
    if (error || !user || !item?.id) {
      return { isSuccess: false, message: 'User not authenticated or invalid item' }
    }

    // 1. Check if item is already in checklist
    const checkQuery = query(
      collection(db, dbCollections.checklists),
      where('uid', '==', user.uid),
      where('itemId', '==', item.id)
    )
    const existing = await getDocs(checkQuery)
    if (!existing.empty) {
      return { isSuccess: false, message: `"${item.origin}" is already in your checklist` }
    }

    // 2. Save only the itemId and checklist metadata in Firestore
    const checklistPayload: IChecklistDoc = {
      uid: user.uid,
      itemId: item.id,
      isCompleted: false,
      added_date: Date.now(),
      last_update: Date.now(),
    }

    await addDoc(collection(db, dbCollections.checklists), checklistPayload)
    return { isSuccess: true, message: `Added "${item.origin}" to checklist` }
  },

  /**
   * Toggle completion status
   */
  async toggleComplete(checklistId: string, isCompleted: boolean): Promise<void> {
    const docRef = doc(db, dbCollections.checklists, checklistId)
    await updateDoc(docRef, {
      isCompleted,
      last_update: Date.now(),
    })
  },

  /**
   * Remove item from checklist
   */
  async remove(checklistId: string): Promise<void> {
    const docRef = doc(db, dbCollections.checklists, checklistId)
    await deleteDoc(docRef)
  },
}
