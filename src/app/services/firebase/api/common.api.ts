import { IHttpResponse } from '@/models/http.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import {
  firebaseAuthService,
  requireAuth,
  getRequiredCurrentUser,
} from '@/services/firebase/authService'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { ECategory, EType, IOption, IIotd, IIotdDoc, IIotdRequest, IItem } from '@/models/item.model'
import { categories, types } from '@/constant/item'
import { itemApi } from '@/services/firebase/api/item.api'

const getCategories = async (): Promise<IHttpResponse<IOption<string, ECategory>[]>> => {
  return {
    isSuccess: true,
    message: 'Fetched categories from Firebase enum',
    content: categories,
    statusCode: 200,
  }
}

const getTypes = async (): Promise<
  IHttpResponse<IOption<{ origin: string; abbr: string }, EType>[]>
> => {
  return {
    isSuccess: true,
    message: 'Fetched types from Firebase enum',
    content: types,
    statusCode: 200,
  }
}

/**
 * Get start and end of today in milliseconds
 */
const getTodayRange = () => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).getTime()
  return { startOfDay, endOfDay }
}

/**
 * Get a random item from items collection by category
 */
const getRandomItemByCategory = async (
  catId: number,
  excludeItemId?: string,
): Promise<any | null> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      console.error('[IOTD] No authenticated user found')
      return null
    }

    // Query items by category and user, excluding deleted and archived items
    const itemsQuery = query(
      collection(db, dbCollections.items),
      where('uid', '==', currentUser.uid),
      where('catId', '==', catId),
      where('is_deleted', '==', false),
      where('archive', '==', false),
    )

    const snapshot = await getDocs(itemsQuery)

    if (snapshot.empty) {
      console.log(`[IOTD] No items found for category ${catId}`)
      return null
    }

    // Get candidate items from results, filtering for valid meanings
    const allItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as IItem))
    const eligibleItems = allItems.filter((item) => {
      const meanings = item.meanings || []
      return (
        meanings.length > 0 &&
        meanings.some(
          (m) =>
            (m.definition && m.definition.trim() !== '') ||
            (m.translation && m.translation.trim() !== ''),
        )
      )
    })

    const itemsToPick = eligibleItems.length > 0 ? eligibleItems : allItems
    if (itemsToPick.length === 0) return null

    // Prefer items that also have examples if available
    const itemsWithExamples = itemsToPick.filter((item) =>
      (item.meanings || []).some((m) => m.examples && m.examples.length > 0),
    )
    const candidatePool = itemsWithExamples.length > 0 ? itemsWithExamples : itemsToPick

    // Exclude previous item ID if alternative candidates are available
    const finalCandidates =
      excludeItemId && candidatePool.length > 1
        ? candidatePool.filter((item) => item.id !== excludeItemId)
        : candidatePool

    const randomIndex = Math.floor(Math.random() * finalCandidates.length)
    return finalCandidates[randomIndex]
  } catch (error) {
    console.error('[IOTD] Error fetching random item:', error)
    return null
  }
}


/**
 * Create a new Item of the Day for a specific category.
 * RULE: If a category item already exists in Firestore, removes the old one before adding.
 */
