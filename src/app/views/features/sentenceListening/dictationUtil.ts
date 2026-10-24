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

/**
 * Standardize text: clean punctuation, normalize curly apostrophes.
 */
export const cleanPunctuation = (str: string): string => {
  if (!str) return ''
  return str
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”"]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_~()?]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Compute Levenshtein distance between two strings.
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      )
    }
  }

  return dp[m][n]
}

const isExactWordMatch = (orig: string, user: string): boolean => {
  const cOrig = cleanPunctuation(orig)
  const cUser = cleanPunctuation(user)
  if (!cOrig || !cUser) return false
  if (cOrig === cUser) return true

  // Contraction checks
  if (CONTRACTIONS[cOrig] && CONTRACTIONS[cOrig] === cUser) return true
  if (CONTRACTIONS[cUser] && CONTRACTIONS[cUser] === cOrig) return true
  return false
}

const isTypoMatch = (orig: string, user: string): boolean => {
  const cOrig = cleanPunctuation(orig)
  const cUser = cleanPunctuation(user)
  if (!cOrig || !cUser) return false
  if (cOrig === cUser) return false // already exact

  const dist = levenshteinDistance(cOrig, cUser)
  const maxLen = Math.max(cOrig.length, cUser.length)

  // Minor typos: 1 edit for 4+ chars, <=2 edits for 7+ chars
  if (maxLen >= 4 && dist === 1) return true
  if (maxLen >= 7 && dist <= 2) return true

  return false
}

/**
 * Compare user typed text against original sentence using Longest Common Subsequence (LCS).
 * Accurately aligns words even when words are omitted or extra words are typed.
 */
export const evaluateDictation = (originalText: string, userText: string): IDictationResult => {
  const origTokens = (originalText || '').trim().split(/\s+/).filter(Boolean)
  const userTokens = (userText || '').trim().split(/\s+/).filter(Boolean)

  const m = origTokens.length
  const n = userTokens.length

  if (m === 0) {
    return {
      words: [],
      accuracy: 100,
      isPerfect: true,
      totalWords: 0,
      correctCount: 0,
      extraCount: 0,
    }
  }

  // 1. Build DP matrix for LCS (both exact and typo can yield match points)
  // We prefer exact matches (score 2) over typo matches (score 1)
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (isExactWordMatch(origTokens[i - 1], userTokens[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 2
      } else if (isTypoMatch(origTokens[i - 1], userTokens[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // 2. Backtrack to align tokens
  let i = m
  let j = n
  const aligned: IDictationWord[] = []

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
      // User typed an extra word that doesn't correspond to current original word
      aligned.unshift({
        word: userTokens[j - 1],
        isCorrect: false,
        status: 'extra',
        userWord: userTokens[j - 1],
      })
      extraCount++
      j--
    } else if (i > 0) {
      // Original word is missing in user's dictation
      aligned.unshift({
        word: origTokens[i - 1],
        isCorrect: false,
        status: 'missing',
      })
      i--
    }
  }

  const totalWords = m
  // Partial credit for typo: 0.8 of a word
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
