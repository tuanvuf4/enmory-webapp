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

// Normalizes apostrophe variations (curly quotes, backticks, accents, HTML entities) to ASCII single quote (')
export const normalizeApostrophes = (str: string): string => {
  if (!str) return ''
  return str.replace(/(&#39;|&apos;|&#039;)/g, "'").replace(/[’‘ʼʻ`´]/g, "'")
}

// Normalizes double quote variations (curly quotes, entities, etc.) to standard ASCII double quote (")
export const normalizeDoubleQuotes = (str: string): string => {
  if (!str) return ''
  return str
    .replace(/(&quot;|&#34;|&ldquo;|&rdquo;|&#8220;|&#8221;)/g, '"')
    .replace(/[“”„‟«»]/g, '"')
}

// Regex matching text inside parentheses (round brackets): (...) or （...）
export const PARENTHESES_REGEX = /[(\uff08][^)\uff09]*?(?:[)\uff09]|$)/g

/**
 * Extracts words that appear inside parentheses (...) from a sentence.
 * Returns a Set of normalized word tokens.
 */
export const extractParenthesesWordTokens = (sentence: string): Set<string> => {
  const parenWords = new Set<string>()
  if (!sentence) return parenWords

  const matches = sentence.match(PARENTHESES_REGEX)
  if (!matches) return parenWords

  for (const match of matches) {
    const inner = match.replace(/^[(\uff08]+|[)\uff09]+$/g, '')
    const tokens = inner.split(/\s+/).filter(Boolean)
    for (const t of tokens) {
      const norm = normalizeWordToken(t)
      if (norm) {
        parenWords.add(norm)
        const stripped = stripToAlphanumeric(norm)
        if (stripped) parenWords.add(stripped)
      }
    }
  }

  return parenWords
}

/**
 * Strips parenthesized text (...) from a sentence for dictation comparison.
 * If removing parenthesized text leaves no words (i.e. the entire sentence
 * was inside parentheses), it preserves the inner words and strips only the parentheses.
 */
export const removeParenthesesText = (text: string): string => {
  if (!text) return ''

  const withoutParen = text.replace(PARENTHESES_REGEX, ' ').trim()

  // If text without parentheses still has alphanumeric content (words), return it
  if (stripToAlphanumeric(withoutParen)) {
    return withoutParen.replace(/\s+/g, ' ')
  }

  // Otherwise, the entire sentence was inside parentheses, so keep text and strip parentheses only
  return text
    .replace(/[()\uff08\uff09]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Comprehensive English contractions mapping (supports contractions with or without apostrophe, and their expansions)
export const CONTRACTIONS_MAP: Record<string, string[]> = {
  "aren't": ['are not'],
  "can't": ['cannot', 'can not'],
  "couldn't": ['could not'],
  "could've": ['could have'],
  "didn't": ['did not'],
  "doesn't": ['does not'],
  "don't": ['do not'],
  "hadn't": ['had not'],
  "hasn't": ['has not'],
  "haven't": ['have not'],
  "he'd": ['he would', 'he had'],
  "he'll": ['he will'],
  "he's": ['he is', 'he has'],
  "how's": ['how is', 'how has'],
  "how'd": ['how did', 'how would'],
  "i'd": ['i would', 'i had'],
  "i'll": ['i will'],
  "i'm": ['i am'],
  "i've": ['i have'],
  "isn't": ['is not'],
  "it'd": ['it would', 'it had'],
  "it'll": ['it will'],
  "it's": ['it is', 'it has'],
  "let's": ['let us'],
  "might've": ['might have'],
  "mustn't": ['must not'],
  "must've": ['must have'],
  "needn't": ['need not'],
  "she'd": ['she would', 'she had'],
  "she'll": ['she will'],
  "she's": ['she is', 'she has'],
  "shouldn't": ['should not'],
  "should've": ['should have'],
  "that'd": ['that would', 'that had'],
  "that'll": ['that will'],
  "that's": ['that is', 'that has'],
  "there'd": ['there would', 'there had'],
  "there'll": ['there will'],
  "there's": ['there is', 'there has'],
  "they'd": ['they would', 'they had'],
  "they'll": ['they will'],
  "they're": ['they are'],
  "they've": ['they have'],
  "wasn't": ['was not'],
  "we'd": ['we would', 'we had'],
  "we'll": ['we will'],
  "we're": ['we are'],
  "we've": ['we have'],
  "weren't": ['were not'],
  "what'd": ['what did'],
  "what'll": ['what will'],
  "what're": ['what are'],
  "what's": ['what is', 'what has'],
  "where'd": ['where did'],
  "where's": ['where is', 'where has'],
  "who'd": ['who would', 'who had'],
  "who'll": ['who will'],
  "who're": ['who are'],
  "who's": ['who is', 'who has'],
  "why's": ['why is', 'why has'],
  "won't": ['will not'],
  "wouldn't": ['would not'],
  "would've": ['would have'],
  "you'd": ['you would', 'you had'],
  "you'll": ['you will'],
  "you're": ['you are'],
  "you've": ['you have'],
  "ain't": ['is not', 'are not', 'am not'],
  "y'all": ['you all'],
  cannot: ['can not'],
}

// Backward compatible single-expansion map
export const CONTRACTIONS: Record<string, string> = Object.fromEntries(
  Object.entries(CONTRACTIONS_MAP).map(([k, v]) => [k, v[0]]),
)

export const cleanPunctuation = (str: string): string => {
  return normalizeApostrophes(normalizeDoubleQuotes(str))
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”„‟«»]/g, '')
    .trim()
}

/**
 * Normalizes a single word token:
 * 1. Unifies all apostrophes to ASCII '
 * 2. Lowercases and trims
 * 3. Strips surrounding punctuation (e.g. "(He's)," -> "he's", "I'm!" -> "i'm")
 */
export const normalizeWordToken = (word: string): string => {
  if (!word) return ''
  const normalized = normalizeApostrophes(word).toLowerCase().trim()
  return normalized.replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '')
}

/**
 * Strips all non-alphanumeric characters (including apostrophes) for flexible matching.
 * e.g. "I'm" -> "im", "He's" -> "hes", "don't" -> "dont"
 */
export const stripToAlphanumeric = (word: string): string => {
  return normalizeWordToken(word).replace(/[^a-z0-9]/gi, '')
}

/**
 * Returns possible expansions for a token if it is a contraction.
 * Supports both apostrophe form ("i'm") and non-apostrophe typing ("im", "hes", "dont").
 */
export const getContractionExpansions = (token: string): string[] => {
  const norm = normalizeWordToken(token)
  if (!norm) return []
  if (CONTRACTIONS_MAP[norm]) return CONTRACTIONS_MAP[norm]

  // Check without apostrophe (e.g. user typed "im", "hes", "dont", "cant")
  const stripped = stripToAlphanumeric(norm)
  if (!stripped) return []

  for (const [key, expansions] of Object.entries(CONTRACTIONS_MAP)) {
    if (key.replace(/'/g, '') === stripped) {
      return expansions
    }
  }

  return []
}

export const levenshteinDistance = (a: string, b: string): number => {
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

/**
 * 1-to-1 exact word match:
 * - Direct match after normalization (e.g. "I'm" vs "I'm", "I’m" vs "I'm", "I'm," vs "I'm")
 * - Match without apostrophe (e.g. "I'm" vs "Im", "He's" vs "Hes")
 * - 1-word contraction equivalence (e.g. "can't" vs "cannot")
 */
export const isExactWordMatch = (orig: string, user: string): boolean => {
  const normOrig = normalizeWordToken(orig)
  const normUser = normalizeWordToken(user)
  if (!normOrig || !normUser) return false

  // 1. Exact match with apostrophe preserved
  if (normOrig === normUser) return true

  // 2. Match without apostrophes (e.g. "I'm" vs "Im", "He's" vs "Hes")
  const strippedOrig = stripToAlphanumeric(normOrig)
  const strippedUser = stripToAlphanumeric(normUser)
  if (strippedOrig && strippedOrig === strippedUser) return true

  // 3. 1-token contraction equivalence (e.g. "can't" vs "cannot", "cant" vs "cannot")
  const expOrig = getContractionExpansions(normOrig)
  if (expOrig.includes(normUser) || expOrig.includes(strippedUser)) return true

  const expUser = getContractionExpansions(normUser)
  if (expUser.includes(normOrig) || expUser.includes(strippedOrig)) return true

  return false
}

/**
 * Checks if a single orig token (contraction) matches two consecutive user tokens (expanded).
 * e.g. orig = "I'm", user1 = "I", user2 = "am" -> true
 * e.g. orig = "He's", user1 = "He", user2 = "is" -> true
 */
export const isContraction1to2 = (orig: string, user1: string, user2: string): boolean => {
  const normOrig = normalizeWordToken(orig)
  const normUser1 = normalizeWordToken(user1)
  const normUser2 = normalizeWordToken(user2)
  if (!normOrig || !normUser1 || !normUser2) return false

  const combinedUser = `${normUser1} ${normUser2}`
  const expansions = getContractionExpansions(normOrig)
  return expansions.includes(combinedUser)
}

/**
 * Checks if two consecutive orig tokens (expanded) match a single user token (contraction).
 * e.g. orig1 = "I", orig2 = "am", user = "I'm" -> true
 * e.g. orig1 = "He", orig2 = "is", user = "He's" -> true
 */
export const isContraction2to1 = (orig1: string, orig2: string, user: string): boolean => {
  const normOrig1 = normalizeWordToken(orig1)
  const normOrig2 = normalizeWordToken(orig2)
  const normUser = normalizeWordToken(user)
  if (!normOrig1 || !normOrig2 || !normUser) return false

  const combinedOrig = `${normOrig1} ${normOrig2}`
  const expansions = getContractionExpansions(normUser)
  return expansions.includes(combinedOrig)
}

export const isTypoMatch = (orig: string, user: string): boolean => {
  const strippedOrig = stripToAlphanumeric(orig)
  const strippedUser = stripToAlphanumeric(user)
  if (!strippedOrig || !strippedUser) return false
  if (strippedOrig === strippedUser) return true

  const dist = levenshteinDistance(strippedOrig, strippedUser)
  // Short words (<= 3 chars) need exact match
  if (strippedOrig.length <= 3) return false
  // Medium words (4-6 chars) allow 1 char difference
  if (strippedOrig.length <= 6) return dist <= 1
  // Longer words (> 6 chars) allow 2 chars difference
  return dist <= 2
}

/**
 * Evaluates sentence alignment using Longest Common Subsequence (LCS)
 * with support for contractions (1-to-1, 1-to-2, 2-to-1) and typo tolerance.
 */
export const evaluateSentenceDiff = (
  originalSentence: string,
  userSentence: string,
): IDictationResult => {
  // Extract words that appear inside parentheses (...) in the original sentence
  // so that if the user happens to type them without parentheses, they won't be penalized as extra words.
  const origParenWords = extractParenthesesWordTokens(originalSentence || '')

  // Remove parenthesized text (...) from both sentences for comparison (as they represent explanations/notes)
  const cleanOriginal = removeParenthesesText(originalSentence || '')
  const cleanUser = removeParenthesesText(userSentence || '')

  const origTokens = cleanOriginal
    .trim()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => Boolean(stripToAlphanumeric(w)))

  const userTokens = cleanUser
    .trim()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => Boolean(stripToAlphanumeric(w)))

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

  // 2D DP matrix for LCS with multi-token contraction transitions
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let maxVal = Math.max(dp[i - 1][j], dp[i][j - 1])

      if (isExactWordMatch(origTokens[i - 1], userTokens[j - 1])) {
        maxVal = Math.max(maxVal, dp[i - 1][j - 1] + 2) // higher weight for exact match
      } else if (isTypoMatch(origTokens[i - 1], userTokens[j - 1])) {
        maxVal = Math.max(maxVal, dp[i - 1][j - 1] + 1) // typo match
      }

      // Check 1-to-2 contraction match (orig 1 word, user 2 words, e.g. "I'm" -> "I am")
      if (j >= 2 && isContraction1to2(origTokens[i - 1], userTokens[j - 2], userTokens[j - 1])) {
        maxVal = Math.max(maxVal, dp[i - 1][j - 2] + 2)
      }

      // Check 2-to-1 contraction match (orig 2 words, user 1 word, e.g. "He is" -> "He's")
      if (i >= 2 && isContraction2to1(origTokens[i - 2], origTokens[i - 1], userTokens[j - 1])) {
        maxVal = Math.max(maxVal, dp[i - 2][j - 1] + 2)
      }

      dp[i][j] = maxVal
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
    // 1. Priority: Exact 1-to-1 match
    if (
      i > 0 &&
      j > 0 &&
      isExactWordMatch(origTokens[i - 1], userTokens[j - 1]) &&
      dp[i][j] === dp[i - 1][j - 1] + 2
    ) {
      aligned.unshift({
        word: origTokens[i - 1],
        isCorrect: true,
        status: 'correct',
        userWord: userTokens[j - 1],
      })
      exactMatches++
      i--
      j--
    }
    // 2. Priority: 1-to-2 contraction match (Orig 1 word, User 2 words)
    else if (
      i > 0 &&
      j >= 2 &&
      isContraction1to2(origTokens[i - 1], userTokens[j - 2], userTokens[j - 1]) &&
      dp[i][j] === dp[i - 1][j - 2] + 2
    ) {
      aligned.unshift({
        word: origTokens[i - 1],
        isCorrect: true,
        status: 'correct',
        userWord: `${userTokens[j - 2]} ${userTokens[j - 1]}`,
      })
      exactMatches++
      i--
      j -= 2
    }
    // 3. Priority: 2-to-1 contraction match (Orig 2 words, User 1 word)
    else if (
      i >= 2 &&
      j > 0 &&
      isContraction2to1(origTokens[i - 2], origTokens[i - 1], userTokens[j - 1]) &&
      dp[i][j] === dp[i - 2][j - 1] + 2
    ) {
      aligned.unshift({
        word: origTokens[i - 1],
        isCorrect: true,
        status: 'correct',
        userWord: userTokens[j - 1],
      })
      aligned.unshift({
        word: origTokens[i - 2],
        isCorrect: true,
        status: 'correct',
        userWord: userTokens[j - 1],
      })
      exactMatches += 2
      i -= 2
      j--
    }
    // 4. Priority: Typo 1-to-1 match
    else if (
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
    }
    // 5. Extra user word
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      const extraWord = userTokens[j - 1]
      const normExtra = normalizeWordToken(extraWord)
      const strippedExtra = stripToAlphanumeric(extraWord)

      // If user typed a word that was in the original parenthesized text, do not penalize as extra
      if (
        (normExtra && origParenWords.has(normExtra)) ||
        (strippedExtra && origParenWords.has(strippedExtra))
      ) {
        j--
      } else {
        aligned.unshift({
          word: extraWord,
          isCorrect: false,
          status: 'extra',
          userWord: extraWord,
        })
        extraCount++
        j--
      }
    }
    // 6. Missing orig word
    else if (i > 0) {
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
