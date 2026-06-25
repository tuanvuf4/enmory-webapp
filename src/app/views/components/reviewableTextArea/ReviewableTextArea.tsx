import React, { useRef, useState, useMemo, useEffect } from 'react'
import TextArea, { TextAreaProps } from 'antd/es/input/TextArea'
import {
  IReviewSentenceResponse,
  IReviewSuggestion,
  reviewSentenceService,
} from '@/services/openai/reviewSentence.service'
import './style.scss'

/**
 * ReviewableTextArea - A web app component that wraps Ant Design TextArea with grammar/spelling review functionality
 *
 * This component is completely separate from the Chrome extension review logic and uses the web app's
 * reviewSentenceService which calls OpenAI API directly from the browser with the build-time injected API key.
 *
 * Features:
 * - Shows a review badge button (R) in the top-right corner when text is present
 * - Badge states: R (idle), ... (loading), ✓ (clean), ! (error), or number (suggestions count)
 * - Clicking badge triggers grammar/spelling review via OpenAI
 * - Displays suggestion panel with clickable corrections
 * - Auto-closes panel when clicking outside
 * - Resets review state when text changes
 *
 * @example
 * ```tsx
 * <ReviewableTextArea
 *   value={text}
 *   onChange={(value) => setText(value)}
 *   placeholder="Enter text..."
 *   language="en"
 *   enableReview={true}
 * />
 * ```
 */
export interface ReviewableTextAreaProps extends Omit<TextAreaProps, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  language?: 'en' | 'vi'
  enableReview?: boolean
}

export const ReviewableTextArea: React.FC<ReviewableTextAreaProps> = ({
  value,
  onChange,
  language = 'en',
  enableReview = true,
  ...textAreaProps
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewState, setReviewState] = useState<'idle' | 'loading' | 'ready' | 'clean' | 'error'>(
    'idle',
  )
  const [reviewResult, setReviewResult] = useState<IReviewSentenceResponse | null>(null)

  const reviewBadgeLabel = useMemo(() => {
    if (reviewState === 'loading') return '...'
    if (reviewState === 'clean') return '✓'
    if (reviewState === 'error') return '!'
    if (reviewState === 'ready') {
      const count = reviewResult?.suggestions?.length || 0
      return String(count > 99 ? '99+' : count)
    }
    return 'R'
  }, [reviewResult?.suggestions?.length, reviewState])

  const handleReview = async () => {
    const text = (value || '').trim()
    if (!text) {
      setReviewState('idle')
      setReviewResult(null)
      setReviewOpen(false)
      return
    }

    setReviewState('loading')
    setReviewOpen(true)

    try {
      const response = await reviewSentenceService.reviewText({
        text,
        language,
      })

      if (response.isSuccess && response.content) {
        setReviewResult(response.content)
        setReviewState(response.content.suggestions.length > 0 ? 'ready' : 'clean')
      } else {
        setReviewState('error')
      }
    } catch (_error) {
      setReviewState('error')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange?.(newValue)

    // Reset review state when content changes
    if (reviewState !== 'idle') {
      setReviewState('idle')
      setReviewResult(null)
      setReviewOpen(false)
    }
  }

  const handleBadgeClick = () => {
    if (reviewOpen) {
      setReviewOpen(false)
      return
    }

    if (reviewResult && reviewState !== 'loading') {
      setReviewOpen(true)
      return
    }

    handleReview()
  }

  const applySuggestion = (suggestion: IReviewSuggestion) => {
    // Only replace the specific current text, not the whole value
    const currentValue = value || ''
    const current = suggestion.current || ''
    const suggestionText = suggestion.suggestion || ''

    if (current && suggestionText && currentValue.includes(current)) {
      // Find the first occurrence and replace it
      const index = currentValue.indexOf(current)
      if (index !== -1) {
        const before = currentValue.substring(0, index)
        const after = currentValue.substring(index + current.length)
        onChange?.(before + suggestionText + after)
      }
    }

    // Remove the applied suggestion from the list
    if (reviewResult) {
      const nextSuggestions = reviewResult.suggestions.filter((item) => item !== suggestion)
      setReviewResult({
        ...reviewResult,
        suggestions: nextSuggestions,
        isCorrect: nextSuggestions.length === 0,
      })
      setReviewState(nextSuggestions.length > 0 ? 'ready' : 'clean')
    }
  }

  // Close panel when clicking outside
  useEffect(() => {
    if (!reviewOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target || !containerRef.current) return

      if (!containerRef.current.contains(target)) {
        setReviewOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [reviewOpen])

  if (!enableReview) {
    return (
      <TextArea {...textAreaProps} value={value} onChange={(e) => onChange?.(e.target.value)} />
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <TextArea
        {...textAreaProps}
        value={value}
        onChange={handleChange}
        data-review-disabled='true'
      />

      {value && (
        <button
          type='button'
          onClick={handleBadgeClick}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 22,
            height: 22,
            border: 0,
            borderRadius: '50%',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            background:
              reviewState === 'loading'
                ? '#1677ff'
                : reviewState === 'ready'
                  ? '#fa8c16'
                  : reviewState === 'clean'
                    ? '#52c41a'
                    : reviewState === 'error'
                      ? '#ff4d4f'
                      : '#1677ff',
            boxShadow: '0 2px 8px rgba(0,0,0,.2)',
            zIndex: 10,
          }}
          title='Review text'
        >
          {reviewBadgeLabel}
        </button>
      )}

      {reviewOpen && (
        <div
          className='review-panel'
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            top: '100%',
            right: 0,
            marginTop: 8,
          }}
        >
          {reviewState === 'loading' && <div className='review-panel__empty'>Reviewing...</div>}

          {reviewState === 'error' && (
            <div className='review-panel__empty'>Review failed. Please try again.</div>
          )}

          {reviewState !== 'loading' && reviewState !== 'error' && reviewResult && (
            <>
              <div className='review-panel__header'>{reviewResult.summary || 'Suggestions'}</div>

              {reviewResult.suggestions.length === 0 ? (
                <div className='review-panel__empty'>No suggestions.</div>
              ) : (
                <div className='review-panel__list'>
                  {reviewResult.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type='button'
                      className='review-panel__item'
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <div className='review-panel__issue'>{suggestion.issue}</div>
                      <div className='review-panel__current'>{suggestion.current}</div>
                      <div className='review-panel__next'>→ {suggestion.suggestion}</div>
                      <div className='review-panel__note'>{suggestion.explanation}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
