import { IItem, ECategory, IMeaning } from '@/models/item.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { initItem } from './data'
import { Timestamp } from 'firebase/firestore'

/**
 * Determine category based on origin word count
 * If origin has 2+ space-separated words, it's a PHRASE
 * Otherwise, it's a WORD
 */
const getDefaultCategoryFromOrigin = (origin: string): ECategory => {
  if (!origin) return ECategory.WORD

  const wordCount = origin.trim().split(/\s+/).length
  return wordCount >= 2 ? ECategory.PHRASE : ECategory.WORD
}

/**
 * Extract all related item names from form data
 * Returns an array of unique item names to validate
 */
const extractRelatedItemNames = (data: IItem): string[] => {
  const relatedNames = new Set<string>()

  // Add word_family items
  if (data.word_family && Array.isArray(data.word_family)) {
    data.word_family.forEach((name) => {
      if (name && typeof name === 'string' && name.trim()) {
        relatedNames.add(name.trim())
      }
    })
  }

  // Add relation items
  if (data.relation && Array.isArray(data.relation)) {
    data.relation.forEach((name) => {
      if (name && typeof name === 'string' && name.trim()) {
        relatedNames.add(name.trim())
      }
    })
  }

  // Add collocations items
  if (data.collocations && Array.isArray(data.collocations)) {
    data.collocations.forEach((name) => {
      if (name && typeof name === 'string' && name.trim()) {
        relatedNames.add(name.trim())
      }
    })
  }

  // Add synonyms and antonyms from meanings
  if (data.meanings && Array.isArray(data.meanings)) {
    data.meanings.forEach((meaning: IMeaning) => {
      if (meaning.synonyms && Array.isArray(meaning.synonyms)) {
        meaning.synonyms.forEach((name) => {
          if (name && typeof name === 'string' && name.trim()) {
            relatedNames.add(name.trim())
          }
        })
      }

      if (meaning.antonyms && Array.isArray(meaning.antonyms)) {
        meaning.antonyms.forEach((name) => {
          if (name && typeof name === 'string' && name.trim()) {
            relatedNames.add(name.trim())
          }
        })
      }
    })
  }

  return Array.from(relatedNames)
}

/**
 * Check which related items already exist in the database
 * Returns a map of item names to their IDs (undefined if not found)
 */
const checkExistingItems = async (
  itemNames: string[],
): Promise<Map<string, string | undefined>> => {
  const existingItemsMap = new Map<string, string | undefined>()

  if (!itemNames || itemNames.length === 0) {
    return existingItemsMap
  }

  try {
    // Query each item by exact name
    const checkPromises = itemNames.map(async (name) => {
      try {
        const response = await itemApi.getItems(
          {
            keyword: name,
            page: 0,
            size: 1,
            exact: true,
          },
          undefined,
        )

        if (response.isSuccess && response.content && response.content.length > 0) {
          return { name, id: response.content[0].id }
        }
        return { name, id: undefined }
      } catch (error) {
        console.warn(`Error checking item existence for "${name}":`, error)
        return { name, id: undefined }
      }
    })

    const results = await Promise.all(checkPromises)
    results.forEach(({ name, id }) => {
      existingItemsMap.set(name, id)
    })

    return existingItemsMap
  } catch (error) {
    console.error('Error checking existing items:', error)
    throw error
  }
}

/**
 * Create a new item for a related word/phrase
 */
const createRelatedItem = async (
  itemName: string,
  uid?: string,
): Promise<{ name: string; id: string }> => {
  try {
    const newItem: IItem = {
      ...initItem,
      origin: itemName,
      origin_lowercase: itemName.toLowerCase(),
      catId: getDefaultCategoryFromOrigin(itemName),
      uid: uid || '',
      created_date: Timestamp.now().toMillis(),
      last_update: Timestamp.now().toMillis(),
    }

    const response = await itemApi.createItem(newItem)

    if (!response.isSuccess || !response.content || !response.content.id) {
      throw new Error(`Failed to create item for "${itemName}"`)
    }

    return {
      name: itemName,
      id: response.content.id,
    }
  } catch (error) {
    console.error(`Error creating related item "${itemName}":`, error)
    throw error
  }
}

/**
 * Validate and auto-create missing related items
 * This function:
 * 1. Extracts all related item names from the form data
 * 2. Checks which items already exist
 * 3. Creates missing items automatically
 * 4. Returns a complete map of item names to their IDs
 */
export const validateAndCreateRelatedItems = async (
  data: IItem,
  uid?: string,
): Promise<Map<string, string>> => {
  const relatedNames = extractRelatedItemNames(data)

  if (relatedNames.length === 0) {
    return new Map()
  }

  // Check which items already exist
  const existingItemsMap = await checkExistingItems(relatedNames)

  // Identify missing items
  const missingNames = relatedNames.filter((name) => !existingItemsMap.get(name))

  // Create missing items
  if (missingNames.length > 0) {
    const createPromises = missingNames.map((name) => createRelatedItem(name, uid))
    const createdItems = await Promise.all(createPromises)

    createdItems.forEach(({ name, id }) => {
      existingItemsMap.set(name, id)
    })
  }

  // Filter out undefined values and return only valid entries
  const validItemsMap = new Map<string, string>()
  existingItemsMap.forEach((id, name) => {
    if (id) {
      validItemsMap.set(name, id)
    }
  })

  return validItemsMap
}
