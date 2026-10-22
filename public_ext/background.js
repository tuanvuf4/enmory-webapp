const ENMORY_QUICK_ADD_MENU_ID = 'enmory-quick-add'
const WORD_CATEGORY_ID = 1
const PHRASE_CATEGORY_ID = 2
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

if (typeof importScripts === 'function') {
  importScripts('extension-config.js')
}

const BUILD_TIME_GEMINI_API_KEY = self.__ENMORY_EXTENSION_CONFIG__?.geminiApiKey || ''

const normalizeSelection = (value = '') => value.replace(/\s+/g, ' ').trim()

const getCategoryIdFromSelection = (value = '') =>
  normalizeSelection(value).split(' ').filter(Boolean).length > 1
    ? PHRASE_CATEGORY_ID
    : WORD_CATEGORY_ID

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

const reviewSentence = async (text) => {
  const normalizedText = normalizeSelection(text)
  if (!normalizedText) {
    throw new Error('Missing text to review')
  }

  const { geminiApiKey } = await chrome.storage.sync.get(['geminiApiKey'])
  const resolvedApiKey =
    typeof geminiApiKey === 'string' && geminiApiKey.trim()
      ? geminiApiKey.trim()
      : BUILD_TIME_GEMINI_API_KEY.trim()

  if (!resolvedApiKey) {
    throw new Error('Gemini API key is not configured')
  }

  const prompt = `You are an English writing assistant. Review this text and return ONLY JSON.\n\nRules:\n- Find ALL issues you can detect (grammar, spelling, word choice, punctuation, style).\n- Return granular issues, not only one global correction.\n- Include multiple issues when they are independent, even in the same sentence.\n- Return up to 10 issues, sorted by appearance order.\n- If no issue exists, return an empty issues array.\n\nJSON schema:\n{\n  "summary": "short assessment",\n  "correctedText": "best corrected sentence",\n  "issues": [\n    {\n      "issue": "grammar|spelling|word-choice|punctuation|style",\n      "current": "original fragment",\n      "suggestion": "replacement fragment",\n      "explanation": "short explanation"\n    }\n  ]\n}\n\nText: "${normalizedText}"`

  let lastError = null

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(resolvedApiKey)}`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

const createQuickAddContextMenu = async () => {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: ENMORY_QUICK_ADD_MENU_ID,
    title: 'Add to Enmory',
    type: 'normal',
    contexts: ['selection'],
  })
}

chrome.runtime.onInstalled.addListener(() => {
  createQuickAddContextMenu()
})

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  if (item.menuItemId === ENMORY_QUICK_ADD_MENU_ID) {
    const origin = normalizeSelection(item.selectionText)
    const catId = getCategoryIdFromSelection(origin)

    await chrome.storage.sync.set({ origin, catId })
    chrome.windows.create(
      {
        url: 'index.html',
        type: 'popup',
        focused: true,
        width: 530,
        height: 750,
        top: 0,
      },
      (window) => {
        console.log('Extension popup opened!')
      },
    )
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.addOrigin === 'addOrigin') {
    const origin = normalizeSelection(request.value)
    chrome.storage.sync.set({
      origin,
      catId: getCategoryIdFromSelection(origin),
    })
    return false
  }

  if (request?.action === 'reviewSentence') {
    reviewSentence(request.text)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Review failed' }))

    return true
  }

  if (request?.action === 'setGeminiApiKey') {
    chrome.storage.sync.set({ geminiApiKey: request.value }).then(() => {
      sendResponse({ ok: true })
    })
    return true
  }

  return false
})
