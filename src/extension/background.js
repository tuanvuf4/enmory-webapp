const ENMORY_MANUAL_ADD_MENU_ID = 'enmory-manual-add'
const ENMORY_QUICK_ADD_MENU_ID = 'enmory-quick-add'
const WORD_CATEGORY_ID = 1
const PHRASE_CATEGORY_ID = 2

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
]

if (typeof importScripts === 'function') {
  try {
    importScripts('extension-config.js')
  } catch (e) {
    console.warn('[Enmory] Could not load extension-config.js', e)
  }
}

const EXT_CONFIG = self.__ENMORY_EXTENSION_CONFIG__ || {}
const BUILD_TIME_GEMINI_API_KEY = EXT_CONFIG.geminiApiKey || ''
const BUILD_TIME_FIREBASE_PROJECT_ID = EXT_CONFIG.firebase?.projectId || 'enmory-21593'
const BUILD_TIME_FIREBASE_API_KEY = EXT_CONFIG.firebase?.apiKey || 'AIzaSyD1M98BLfltwGQx5vh3uQ8ZVHnBk3oKU7k'

const normalizeSelection = (value = '') => value.replace(/\s+/g, ' ').trim()

const getCategoryIdFromSelection = (value = '') =>
  normalizeSelection(value).split(' ').filter(Boolean).length > 1
    ? PHRASE_CATEGORY_ID
    : WORD_CATEGORY_ID

// =========================================================================
// Grammar Review Feature (Preserved)
// =========================================================================
const parseReviewResult = (content, originalText) => {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response payload')

    const parsed = JSON.parse(jsonMatch[0])
    const correctedText =
      typeof parsed.correctedText === 'string' && parsed.correctedText.trim().length
        ? parsed.correctedText
        : originalText

    const rawIssues = Array.isArray(parsed.issues)
      ? parsed.issues
      : Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : []

    let issues = rawIssues
      .map((item) => ({
        issue: typeof item?.issue === 'string' ? item.issue : 'style',
        current: typeof item?.current === 'string' ? item.current : '',
        suggestion: typeof item?.suggestion === 'string' ? item.suggestion : '',
        explanation: typeof item?.explanation === 'string' ? item.explanation : '',
      }))
      .filter((item) => item.current || item.suggestion)

    if (!issues.length && correctedText !== originalText) {
      issues = [
        {
          issue: 'style',
          current: originalText,
          suggestion: correctedText,
          explanation: 'Suggested full-sentence correction.',
        },
      ]
    }

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Review completed',
      correctedText,
      issues,
    }
  } catch (error) {
    return {
      summary: 'Review completed (could not parse structured issues)',
      correctedText: originalText,
      issues: [],
    }
  }
}

const getResolvedGeminiApiKey = async () => {
  const { geminiApiKey } = await chrome.storage.sync.get(['geminiApiKey'])
  const resolved =
    typeof geminiApiKey === 'string' && geminiApiKey.trim()
      ? geminiApiKey.trim()
      : BUILD_TIME_GEMINI_API_KEY.trim()
  return resolved
}

const getResolvedUid = async () => {
  try {
    const local = await chrome.storage.local.get(['enmory_uid'])
    if (local?.enmory_uid) return String(local.enmory_uid).trim()
    const sync = await chrome.storage.sync.get(['enmory_uid'])
    if (sync?.enmory_uid) return String(sync.enmory_uid).trim()
  } catch (e) {
    // ignore
  }
  return ''
}

