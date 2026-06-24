const ENMORY_QUICK_ADD_MENU_ID = 'enmory-quick-add'
const WORD_CATEGORY_ID = 1
const PHRASE_CATEGORY_ID = 2
const OPENAI_MODEL = 'gpt-4o-mini'
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

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

    let issues = Array.isArray(parsed.issues) ? parsed.issues : []

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

  const { openaiApiKey } = await chrome.storage.sync.get(['openaiApiKey'])
  if (!openaiApiKey || typeof openaiApiKey !== 'string') {
    throw new Error('OpenAI API key is not configured in extension storage')
  }

  const prompt = `You are an English writing assistant. Review this text and return ONLY JSON.\n\nRules:\n- Find ALL issues you can detect (grammar, spelling, word choice, punctuation, style).\n- Return granular issues, not only one global correction.\n- Include multiple issues when they are independent, even in the same sentence.\n- Return up to 10 issues, sorted by appearance order.\n- If no issue exists, return an empty issues array.\n\nJSON schema:\n{\n  "summary": "short assessment",\n  "correctedText": "best corrected sentence",\n  "issues": [\n    {\n      "issue": "grammar|spelling|word-choice|punctuation|style",\n      "current": "original fragment",\n      "suggestion": "replacement fragment",\n      "explanation": "short explanation"\n    }\n  ]\n}\n\nText: "${normalizedText}"`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 18000)

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    }),
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content || ''

  return parseReviewResult(content, normalizedText)
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

  if (request?.action === 'setOpenaiApiKey') {
    chrome.storage.sync.set({ openaiApiKey: request.value }).then(() => {
      sendResponse({ ok: true })
    })
    return true
  }

  return false
})
