const WORD_CATEGORY_ID = 1
const PHRASE_CATEGORY_ID = 2

let activeTextarea = null
let reviewBadge = null
let suggestionPanel = null
let suggestionPanelOpen = false
let isReviewing = false
let keepReviewUIVisible = false
let reviewRequestSeq = 0
const reviewCache = new WeakMap()

const normalizeSelection = (value = '') => value.replace(/\s+/g, ' ').trim()

const normalizeReviewText = (value = '') =>
  value
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getCategoryIdFromSelection = (value = '') =>
  normalizeSelection(value).split(' ').filter(Boolean).length > 1
    ? PHRASE_CATEGORY_ID
    : WORD_CATEGORY_ID

const hasTextareaContent = (textarea) => Boolean(normalizeReviewText(textarea?.value || ''))

const isTextareaElement = (element) => element instanceof HTMLTextAreaElement
const isReviewDisabled = (element) => element?.dataset?.reviewDisabled === 'true'
const isReviewableTextarea = (element) =>
  isTextareaElement(element) && !element.disabled && !element.readOnly && !isReviewDisabled(element)

const syncReviewUIState = () => {
  if (!reviewBadge) return

  const focused = document.activeElement
  const candidateTextarea = isReviewableTextarea(focused) ? focused : activeTextarea

  if (!isReviewableTextarea(candidateTextarea) || !candidateTextarea?.isConnected) {
    activeTextarea = null
    hideReviewUI()
    return
  }

  activeTextarea = candidateTextarea

  const hasContent = hasTextareaContent(activeTextarea)
  reviewBadge.style.display = hasContent ? 'block' : 'none'

  if (!hasContent && suggestionPanel) {
    suggestionPanel.style.display = 'none'
    suggestionPanelOpen = false
  }

  positionReviewUI()
}

const hideReviewUI = () => {
  if (reviewBadge) reviewBadge.style.display = 'none'
  if (suggestionPanel) suggestionPanel.style.display = 'none'
  suggestionPanelOpen = false
}

const setBadgeState = (state = 'idle', count = 0) => {
  if (!reviewBadge) return

  if (state === 'loading') {
    reviewBadge.textContent = '...'
    reviewBadge.style.background = '#1677ff'
    reviewBadge.title = 'Reviewing...'
    return
  }

  if (state === 'ready') {
    reviewBadge.textContent = String(count > 99 ? '99+' : count)
    reviewBadge.style.background = '#fa8c16'
    reviewBadge.title = `${count} suggestion(s)`
    return
  }

  if (state === 'clean') {
    reviewBadge.textContent = '✓'
    reviewBadge.style.background = '#52c41a'
    reviewBadge.title = 'No issues found'
    return
  }

  if (state === 'error') {
    reviewBadge.textContent = '!'
    reviewBadge.style.background = '#ff4d4f'
    reviewBadge.title = 'Review failed. Click to retry.'
    return
  }

  reviewBadge.textContent = 'R'
  reviewBadge.style.background = '#1677ff'
  reviewBadge.title = 'Review text'
}

const positionReviewUI = () => {
  if (!reviewBadge || !activeTextarea) return

  const rect = activeTextarea.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    hideReviewUI()
    return
  }

  reviewBadge.style.top = `${window.scrollY + rect.bottom - 30}px`
  reviewBadge.style.left = `${window.scrollX + rect.right - 30}px`

  if (suggestionPanel && suggestionPanel.style.display === 'block') {
    const panelWidth = 300
    const top = window.scrollY + rect.bottom + 6
    const maxLeft = window.scrollX + window.innerWidth - panelWidth - 8
    const preferredLeft = window.scrollX + rect.right - panelWidth
    const left = Math.max(window.scrollX + 8, Math.min(preferredLeft, maxLeft))

    suggestionPanel.style.top = `${top}px`
    suggestionPanel.style.left = `${left}px`
  }
}

const setTextareaValue = (textarea, value) => {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.dispatchEvent(new Event('change', { bubbles: true }))
}

const applySuggestion = (issue) => {
  if (!activeTextarea || !issue) return

  const currentValue = activeTextarea.value || ''
  const current = typeof issue.current === 'string' ? issue.current : ''
  const suggestion = typeof issue.suggestion === 'string' ? issue.suggestion : ''

  if (current && suggestion && currentValue.includes(current)) {
    setTextareaValue(activeTextarea, currentValue.replace(current, suggestion))
  }

  const cached = reviewCache.get(activeTextarea)
  if (!cached) return

  const nextIssues = (cached.issues || []).filter((item) => item !== issue)
  const nextCached = { ...cached, issues: nextIssues }
  reviewCache.set(activeTextarea, nextCached)
  renderSuggestionPanel(nextCached)
  setBadgeState(nextIssues.length ? 'ready' : 'clean', nextIssues.length)

  if (suggestionPanel) {
    suggestionPanel.style.display = 'none'
    suggestionPanelOpen = false
  }
}

