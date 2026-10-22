export interface IDictationWord {
  word: string
  isCorrect: boolean
  userWord?: string
}

export interface IDictationResult {
  words: IDictationWord[]
  accuracy: number
  isPerfect: boolean
  totalWords: number
  correctCount: number
}

const cleanPunctuation = (str: string): string => {
  return str
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Compare user typed text against original sentence.
 */
export const evaluateDictation = (originalText: string, userText: string): IDictationResult => {
  const origTokens = (originalText || '').trim().split(/\s+/).filter(Boolean)

  const userTokens = (userText || '').trim().split(/\s+/).filter(Boolean)

  let correctCount = 0

  const words: IDictationWord[] = origTokens.map((origWord, idx) => {
    const userWord = userTokens[idx] || ''
    const cleanOrig = cleanPunctuation(origWord)
    const cleanUser = cleanPunctuation(userWord)
    const isCorrect = cleanOrig === cleanUser && cleanOrig.length > 0

    if (isCorrect) {
      correctCount++
    }

    return {
      word: origWord,
      isCorrect,
      userWord: userWord || undefined,
    }
  })

  const totalWords = origTokens.length
  const accuracy = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0
  const isPerfect = accuracy === 100 && userTokens.length === totalWords

  return {
    words,
    accuracy,
    isPerfect,
    totalWords,
    correctCount,
  }
}