const createIotdByCatId = async ({
  catId,
  userId,
  previousItemId,
}: {
  catId: number
  userId: string
  previousItemId?: string
}): Promise<IHttpResponse<IIotd>> => {
  try {
    const { startOfDay, endOfDay } = getTodayRange()

    // 1. Remove ANY existing IOTD documents for this category and user before adding the new one
    const existingIotdQuery = query(
      collection(db, dbCollections.iotd),
      where('uid', '==', userId),
      where('catId', '==', catId),
    )
    const existingSnapshot = await getDocs(existingIotdQuery)
    const existingItemIds = existingSnapshot.docs.map((d) => d.data()?.itemId).filter(Boolean)
    const excludedId = previousItemId || existingItemIds[0]

    if (!existingSnapshot.empty) {
      const deletePromises = existingSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref))
      await Promise.all(deletePromises)
    }

    // 2. Get random item, avoiding the previous item if alternatives exist
    const randomItem = await getRandomItemByCategory(catId, excludedId)

    if (!randomItem) {
      return {
        isSuccess: false,
        message: `No items available for category ${catId}`,
        content: null as unknown as IIotd,
        statusCode: 404,
      }
    }

    // 3. Enrich item with meaning examples
    const enrichedItemResp = await itemApi.getItemById(randomItem.id)
    const enrichedItem =
      enrichedItemResp.isSuccess && enrichedItemResp.content ? enrichedItemResp.content : randomItem

    // 4. Create new IOTD document - saving only itemId and metadata (not full item)
    const newIotd: IIotdDoc = {
      itemId: enrichedItem.id || randomItem.id,
      uid: userId,
      catId: catId,
      first_of_date: startOfDay,
      last_of_date: endOfDay,
      created_date: Date.now(),
    }

    const docRef = await addDoc(collection(db, dbCollections.iotd), newIotd)

    return {
      isSuccess: true,
      message: 'IOTD created successfully',
      content: {
        id: docRef.id,
        ...newIotd,
        item: enrichedItem,
      } as IIotd,
      statusCode: 201,
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error creating IOTD: ${error}`,
      content: null as unknown as IIotd,
      statusCode: 500,
    }
  }
}

/**
 * Get or create Item of the Day for a specific category
 */
const getIotdByCatId = async ({
  catId,
  generate = false,
}: IIotdRequest): Promise<IHttpResponse<IIotd>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null as unknown as IIotd,
        statusCode: 401,
      }
    }

    const { startOfDay, endOfDay } = getTodayRange()

    // If explicit regeneration is requested, remove old and generate new
    if (generate) {
      return await createIotdByCatId({ catId, userId: currentUser.uid })
    }

    // Query for existing IOTD documents for this category and user
    const iotdQuery = query(
      collection(db, dbCollections.iotd),
      where('uid', '==', currentUser.uid),
      where('catId', '==', catId),
    )

    const snapshot = await getDocs(iotdQuery)

    // Check if an IOTD exists for today
    const todayDoc = snapshot.docs.find((docSnap) => {
      const data = docSnap.data()
      return data.first_of_date >= startOfDay && data.first_of_date <= endOfDay
    })

    if (todayDoc) {
      // Remove any stale / older duplicate IOTDs for this category so only today's document remains
      const staleDocs = snapshot.docs.filter((docSnap) => docSnap.id !== todayDoc.id)
      if (staleDocs.length > 0) {
        await Promise.all(staleDocs.map((docSnap) => deleteDoc(docSnap.ref)))
      }

      const iotdData = todayDoc.data()

      // Fetch the actual item (hydrated dynamically with latest item data)
      let item: IItem | null = null
      const { isSuccess, content } = await itemApi.getItemById(iotdData.itemId)
      if (isSuccess && content) {
        item = content
      } else {
        try {
          const itemDoc = await getDoc(doc(db, dbCollections.items, iotdData.itemId))
          if (itemDoc.exists()) {
            item = { id: itemDoc.id, ...itemDoc.data() } as IItem
          }
        } catch (e) {
          console.warn('[IOTD] Failed to fetch item from Firestore:', e)
        }
      }

      // Backward-compatibility fallback for legacy documents that stored item in Firestore
      if (!item && (iotdData as any).item) {
        item = (iotdData as any).item
      }

      return {
        isSuccess: true,
        message: 'IOTD fetched successfully',
        content: {
          id: todayDoc.id,
          ...iotdData,
          item: item || ({} as IItem),
        } as IIotd,
        statusCode: 200,
      }
    }

    // If no IOTD exists for today, create a new one (which cleans up any old one before adding)
    return await createIotdByCatId({ catId, userId: currentUser.uid })
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error fetching/creating IOTD: ${error}`,
      content: null as unknown as IIotd,
      statusCode: 500,
    }
  }
}

const deleteIotd = async (id: string): Promise<IHttpResponse<null>> => {
  try {
    await deleteDoc(doc(db, dbCollections.iotd, id))

    return {
      isSuccess: true,
      message: 'IOTD deleted successfully',
      content: null,
      statusCode: 200,
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error deleting IOTD: ${error}`,
      content: null,
      statusCode: 500,
    }
  }
}

const checkAuth = () => {
  return requireAuth().error
}

const getCurrentUser = () => {
  return firebaseAuthService.getCurrentUser()
}

export { requireAuth, getRequiredCurrentUser }

export const commonApi = {
  getCategories,
  getTypes,
  getIotdByCatId,
  createIotdByCatId,
  deleteIotd,
  checkAuth,
  getCurrentUser,
  requireAuth,
  getRequiredCurrentUser,
}
