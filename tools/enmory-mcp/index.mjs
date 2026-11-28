import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { initializeApp } from 'firebase/app'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit as firestoreLimit,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../..')

// Load .env as fallback (e.g., UID), then override with .env.web
dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true })
dotenv.config({ path: path.join(ROOT_DIR, '.env.web'), override: true, quiet: true })

const CATEGORY_MAP = {
  ALL: 0,
  WORD: 1,
  PHRASE: 2,
  IDIOM: 3,
  SLANG: 4,
  COLLOCATION: 5,
  SENTENCE: 6,
}

const TYPE_MAP = {
  ALL: 0,
  NOUN: 1,
  VERB: 2,
  ADJECTIVE: 3,
  ADVERB: 4,
  PREPOSITION: 5,
  CONJUNCTION: 6,
  PRONOUN: 7,
  ARTICLE: 8,
  DETERMINER: 9,
  INTERJECTION: 10,
}

const DEFAULT_TAG_COLOR = '#1890ff'

function getRequiredConfig() {
  const uid = (process.env.UID || process.env.ENMORY_UID || '').trim()
  const firebase = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  }

  if (!uid) {
    throw new Error('Missing UID in .env (expected UID=...)')
  }
  if (!firebase.apiKey || !firebase.projectId || !firebase.appId) {
    throw new Error('Missing Firebase configuration in .env (VITE_FIREBASE_*)')
  }

  return { uid, firebase }
}

const { uid: DEFAULT_UID, firebase: FIREBASE_CONFIG } = getRequiredConfig()
const firebaseApp = initializeApp(FIREBASE_CONFIG)
const db = getFirestore(firebaseApp)

function removeUndefinedFields(obj) {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields)
  }
  if (typeof obj === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefinedFields(value)
      }
    }
    return result
  }
  return obj
}

function normalizeTags(tags = []) {
  const cleanTags = tags.map((tag) => String(tag || '').trim()).filter(Boolean)
  return Array.from(new Set(cleanTags))
}

