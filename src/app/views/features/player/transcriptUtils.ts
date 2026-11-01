export interface ITranscriptSegment {
  timeSeconds: number
  text: string
  translation?: string
}

/**
 * Matches lines that contain ONLY a timestamp.
 * Supports: M:SS, MM:SS, H:MM:SS
 * Example: "19:26", "1:23:45"
 */
const TIMESTAMP_RE = /^(\d+):(\d{2})(?::(\d{2}))?$/

/**
 * Parses a plain-text transcript with timestamp markers into segments.
 * Optionally merges a parallel Vietnamese translation transcript mapped by timestamp or sequence.
 */
export function parseTranscript(transcript: string, translation?: string): ITranscriptSegment[] {
  if (!transcript?.trim()) return []

  const segments: ITranscriptSegment[] = []
  let currentTime: number | null = null
  let currentLines: string[] = []

  const flush = () => {
    if (currentTime !== null) {
      const text = currentLines.join('\n').trim()
      if (text) segments.push({ timeSeconds: currentTime, text })
    }
  }

  for (const rawLine of transcript.split('\n')) {
    const line = rawLine.trim()
    const match = line.match(TIMESTAMP_RE)

    if (match) {
      flush()
      currentTime =
        match[3] !== undefined
          ? parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3])
          : parseInt(match[1]) * 60 + parseInt(match[2])
      currentLines = []
    } else if (currentTime !== null && line) {
      currentLines.push(line)
    }
  }

  flush()

  // Match and attach translation if provided
  if (translation?.trim() && segments.length > 0) {
    const transSegments = parseTranscript(translation)
    if (transSegments.length > 0) {
      const hasCloseTimestamps = transSegments.some((ts) =>
        segments.some((s) => Math.abs(s.timeSeconds - ts.timeSeconds) <= 2),
      )

      segments.forEach((seg, idx) => {
        if (hasCloseTimestamps) {
          const match = transSegments.find((ts) => Math.abs(ts.timeSeconds - seg.timeSeconds) <= 2)
          if (match) {
            seg.translation = match.text
            return
          }
        }
        if (transSegments[idx]) {
          seg.translation = transSegments[idx].text
        }
      })
    } else {
      // Translation might be lines without timestamps
      const lines = translation
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      if (lines.length > 0) {
        segments.forEach((seg, idx) => {
          if (lines[idx]) {
            seg.translation = lines[idx]
          }
        })
      }
    }
  }

  return segments
}

/**
 * Returns the index of the active segment for the given playedSeconds.
 * Returns -1 if playback hasn't reached the first segment yet.
 */
export function getActiveSegmentIndex(
  segments: ITranscriptSegment[],
  playedSeconds: number,
): number {
  let active = -1
  for (let i = 0; i < segments.length; i++) {
    if (playedSeconds >= segments[i].timeSeconds) active = i
    else break
  }
  return active
}

