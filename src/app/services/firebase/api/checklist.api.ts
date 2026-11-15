import { db, dbCollections } from '@/config/firebaseConfig'
import { requireAuth } from '@/services/firebase/authService'
import { IChecklistItem, IChecklistDoc } from '@/models/checklist.model'
import { IItem } from '@/models/item.model'
import { hydrateItemsWithExamples } from '@/services/firebase/dbIntegration'
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
  documentId,
} from 'firebase/firestore'

const FIRESTORE_IN_QUERY_LIMIT = 30

export const checklistApi = {
  /**
   * Get all checklist items for the current user.
   * Loads from localDb first (offline-first, fast), then falls back to Firestore items.
   */
  async getChecklist(): Promise<IChecklistItem[]> {
    try {
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

      // 2. Collect unique item IDs to resolve
      const itemIds = Array.from(
        new Set(
          checklistDocs
            .map((entry) => entry.itemId || (entry as any).id)
            .filter((id): id is string => Boolean(id) && typeof id === 'string'),
        ),
      )

      if (itemIds.length === 0) return []

      const itemsMap = new Map<string, IItem>()

      // 3. Resolve items from localDb FIRST (fastest, offline-friendly, reliable)
      try {
        const localItems = await localDb.items.bulkGet(itemIds)
        localItems.forEach((localItem) => {
          if (localItem && localItem.id) {
            itemsMap.set(localItem.id, localItem)
          }
        })
      } catch (localErr) {
        console.warn('Failed to load items from localDb for checklist:', localErr)
      }

      // 4. Batch fetch remaining items from Firebase DB (Firestore) for any missing IDs
      const missingItemIds = itemIds.filter((id) => !itemsMap.has(id))
      if (missingItemIds.length > 0) {
        for (let i = 0; i < missingItemIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
          const chunk = missingItemIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT)
          try {
            const itemsQuery = query(
              collection(db, dbCollections.items),
              where(documentId(), 'in', chunk),
            )
            const itemsSnapshot = await getDocs(itemsQuery)
            itemsSnapshot.forEach((docSnap) => {
              const data = docSnap.data()
              if (!data.is_deleted) {
                const itemObj = {
                  id: docSnap.id,
                  ...data,
                } as IItem
                itemsMap.set(docSnap.id, itemObj)
                // Cache into localDb asynchronously
                localDb.items.put(itemObj).catch(() => {})
              }
            })
          } catch (err) {
            console.error('Error batch fetching missing checklist items from Firestore:', err)
            // Fallback: try individual getDoc
            try {
              const docSnaps = await Promise.all(
                chunk.map((id) => getDoc(doc(db, dbCollections.items, id)).catch(() => null)),
              )
              docSnaps.forEach((docSnap) => {
                if (docSnap && docSnap.exists()) {
                  const data = docSnap.data()
                  if (!data.is_deleted) {
                    const itemObj = { id: docSnap.id, ...data } as IItem
                    itemsMap.set(docSnap.id, itemObj)
                    localDb.items.put(itemObj).catch(() => {})
                  }
                }
              })
            } catch (individualErr) {
              console.warn('Individual fallback also failed:', individualErr)
            }
          }
        }
      }

      // 5. Hydrate fetched items with meaning examples
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

      // 6. Construct hydrated checklist items without destructive side effects
      const hydratedList: IChecklistItem[] = []

      for (const entry of checklistDocs) {
        const targetItemId = entry.itemId || (entry as any).id
        let item = targetItemId ? itemsMap.get(targetItemId) : null

        // Fallback to legacy embedded properties if available
        if (!item) {
          const legacy = entry as any
          if (legacy.origin) {
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
        }

        if (!item) {
          // If item is completely missing, skip displaying it (do NOT delete the record silently!)
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

      return hydratedList
    } catch (error) {
      console.error('Error getting checklist:', error)
      return []
    }
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
      origin: item.origin || '',
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

  /**
   * Clear all completed items from checklist for current user
   */
  async clearCompleted(): Promise<{ isSuccess: boolean; count: number; message: string }> {
    const { user, error } = requireAuth()
    if (error || !user) {
      return { isSuccess: false, count: 0, message: 'User not authenticated' }
    }

    const q = query(
      collection(db, dbCollections.checklists),
      where('uid', '==', user.uid),
      where('isCompleted', '==', true),
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return { isSuccess: true, count: 0, message: 'No completed items to clear' }
    }

    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref))
    await Promise.all(deletePromises)
    return {
      isSuccess: true,
      count: snapshot.docs.length,
      message: `Cleared ${snapshot.docs.length} completed item(s)`,
    }
  },

  /**
   * Clear all items from checklist for current user
   */
  async clearAll(): Promise<{ isSuccess: boolean; count: number; message: string }> {
    const { user, error } = requireAuth()
    if (error || !user) {
      return { isSuccess: false, count: 0, message: 'User not authenticated' }
    }

    const q = query(collection(db, dbCollections.checklists), where('uid', '==', user.uid))
    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return { isSuccess: true, count: 0, message: 'Checklist is already empty' }
    }

    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref))
    await Promise.all(deletePromises)
    return {
      isSuccess: true,
      count: snapshot.docs.length,
      message: `Cleared all ${snapshot.docs.length} item(s) from checklist`,
    }
  },

  /**
   * Set completion status for all items in checklist
   */
  async setAllCompletion(isCompleted: boolean): Promise<{ isSuccess: boolean; count: number }> {
    const { user, error } = requireAuth()
    if (error || !user) {
      return { isSuccess: false, count: 0 }
    }

    const q = query(collection(db, dbCollections.checklists), where('uid', '==', user.uid))
    const snapshot = await getDocs(q)
    const updatePromises = snapshot.docs.map((docSnap) =>
      updateDoc(docSnap.ref, {
        isCompleted,
        last_update: Date.now(),
      }),
    )
    await Promise.all(updatePromises)
    return { isSuccess: true, count: snapshot.docs.length }
  },
}
