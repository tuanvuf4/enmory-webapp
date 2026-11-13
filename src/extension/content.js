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

const isExtensionContextValid = () => {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
}

const safeSendMessage = (message, callback) => {
  if (!isExtensionContextValid()) {
    return
  }
  try {
    const promise = chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime?.lastError) {
        // Suppressed or handled
      }
      if (callback) callback(response)
    })
    if (promise && typeof promise.catch === 'function') {
      promise.catch((err) => {
        console.debug('[Enmory] Extension message failed (context invalidated):', err?.message)
      })
    }
  } catch (err) {
    console.debug('[Enmory] Extension context error:', err?.message)
  }
}

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
      const panelWidth = 320
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      // Get actual panel height (or use estimated max if not rendered yet)
      const panelHeight = suggestionPanel.offsetHeight || 280
      const panelWithMargin = panelHeight + 12 // Add margin for spacing

      // Determine if panel should be positioned above or below
      const shouldPositionAbove = spaceBelow < panelWithMargin && spaceAbove > spaceBelow

      let top
      if (shouldPositionAbove) {
        // Position above the textarea
        top = window.scrollY + rect.top - panelHeight - 12
        // Ensure it doesn't go above viewport
        const minTop = window.scrollY + 8
        if (top < minTop) {
          top = minTop
        }
      } else {
        // Position below the textarea (default)
        top = window.scrollY + rect.bottom + 12
        // Ensure it doesn't go below viewport
        const maxTop = window.scrollY + viewportHeight - panelHeight - 8
        if (top > maxTop && maxTop > window.scrollY) {
          top = maxTop
        }
      }

      // Horizontal positioning
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
      // Only replace the first occurrence of the exact current text
      const index = currentValue.indexOf(current)
      if (index !== -1) {
        const before = currentValue.substring(0, index)
        const after = currentValue.substring(index + current.length)
        setTextareaValue(activeTextarea, before + suggestion + after)
      }
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
    header.style.setProperty('color', 'rgba(51, 51, 51, 0.85)', 'important')
    header.textContent = data?.summary || 'Suggestions'
    suggestionPanel.appendChild(header)

    const body = document.createElement('div')
    body.style.maxHeight = '220px'
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
        item.style.transition = 'background 0.2s'

        item.addEventListener('mouseenter', () => {
          item.style.background = '#f5f5f5'
        })
        item.addEventListener('mouseleave', () => {
          item.style.background = '#fff'
        })

        const current = typeof issue.current === 'string' ? issue.current : ''
        const suggestion = typeof issue.suggestion === 'string' ? issue.suggestion : ''
        const explanation = typeof issue.explanation === 'string' ? issue.explanation : ''
        const issueType = issue.issue || 'issue'

        item.innerHTML = `<div style="font-size:12px;color:#999;margin-bottom:2px;text-transform:capitalize;">${issueType}</div>
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
            '<div style="padding:12px;font-size:12px;color:#666;">Review failed. Please try again.</div>'
        }
      }, 30000)

      safeSendMessage({ action: 'reviewSentence', text }, (response) => {
        if (requestId !== reviewRequestSeq) return
        window.clearTimeout(timeoutId)

        isReviewing = false

        if (chrome.runtime.lastError) {
          setBadgeState('error')
          if (suggestionPanelOpen && suggestionPanel) {
            suggestionPanel.innerHTML =
              '<div style="padding:12px;font-size:12px;color:#666;">Review failed. Please try again.</div>'
          }
          return
        }

        if (!response?.ok) {
          setBadgeState('error')
          if (suggestionPanelOpen && suggestionPanel) {
            suggestionPanel.innerHTML =
              '<div style="padding:12px;font-size:12px;color:#666;">Review failed. Please try again.</div>'
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
      reviewBadge.style.zIndex = '10'
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
      suggestionPanel.style.zIndex = '11'
      suggestionPanel.style.width = '320px'
      suggestionPanel.style.maxWidth = 'calc(100% - 16px)'
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

  // =========================================================================
  // In-Page Enmory Integration (Context Menu Triggered + Toast Notifications)
  // =========================================================================

  let currentSelectionText = ''
  let currentSentenceContext = ''

  const ENMORY_LOGO_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FBBF24" stroke="#F59E0B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`

  // Ensure extension toast style animations are injected into the page once
  const ensureExtensionStyles = () => {
    if (document.getElementById('enmory-extension-custom-styles')) return
    const styleEl = document.createElement('style')
    styleEl.id = 'enmory-extension-custom-styles'
    styleEl.textContent = `
      @keyframes enmorySlideInRight {
        from { opacity: 0; transform: translateX(40px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes enmoryFadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-8px); }
      }
      #enmory-toast-container {
        all: initial;
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }
      .enmory-toast-card {
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 12px;
        padding: 13px 18px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(79, 70, 229, 0.2);
        max-width: 380px;
        animation: enmorySlideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        display: flex;
        flex-direction: column;
        gap: 5px;
        box-sizing: border-box;
      }
      .enmory-toast-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .enmory-toast-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        font-weight: 700;
        color: #38bdf8;
      }
      .enmory-toast-close {
        cursor: pointer;
        color: #94a3b8;
        font-size: 16px;
        line-height: 1;
        padding: 2px;
      }
      .enmory-toast-close:hover {
        color: #ffffff;
      }
      .enmory-toast-origin {
        font-size: 15px;
        font-weight: 700;
        color: #f1f5f9;
        margin-top: 1px;
      }
      .enmory-toast-detail {
        font-size: 13px;
        color: #cbd5e1;
        line-height: 1.45;
      }
      .enmory-toast-meanings-list {
        font-size: 12.5px;
        color: #e2e8f0;
        margin: 2px 0;
        padding-left: 18px;
      }
      .enmory-toast-meanings-list li {
        margin-bottom: 2px;
      }
      .enmory-toast-example {
        font-size: 12px;
        font-style: italic;
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.06);
        padding: 5px 9px;
        border-radius: 6px;
        margin-top: 3px;
        border-left: 2px solid #6366f1;
        line-height: 1.35;
      }
      .enmory-toast-footer {
        font-size: 11.5px;
        color: #4ade80;
        font-weight: 600;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `
    document.head.appendChild(styleEl)
  }

  // Extract sentence context around selected text
  const extractSentenceContext = (selection) => {
    try {
      if (!selection || !selection.anchorNode) return ''
      const anchorNode = selection.anchorNode
      const parentElement =
        anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode
      if (!parentElement) return ''

      const block =
        parentElement.closest(
          'p, li, blockquote, div, article, section, td, h1, h2, h3, h4, h5, h6',
        ) || parentElement
      const blockText = (block.innerText || block.textContent || '').replace(/\s+/g, ' ').trim()
      const selectedStr = selection.toString().trim()
      if (!blockText || !selectedStr) return ''

      // Split into sentences using punctuation boundaries
      const sentences = blockText.split(/(?<=[.!?])\s+/)
      const matchingSentence = sentences.find((s) => s.includes(selectedStr))
      if (matchingSentence) {
        return matchingSentence.trim()
      }

      // Fallback: window around selection
      const idx = blockText.indexOf(selectedStr)
      if (idx !== -1) {
        const start = Math.max(0, idx - 80)
        const end = Math.min(blockText.length, idx + selectedStr.length + 80)
        return blockText.substring(start, end).trim()
      }

      return blockText.slice(0, 180).trim()
    } catch (e) {
      return ''
    }
  }

  // In-page Toast Notifications
  const showEnmoryToast = ({ type = 'success', title, origin, detail, example, subtext }) => {
    ensureExtensionStyles()
    let container = document.getElementById('enmory-toast-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'enmory-toast-container'
      document.body.appendChild(container)
    }

    const toast = document.createElement('div')
    toast.className = 'enmory-toast-card'

    const titleColor = type === 'error' ? '#ef4444' : type === 'info' ? '#38bdf8' : '#4ade80'
    const statusIcon = type === 'error' ? '✕' : '✓'

    toast.innerHTML = `
      <div class="enmory-toast-header">
        <span class="enmory-toast-title" style="color: ${titleColor}">
          ${ENMORY_LOGO_SVG} ${title || 'Enmory'}
        </span>
        <span class="enmory-toast-close">&times;</span>
      </div>
      ${origin ? `<div class="enmory-toast-origin">${origin}</div>` : ''}
      ${detail ? `<div class="enmory-toast-detail">${detail}</div>` : ''}
      ${example ? `<div class="enmory-toast-example">“${example}”</div>` : ''}
      <div class="enmory-toast-footer">
        ${statusIcon} ${subtext || 'Đã lưu vào Local DB & Firestore'}
      </div>
    `

    toast.querySelector('.enmory-toast-close').addEventListener('click', () => {
      toast.remove()
    })

    container.appendChild(toast)

    setTimeout(() => {
      toast.style.animation = 'enmoryFadeOut 0.3s forwards'
      setTimeout(() => toast.remove(), 300)
    }, 5000)
  }

  // Listen to selection changes to track current selection and sentence context
  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      const selection = window.getSelection()
      const rawText = selection?.toString() || ''
      const selectedText = normalizeSelection(rawText)

      if (selectedText.length) {
        currentSelectionText = selectedText
        currentSentenceContext = extractSentenceContext(selection)

        // Legacy message for manual form popup
        safeSendMessage({
          addOrigin: 'addOrigin',
          value: selectedText,
          catId: getCategoryIdFromSelection(selectedText),
        })
      }
    }, 20)
  })

  // Listen to background messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Context query from background when context menu is clicked
    if (request?.action === 'getSelectionContext') {
      const selection = window.getSelection()
      const text =
        normalizeSelection(selection?.toString() || '') || currentSelectionText
      const ctx = extractSentenceContext(selection) || currentSentenceContext
      sendResponse({ origin: text, sentenceContext: ctx })
      return false
    }

    // 2. Loading started
    if (request?.action === 'quickAddStarted') {
      showEnmoryToast({
        type: 'info',
        title: 'Enmory AI',
        origin: request.origin,
        detail: 'Đang phân tích tất cả các nghĩa bằng Gemini AI...',
        subtext: 'Đang lấy dữ liệu từ điển & ngữ cảnh...',
      })
      return false
    }

    // 3. Quick add completed
    if (request?.action === 'quickAddSuccess') {
      const item = request.item || {}
      const meanings = item.meanings || []

      // Build readable detail of all extracted meanings
      let detailHtml = ''
      if (meanings.length === 1) {
        detailHtml = `Nghĩa: <strong>${meanings[0].translation || ''}</strong>`
      } else if (meanings.length > 1) {
        const listItems = meanings
          .slice(0, 4)
          .map((m) => `<li>${m.translation || m.definition || ''}</li>`)
          .join('')
        detailHtml = `<div>Đã tìm thấy <strong>${meanings.length} nghĩa</strong>:</div><ul class="enmory-toast-meanings-list">${listItems}</ul>`
      }

      // First example (the contextual sentence)
      const firstEx =
        meanings[0]?.examples?.[0]?.origin ||
        item.examples?.[0]?.origin ||
        currentSentenceContext ||
        ''

      const isUpdated = Boolean(item.isUpdated)
      const preservedCount = item.preservedExamplesCount || 0
      const toastTitle = isUpdated ? 'Đã cập nhật từ vựng!' : 'Đã nạp vào Enmory!'
      const toastSubtext = isUpdated
        ? `Ghi đè nghĩa mới & giữ lại ${preservedCount} câu ví dụ cũ (Local DB & Firestore)`
        : 'Đã lưu vào cả Local DB & Firestore'

      showEnmoryToast({
        type: 'success',
        title: toastTitle,
        origin: item.origin,
        detail: detailHtml,
        example: firstEx,
        subtext: toastSubtext,
      })
      return false
    }

    // 4. Quick add error
    if (request?.action === 'quickAddError') {
      showEnmoryToast({
        type: 'error',
        title: 'Lỗi nạp từ vựng',
        detail: request.error || 'Thao tác không thành công',
        subtext: 'Bạn có thể dùng chuột phải -> Mở form thủ công để thử lại',
      })
      return false
    }
  })
}