const reviewSentence = async (text) => {
  const normalizedText = normalizeSelection(text)
  if (!normalizedText) throw new Error('Missing text to review')

  const resolvedApiKey = await getResolvedGeminiApiKey()
  if (!resolvedApiKey) throw new Error('Gemini API key is not configured')

  const prompt = `You are an English writing assistant. Review this text and return ONLY JSON.\n\nRules:\n- Find ALL issues you can detect (grammar, spelling, word choice, punctuation, style).\n- Return granular issues, not only one global correction.\n- Include multiple issues when they are independent, even in the same sentence.\n- Return up to 10 issues, sorted by appearance order.\n- If no issue exists, return an empty issues array.\n\nJSON schema:\n{\n  "summary": "short assessment",\n  "correctedText": "best corrected sentence",\n  "issues": [\n    {\n      "issue": "grammar|spelling|word-choice|punctuation|style",\n      "current": "original fragment",\n      "suggestion": "replacement fragment",\n      "explanation": "short explanation"\n    }\n  ]\n}\n\nText: "${normalizedText}"`

  let lastError = null

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(resolvedApiKey)}`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        return parseReviewResult(content, normalizedText)
      } else {
        const errText = await response.text()
        lastError = new Error(`Gemini request failed: ${response.status} ${errText}`)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
    }
  }

  throw lastError || new Error('Failed to review sentence with Google Gemini')
}

// =========================================================================
/** Generate standard 20-character base62 Firestore document ID */
function generateFirestoreAutoId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let autoId = ''
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(20)
    crypto.getRandomValues(bytes)
    for (let i = 0; i < 20; i++) {
      autoId += chars[bytes[i] % chars.length]
    }
  } else {
    for (let i = 0; i < 20; i++) {
      autoId += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  return autoId
}

// Auto-Enrichment & Database Persistence
// =========================================================================

/** Convert JavaScript object to Firestore REST typed fields */
function toFirestoreValue(val) {
  if (val === null || val === undefined) {
    return { nullValue: null }
  }
  if (typeof val === 'string') {
    return { stringValue: val }
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val }
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) }
    }
    return { doubleValue: val }
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue),
      },
    }
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(val),
      },
    }
  }
  return { stringValue: String(val) }
}

function toFirestoreFields(obj) {
  const fields = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value)
    }
  }
  return fields
}

/** Convert Firestore typed fields back to plain JavaScript object */
function fromFirestoreValue(val) {
  if (!val) return null
  if (val.stringValue !== undefined) return val.stringValue
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10)
  if (val.doubleValue !== undefined) return parseFloat(val.doubleValue)
  if (val.booleanValue !== undefined) return val.booleanValue
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map(fromFirestoreValue)
  }
  if (val.mapValue !== undefined) {
    return fromFirestoreFields(val.mapValue.fields || {})
  }
  return null
}

function fromFirestoreFields(fields) {
  const obj = {}
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = fromFirestoreValue(v)
  }
  return obj
}

/** Save item to IndexedDB (EnmoryLocalDB -> items table) */
function saveToIndexedDb(item) {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(false)
        return
      }
      const req = indexedDB.open('EnmoryLocalDB')
      req.onerror = () => resolve(false)
      req.onsuccess = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('items')) {
          db.close()
          resolve(false)
          return
        }
        try {
          const tx = db.transaction(['items'], 'readwrite')
          const store = tx.objectStore('items')
          const putReq = store.put(item)
          putReq.onsuccess = () => {
            db.close()
            resolve(true)
          }
          putReq.onerror = () => {
            db.close()
            resolve(false)
          }
        } catch (txErr) {
          db.close()
          resolve(false)
        }
      }
    } catch (err) {
      resolve(false)
    }
  })
}

/** Find existing item in Local IndexedDB (strictly local-only, 0 Firestore requests) */
function findExistingInLocalDb(originWord, uid) {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open('EnmoryLocalDB')
      req.onerror = () => resolve(null)
      req.onsuccess = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('items')) {
          db.close()
          return resolve(null)
        }
        try {
          const tx = db.transaction(['items'], 'readonly')
          const store = tx.objectStore('items')
          const source =
            store.indexNames && store.indexNames.contains('uid') && uid
              ? store.index('uid').openCursor(IDBKeyRange.only(uid))
              : store.openCursor()

          const norm = originWord.trim().toLowerCase()

          source.onsuccess = (ev) => {
            const cursor = ev.target.result
            if (cursor) {
              const item = cursor.value
              const itemOrigin = String(item.origin || '').trim().toLowerCase()
              const itemUid = String(item.uid || '').trim()
              if (itemOrigin === norm && (!uid || itemUid === uid)) {
                db.close()
                return resolve(item)
              }
              cursor.continue()
            } else {
              db.close()
              resolve(null)
            }
          }
          source.onerror = () => {
            db.close()
            resolve(null)
          }
        } catch (txErr) {
          db.close()
          resolve(null)
        }
      }
    } catch (err) {
      resolve(null)
    }
  })
}

/** Look for existing item: strictly local IndexedDB check (0 Firestore queries) */
async function findExistingItem(originWord, uid) {
  return await findExistingInLocalDb(originWord, uid)
}

/** Save new item to Google Cloud Firestore via REST API in a SINGLE request */
async function saveToFirestore(item) {
  const projectId = BUILD_TIME_FIREBASE_PROJECT_ID
  const apiKey = BUILD_TIME_FIREBASE_API_KEY

  // Pre-generate document ID so item.id and meanings are all populated in 1 single write
  const docId = item.id || generateFirestoreAutoId()
  item.id = docId
  if (Array.isArray(item.meanings)) {
    item.meanings.forEach((m) => {
      m.itemId = docId
    })
  }

  // Create directly with documentId query parameter (eliminates the need for a secondary PATCH request)
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/items?documentId=${encodeURIComponent(docId)}&key=${encodeURIComponent(apiKey)}`

  const fields = toFirestoreFields(item)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Firestore save failed (${res.status}): ${errorText}`)
  }

  return docId
}

/** Update existing item in Google Cloud Firestore via PATCH REST API */
async function updateFirestore(docId, item) {
  const projectId = BUILD_TIME_FIREBASE_PROJECT_ID
  const apiKey = BUILD_TIME_FIREBASE_API_KEY
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/items/${encodeURIComponent(docId)}?key=${encodeURIComponent(apiKey)}`

  const fields = toFirestoreFields(item)

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Firestore update failed (${res.status}): ${errorText}`)
  }

  const updatedDoc = await res.json()
  return updatedDoc?.name ? updatedDoc.name.split('/').pop() : docId
}

/** Filter words array and exclude the origin word (case-insensitive deduplication) */
function filterWordsExcludingOrigin(words = [], originWord = '') {
  const normalizedOrigin = String(originWord || '').trim().toLowerCase()
  const map = new Map()

  const flatWords = (words || []).flatMap((item) =>
    typeof item === 'string' && item.includes(',') ? item.split(',') : [item],
  )

  flatWords
    .map((word) => String(word || '').trim())
    .filter(Boolean)
    .forEach((word) => {
      const key = word.toLowerCase()
      if (key !== normalizedOrigin && !map.has(key)) {
        map.set(key, word)
      }
    })

  return Array.from(map.values())
}

/**
 * Call Gemini to enrich a vocabulary item.
 * Automatically handles IPA, definition, Vietnamese translation, collocations, and contextual example.
 */
async function enrichVocabWithGemini(originWord, sentenceContext = '') {
  const resolvedApiKey = await getResolvedGeminiApiKey()
  if (!resolvedApiKey) {
    throw new Error('Chưa cấu hình Gemini API Key cho Extension')
  }

  const contextHint = sentenceContext
    ? `\nSentence context where this word appears: "${sentenceContext}"\n(CRITICAL: The sense used in this sentence context MUST be placed as meanings[0]. You MUST translate this exact sentence context into Vietnamese and put it as the VERY FIRST example in meanings[0].examples!).`
    : ''

  const prompt = `You are a professional English lexicographer for the Enmory language app.