const renderSuggestionPanel = (data) => {
  if (!suggestionPanel) return

  suggestionPanel.innerHTML = ''

  const header = document.createElement('div')
  header.style.padding = '10px 12px'
  header.style.borderBottom = '1px solid #f0f0f0'
  header.style.fontSize = '12px'
  header.style.fontWeight = '600'
  header.textContent = data?.summary || 'Suggestions'
  suggestionPanel.appendChild(header)

  const body = document.createElement('div')
  body.style.maxHeight = '180px'
  body.style.overflowY = 'auto'

  const issues = Array.isArray(data?.issues) ? data.issues : []

  if (!issues.length) {
    const empty = document.createElement('div')
    empty.style.padding = '12px'
    empty.style.fontSize = '12px'
    empty.style.color = '#666'
    empty.textContent = 'No suggestions.'
    body.appendChild(empty)
  } else {
    issues.forEach((issue) => {
      const item = document.createElement('button')
      item.type = 'button'
      item.style.display = 'block'
      item.style.width = '100%'
      item.style.textAlign = 'left'
      item.style.padding = '8px 10px'
      item.style.border = '0'
      item.style.borderBottom = '1px solid #f5f5f5'
      item.style.background = '#fff'
      item.style.cursor = 'pointer'

      const current = typeof issue.current === 'string' ? issue.current : ''
      const suggestion = typeof issue.suggestion === 'string' ? issue.suggestion : ''
      const explanation = typeof issue.explanation === 'string' ? issue.explanation : ''

      item.innerHTML = `<div style="font-size:12px;color:#999;margin-bottom:2px;">${issue.issue || 'issue'}</div>
        <div style="font-size:13px;color:#ff4d4f;">${current || '(text)'}</div>
        <div style="font-size:13px;color:#52c41a;">→ ${suggestion || '(suggestion)'}</div>
        <div style="font-size:12px;color:#666;margin-top:2px;">${explanation}</div>`

      item.addEventListener('click', () => applySuggestion(issue))
      body.appendChild(item)
    })
  }

  suggestionPanel.appendChild(body)
}

const renderLoadingPanel = () => {
  if (!suggestionPanel) return

  suggestionPanel.innerHTML = ''

  const loading = document.createElement('div')
  loading.style.padding = '12px'
  loading.style.fontSize = '12px'
  loading.style.color = '#666'
  loading.textContent = 'Reviewing...'
  suggestionPanel.appendChild(loading)
}

const reviewActiveTextarea = () => {
  if (!isReviewableTextarea(activeTextarea)) {
    hideReviewUI()
    return
  }

  if (!activeTextarea || isReviewing) return

  const text = normalizeReviewText(activeTextarea.value)
  if (!text) {
    reviewBadge.style.display = 'none'
    if (suggestionPanel) {
      suggestionPanel.style.display = 'none'
      suggestionPanelOpen = false
    }
    setBadgeState('idle')
    return
  }

  isReviewing = true
  setBadgeState('loading')

  const requestId = ++reviewRequestSeq
  const timeoutId = window.setTimeout(() => {
    if (requestId !== reviewRequestSeq) return

    isReviewing = false
    setBadgeState('error')
    if (suggestionPanelOpen && suggestionPanel) {
      suggestionPanel.innerHTML =
        '<div style="padding:12px;font-size:12px;color:#ff4d4f;">Review timeout. Please try again.</div>'
    }
  }, 20000)

  chrome.runtime.sendMessage({ action: 'reviewSentence', text }, (response) => {
    if (requestId !== reviewRequestSeq) return
    window.clearTimeout(timeoutId)

    isReviewing = false

    if (chrome.runtime.lastError) {
      setBadgeState('error')
      if (suggestionPanelOpen) {
        suggestionPanel.innerHTML = `<div style="padding:12px;font-size:12px;color:#ff4d4f;">${chrome.runtime.lastError.message}</div>`
      }
      return
    }

    if (!response?.ok) {
      if (String(response?.error || '').includes('OpenAI API key is not configured')) {
        const inputKey = window.prompt('Enter OpenAI API key to enable review:')
        if (inputKey && inputKey.trim()) {
          chrome.runtime.sendMessage(
            { action: 'setOpenaiApiKey', value: inputKey.trim() },
            (setKeyResponse) => {
              if (setKeyResponse?.ok) {
                reviewActiveTextarea()
              }
            },
          )
          return
        }
      }

      setBadgeState('error')
      if (suggestionPanelOpen) {
        suggestionPanel.innerHTML = `<div style="padding:12px;font-size:12px;color:#ff4d4f;">${response?.error || 'Review failed'}</div>`
      }
      return
    }

    const result = response.result || {
      summary: 'Review completed',
      issues: [],
      correctedText: text,
    }
    const issues = Array.isArray(result.issues) ? result.issues : []

    reviewCache.set(activeTextarea, result)
    renderSuggestionPanel(result)
    setBadgeState(issues.length ? 'ready' : 'clean', issues.length)

    if (suggestionPanel) {
      suggestionPanel.style.display = 'block'
      suggestionPanelOpen = true
      positionReviewUI()
    }
  })
}

