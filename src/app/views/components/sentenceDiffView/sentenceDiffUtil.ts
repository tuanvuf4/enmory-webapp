export type TDictationWordStatus = 'correct' | 'typo' | 'missing' | 'extra'

export interface IDictationWord {
  word: string
  isCorrect: boolean
  status: TDictationWordStatus
  userWord?: string
}

export interface IDictationResult {
  words: IDictationWord[]
  accuracy: number
  isPerfect: boolean
  totalWords: number
  correctCount: number
  extraCount: number
}

// Common English contractions normalization
const CONTRACTIONS: Record<string, string> = {
  "aren't": 'are not',
  "can't": 'cannot',
  "couldn't": 'could not',
  "didn't": 'did not',
  "doesn't": 'does not',
  "don't": 'do not',
  "hadn't": 'had not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "he'd": 'he would',
  "he'll": 'he will',
  "he's": 'he is',
  "i'd": 'i would',
  "i'll": 'i will',
  "i'm": 'i am',
  "i've": 'i have',
  "isn't": 'is not',
  "it's": 'it is',
  "let's": 'let us',
  "she'd": 'she would',
  "she'll": 'she will',
  "she's": 'she is',
  "shouldn't": 'should not',
  "that's": 'that is',
  "there's": 'there is',
  "they'd": 'they would',
  "they'll": 'they will',
  "they're": 'they are',
  "they've": 'they have',
  "wasn't": 'was not',
  "we'd": 'we would',
  "we'll": 'we will',
  "we're": 'we are',
  "we've": 'we have',
  "weren't": 'were not',
  "what's": 'what is',
  "where's": 'where is',
  "who's": 'who is',
  "won't": 'will not',
  "wouldn't": 'would not',
  "you'd": 'you would',
  "you'll": 'you will',
  "you're": 'you are',
  "you've": 'you have',
}

export const cleanPunctuation = (str: string): string => {
  return str.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '').trim()
}

const normalizeWord = (word: string): string => {
  const lower = word.toLowerCase().trim()
  return CONTRACTIONS[lower] || lower
}

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

const isExactWordMatch = (orig: string, user: string): boolean => {
  const cOrig = cleanPunctuation(normalizeWord(orig))
  const cUser = cleanPunctuation(normalizeWord(user))
  return cOrig === cUser
}

const isTypoMatch = (orig: string, user: string): boolean => {
  const cOrig = cleanPunctuation(normalizeWord(orig))
  const cUser = cleanPunctuation(normalizeWord(user))
  if (cOrig === cUser) return true

  const dist = levenshteinDistance(cOrig, cUser)
  // Short words (<= 3 chars) need exact match
  if (cOrig.length <= 3) return false
  // Medium words (4-6 chars) allow 1 char difference
  if (cOrig.length <= 6) return dist <= 1
  // Longer words (> 6 chars) allow 2 chars difference
  return dist <= 2
}

/**
 * Evaluates sentence alignment using Longest Common Subsequence (LCS) with typo tolerance.
 */
export const evaluateSentenceDiff = (
  originalSentence: string,
  userSentence: string,
): IDictationResult => {
  const origTokens = (originalSentence || '').trim().split(/\s+/).filter(Boolean)
  const userTokens = (userSentence || '').trim().split(/\s+/).filter(Boolean)

  const m = origTokens.length
  const n = userTokens.length

  if (m === 0 && n === 0) {
    return {
      words: [],
      accuracy: 100,
      isPerfect: true,
      totalWords: 0,
      correctCount: 0,
      extraCount: 0,
    }
  }

  if (m === 0) {
    return {
      words: userTokens.map((w) => ({
        word: w,
        isCorrect: false,
        status: 'extra',
        userWord: w,
      })),
      accuracy: 0,
      isPerfect: false,
      totalWords: 0,
      correctCount: 0,
      extraCount: n,
    }
  }

  // 2D DP matrix for LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (isExactWordMatch(origTokens[i - 1], userTokens[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 2 // higher weight for exact match
      } else if (isTypoMatch(origTokens[i - 1], userTokens[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1 // typo match
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to reconstruct aligned tokens
  const aligned: IDictationWord[] = []
  let i = m
  let j = n
  let exactMatches = 0
  let typoMatches = 0
  let extraCount = 0

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && isExactWordMatch(origTokens[i - 1], userTokens[j - 1])) {
      aligned.unshift({
        word: origTokens[i - 1],
        isCorrect: true,
        status: 'correct',
        userWord: userTokens[j - 1],
      })
      exactMatches++
      i--
      j--
    } else if (
      i > 0 &&
      j > 0 &&
      isTypoMatch(origTokens[i - 1], userTokens[j - 1]) &&
      dp[i][j] === dp[i - 1][j - 1] + 1
    ) {
      aligned.unshift({
        word: origTokens[i - 1],
        isCorrect: false,
        status: 'typo',
        userWord: userTokens[j - 1],
      })
      typoMatches++
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      aligned.unshift({
        word: userTokens[j - 1],
        isCorrect: false,
        status: 'extra',
        userWord: userTokens[j - 1],
      })
      extraCount++
      j--
    } else if (i > 0) {
      aligned.unshift({
        word: origTokens[i - 1],
        isCorrect: false,
        status: 'missing',
      })
      i--
    }
  }

  const totalWords = m
  const weightedCorrect = exactMatches + typoMatches * 0.8
  const rawAccuracy = Math.round((weightedCorrect / totalWords) * 100)
  const accuracy = Math.min(100, Math.max(0, rawAccuracy))
  const isPerfect = exactMatches === totalWords && extraCount === 0 && typoMatches === 0

  return {
    words: aligned,
    accuracy,
    isPerfect,
    totalWords,
    correctCount: exactMatches,
    extraCount,
  }
}

// Backward compatible alias
export const evaluateDictation = evaluateSentenceDiff