Perform a comprehensive lexical analysis for the English word or phrase: "${originWord}"${contextHint}

CRITICAL RULES FOR CATEGORY & LINGUISTIC FIELDS (STRICT ENMORY RULES):
1. Category (catId):
   - 1 = WORD (single word)
   - 2 = PHRASE (multi-word phrase)
   - 3 = IDIOM (idiom / figurative expression)
   - 4 = SLANG (slang / informal expression)
   - 5 = COLLOCATION (frequent word pairing)
   - 6 = SENTENCE (full sentence / proverb)

2. FORMS & WORD FAMILY (CRITICAL RULE):
   - ONLY items where catId === 1 (WORD) can have "forms" and "word_family"!
   - If "${originWord}" is a PHRASE, IDIOM, SLANG, COLLOCATION, or SENTENCE (catId !== 1):
     You MUST return "forms": [] (empty array) and "word_family": [] (empty array). Do NOT invent forms or word families for phrases!
   - For single words (catId === 1): return other morphological forms and derived word family words. NEVER include "${originWord}" itself in forms, word_family, relation, or synonyms!

3. PRONUNCIATION:
   - For single words (catId === 1): provide "uk", "us", and "common".
   - For phrases / idioms / sentences (catId !== 1): provide "common" standard IPA, and set "uk": "", "us": "".

