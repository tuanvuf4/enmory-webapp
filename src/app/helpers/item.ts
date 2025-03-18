import { patternValidation } from '@/core/utils'
import { IItem, EType, ECategory } from '@/models/item.model'
import { compact } from 'lodash'

export const transformItemModelToClient = (item: IItem<string>): IItem => ({
  ...item,
  collocations:
    item.collocations && item.collocations.length > 0 ? item.collocations.split(',') : [],
  word_family: item.word_family && item.word_family.length > 0 ? item.word_family.split(',') : [],
  forms: item.forms && item.forms.length > 0 ? item.forms.split(',') : [],
  relation: item.relation && item.relation.length > 0 ? item.relation.split(',') : [],
  quickAdd: [],
  meanings: item.meanings?.map((meaning) => ({
    ...meaning,
    pronunciation: meaning.pronunciation
      ? {
          id: meaning.pronunciation.id,
          uk: meaning.pronunciation.uk
            ? meaning.pronunciation.uk.replace(patternValidation.specialCharacterPronouns, '')
            : '',
          us: meaning.pronunciation.us
            ? meaning.pronunciation.us.replace(patternValidation.specialCharacterPronouns, '')
            : '',
          common: meaning.pronunciation.common
            ? meaning.pronunciation.common.replace(patternValidation.specialCharacterPronouns, '')
            : '',
        }
      : {
          common: '',
          uk: '',
          us: '',
        },
    synonyms: meaning.synonyms && meaning.synonyms.length > 0 ? meaning.synonyms.split(',') : [],
    antonyms: meaning.antonyms && meaning.antonyms.length > 0 ? meaning.antonyms.split(',') : [],
    examples: meaning.examples.map((example) => ({
      ...example,
      auto: false,
      original: example.original.trim().replace(/\n/g, ''),
      translation: example.translation.trim().replace(/\n/g, ''),
    })),
  })),
})

export const transformItemModelToServer = (item: IItem): IItem<string> => {
  const { quickAdd, ...rest } = item
  return {
    ...rest,
    original: item.original.trim().replace(/\n/g, ''),
    collocations:
      rest.collocations && rest.collocations.length > 0
        ? rest.collocations.map((item) => item.trim()).join(',')
        : '',
    forms:
      rest.forms && rest.forms.length > 0 ? rest.forms.map((item) => item.trim()).join(',') : '',
    word_family:
      rest.word_family && rest.word_family.length > 0
        ? rest.word_family
            .filter((item) => item)
            .map((item) => item.trim())
            .filter((item) => item !== rest.original)
            .join(',')
        : '',
    relation:
      rest.relation && rest.relation.length > 0
        ? rest.relation.map((item) => item.trim()).join(',')
        : '',
    meanings: rest.meanings?.map((meaning) => ({
      ...meaning,
      note: meaning.note.trim().replace(/- /g, ''),
      translation: meaning.translation.trim(),
      definition: meaning.definition.trim(),
      grammar: meaning.grammar.trim().replace(/- /g, ''),
      collocations: meaning.collocations.trim().replace(/- /g, ''),
      pronunciation: {
        id: meaning.pronunciation.id,
        uk: meaning.pronunciation.uk
          ? meaning.pronunciation.uk.trim().replace(patternValidation.specialCharacterPronouns, '')
          : '',
        us: meaning.pronunciation.us
          ? meaning.pronunciation.us.trim().replace(patternValidation.specialCharacterPronouns, '')
          : '',
        common: meaning.pronunciation.common
          ? meaning.pronunciation.common
              .trim()
              .replace(patternValidation.specialCharacterPronouns, '')
          : '',
      },
      examples: meaning.examples.map((example) => {
        const { auto, ...rest } = example
        return {
          ...rest,
          original: example.original.trim().replace(/\n/g, ''),
          translation: example.translation.trim().replace(/\n/g, ''),
        }
      }),
      synonyms:
        meaning.synonyms && meaning.synonyms.length > 0
          ? meaning.synonyms.map((item) => item.trim()).join(',')
          : '',
      antonyms:
        meaning.antonyms && meaning.antonyms.length > 0
          ? meaning.antonyms.map((item) => item.trim()).join(',')
          : '',
    })),
  }
}

export const getTypeOfItem = (type: EType) => {
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
      item.meanings.filter((item) => item.translation.trim() === '').length > 0)
  ) {
    return true
  } else {
    return false
  }
}