export function formatSegmentTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  if (s >= 3600) {
    const h = Math.floor(s / 3600)
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${h}:${m}:${sec}`
  }
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

/**
 * Common English abbreviations and honorifics that end with a period but do NOT mark the end of a sentence.
 */
const COMMON_ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'rev',
  'gen',
  'rep',
  'sen',
  'st',
  'vs',
  'etc',
  'eg',
  'ie',
  'al',
  'approx',
  'dept',
  'fig',
  'vol',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
  'us',
  'uk',
  'eu',
  'am',
  'pm',
])

/**
 * Checks if a word ending with a period is an abbreviation rather than a sentence boundary.
 */
function isAbbreviation(wordWithDot: string): boolean {
  const clean = wordWithDot.replace(/[^\w]/g, '').toLowerCase()
  if (COMMON_ABBREVIATIONS.has(clean)) return true
  // Single letter initial like "J." or "F."
  if (/^[a-zA-Z]\.$/.test(wordWithDot)) return true
  // Multi-dotted like "u.s." or "e.g."
  if (/^([a-zA-Z]\.){2,}$/.test(wordWithDot)) return true
  // Decimal numbers like "3.14" or "$1.5"
  if (/\d+\.\d*$/.test(wordWithDot)) return true
  return false
}

/**
 * Identifies whether a text fragment is purely an audio sound annotation like (Laughter), [Music], etc.
 */
export function isAudioNoiseTag(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true

  // Text enclosed in (), [], {}, or surrounded by ♪ / *
  if (/^[\(\[\{♪\*].*[\)\]\}♪\*]$/.test(trimmed)) {
    const inner = trimmed.replace(/^[\(\[\{♪\*\s]+|[\)\]\}♪\*\s]+$/g, '').toLowerCase()
    if (
      /^(?:laughter|applause|music|cheering|cheers|chuckles|giggles|sighs|silence|audio|groans|inaudible|crosstalk|screaming|snickers|singing|whistling|coughing|gasping|sobbing|bell|upbeat music|instrumental|background music|applause and laughter|theme music|sound of|ambient sound|noise)$/i.test(
        inner,
      )
    ) {
      return true
    }
    // Generic non-speech descriptor (<= 3 words, no common verbs or pronouns)
    if (
      inner.split(/\s+/).length <= 3 &&
      !/\b(?:i|you|he|she|we|they|is|are|was|were|have|has|do|did|can|will|the|a|an)\b/i.test(inner)
    ) {
      return true
    }
  }
  return false
}

/**
 * Cleans inline sound tags from speech text.
 */
function cleanSpeechText(text: string): string {
  return text
    .replace(
      /[\(\[]\s*(?:laughter|applause|music|cheering|cheers|chuckles|giggles|sighs|silence|audio|groans|inaudible|crosstalk)\s*[\)\]]/gi,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Checks if a string ends with terminal punctuation (. ? ! …) that indicates a complete sentence.
 */
function isSentenceEnding(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  // Ends with . ? ! … possibly followed by closing quotation mark or parenthesis
  const match = trimmed.match(/(\S+?)([.?!…]["'”’)]?)$/)
  if (!match) return false

  const word = match[1].toLowerCase().replace(/[^\w]/g, '')
  if (match[2].startsWith('.') && isAbbreviation(word + '.')) {
    return false
  }

  // Single letter initial
  if (match[2].startsWith('.') && /^[a-zA-Z]\.?$/.test(match[1])) {
    return false
  }

  return true
}

function parseTimeToSeconds(hOrM: string, mOrS: string, sOpt?: string): number {
  if (sOpt !== undefined) {
    return parseInt(hOrM, 10) * 3600 + parseInt(mOrS, 10) * 60 + parseInt(sOpt, 10)
  }
  return parseInt(hOrM, 10) * 60 + parseInt(mOrS, 10)
}

interface IRawFragment {
  timeSeconds: number
  text: string
}

const TIMESTAMP_LINE_RE =
  /^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+|\,\d+)?\]?(?:\s*(?:-->|-)\s*\[?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+|\,\d+)?\]?)?$/

const TIMESTAMP_PREFIX_RE = /^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+|\,\d+)?\]?[\s\-:]+(.+)$/

function parseRawFragments(transcript: string): IRawFragment[] {
  const fragments: IRawFragment[] = []
  const lines = transcript.split(/\r?\n/)

  let pendingTime: number | null = null
  let pendingTextLines: string[] = []

  const flush = () => {
    if (pendingTime !== null) {
      const combinedText = pendingTextLines.join(' ').trim()
      if (combinedText) {
        fragments.push({ timeSeconds: pendingTime, text: combinedText })
      }
    }
    pendingTime = null
    pendingTextLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Skip WebVTT header or metadata
    if (/^(?:WEBVTT|NOTE|Kind:|Language:)/i.test(line)) continue

    // Skip pure SRT line sequence numbers
    if (/^\d+$/.test(line) && pendingTime === null) continue

    // Pure timestamp line
    const lineTimeMatch = line.match(TIMESTAMP_LINE_RE)
    if (lineTimeMatch) {
      flush()
      pendingTime = parseTimeToSeconds(lineTimeMatch[1], lineTimeMatch[2], lineTimeMatch[3])
      continue
    }

    // Line starting with timestamp
    const prefixMatch = line.match(TIMESTAMP_PREFIX_RE)
    if (prefixMatch) {
      flush()
      const t = parseTimeToSeconds(prefixMatch[1], prefixMatch[2], prefixMatch[3])
      fragments.push({ timeSeconds: t, text: prefixMatch[4].trim() })
      continue
    }

    // Text content line
    if (pendingTime !== null) {
      pendingTextLines.push(line)
    } else {
      pendingTime = 0
      pendingTextLines.push(line)
    }
  }

  flush()
  return fragments
}

export interface IFormatTranscriptResult {
  formattedText: string
  sentenceCount: number
  originalFragmentCount: number
  hasPunctuation: boolean
}

/**
 * Formats and reorganizes a raw transcript into complete sentences per timestamp marker.
 * - Merges broken subtitle fragments belonging to the same sentence into one segment.
 * - Discards non-speech audio cues like (Laughter), [Applause], [Music].
 * - Preserves the start timestamp of each full sentence.
 * - Adds a blank line between segments for optimal readability and parser compatibility.
 */
export function formatTranscriptIntoSentences(transcript: string): IFormatTranscriptResult {
  if (!transcript || !transcript.trim()) {
    return { formattedText: '', sentenceCount: 0, originalFragmentCount: 0, hasPunctuation: false }
  }

  const rawFragments = parseRawFragments(transcript)
  if (!rawFragments.length) {
    return {
      formattedText: transcript.trim(),
      sentenceCount: 0,
      originalFragmentCount: 0,
      hasPunctuation: false,
    }
  }

  // Filter out noise tags & clean text
  const validFragments: IRawFragment[] = []
  let totalTerminalPunctuation = 0

  for (const frag of rawFragments) {
    const cleaned = cleanSpeechText(frag.text)
    if (cleaned && !isAudioNoiseTag(cleaned)) {
      validFragments.push({
        timeSeconds: frag.timeSeconds,
        text: cleaned,
      })
      if (isSentenceEnding(cleaned)) {
        totalTerminalPunctuation++
      }
    }
  }

  const hasPunctuation = totalTerminalPunctuation > 0

  if (!validFragments.length) {
    return {
      formattedText: transcript.trim(),
      sentenceCount: 0,
      originalFragmentCount: rawFragments.length,
      hasPunctuation: false,
    }
  }

  const formattedSegments: { timeFormatted: string; text: string }[] = []

  let currentStartSeconds = validFragments[0].timeSeconds
  let currentWords: string[] = []

  const flushSentence = () => {
    if (currentWords.length > 0) {
      const sentenceText = currentWords
        .join(' ')
        .replace(/\s+([,.:;?!…])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (sentenceText) {
        formattedSegments.push({
          timeFormatted: formatSegmentTime(currentStartSeconds),
          text: sentenceText,
        })
      }
    }
    currentWords = []
  }

  for (let i = 0; i < validFragments.length; i++) {
    const frag = validFragments[i]
    const nextFrag = validFragments[i + 1]

    if (currentWords.length === 0) {
      currentStartSeconds = frag.timeSeconds
    }

    currentWords.push(frag.text)

    const currentCombined = currentWords.join(' ')
    const endsWithTerminal = isSentenceEnding(frag.text)

    // Check speaker label in next fragment (e.g. "Sarah: ...")
    const nextHasSpeaker = nextFrag && /^[A-Z][a-zA-Z0-9_\s]{1,15}:\s+/.test(nextFrag.text)

    // Time gap between fragments
    const nextTimeGap = nextFrag ? nextFrag.timeSeconds - frag.timeSeconds : 0

    // Condition 1: Fragment ends with sentence-terminating punctuation (. ? ! …)
    let shouldFlush = endsWithTerminal

    // Condition 2: Next fragment is a different speaker
    if (nextHasSpeaker) {
      shouldFlush = true
    }

    // Condition 3: Significant pause in speech (>= 3.5s)
    if (hasPunctuation) {
      if (nextTimeGap >= 3.5 && currentCombined.length > 40) {
        shouldFlush = true
      }
      // If a sentence is unusually long (> 160 chars) and reaches a comma/semicolon with pause
      if (currentCombined.length > 160 && (nextTimeGap >= 2.0 || /[,;]$/.test(frag.text))) {
        shouldFlush = true
      }
    } else {
      // Heuristic when transcript completely lacks punctuation:
      // Break on natural pauses (>= 3.0s) or when line length exceeds ~100 chars at a pause/capital
      if (
        (nextTimeGap >= 3.0 && currentCombined.length > 30) ||
        (currentCombined.length >= 90 &&
          (nextTimeGap >= 2.0 || (nextFrag && /^[A-Z]/.test(nextFrag.text)))) ||
        currentCombined.length >= 150
      ) {
        shouldFlush = true
      }
    }

    if (shouldFlush) {
      flushSentence()
    }
  }

  flushSentence()

  const formattedText = formattedSegments
    .map((seg) => `${seg.timeFormatted}\n${seg.text}`)
    .join('\n\n')

  return {
    formattedText,
    sentenceCount: formattedSegments.length,
    originalFragmentCount: rawFragments.length,
    hasPunctuation,
  }
}
