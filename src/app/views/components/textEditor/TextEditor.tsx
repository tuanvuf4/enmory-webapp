import { useRef } from 'react'

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
  // use a mutable ref so we can assign editor instance in onReady
  const editorRef = useRef<ClassicEditor | null>(
    null,
  ) as React.MutableRefObject<ClassicEditor | null>

  return (
    <div className={'text-editor'}>
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
            'numberedList',
            'bulletedList',
          ],
        }}
        // CKEditor passes (event, editor) but we only care about data
        onChange={() => {
          const data = editorRef.current?.getData() ?? ''
          onChange?.(data)
        }}
        onReady={(editor) => {
          editorRef.current = editor
          if (content) {
            editor.setData(content)
          }
        }}
      />
    </div>
  )
}
