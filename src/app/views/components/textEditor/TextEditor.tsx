import { useRef, useEffect, useMemo, useState } from 'react'

import {
  ClassicEditor,
  Bold,
  Essentials,
  Heading,
  Indent,
  IndentBlock,
  Strikethrough,
  BlockQuote,
  Italic,
  Link,
  List,
  MediaEmbed,
  Paragraph,
  Table,
  Undo,
  AutoImage,
  Image,
  ImageInsertViaUrl,
  Alignment,
} from 'ckeditor5'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  IReviewSentenceResponse,
  IReviewSuggestion,
  reviewSentenceService,
} from '@/services/openai/reviewSentence.service'

import './style.scss'
import 'ckeditor5/ckeditor5.css'

// props for text editor component
export interface TextEditorProps {
  disabled?: boolean
  content?: string | null
  /**
   * always emits a string (empty when editor is cleared)
   */
  onChange?: (content: string) => void
}

export const TextEditor = ({ content, onChange }: Omit<TextEditorProps, 'disabled'>) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // use a mutable ref so we can assign editor instance in onReady
  const editorRef = useRef<ClassicEditor | null>(
    null,
  ) as React.MutableRefObject<ClassicEditor | null>

  const contentRef = useRef<string | null | undefined>(content)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewState, setReviewState] = useState<'idle' | 'loading' | 'ready' | 'clean' | 'error'>(
    'idle',
  )
  const [reviewResult, setReviewResult] = useState<IReviewSentenceResponse | null>(null)
  const [hasContent, setHasContent] = useState<boolean>(false)

  const plainTextFromHtml = (html: string) => {
    const container = document.createElement('div')
    container.innerHTML = html || ''
    return (container.textContent || '')
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  useEffect(() => {
    setHasContent(Boolean(plainTextFromHtml(content || '')))
  }, [content])

  const badgeLabel = useMemo(() => {
    if (reviewState === 'loading') return '...'
    if (reviewState === 'clean') return '✓'
    if (reviewState === 'error') return '!'
    if (reviewState === 'ready') {
      const count = reviewResult?.suggestions?.length || 0
      return String(count > 99 ? '99+' : count)
    }
    return 'R'
  }, [reviewResult?.suggestions?.length, reviewState])

  const applySuggestion = (suggestion: IReviewSuggestion) => {
    if (!editorRef.current) return

    const currentHtml = editorRef.current.getData() || ''
    let nextHtml = currentHtml

    if (suggestion.current && currentHtml.includes(suggestion.current)) {
      nextHtml = currentHtml.replace(suggestion.current, suggestion.suggestion)
    } else {
      const plainText = plainTextFromHtml(currentHtml)
      if (suggestion.current && plainText.includes(suggestion.current)) {
        nextHtml = `<p>${plainText.replace(suggestion.current, suggestion.suggestion)}</p>`
      } else {
        nextHtml = `<p>${suggestion.suggestion}</p>`
      }
    }

    editorRef.current.setData(nextHtml)
    contentRef.current = nextHtml
    onChange?.(nextHtml)

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

  const handleReview = async () => {
    const html = editorRef.current?.getData() || ''
    const text = plainTextFromHtml(html)

    if (!text) {
      setReviewState('idle')
      setReviewResult(null)
      setReviewOpen(false)
      return
    }

    setReviewState('loading')
    setReviewOpen(true)

    try {
      const response = await reviewSentenceService.reviewText({ text, language: 'en' })
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

  // Update editor content only when it changes from outside (not from user typing)
  useEffect(() => {
    if (editorRef.current && content !== contentRef.current && content !== undefined) {
      const currentData = editorRef.current.getData()
      // Only update if the new content is different from what's currently in the editor
      if (currentData !== content) {
        editorRef.current.setData(content || '')
      }
      contentRef.current = content
    }
  }, [content])

  useEffect(() => {
    if (!reviewOpen) return

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target || !containerRef.current) return

      if (!containerRef.current.contains(target)) {
        setReviewOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [reviewOpen])

  return (
    <div className={'text-editor'} ref={containerRef}>
      <CKEditor
        editor={ClassicEditor}
        config={{
          plugins: [
            Essentials,
            Bold,
            Heading,
            Indent,
            IndentBlock,
            Italic,
            Link,
            List,
            MediaEmbed,
            Image,
            AutoImage,
            ImageInsertViaUrl,
            Alignment,
            Paragraph,
            Table,
            Undo,
            Strikethrough,
            BlockQuote,
          ],
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
              { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
              { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' },
            ],
          },
          toolbar: [
            'heading',
            '|',
            'bold',
            'italic',
            'strikethrough',
            '|',
            'insertTable',
            // '|',
            'alignment',
            // only works for text format
            '|',
            'link',
            'blockQuote',
            'imageInsertViaUrl',
            'insertImage',
            'uploadImage',
            '|',
            'indent',
            'outdent',
            '|',
            'numberedList',
            'bulletedList',
          ],
        }}
        // CKEditor passes (event, editor) but we only care about data
        onChange={() => {
          const data = editorRef.current?.getData() ?? ''
          const text = plainTextFromHtml(data)

          setHasContent(Boolean(text))
          if (!text) {
            setReviewOpen(false)
          }

          onChange?.(data)
          if (reviewState !== 'idle') {
            setReviewState('idle')
            setReviewResult(null)
            setReviewOpen(false)
          }
        }}
        onReady={(editor) => {
          editorRef.current = editor
          if (content) {
            editor.setData(content)
          }

          const initialText = plainTextFromHtml(editor.getData() || '')
          setHasContent(Boolean(initialText))
        }}
      />

      {hasContent && (
        <button
          type='button'
          className={`text-editor__review-badge text-editor__review-badge--${reviewState}`}
          onClick={() => {
            if (reviewOpen) {
              setReviewOpen(false)
              return
            }

            if (reviewResult && reviewState !== 'loading') {
              setReviewOpen(true)
              return
            }

            handleReview()
          }}
          title='Review text'
        >
          {badgeLabel}
        </button>
      )}

      {reviewOpen && (
        <div className='text-editor__review-panel'>
          {reviewState === 'loading' && (
            <div className='text-editor__review-empty'>Reviewing...</div>
          )}

          {reviewState === 'error' && (
            <div className='text-editor__review-empty'>Review failed. Please try again.</div>
          )}

          {reviewState !== 'loading' && reviewState !== 'error' && reviewResult && (
            <>
              <div className='text-editor__review-header'>
                {reviewResult.summary || 'Suggestions'}
              </div>

              {reviewResult.suggestions.length === 0 ? (
                <div className='text-editor__review-empty'>No suggestions.</div>
              ) : (
                <div className='text-editor__review-list'>
                  {reviewResult.suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.issue}-${index}`}
                      type='button'
                      className='text-editor__review-item'
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <div className='text-editor__review-issue'>{suggestion.issue}</div>
                      <div className='text-editor__review-current'>{suggestion.current}</div>
                      <div className='text-editor__review-next'>→ {suggestion.suggestion}</div>
                      <div className='text-editor__review-note'>{suggestion.explanation}</div>
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
