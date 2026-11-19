export interface ParagraphPair {
  original: string
  translation: string
}

/**
 * Extracts logical paragraph or block elements from HTML or plain text.
 * - Strips empty/ghost formatting elements like <p><br></p>, <p>&nbsp;</p>.
 * - Unwraps single container wrappers (e.g. <div class="ck-content">...</div>).
 * - Recognizes block elements (P, H1-H6, BLOCKQUOTE, UL, OL, TABLE, etc.).
 * - If text has no HTML tags, splits on double newlines.
 */
export function extractParagraphBlocks(content: string): string[] {
  if (!content || !content.trim()) return []

  if (typeof document === 'undefined') {
    return content.split(/\n\s*\n/).filter((b) => b.trim().length > 0)
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')

    // Unwrap single wrapper containers if present
    let container: Element = doc.body
    while (
      container.children.length === 1 &&
      ['DIV', 'SECTION', 'ARTICLE', 'MAIN'].includes(container.children[0].tagName)
    ) {
      container = container.children[0]
    }

    const rawChildren = Array.from(container.children)

    if (rawChildren.length > 0) {
      const blocks: string[] = []
      for (const child of rawChildren) {
        // Exclude empty paragraphs (e.g. <p><br></p> or whitespace)
        const text = child.textContent?.replace(/\u00a0/g, ' ').trim() || ''
        const hasMedia = child.querySelector('img, video, iframe, audio, table') !== null
        if (!text && !hasMedia) {
          continue
        }
        blocks.push(child.outerHTML)
      }
      if (blocks.length > 0) {
        return blocks
      }
    }

    // If no block children (e.g. plain text or text separated by <br><br>)
    const innerHtml = container.innerHTML.trim()
    if (innerHtml.includes('<br')) {
      const parts = innerHtml
        .split(/(?:<br\s*\/?>\s*){2,}/i)
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length > 1) {
        return parts.map((p) => (p.startsWith('<p>') ? p : `<p>${p}</p>`))
      }
    }

    // Split plain text on double newlines
    const textParts = (container.textContent || content)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    if (textParts.length > 0) {
      return textParts.map((p) => `<p>${p}</p>`)
    }
  } catch (err) {
    console.warn('[bilingualUtils] Failed to parse content:', err)
  }

  return [content]
}

/**
 * Aligns original blocks and translation blocks into 1:1 pairs.
 * If paragraph counts differ, aligns up to Math.max(orig.length, trans.length).
 */
export function alignParagraphPairs(origBlocks: string[], transBlocks: string[]): ParagraphPair[] {
  const maxLen = Math.max(origBlocks.length, transBlocks.length)
  if (maxLen === 0) return []

  const pairs: ParagraphPair[] = []
  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      original: origBlocks[i] || '',
      translation: transBlocks[i] || '',
    })
  }
  return pairs
}
