import { IHttpResponse } from '@/models/http.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  limit,
} from 'firebase/firestore'
import { ECategory, EType, IOption, IIotd, IIotdRequest } from '@/models/item.model'
import { categories, types } from '@/constant/item'

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
const getRandomItemByCategory = async (catId: number): Promise<any | null> => {
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

    // Get random item from results
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    const randomIndex = Math.floor(Math.random() * items.length)
    return items[randomIndex]
  } catch (error) {
    console.error('[IOTD] Error fetching random item:', error)
    return null
  }
}

/**
 * Delete IOTDs that are not from today
 */
const cleanupOldIotds = async (catId: number, force = false) => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) return

    const { startOfDay } = getTodayRange()

    // Query IOTDs for this category and user that are not from today
    const forceIotdQuery = query(
      collection(db, dbCollections.iotd),
      where('uid', '==', currentUser.uid),
      where('catId', '==', catId),
    )

    const oldIotdsQuery = query(
      collection(db, dbCollections.iotd),
      where('uid', '==', currentUser.uid),
      where('catId', '==', catId),
      where('last_of_date', '<', startOfDay),
    )

    const snapshot = await getDocs(force ? forceIotdQuery : oldIotdsQuery)

    // Delete old IOTDs
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error('Error cleaning up old IOTDs:', error)
  }
}

/**
 * Create a new Item of the Day for a specific category
 * Gets a random item and creates a new IOTD document
 */
const createItemOfTheDayByCatId = async ({
  catId,
  userId,
}: {
  catId: number
  userId: string
}): Promise<IHttpResponse<IIotd>> => {
  try {
    const { startOfDay, endOfDay } = getTodayRange()

    // Get random item
    const randomItem = await getRandomItemByCategory(catId)

    if (!randomItem) {
      return {
        isSuccess: false,
        message: `No items available for category ${catId}`,
        content: null as unknown as IIotd,
        statusCode: 404,
      }
    }

    // Create new IOTD document
    const newIotd = {
      itemId: randomItem.id,
      uid: userId,
      catId: catId,
      first_of_date: startOfDay,
      last_of_date: endOfDay,
      created_date: Date.now(),
      item: randomItem,
    }

    const docRef = await addDoc(collection(db, dbCollections.iotd), newIotd)

    return {
      isSuccess: true,
      message: 'IOTD created successfully',
      content: {
        id: docRef.id,
        ...newIotd,
        item: randomItem,
      } as IIotd,
      statusCode: 201,
    }
  } catch (error) {
    console.error('[IOTD] Error creating IOTD:', error)
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
const getItemOfTheDayByCatId = async ({
  catId,
  generate = true,
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

    await cleanupOldIotds(catId, generate)

    // Query for today's IOTD
    const iotdQuery = query(
      collection(db, dbCollections.iotd),
      where('uid', '==', currentUser.uid),
      where('catId', '==', catId),
      where('first_of_date', '>=', startOfDay),
      where('last_of_date', '<=', endOfDay),
      limit(1),
    )

    const snapshot = await getDocs(iotdQuery)

    // If today's IOTD exists, return it
    if (!snapshot.empty) {
      const iotdDoc = snapshot.docs[0]
      const iotdData = iotdDoc.data()

      console.log(`*** iotdData *** `, iotdData)

      // Fetch the actual item
      const itemDoc = await getDocs(
        query(collection(db, dbCollections.items), where('__name__', '==', iotdData.itemId)),
      )

      const item = itemDoc.empty ? null : { id: itemDoc.docs[0].id, ...itemDoc.docs[0].data() }

      return {
        isSuccess: true,
        message: 'IOTD fetched successfully',
        content: {
          id: iotdDoc.id,
          ...iotdData,
          item: item || {},
        } as IIotd,
        statusCode: 200,
      }
    }

    // If no IOTD exists for today, create a new one
    if (generate) {
      return await createItemOfTheDayByCatId({ catId, userId: currentUser.uid })
    }

    // If generate is false, return not found
    return {
      isSuccess: false,
      message: 'No IOTD found for today',
      content: null as unknown as IIotd,
      statusCode: 404,
    }
  } catch (error) {
    console.error('[IOTD] Error in getItemOfTheDayByCatId:', error)
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
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null,
        statusCode: 401,
      }
    }

    await deleteDoc(doc(db, dbCollections.iotd, id))

    return {
      isSuccess: true,
      message: 'IOTD deleted successfully',
      content: null,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error deleting IOTD:', error)
    return {
      isSuccess: false,
      message: `Error deleting IOTD: ${error}`,
      content: null,
      statusCode: 500,
    }
  }
}

export const commonApi = {
  getCategories,
  getTypes,
  getItemOfTheDayByCatId,
  createItemOfTheDayByCatId,
  deleteIotd,
}