function normalizeLowercaseTags(tags = []) {
  return Array.from(
    new Set(
      normalizeTags(tags)
        .map((tag) => tag.replace(/^#+/, '').trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

function removeLineBreaks(str = '') {
  if (!str) return ''
  return String(str)
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizePronunciation(val = '') {
  if (!val) return ''
  return String(val)
    .toLowerCase()
    .replace(/[/`_+=\[\]{}\\\d]/g, '')
    .trim()
}

function normalizePronunciation(pronunciation = {}) {
  const rawUk = String(pronunciation?.uk || '').trim()
  const rawUs = String(pronunciation?.us || '').trim()
  const rawCommon = String(pronunciation?.common || '').trim()

  const cleanIpa = (val) => val.replace(/^\/+|\/+$/g, '').trim().toLowerCase()
  const isSame = rawUk && rawUs && cleanIpa(rawUk) === cleanIpa(rawUs)

  const us = sanitizePronunciation(rawUs || rawUk)
  const uk = isSame ? '' : sanitizePronunciation(rawUk)
  const common = sanitizePronunciation(rawCommon || us)

  return { uk, us, common }
}

function filterWordsExcludingOrigin(words = [], originWord = '') {
  const originLower = String(originWord || '').trim().toLowerCase()
  const seen = new Set()
  const result = []
  for (const w of words) {
    const trimmed = String(w || '').trim()
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    if (originLower && lower === originLower) continue
    if (!seen.has(lower)) {
      seen.add(lower)
      result.push(trimmed)
    }
  }
  return result
}

function formatTagValue(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
}

function resolveCategoryId(cat) {
  if (typeof cat === 'number') return cat
  if (typeof cat === 'string') {
    const key = cat.trim().toUpperCase()
    if (key in CATEGORY_MAP) return CATEGORY_MAP[key]
  }
  return CATEGORY_MAP.WORD
}

function resolveTypeId(type) {
  if (typeof type === 'number') return type
  if (typeof type === 'string') {
    const key = type.trim().toUpperCase()
    if (key in TYPE_MAP) return TYPE_MAP[key]
  }
  return TYPE_MAP.NOUN
}

function buildItemPayload(input, uid, resolvedTags, existingDoc = null) {
  const now = Date.now()
  const origin = String(input.origin || '').trim()
  const normalizedTags = normalizeTags(resolvedTags ?? input.tags ?? [])
  const existingId = existingDoc?.id || ''

  const meanings = (input.meanings || [])
    .map((m, index) => {
      const meaningId = m.id || crypto.randomUUID()
      const examples = (m.examples || []).map((ex) => ({
        id: ex.id || crypto.randomUUID(),
        uid,
        origin: removeLineBreaks(ex.origin || ''),
        translation: removeLineBreaks(ex.translation || ''),
        note: String(ex.note || '').trim(),
        created_date: ex.created_date || now,
        last_update: now,
        randomIndex: ex.randomIndex ?? Math.random(),
      }))

      return {
        id: meaningId,
        itemId: existingId,
        uid,
        typeId: resolveTypeId(m.type ?? m.typeId),
        common: m.common ?? index === 0,
        enable: m.enable ?? true,
        pronunciation: normalizePronunciation(m.pronunciation),
        note: String(m.note || ''),
        definition: String(m.definition || ''),
        translation: String(m.translation || ''),
        grammar: String(m.grammar || ''),
        collocations: String(m.collocations || ''),
        synonyms: filterWordsExcludingOrigin(m.synonyms || [], origin),
        antonyms: normalizeTags(m.antonyms || []),
        created_date: m.created_date || now,
        last_update: now,
        examples,
      }
    })
    .sort((a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0))

  return removeUndefinedFields({
    uid,
    catId: resolveCategoryId(input.cat ?? input.catId),
    origin,
    tags: normalizedTags,
    tags_lowercase: normalizeLowercaseTags(normalizedTags),
    favorite: input.favorite ?? false,
    archive: input.archive ?? false,
    level: input.level ?? 0,
    count: 0,
    deleted_date: 0,
    forms: filterWordsExcludingOrigin(input.forms || [], origin),
    collocations: normalizeTags(input.collocations || []),
    word_family: filterWordsExcludingOrigin(input.word_family || [], origin),
    relation: filterWordsExcludingOrigin(input.relation || [], origin),
    meanings,
    created_date: existingDoc?.created_date || now,
    last_update: now,
    randomIndex: Math.random(),
  })
}

async function getUserTags(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid))
  if (!userDoc.exists()) return []
  const data = userDoc.data()
  const itemTags = data?.configuration?.itemTags
  return Array.isArray(itemTags) ? itemTags : []
}

async function ensureTagsExist(uid, tagNames) {
  const cleanNames = normalizeTags(tagNames)
  if (cleanNames.length === 0) return []

  const currentTags = await getUserTags(uid)
  const existingMap = new Map(
    currentTags.map((t) => [String(t.name || '').toLowerCase(), String(t.name || '')]),
  )
  let maxOrder = currentTags.length > 0 ? Math.max(...currentTags.map((t) => t.order ?? 1)) : 0
  const now = Date.now()
  const tagsToAdd = []

  for (const name of cleanNames) {
    const lower = name.toLowerCase()
    if (!existingMap.has(lower)) {
      maxOrder += 1
      tagsToAdd.push({
        value: formatTagValue(name),
        name,
        color: DEFAULT_TAG_COLOR,
        order: maxOrder,
        created_date: now,
        last_update: now,
      })
      existingMap.set(lower, name)
    }
  }

  if (tagsToAdd.length > 0) {
    await setDoc(
      doc(db, 'users', uid),
      {
        configuration: { itemTags: [...currentTags, ...tagsToAdd] },
        updatedAt: now,
      },
      { merge: true },
    )
  }

  return Array.from(new Set(cleanNames.map((t) => existingMap.get(t.toLowerCase()) || t)))
}

async function findExistingByOrigin(uid, origin) {
  const normalizedTarget = origin.trim().toLowerCase()
  const snap = await getDocs(query(collection(db, 'items'), where('uid', '==', uid)))
  const matches = []
  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (String(data.origin || '').trim().toLowerCase() === normalizedTarget) {
      matches.push({ id: docSnap.id, ...data })
    }
  })
  return matches
}

const ExampleSchema = z.object({
  origin: z.string().min(1).describe('Example sentence in English'),
  translation: z.string().optional().default('').describe('Vietnamese translation of the example'),
  note: z.string().optional().default('').describe('Optional note for the example'),
})

const MeaningSchema = z.object({
  type: z
    .union([
      z.enum([
        'ALL',
        'NOUN',
        'VERB',
        'ADJECTIVE',
        'ADVERB',
        'PREPOSITION',
        'CONJUNCTION',
        'PRONOUN',
        'ARTICLE',
        'DETERMINER',
        'INTERJECTION',
      ]),
      z.number().int().min(0).max(10),
    ])
    .optional()
    .default('NOUN')
    .describe('Part of speech (NOUN, VERB, ADJECTIVE, ADVERB, etc.)'),
  definition: z.string().optional().default('').describe('English definition'),
  translation: z.string().optional().default('').describe('Vietnamese meaning/translation'),
  pronunciation: z
    .object({
      us: z.string().optional().default(''),
      uk: z.string().optional().default(''),
      common: z.string().optional().default(''),
    })
    .optional()
    .describe('IPA pronunciations (us, uk, common)'),
  note: z
    .string()
    .optional()
    .default('')
    .describe('Usage notes, explanations, caveats, or common mistakes (e.g., "Usually not used in progressive tenses...").'),
  grammar: z
    .string()
    .optional()
    .default('')
    .describe('Grammar structures/patterns. When there are multiple structures, format as an HTML <ul><li>...</li></ul> list.'),
  collocations: z
    .string()
    .optional()
    .default('')
    .describe('Common collocations (format as <ul><li>...</li></ul> when multiple).'),
  synonyms: z.array(z.string()).optional().default([]),
  antonyms: z.array(z.string()).optional().default([]),
  common: z.boolean().optional().default(true),
  enable: z.boolean().optional().default(true),
  examples: z.array(ExampleSchema).optional().default([]),
})

const VocabItemSchema = z.object({
  origin: z.string().min(1).describe('The word, phrase, idiom, slang, collocation, or sentence'),
  cat: z
    .union([
      z.enum(['WORD', 'PHRASE', 'IDIOM', 'SLANG', 'COLLOCATION', 'SENTENCE']),
      z.number().int().min(1).max(6),
    ])
    .optional()
    .default('WORD')
    .describe('Category: WORD (1), PHRASE (2), IDIOM (3), SLANG (4), COLLOCATION (5), SENTENCE (6)'),
  tags: z.array(z.string()).optional().default([]).describe('Tags to attach to this item'),
  favorite: z.boolean().optional().default(false),
  archive: z.boolean().optional().default(false),
  level: z.number().int().min(0).optional().default(0),
  forms: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      'Only irregular word forms (e.g., went, gone, children, better, best). Omit regular inflections (-s, -es, -ed, -ing, -er, -est).',
    ),
  collocations: z.array(z.string()).optional().default([]),
  word_family: z.array(z.string()).optional().default([]),
  relation: z.array(z.string()).optional().default([]),
  meanings: z.array(MeaningSchema).optional().default([]).describe('Meanings, IPA, and examples'),
})

const server = new McpServer({
  name: 'enmory-mcp',
  version: '1.0.0',
})

server.tool(
  'add_vocabulary',
  'Add a single vocabulary item (word, phrase, idiom, slang, collocation, or sentence) to Enmory Firestore for the configured UID. Replaces the existing item if the same origin already exists.',
  {
    item: VocabItemSchema,
    ensureTags: z
      .boolean()
      .optional()
      .default(true)
      .describe('Automatically add any new tags to user configuration'),
    skipDuplicateCheck: z
      .boolean()
      .optional()
      .default(false)
      .describe('Set true to force creating a new document instead of replacing an existing one with the same origin'),
  },
  async ({ item, ensureTags, skipDuplicateCheck }) => {
    try {
      const trimmedOrigin = String(item.origin || '').trim()
      if (!trimmedOrigin) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Origin is required and cannot be empty.' }],
        }
      }

      const existing = !skipDuplicateCheck
        ? await findExistingByOrigin(DEFAULT_UID, trimmedOrigin)
        : []
      const existingDoc = existing.length > 0 ? existing[0] : null

      const resolvedTags =
        ensureTags && (item.tags || []).length > 0
          ? await ensureTagsExist(DEFAULT_UID, item.tags)
          : normalizeTags(item.tags || [])

      const payload = buildItemPayload(item, DEFAULT_UID, resolvedTags, existingDoc)

      let docId
      let action
      if (existingDoc) {
        await setDoc(doc(db, 'items', existingDoc.id), payload)
        docId = existingDoc.id
        action = 'replaced'
      } else {
        const docRef = await addDoc(collection(db, 'items'), payload)
        docId = docRef.id
        action = 'created'
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                isSuccess: true,
                action,
                id: docId,
                uid: DEFAULT_UID,
                origin: payload.origin,
                catId: payload.catId,
                tags: payload.tags,
                meaningsCount: payload.meanings.length,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to add vocabulary "${item.origin}": ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      }
    }
  },
)

server.tool(
  'add_vocabularies',
  'Batch add multiple vocabulary items to Enmory Firestore for the configured UID. Replaces existing items when the same origin already exists.',
  {
    items: z.array(VocabItemSchema).min(1).describe('List of vocabulary items to add or replace'),
    ensureTags: z
      .boolean()
      .optional()
      .default(true)
      .describe('Automatically add any new tags to user configuration'),
    skipDuplicateCheck: z
      .boolean()
      .optional()
      .default(false)
      .describe('Set true to force creating new documents instead of replacing existing ones'),
  },
  async ({ items, ensureTags, skipDuplicateCheck }) => {
    try {
      const existingMap = new Map()
      if (!skipDuplicateCheck) {
        const snap = await getDocs(query(collection(db, 'items'), where('uid', '==', DEFAULT_UID)))
        snap.forEach((docSnap) => {
          const data = docSnap.data()
          const orig = String(data.origin || '')
            .trim()
            .toLowerCase()
          if (orig && !existingMap.has(orig)) {
            existingMap.set(orig, { id: docSnap.id, created_date: data.created_date })
          }
        })
      }

      const allInputTags = Array.from(
        new Set(items.flatMap((it) => normalizeTags(it.tags || []))),
      )
      const canonicalTagList =
        ensureTags && allInputTags.length > 0
          ? await ensureTagsExist(DEFAULT_UID, allInputTags)
          : allInputTags
      const tagLookup = new Map(canonicalTagList.map((t) => [t.toLowerCase(), t]))

      const created = []
      const replaced = []
      const skipped = []

      for (const item of items) {
        const trimmedOrigin = String(item.origin || '').trim()
        if (!trimmedOrigin) {
          skipped.push('(empty origin)')
          continue
        }
        const key = trimmedOrigin.toLowerCase()
        const resolvedTags = normalizeTags(item.tags || []).map(
          (t) => tagLookup.get(t.toLowerCase()) || t,
        )
        const existingDoc = !skipDuplicateCheck ? existingMap.get(key) || null : null
        const payload = buildItemPayload(item, DEFAULT_UID, resolvedTags, existingDoc)

        if (existingDoc) {
          await setDoc(doc(db, 'items', existingDoc.id), payload)
          replaced.push({ id: existingDoc.id, origin: payload.origin, catId: payload.catId })
        } else {
          const docRef = await addDoc(collection(db, 'items'), payload)
          created.push({ id: docRef.id, origin: payload.origin, catId: payload.catId })
          existingMap.set(key, { id: docRef.id, created_date: payload.created_date })
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                isSuccess: true,
                uid: DEFAULT_UID,
                createdCount: created.length,
                replacedCount: replaced.length,
                skippedCount: skipped.length,
                created,
                replaced,
                skipped,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to batch add vocabularies: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      }
    }
  },
)

server.tool(
  'search_vocabulary',
  'Search existing vocabulary items in Enmory Firestore for the configured UID.',
  {
    keyword: z.string().optional().default('').describe('Optional keyword to filter by origin or translation'),
    limit: z.number().int().min(1).max(100).optional().default(20),
  },
  async ({ keyword, limit }) => {
    try {
      const snap = await getDocs(
        query(collection(db, 'items'), where('uid', '==', DEFAULT_UID), firestoreLimit(500)),
      )
      const kw = keyword.trim().toLowerCase()
      const results = []

      snap.forEach((docSnap) => {
        const data = docSnap.data()
        const origin = String(data.origin || '')
        const translations = (data.meanings || []).map((m) => m.translation || '').join(' ')
        if (!kw || origin.toLowerCase().includes(kw) || translations.toLowerCase().includes(kw)) {
          results.push({
            id: docSnap.id,
            origin: data.origin,
            catId: data.catId,
            tags: data.tags || [],
            meanings: (data.meanings || []).map((m) => ({
              typeId: m.typeId,
              definition: m.definition,
              translation: m.translation,
            })),
            created_date: data.created_date,
          })
        }
      })

      results.sort((a, b) => (b.created_date || 0) - (a.created_date || 0))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                uid: DEFAULT_UID,
                totalMatched: results.length,
                items: results.slice(0, limit),
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to search vocabulary: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      }
    }
  },
)

server.tool(
  'list_tags',
  'List all vocabulary tags configured for the current UID in Enmory.',
  {},
  async () => {
    try {
      const tags = await getUserTags(DEFAULT_UID)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                uid: DEFAULT_UID,
                count: tags.length,
                tags: tags.map((t) => ({ name: t.name, value: t.value, color: t.color })),
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to list tags: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      }
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error(`enmory-mcp server started (UID: ${DEFAULT_UID}, project: ${FIREBASE_CONFIG.projectId})`)
