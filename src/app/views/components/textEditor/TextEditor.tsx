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

interface TextEditor {
  disabled?: boolean
  content?: string | null
  onChange?: (content: unknown) => void
}

export const TextEditor = ({ content, disabled = false, onChange }: TextEditor) => {
  const editorRef = useRef<ClassicEditor>()

  return (
    <div className={'text-editor'}>
      <CKEditor
        editor={ClassicEditor}
        disabled={disabled}
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
          toolbar: [
            'bold',
            'italic',
            'strikethrough',
            // '|',
            // 'alignment',
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
        onChange={() => {
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
