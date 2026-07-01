export interface ITranscriptSegment {
  timeSeconds: number
  text: string
}

/**
 * Matches lines that contain ONLY a timestamp.
 * Supports: M:SS, MM:SS, H:MM:SS
 * Example: "19:26", "1:23:45"
 */
const TIMESTAMP_RE = /^(\d+):(\d{2})(?::(\d{2}))?$/

/**
 * Parses a plain-text transcript with timestamp markers into segments.
 *
 * Input format:
 * ```
 * 19:26
 *
 * But if we just listen and pay attention...
 *
 * So reflect on your own life.
 *
 * 19:41
 * If you try to embrace those things...
 * ```
 */
export function parseTranscript(transcript: string): ITranscriptSegment[] {
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
      // H:MM:SS or MM:SS
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
  const s = Math.floor(totalSeconds)
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}