const toggleSuggestionPanel = () => {
  if (!suggestionPanel || !activeTextarea || !isReviewableTextarea(activeTextarea)) return

  if (!hasTextareaContent(activeTextarea)) {
    reviewBadge.style.display = 'none'
    suggestionPanel.style.display = 'none'
    suggestionPanelOpen = false
    return
  }

  if (suggestionPanel.style.display === 'block') {
    suggestionPanel.style.display = 'none'
    suggestionPanelOpen = false
    return
  }

  const cached = reviewCache.get(activeTextarea)
  if (!cached) {
    renderLoadingPanel()
    reviewActiveTextarea()
  } else {
    renderSuggestionPanel(cached)
  }

  suggestionPanel.style.display = 'block'
  suggestionPanelOpen = true
  positionReviewUI()
}

const ensureReviewUI = () => {
  if (!reviewBadge) {
    reviewBadge = document.createElement('button')
    reviewBadge.type = 'button'
    reviewBadge.style.position = 'absolute'
    reviewBadge.style.zIndex = '2147483647'
    reviewBadge.style.width = '22px'
    reviewBadge.style.height = '22px'
    reviewBadge.style.border = '0'
    reviewBadge.style.borderRadius = '50%'
    reviewBadge.style.color = '#fff'
    reviewBadge.style.fontSize = '11px'
    reviewBadge.style.fontWeight = '700'
    reviewBadge.style.cursor = 'pointer'
    reviewBadge.style.display = 'none'
    reviewBadge.style.boxShadow = '0 2px 8px rgba(0,0,0,.2)'
    reviewBadge.addEventListener('mousedown', () => {
      keepReviewUIVisible = true
    })
    reviewBadge.addEventListener('mouseup', () => {
      keepReviewUIVisible = false
    })
    reviewBadge.addEventListener('click', toggleSuggestionPanel)
    setBadgeState('idle')
    document.body.appendChild(reviewBadge)
  }

  if (!suggestionPanel) {
    suggestionPanel = document.createElement('div')
    suggestionPanel.style.position = 'absolute'
    suggestionPanel.style.zIndex = '2147483647'
    suggestionPanel.style.width = '300px'
    suggestionPanel.style.background = '#fff'
    suggestionPanel.style.border = '1px solid #e8e8e8'
    suggestionPanel.style.borderRadius = '8px'
    suggestionPanel.style.boxShadow = '0 8px 24px rgba(0,0,0,.15)'
    suggestionPanel.style.display = 'none'
    suggestionPanel.addEventListener('mousedown', () => {
      keepReviewUIVisible = true
    })
    suggestionPanel.addEventListener('mouseup', () => {
      keepReviewUIVisible = false
    })
    document.body.appendChild(suggestionPanel)
  }
}

document.addEventListener('focusin', (event) => {
  if (!isReviewableTextarea(event.target)) {
    syncReviewUIState()
    return
  }

  activeTextarea = event.target
  ensureReviewUI()
  syncReviewUIState()

  const cached = reviewCache.get(activeTextarea)
  if (cached) {
    const issues = Array.isArray(cached.issues) ? cached.issues : []
    setBadgeState(issues.length ? 'ready' : 'clean', issues.length)
  } else {
    setBadgeState('idle')
  }

  positionReviewUI()
})

document.addEventListener('focusout', (event) => {
  if (event.target !== activeTextarea) return

  setTimeout(() => {
    if (suggestionPanelOpen) return

    syncReviewUIState()
  }, 100)
})

document.addEventListener('mousedown', (event) => {
  if (!suggestionPanelOpen) return

  const target = event.target
  const isOnBadge = reviewBadge && reviewBadge.contains(target)
  const isOnPanel = suggestionPanel && suggestionPanel.contains(target)
  const isOnTextarea = activeTextarea && target === activeTextarea

  if (!isOnBadge && !isOnPanel && !isOnTextarea) {
    suggestionPanel.style.display = 'none'
    suggestionPanelOpen = false
  }
})

document.addEventListener('input', (event) => {
  if (!activeTextarea || event.target !== activeTextarea) return

  syncReviewUIState()

  setBadgeState('idle')
  reviewCache.delete(activeTextarea)
})

document.addEventListener('click', () => {
  syncReviewUIState()
})

window.addEventListener('scroll', positionReviewUI, true)
window.addEventListener('resize', positionReviewUI)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Reserved for future extension-driven commands.
})

document.addEventListener('mouseup', async () => {
  const selectedText = normalizeSelection(document.getSelection()?.toString() || '')

  if (selectedText.length) {
    chrome.runtime.sendMessage({
      addOrigin: 'addOrigin',
      value: selectedText,
      catId: getCategoryIdFromSelection(selectedText),
    })
  }
})

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.showPopup === 'showPopup') {
//     chrome.action.openPopup().then((resp) => {
//       console.log(`openPopup: `, resp)
//     })
//   }
// })
