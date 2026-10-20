import { db, dbCollections } from '@/config/firebaseConfig'
import { requireAuth } from '@/services/firebase/authService'
import { IChecklistItem, IChecklistDoc } from '@/models/checklist.model'
import { IItem } from '@/models/item.model'
import { hydrateItemsWithExamples } from '@/services/firebase/dbIntegration'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  documentId,
} from 'firebase/firestore'

const FIRESTORE_IN_QUERY_LIMIT = 30

export const checklistApi = {
  /**
   * Get all checklist items for the current user directly from Firebase DB (Firestore).
   * Fetches checklist docs from dbCollections.checklists, then batches fetching items from dbCollections.items.
   */
  async getChecklist(): Promise<IChecklistItem[]> {
    const { user, error } = requireAuth()
    if (error || !user) return []

    // 1. Fetch checklist records for current user from Firebase DB
    const q = query(collection(db, dbCollections.checklists), where('uid', '==', user.uid))

    const snapshot = await getDocs(q)
    const checklistDocs: (IChecklistDoc & { checklistId: string })[] = snapshot.docs.map(
      (docSnap) => ({
        checklistId: docSnap.id,
        ...(docSnap.data() as IChecklistDoc),
      }),
    )

    if (checklistDocs.length === 0) return []

    // Sort descending by added_date in-memory
    checklistDocs.sort((a, b) => (b.added_date || 0) - (a.added_date || 0))

    // 2. Collect unique item IDs to query from Firebase DB items collection
    const itemIds = Array.from(
      new Set(
        checklistDocs
          .map((entry) => entry.itemId || (entry as any).id)
          .filter((id): id is string => Boolean(id) && typeof id === 'string'),
      ),
    )

    if (itemIds.length === 0) return []

    // 3. Batch fetch items from Firebase DB (Firestore) in chunks of 30
    const itemsMap = new Map<string, IItem>()
    const danglingDocRefs: ReturnType<typeof doc>[] = []

    for (let i = 0; i < itemIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
      const chunk = itemIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT)
      try {
        const itemsQuery = query(
          collection(db, dbCollections.items),
          where(documentId(), 'in', chunk),
        )
        const itemsSnapshot = await getDocs(itemsQuery)
        itemsSnapshot.forEach((docSnap) => {
          const data = docSnap.data()
          if (!data.is_deleted) {
            itemsMap.set(docSnap.id, {
              id: docSnap.id,
              ...data,
            } as IItem)
          }
        })
      } catch (err) {
        console.error('Error fetching checklist items from Firebase DB:', err)
      }
    }

    // 4. Hydrate fetched items with meaning examples from Firebase DB
    const fetchedItems = Array.from(itemsMap.values())
    if (fetchedItems.length > 0) {
      try {
        const hydratedItems = await hydrateItemsWithExamples(fetchedItems)
        hydratedItems.forEach((item) => {
          if (item.id) {
            itemsMap.set(item.id, item)
          }
        })
      } catch (hydrateErr) {
        console.warn('Failed to hydrate examples for checklist items:', hydrateErr)
      }
    }

    // 5. Construct hydrated checklist items, filtering out missing or deleted items
    const hydratedList: IChecklistItem[] = []

    for (const entry of checklistDocs) {
      const targetItemId = entry.itemId || (entry as any).id
      const item = targetItemId ? itemsMap.get(targetItemId) : null

      if (!item) {
        // Track dangling checklist records (item deleted in Firebase DB) for cleanup
        if (entry.checklistId) {
          danglingDocRefs.push(doc(db, dbCollections.checklists, entry.checklistId))
        }
        continue
      }

      hydratedList.push({
        ...item,
        checklistId: entry.checklistId,
        itemId: targetItemId,
        isCompleted: !!entry.isCompleted,
        added_date: entry.added_date || Date.now(),
      })
    }

    // Clean up dangling checklist docs in Firestore asynchronously
    if (danglingDocRefs.length > 0) {
      Promise.all(danglingDocRefs.map((docRef) => deleteDoc(docRef))).catch((cleanupErr) =>
        console.warn('Failed to cleanup dangling checklist docs:', cleanupErr),
      )
    }

    return hydratedList
  },

  /**
   * Add item ID and checklist metadata to dbCollections.checklists in Firebase DB
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
      where('itemId', '==', item.id),
    )
    const existing = await getDocs(checkQuery)
    if (!existing.empty) {
      return { isSuccess: false, message: `"${item.origin}" already exists in checklist` }
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
   * Toggle completion status in Firebase DB
   */
  async toggleComplete(checklistId: string, isCompleted: boolean): Promise<void> {
    const docRef = doc(db, dbCollections.checklists, checklistId)
    await updateDoc(docRef, {
      isCompleted,
      last_update: Date.now(),
    })
  },

  /**
   * Remove item from checklist by checklist doc ID in Firebase DB
   */
  async remove(checklistId: string): Promise<void> {
    const docRef = doc(db, dbCollections.checklists, checklistId)
    await deleteDoc(docRef)
  },

  /**
   * Remove item from checklist by target itemId in Firebase DB
   */
  async removeByItemId(itemId: string): Promise<void> {
    const { user, error } = requireAuth()
    if (error || !user || !itemId) return

    const q = query(
      collection(db, dbCollections.checklists),
      where('uid', '==', user.uid),
      where('itemId', '==', itemId),
    )
    const snapshot = await getDocs(q)
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref))
    await Promise.all(deletePromises)
  },
}