4. MEANINGS:
   - EXTRACT ALL DISTINCT & IMPORTANT MEANINGS (up to 4-5 senses) across ALL relevant parts of speech (e.g. if the word can function as both NOUN and VERB, or ADJECTIVE and NOUN, include definitions for each part of speech).
   - If Sentence context is provided above:
     * Identify the exact sense used in that sentence and set it as the FIRST meaning (meanings[0]).
     * Translate that exact sentence context into natural Vietnamese and place it as the VERY FIRST item in meanings[0].examples.
   - Subsequent meanings (meanings[1], meanings[2], etc.) MUST cover the other major meanings and different parts of speech of "${originWord}".
   - DO NOT return only one meaning if the word has multiple common senses or parts of speech in the English language.

Output ONLY valid JSON matching this schema:
{
  "catId": 1,
  "level": 3,
  "forms": ["other morphological forms excluding ${originWord}, or [] if phrase/idiom"],
  "word_family": ["derived words sharing the root excluding ${originWord}, or [] if phrase/idiom"],
  "relation": ["closely related words, synonyms, compounds excluding ${originWord}"],
  "meanings": [
    {
      "typeId": 1,
      "pronunciation": {
        "uk": "British IPA (empty for phrases)",
        "us": "American IPA (empty for phrases)",
        "common": "Standard IPA"
      },
      "definition": "Clear learner English definition for this specific sense",
      "translation": "Accurate natural Vietnamese translation for this specific sense",
      "note": "",
      "grammar": "",
      "collocations": "<ul><li>common collocation 1</li><li>common collocation 2</li></ul>",
      "synonyms": ["up to 4 synonyms, never the word itself"],
      "examples": [
        {
          "origin": "English example sentence",
          "translation": "Vietnamese translation of the example sentence"
        }
      ]
    }
  ]
}

Classification Reference:
- catId: 1=WORD, 2=PHRASE, 3=IDIOM, 4=SLANG, 5=COLLOCATION, 6=SENTENCE
- typeId: 1=NOUN, 2=VERB, 3=ADJECTIVE, 4=ADVERB, 5=PREPOSITION, 6=CONJUNCTION, 7=PRONOUN, 8=ARTICLE, 9=DETERMINER, 10=INTERJECTION
- level: 1=A1, 2=A2, 3=B1, 4=B2, 5=C1/C2`

  let lastError = null

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(resolvedApiKey)}`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('Không thể phân tích dữ liệu JSON từ Gemini')
        return JSON.parse(jsonMatch[0])
      } else {
        const errText = await response.text()
        lastError = new Error(`Gemini API error (${response.status}): ${errText}`)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
    }
  }

  throw lastError || new Error('Không thể kết nối đến Gemini API')
}

/**
 * Handle quick add: Enrich -> Save to Firestore & IndexedDB -> Notify
 * In case the word already exists: Overwrite lexical data completely with new meanings,
 * but preserve and append all old examples from the existing item!
 */
