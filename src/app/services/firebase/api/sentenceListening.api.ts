import { IHttpResponse } from '@/models/http.model'
import { ISentenceListeningItem } from '@/models/sentenceListening.model'
import { ECategory, IItem } from '@/models/item.model'
import { localDb } from '@/services/localDb'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { shuffleArray } from '@/helpers/mics'
import { collection, getDocs, query, where } from 'firebase/firestore'

export interface IGetListeningSentencesOptions {
  count?: number
  sourceType?: 'all' | 'sentence' | 'example'
  level?: number
}

/**
 * Fetch sentence items and item examples for listening practice.
 *
 * Requirements:
 * - Number of sentences taken from user config (default: 10).
 * - Sentences extracted from:
 *    1. Origin item whose type/catId is SENTENCE (ECategory.SENTENCE)
 *    2. Examples within items
 */
const getListeningSentences = async (
  optionsOrCount: IGetListeningSentencesOptions | number = 10,
): Promise<IHttpResponse<ISentenceListeningItem[]>> => {
  try {
    const options: IGetListeningSentencesOptions =
      typeof optionsOrCount === 'number' ? { count: optionsOrCount } : optionsOrCount
    const count = options.count || 10
    const filterSource = options.sourceType || 'all'
    const filterLevel = options.level

    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      return {
        isSuccess: false,
        message: 'User is not authenticated',
        content: [],
        statusCode: 401,
      }
    }

    const candidates: ISentenceListeningItem[] = []

    // 1. Attempt to fetch items from localDb (IndexedDB)
    let localItems: IItem[] = []
    try {
      localItems = await localDb.items.where('uid').equals(currentUser.uid).toArray()
    } catch (err) {
      console.warn('Error querying localDb.items for sentence listening:', err)
    }

    // Fallback: If localDb has no items, fetch from Firestore
    if (localItems.length === 0) {
      try {
        const itemsRef = collection(db, dbCollections.items)
        const q = query(itemsRef, where('uid', '==', currentUser.uid))
        const snapshot = await getDocs(q)
        localItems = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as IItem,
        )
      } catch (err) {
        console.warn('Error querying Firestore items fallback:', err)
      }
    }

    // Extract sentences from items
    for (const item of localItems) {
      if (filterLevel !== undefined && item.level !== filterLevel) continue

      // Source A: Origin item with type = sentence (catId === ECategory.SENTENCE)
      if (
        (filterSource === 'all' || filterSource === 'sentence') &&
        item.catId === ECategory.SENTENCE &&
        item.origin &&
        item.origin.trim()
      ) {
        const meaning = item.meanings?.[0]
        const translation = meaning?.translation || meaning?.definition || ''
        candidates.push({
          id: `item_sent_${item.id || item.origin}`,
          origin: item.origin.trim(),
          translation: translation.trim(),
          sourceType: 'sentence',
          sourceItemOrigin: item.origin.trim(),
          itemId: item.id,
        })
      }

      // Source B: Examples in items
      if (
        (filterSource === 'all' || filterSource === 'example') &&
        item.meanings &&
        item.meanings.length > 0
      ) {
        for (const meaning of item.meanings) {
          if (meaning.examples && meaning.examples.length > 0) {
            for (const ex of meaning.examples) {
              if (ex && ex.origin && ex.origin.trim()) {
                candidates.push({
                  id: `item_ex_${ex.id || `${item.id || ''}_${ex.origin}`}`,
                  origin: ex.origin.trim(),
                  translation: (ex.translation || '').trim(),
                  sourceType: 'example',
                  sourceItemOrigin: item.origin?.trim() || '',
                  itemId: item.id,
                })
              }
            }
          }
        }
      }
    }

    // Deduplicate candidates by lowercase trimmed origin
    const seen = new Set<string>()
    const uniqueCandidates: ISentenceListeningItem[] = []

    for (const cand of candidates) {
      const key = cand.origin.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        uniqueCandidates.push(cand)
      }
    }

    if (uniqueCandidates.length === 0) {
      return {
        isSuccess: true,
        message: 'No sentences or examples found for listening practice',
        content: [],
        statusCode: 200,
      }
    }

    // Randomize and take up to target count
    const shuffled = shuffleArray([...uniqueCandidates])
    const finalItems = shuffled.slice(0, count)

    return {
      isSuccess: true,
      message: 'Listening sentences loaded successfully',
      content: finalItems,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching listening sentences:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to fetch listening sentences',
      content: [],
      statusCode: 500,
    }
  }
}

export const sentenceListeningApi = {
  getListeningSentences,
}
