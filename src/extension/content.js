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

if (document.documentElement.dataset.appType === 'WEB_APP') {
  // Disable extension review features on the web app; the web app has its own local review flow.
  // Keep this content script effectively inactive on the web version.
  console.info('[Enmory] Extension review disabled on web app')
} else {
  const normalizeReviewText = (value = '') =>
    value
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const getCategoryIdFromSelection = (value = '') =>
    normalizeSelection(value).split(' ').filter(Boolean).length > 1
      ? PHRASE_CATEGORY_ID
      : WORD_CATEGORY_ID

  const resolveReviewTarget = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return null

    if (element instanceof HTMLTextAreaElement) return element
    if (element instanceof HTMLInputElement) return null

    if (element.isContentEditable) return element

    const role = element.getAttribute?.('role')
    const ariaMultiline = element.getAttribute?.('aria-multiline')
    const tagName = element.tagName?.toLowerCase()

    if (tagName === 'textarea') return element
    if ((role === 'textbox' || ariaMultiline === 'true') && !element.hasAttribute('disabled')) {
      return element
    }

    const closestTarget = element.closest?.(
      'textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [aria-multiline="true"], [data-review-enabled="true"]',
    )

    return closestTarget || null
  }

  const getEditableText = (element) => {
    const target = resolveReviewTarget(element)
    if (!target) return ''

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      return target.value || ''
    }

    if (target.isContentEditable) {
      return normalizeReviewText(target.innerText || target.textContent || '')
    }

    return normalizeReviewText(target.value || '')
  }

  const hasTextareaContent = (textarea) => Boolean(normalizeReviewText(getEditableText(textarea)))

  const isReviewDisabled = (element) => element?.dataset?.reviewDisabled === 'true'
  const isReviewableTextarea = (element) => {
    const target = resolveReviewTarget(element)
    return Boolean(target && !target.disabled && !target.readOnly && !isReviewDisabled(target))
  }

  const syncReviewUIState = (sourceElement = document.activeElement) => {
    if (!reviewBadge) return

    const focused = resolveReviewTarget(sourceElement)
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
    const target = resolveReviewTarget(textarea)
    if (!target) return

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      target.value = value
      target.dispatchEvent(new Event('input', { bubbles: true }))
      target.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }

    if (target.isContentEditable) {
      target.textContent = value
      target.dispatchEvent(new Event('input', { bubbles: true }))
      target.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  const applySuggestion = (issue) => {
    if (!activeTextarea || !issue) return

    const currentValue = getEditableText(activeTextarea)
    const current = typeof issue.current === 'string' ? issue.current : ''
    const suggestion = typeof issue.suggestion === 'string' ? issue.suggestion : ''
    const cached = reviewCache.get(activeTextarea)

    if (current && suggestion && currentValue.includes(current)) {
      setTextareaValue(activeTextarea, currentValue.replace(current, suggestion))
    }

    if (!cached) {
      setBadgeState('idle')
      if (suggestionPanel) {
        suggestionPanel.style.display = 'none'
        suggestionPanelOpen = false
      }
      return
    }

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

    const text = normalizeReviewText(getEditableText(activeTextarea))
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

    let retryCount = 0
    const maxRetries = 1

    const doRequest = () => {
      const requestId = ++reviewRequestSeq
      const timeoutId = window.setTimeout(() => {
        if (requestId !== reviewRequestSeq) return

        isReviewing = false

        if (retryCount < maxRetries) {
          retryCount++
          setBadgeState('loading')
          if (suggestionPanelOpen) renderLoadingPanel()
          isReviewing = true
          doRequest()
          return
        }

        setBadgeState('error')
        if (suggestionPanelOpen && suggestionPanel) {
          suggestionPanel.innerHTML =
            '<div style="padding:12px;font-size:12px;color:#ff4d4f;">Review timeout. Please try again.</div>'
        }
      }, 30000)

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
    } // end doRequest

    doRequest()
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
      reviewBadge.style.zIndex = '999'
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
      suggestionPanel.style.zIndex = '1101'
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

  const activateReviewTarget = (sourceElement) => {
    const target = resolveReviewTarget(sourceElement)
    if (!isReviewableTextarea(target)) {
      syncReviewUIState(sourceElement)
      return false
    }

    activeTextarea = target
    ensureReviewUI()
    syncReviewUIState(target)

    const cached = reviewCache.get(activeTextarea)
    if (cached) {
      const issues = Array.isArray(cached.issues) ? cached.issues : []
      setBadgeState(issues.length ? 'ready' : 'clean', issues.length)
    } else {
      setBadgeState('idle')
    }

    positionReviewUI()
    return true
  }

  document.addEventListener('focusin', (event) => {
    activateReviewTarget(event.target)
  })

  document.addEventListener('mousedown', (event) => {
    const target = resolveReviewTarget(event.target)
    if (target && target !== activeTextarea) {
      activateReviewTarget(target)
    }
  })

  document.addEventListener('click', (event) => {
    if (
      event.target &&
      event.target.closest?.(
        'textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [aria-multiline="true"], [data-review-enabled="true"]',
      )
    ) {
      activateReviewTarget(event.target)
      return
    }

    syncReviewUIState(document.activeElement)
  })

  const handleReviewableInput = (event) => {
    const target = resolveReviewTarget(event.target)
    if (!target) return

    if (!activeTextarea || target !== activeTextarea) {
      activeTextarea = target
    }

    syncReviewUIState(target)

    setBadgeState('idle')
    reviewCache.delete(activeTextarea)
  }

  document.addEventListener('input', (event) => {
    handleReviewableInput(event)
  })

  document.addEventListener('keyup', (event) => {
    handleReviewableInput(event)
  })

  document.addEventListener('paste', (event) => {
    handleReviewableInput(event)
  })

  // Legacy listeners moved below; keep the previous focusout and mousedown behavior for panel dismissal.

  document.addEventListener('focusout', (event) => {
    if (event.target !== activeTextarea) return

    setTimeout(() => {
      if (suggestionPanelOpen) return

      syncReviewUIState(event.relatedTarget || document.activeElement)
    }, 100)
  })

  /* earlier panel-dismiss handler becomes a close-on-outside-click handler */
  document.addEventListener('mousedown', (event) => {
    if (!suggestionPanelOpen) return

    const target = event.target
    const isOnBadge = reviewBadge && reviewBadge.contains(target)
    const isOnPanel = suggestionPanel && suggestionPanel.contains(target)
    const isOnTextarea =
      activeTextarea && (target === activeTextarea || activeTextarea.contains(target))

    if (!isOnBadge && !isOnPanel && !isOnTextarea) {
      suggestionPanel.style.display = 'none'
      suggestionPanelOpen = false
    }
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
}