async function handleQuickAddVocab(origin, sentenceContext = '', pageUrl = '') {
  const cleanOrigin = normalizeSelection(origin)
  if (!cleanOrigin) {
    throw new Error('Từ vựng trống')
  }

  const defaultCatId = getCategoryIdFromSelection(cleanOrigin)
  const uid = await getResolvedUid()
  if (!uid) {
    throw new Error('Chưa đăng nhập. Vui lòng đăng nhập vào Enmory để sử dụng tính năng này.')
  }

  // 1. Check if word already exists in Local DB or Firestore
  const existingItem = await findExistingItem(cleanOrigin, uid)

  // 2. Collect all existing examples from existingItem (to preserve them)
  const existingExamples = []
  const seenExamples = new Set()

  const collectEx = (ex) => {
    if (!ex) return
    const originStr = typeof ex === 'string' ? ex.trim() : String(ex.origin || '').trim()
    if (!originStr) return
    const lower = originStr.toLowerCase()
    if (!seenExamples.has(lower)) {
      seenExamples.add(lower)
      existingExamples.push(
        typeof ex === 'string'
          ? { origin: originStr, translation: '' }
          : { origin: originStr, translation: String(ex.translation || '').trim() },
      )
    }
  }

  if (existingItem) {
    if (Array.isArray(existingItem.meanings)) {
      for (const m of existingItem.meanings) {
        if (Array.isArray(m?.examples)) {
          for (const ex of m.examples) collectEx(ex)
        }
      }
    }
    if (Array.isArray(existingItem.examples)) {
      for (const ex of existingItem.examples) collectEx(ex)
    }
  }

  // 3. Call Gemini to enrich with all comprehensive meanings
  const enriched = await enrichVocabWithGemini(cleanOrigin, sentenceContext)

  // Ensure sentenceContext is in examples if provided
  if (sentenceContext && enriched.meanings && enriched.meanings.length > 0) {
    const firstMeaning = enriched.meanings[0]
    firstMeaning.examples = firstMeaning.examples || []
    const hasContextInExample = firstMeaning.examples.some(
      (ex) => ex.origin && ex.origin.toLowerCase().includes(cleanOrigin.toLowerCase()),
    )
    if (!hasContextInExample) {
      firstMeaning.examples.unshift({
        origin: sentenceContext.trim(),
        translation: '',
      })
    }
  }

  // 4. Merge preserved examples from old item into new meanings (preserving ALL previous examples)
  const newSeen = new Set()
  for (const m of enriched.meanings || []) {
    for (const ex of m.examples || []) {
      if (ex?.origin) newSeen.add(ex.origin.toLowerCase().trim())
    }
  }

  const preservedToAppend = existingExamples.filter(
    (ex) => !newSeen.has(ex.origin.toLowerCase().trim()),
  )

  if (enriched.meanings && enriched.meanings.length > 0 && preservedToAppend.length > 0) {
    enriched.meanings[0].examples = [
      ...(enriched.meanings[0].examples || []),
      ...preservedToAppend,
    ]
  }

  // 5. Build full item payload with explicit common & enable flags (mirroring ItemForm.tsx)
  const now = Date.now()
  const isUpdating = Boolean(existingItem && existingItem.id)
  const targetId = isUpdating ? existingItem.id : ''

  const removeLineBreaks = (str = '') => String(str || '').replace(/[\r\n]+/g, ' ').trim()

  const finalCatId = enriched.catId || (existingItem?.catId ?? defaultCatId)
  const isWord = finalCatId === 1 // ECategory.WORD: Only word has forms and word_family!

  // Strictly enforce ItemForm.tsx rule: Only WORD (catId 1) has forms & word_family; non-words must be []
  const finalForms = isWord
    ? filterWordsExcludingOrigin(enriched.forms || existingItem?.forms || [], cleanOrigin)
    : []
  const finalWordFamily = isWord
    ? filterWordsExcludingOrigin(enriched.word_family || existingItem?.word_family || [], cleanOrigin)
    : []
  const finalRelation = filterWordsExcludingOrigin(
    enriched.relation || existingItem?.relation || [],
    cleanOrigin,
  )

  // Format and normalize each meaning: explicitly mark common: index === 0, enable: true
  const formattedMeanings = (enriched.meanings || []).map((m, index) => {
    const meaningId = m.id || generateFirestoreAutoId()

    const rawUk = (m.pronunciation?.uk || '').trim()
    const rawUs = (m.pronunciation?.us || '').trim()
    const rawCommon = (m.pronunciation?.common || '').trim()

    const cleanIpa = (val) => val.replace(/^\/+|\/+$/g, '').trim().toLowerCase()
    const isSameIpa = rawUk && rawUs && cleanIpa(rawUk) === cleanIpa(rawUs)

    const finalUs = rawUs || rawUk
    const finalUk = isSameIpa ? '' : rawUk
    const finalCommon = rawCommon || finalUs

    return {
      id: meaningId,
      uid,
      itemId: targetId,
      typeId: typeof m.typeId === 'number' ? m.typeId : 1,
      common: index === 0, // Đánh dấu nghĩa phổ biến nhất (nghĩa chính theo ngữ cảnh)
      enable: true,
      definition: removeLineBreaks(m.definition || ''),
      translation: removeLineBreaks(m.translation || ''),
      note: m.note || '',
      grammar: m.grammar || '',
      collocations: m.collocations || '',
      synonyms: filterWordsExcludingOrigin(m.synonyms || [], cleanOrigin),
      antonyms: [],
      pronunciation: isWord
        ? { uk: finalUk, us: finalUs, common: finalCommon }
        : { uk: '', us: '', common: finalCommon },
      examples: (m.examples || []).map((ex) => ({
        id: ex.id || generateFirestoreAutoId(),
        uid,
        origin: removeLineBreaks(ex.origin || ''),
        translation: removeLineBreaks(ex.translation || ''),
        note: ex.note || '',
        created_date: ex.created_date || now,
        last_update: now,
        randomIndex: typeof ex.randomIndex === 'number' ? ex.randomIndex : Math.random(),
      })),
    }
  })

  // Prioritize common meanings (sort common meanings first, mirroring ItemForm.tsx line 363)
  const sortedMeanings = [...formattedMeanings].sort((a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0))

  const cleanTags = (Array.isArray(existingItem?.tags) ? existingItem.tags : [])
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
  const cleanTagsLower = cleanTags
    .map((tag) => tag.replace(/^#+/, '').trim().toLowerCase())
    .filter(Boolean)

  const itemPayload = {
    id: targetId,
    uid,
    origin: cleanOrigin,
    catId: finalCatId,
    level: enriched.level || 3,
    forms: finalForms,
    word_family: finalWordFamily,
    relation: finalRelation,
    collocations: Array.isArray(enriched.collocations) ? enriched.collocations : [],
    tags: cleanTags,
    tags_lowercase: cleanTagsLower,
    created_date: existingItem?.created_date || now,
    last_update: now,
    randomIndex: typeof existingItem?.randomIndex === 'number' ? existingItem.randomIndex : Math.random(),
    meanings: sortedMeanings,
    archive: existingItem?.archive ?? false,
    favorite: existingItem?.favorite ?? false,
  }

  // 6. Save to Firestore (PATCH if updating, POST if creating)
  let savedId = targetId
  try {
    if (isUpdating) {
      savedId = await updateFirestore(targetId, itemPayload)
    } else {
      savedId = await saveToFirestore(itemPayload)
    }
    itemPayload.id = savedId
    if (Array.isArray(itemPayload.meanings)) {
      itemPayload.meanings.forEach((m) => {
        m.itemId = savedId
      })
    }
  } catch (fsErr) {
    console.error('[Enmory] Firestore save error:', fsErr)
    throw new Error(`Lỗi lưu vào Firestore: ${fsErr.message}`)
  }

  // 7. Save to IndexedDB (local db)
  try {
    await saveToIndexedDb(itemPayload)
  } catch (idbErr) {
    console.warn('[Enmory] IndexedDB save warning:', idbErr)
  }

  // Attach metadata for toast display
  itemPayload.isUpdated = isUpdating
  itemPayload.preservedExamplesCount = preservedToAppend.length

  // 8. Chrome system notification
  try {
    if (chrome.notifications) {
      const firstMeaning = itemPayload.meanings[0]
      const transText = firstMeaning?.translation ? ` - ${firstMeaning.translation}` : ''
      const notifTitle = isUpdating
        ? `Enmory: Đã cập nhật "${cleanOrigin}"!`
        : `Enmory: Đã nạp từ vựng thành công!`
      const notifMsg = isUpdating
        ? `Đã ghi đè toàn bộ nghĩa mới & giữ lại ${preservedToAppend.length} ví dụ cũ\n(Đã cập nhật Local DB & Firestore)`
        : `"${cleanOrigin}"${transText}\n(Đã lưu vào cả Local DB & Firestore)`

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo192.png',
        title: notifTitle,
        message: notifMsg,
        priority: 2,
      })
    }
  } catch (notifErr) {
    console.debug('[Enmory] Notification error:', notifErr)
  }

  return itemPayload
}

