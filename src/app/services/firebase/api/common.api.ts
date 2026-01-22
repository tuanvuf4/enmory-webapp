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
import {
  ECategory,
  EType,
  IOption,
  IIotd,
  IIotdRequest,
  MarkIotdRangeDateRequest,
  GetIIotdRangeDateRequest,
} from '@/models/item.model'
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

const unsupported = (name: string) => ({
  isSuccess: false,
  message: `${name} is not supported in Firebase mode`,
  content: null as unknown as IIotd<string>,
  statusCode: 501,
})

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

    console.log(`[IOTD] Fetching random item for category ${catId}, user: ${currentUser.uid}`)

    // Query items by category and user, excluding deleted and archived items
    const itemsQuery = query(
      collection(db, dbCollections.items),
      where('uid', '==', currentUser.uid),
      where('catId', '==', catId),
      where('is_deleted', '==', false),
      where('archive', '==', false),
    )

    const snapshot = await getDocs(itemsQuery)
    console.log(`[IOTD] Found ${snapshot.size} items for category ${catId}`)

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
const cleanupOldIotds = async (catId: number) => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) return

    const { startOfDay } = getTodayRange()

    // Query IOTDs for this category and user that are not from today
    const oldIotdsQuery = query(
      collection(db, dbCollections.iotd),
      where('uid', '==', currentUser.uid),
      where('catId', '==', catId),
      where('last_of_date', '<', startOfDay),
    )

    const snapshot = await getDocs(oldIotdsQuery)

    // Delete old IOTDs
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)

    console.log(`Cleaned up ${snapshot.size} old IOTD(s) for category ${catId}`)
  } catch (error) {
    console.error('Error cleaning up old IOTDs:', error)
  }
}

/**
 * Get or create Item of the Day for a specific category
 */
const getItemOfTheDayByCatId = async (
  body: IIotdRequest,
): Promise<IHttpResponse<IIotd<string>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User not authenticated',
        content: null as unknown as IIotd<string>,
        statusCode: 401,
      }
    }

    const { startOfDay, endOfDay } = getTodayRange()

    console.log(`[IOTD] Fetching/Creating IOTD for category ${body.catId}`)
    console.log(`[IOTD] Date range: ${new Date(startOfDay)} to ${new Date(endOfDay)}`)
    console.log(`[IOTD] User: ${currentUser.uid}`)

    // First, cleanup old IOTDs for this category
    await cleanupOldIotds(body.catId)

    console.log(`*** cleanup *** `)

    // Query for today's IOTD
    const iotdQuery = query(
      collection(db, dbCollections.iotd),
      where('uid', '==', currentUser.uid),
      where('catId', '==', body.catId),
      where('first_of_date', '>=', startOfDay),
      where('last_of_date', '<=', endOfDay),
      limit(1),
    )

    console.log(`*** iotdQuery *** `, iotdQuery)

    const snapshot = await getDocs(iotdQuery)
    console.log(`[IOTD] Found snapshot ${snapshot.size} existing IOTD(s) for today`)

    console.log(`*** snapshot.empty *** `, snapshot.empty)

    // If today's IOTD exists, return it
    if (!snapshot.empty) {
      const iotdDoc = snapshot.docs[0]
      const iotdData = iotdDoc.data()

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
        } as IIotd<string>,
        statusCode: 200,
      }
    }

    // If no IOTD exists for today, create a new one with a random item
    console.log(`[IOTD] No existing IOTD found, fetching random item...`)
    const randomItem = await getRandomItemByCategory(body.catId)

    if (!randomItem) {
      console.log(`[IOTD] No items available for category ${body.catId}`)
      return {
        isSuccess: false,
        message: `No items available for category ${body.catId}`,
        content: null as unknown as IIotd<string>,
        statusCode: 404,
      }
    }

    console.log(`[IOTD] Selected random item: ${randomItem.id} - ${randomItem.origin}`)

    // Create new IOTD
    const newIotd = {
      itemId: randomItem.id,
      uid: currentUser.uid,
      catId: body.catId,
      first_of_date: startOfDay,
      last_of_date: endOfDay,
      created_date: Date.now(),
    }

    console.log(`[IOTD] Creating new IOTD document:`, newIotd)

    const docRef = await addDoc(collection(db, dbCollections.iotd), newIotd)

    console.log(`[IOTD] Successfully created IOTD with ID: ${docRef.id}`)

    return {
      isSuccess: true,
      message: 'IOTD created successfully',
      content: {
        id: docRef.id,
        ...newIotd,
        item: randomItem,
      } as IIotd<string>,
      statusCode: 201,
    }
  } catch (error) {
    console.error('Error in getItemOfTheDayByCatId:', error)
    return {
      isSuccess: false,
      message: `Error fetching/creating IOTD: ${error}`,
      content: null as unknown as IIotd<string>,
      statusCode: 500,
    }
  }
}

const markIotd = async (_body: MarkIotdRangeDateRequest) => unsupported('IOTD mark')

const getIotdRange = async (_body: GetIIotdRangeDateRequest) => unsupported('IOTD range')

const deleteMarkIotd = async (id: string): Promise<IHttpResponse<null>> => {
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
  markIotd,
  getIotdRange,
  deleteMarkIotd,
}
