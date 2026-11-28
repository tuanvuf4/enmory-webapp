import { IItem, EType, ECategory } from '@/models/item.model'
import { compact } from 'lodash'

export const enumValues = <T extends Record<string, unknown>>(value: T) => {
  return Object.values(value).filter((v) => typeof v === 'number') as number[]
}

export const getType = (type: EType) => {
  switch (type) {
    case EType.NOUN:
      return { origin: 'Noun', abbr: 'n' }

    case EType.VERB:
      return { origin: 'Verb', abbr: 'v' }

    case EType.ADJECTIVE:
      return { origin: 'Adjective', abbr: 'a' }

    case EType.ADVERB:
      return { origin: 'Adverb', abbr: 'adv' }

    case EType.PREPOSITION:
      return { origin: 'Preposition', abbr: 'pre' }

    case EType.CONJUNCTION:
      return { origin: 'Conjunction', abbr: 'conj' }

    case EType.PRONOUN:
      return { origin: 'Pronoun', abbr: 'pr' }

    case EType.ARTICLE:
      return { origin: 'Article', abbr: 'article' }

    case EType.DETERMINER:
      return { origin: 'Determiner', abbr: 'deter' }

    case EType.INTERJECTION:
      return { origin: 'Interjection', abbr: 'inter' }

    default:
      return { origin: 'All', abbr: 'all' }
  }
}

export const getCategory = (type: ECategory) => {
  switch (type) {
    case ECategory.WORD:
      return 'Word'

    case ECategory.PHRASE:
      return 'Phrase'

    case ECategory.IDIOM:
      return 'Idiom'

    case ECategory.SLANG:
      return 'Slang'

    case ECategory.COLLOCATION:
      return 'Collocation'

    case ECategory.SENTENCE:
      return 'Sentence'

    default:
      return 'All'
  }
}

export const getArrayUniqueItem = <T>(origin: T[]) => {
  const combine: T[] = []
  origin.forEach((item) => {
    if (combine.findIndex((outItem) => outItem === item) < 0) {
      combine.push(item)
    }
  })
  return compact(combine)
}

/**
 * Check if an item has at least one valid meaning (non-empty definition or translation).
 */
export const hasValidMeaning = (item?: IItem | null): boolean => {
  if (!item || !Array.isArray(item.meanings) || item.meanings.length === 0) {
    return false
  }
  return item.meanings.some((meaning) => {
    const hasDef = typeof meaning.definition === 'string' && meaning.definition.trim().length > 0
    const hasTrans =
      typeof meaning.translation === 'string' && meaning.translation.trim().length > 0
    return hasDef || hasTrans
  })
}

export const isDefect = (item: IItem) => {
  const conditions =
    !item.meanings ||
    item.meanings.length === 0 ||
    (item.meanings &&
      item.meanings.length > 0 &&
      item.meanings.filter((item) => !item.translation || item.translation.trim() === '').length >
        0 &&
      item.meanings.filter((item) => !item.definition || item.definition.trim() === '').length > 0)
  return conditions
}

export const toWildString = (value: string, wildcard = '_') => {
  const array = value.trim().split('')
  const ran = getRandomNumber(array.length - 1, 0)
  for (let i = 0; i < array.length; i++) {
    if (i !== ran) {
      array[i] = wildcard
    }
  }
  return array.join(' ')
}

export const getRandomNumber = (max: number, min: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const escapeHtmlAttr = (str = '') =>
  str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Fetch an illustrative thumbnail image URL from Wikipedia REST summary API.
 * Returns null silently on error, timeout, or disambiguation pages.
 */
export const fetchIllustrativeImage = async (origin: string): Promise<string | null> => {
  const term = String(origin || '').trim()
  if (!term) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2500)
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data?.type === 'disambiguation') return null
    const src = data?.thumbnail?.source
    return typeof src === 'string' && src.startsWith('http') ? src : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Embed an illustrative image into an HTML definition string if not already present.
 */
export const appendImageToDefinition = (
  definition = '',
  imageUrl?: string | null,
  altText = '',
): string => {
  const def = String(definition || '').trim()
  if (!imageUrl || /<img\b/i.test(def)) return def
  const imgHtml = `<p><img src="${escapeHtmlAttr(imageUrl)}" alt="${escapeHtmlAttr(altText)}" /></p>`
  if (!def) return imgHtml
  return /<[a-z][\s\S]*>/i.test(def) ? `${def}${imgHtml}` : `<p>${def}</p>${imgHtml}`
}