// =========================================================================
// Context Menus (Manual Add + Quick Add)
// Only visible when user is logged in (enmory_uid is present)
// =========================================================================
const updateContextMenuVisibility = async () => {
  try {
    const uid = await getResolvedUid()
    await chrome.contextMenus.removeAll()

    if (!uid) {
      // User is not logged in: do not show Enmory in context menu
      return
    }

    // 1. Quick Add (AI Auto-Save without opening form)
    chrome.contextMenus.create({
      id: ENMORY_QUICK_ADD_MENU_ID,
      title: '⚡ Save to Enmory (Lưu nhanh AI)',
      type: 'normal',
      contexts: ['selection'],
    })

    // 2. Manual Add (Opens popup form - preserves existing manual workflow)
    chrome.contextMenus.create({
      id: ENMORY_MANUAL_ADD_MENU_ID,
      title: '📝 Add to Enmory (Mở form thủ công)',
      type: 'normal',
      contexts: ['selection'],
    })
  } catch (e) {
    console.warn('[Enmory] Context menu update error:', e)
  }
}

// Initial check when background script initializes
updateContextMenuVisibility()

chrome.runtime.onInstalled.addListener(() => {
  updateContextMenuVisibility()
})

chrome.runtime.onStartup.addListener(() => {
  updateContextMenuVisibility()
})

