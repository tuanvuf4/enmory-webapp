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
} from 'ckeditor5'
import { CKEditor } from '@ckeditor/ckeditor5-react'

import './style.scss'
import 'ckeditor5/ckeditor5.css'

interface TextEditor {
  content?: string | null
  onChange?: (content: unknown) => void
}

export const TextEditor = ({ content, onChange }: TextEditor) => {
  const editorRef = useRef<ClassicEditor>()

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
            Paragraph,
            Table,
            Undo,
            Strikethrough,
            BlockQuote,
          ],
          toolbar: [
            'bold',
            'italic',
            'strikethrough',
            '|',
            'link',
            'blockQuote',
            'uploadImage',
            'mediaEmbed',
            '|',
            'numberedList',
            'bulletedList',
          ],
        }}
        onChange={(event) => {
          onChange?.(editorRef.current?.getData())
        }}
        data={content}
        onReady={(editor) => {
          editorRef.current = editor
        }}
      />
    </div>
  )
}
