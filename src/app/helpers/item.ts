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
      return 'Other'
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

export const isDefect = (item: IItem) => {
  if (
    !item.meanings ||
    item.meanings.length === 0 ||
    (item.meanings &&
      item.meanings.length > 0 &&
      item.meanings.filter((item) => item.translation.trim() === '').length > 0 &&
      item.meanings.filter((item) => item.definition.trim() === '').length > 0)
  ) {
    return true
  } else {
    return false
  }
}