// Dynamically add/remove context menus when user logs in or out
chrome.storage.onChanged.addListener((changes, areaName) => {
  if ((areaName === 'local' || areaName === 'sync') && changes.enmory_uid) {
    updateContextMenuVisibility()
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const uid = await getResolvedUid()
  if (!uid) {
    await updateContextMenuVisibility()
    if (chrome.windows) {
      chrome.windows.create({
        url: 'index.html',
        type: 'popup',
        focused: true,
        width: 530,
        height: 750,
        top: 0,
      })
    }
    return
  }
  const origin = normalizeSelection(info.selectionText)
  const catId = getCategoryIdFromSelection(origin)

  if (info.menuItemId === ENMORY_MANUAL_ADD_MENU_ID) {
    // Preserve manual entry: set storage and open popup window
    await chrome.storage.sync.set({ origin, catId })
    chrome.windows.create({
      url: 'index.html',
      type: 'popup',
      focused: true,
      width: 530,
      height: 750,
      top: 0,
    })
  } else if (info.menuItemId === ENMORY_QUICK_ADD_MENU_ID) {
    // Query tab for enclosing sentence context
    let sentenceContext = ''
    if (tab?.id) {
      try {
        const resp = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectionContext' })
        if (resp?.sentenceContext) {
          sentenceContext = resp.sentenceContext
        }
      } catch (e) {
        // Tab might not respond
      }

      // Notify tab that loading started
      chrome.tabs.sendMessage(tab.id, {
        action: 'quickAddStarted',
        origin,
      }).catch(() => {})
    }

    try {
      const item = await handleQuickAddVocab(origin, sentenceContext)

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'quickAddSuccess',
          item,
        }).catch(() => {})
      }
    } catch (err) {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'quickAddError',
          error: err.message,
        }).catch(() => {})
      }
    }
  }
})

// =========================================================================
// Runtime Messages
// =========================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Quick Add Vocab from in-page button
  if (request?.action === 'quickAddVocab') {
    handleQuickAddVocab(request.origin, request.sentenceContext, request.pageUrl)
      .then((item) => sendResponse({ ok: true, item }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Lỗi không xác định' }))
    return true
  }

  // 2. Legacy addOrigin message
  if (request.addOrigin === 'addOrigin') {
    const origin = normalizeSelection(request.value)
    chrome.storage.sync.set({
      origin,
      catId: getCategoryIdFromSelection(origin),
    })
    return false
  }

  // 3. Sentence review action
  if (request?.action === 'reviewSentence') {
    reviewSentence(request.text)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Review failed' }))
    return true
  }

  // 4. Set Gemini API key
  if (request?.action === 'setGeminiApiKey') {
    chrome.storage.sync.set({ geminiApiKey: request.value }).then(() => {
      sendResponse({ ok: true })
    })
    return true
  }

  return false
})
