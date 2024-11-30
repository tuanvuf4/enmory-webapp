import { type ReactNode, useCallback, useEffect, useRef } from 'react'

import {
  ClassicEditor,
  Bold,
  Essentials,
  Heading,
  Indent,
  IndentBlock,
  Strikethrough,
  UploadImageCommand,
  BlockQuote,
  Italic,
  Link,
  List,
  MediaEmbed,
  Paragraph,
  Table,
  Undo,
} from 'ckeditor5'
import { CKEditor, CKEditorContext } from '@ckeditor/ckeditor5-react'

import { CiImageOn } from 'react-icons/ci'
import { RxQuote } from 'react-icons/rx'
import { IoIosUndo, IoIosRedo } from 'react-icons/io'
import { TbH1, TbH2, TbH3, TbH4, TbH5, TbH6 } from 'react-icons/tb'
import { BiParagraph } from 'react-icons/bi'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
// import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { type Content, Editor, EditorContent, useEditor } from '@tiptap/react'
import { isEmpty } from 'lodash'
import { Button } from 'antd'
import styles from './style'
import {
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'

import './style.scss'
import 'ckeditor5/ckeditor5.css'

interface TextEditor {
  content?: string | null
  onChange?: (content: unknown) => void
}

interface MenuBarProps {
  editor: Editor | null
}

const MenuBar = ({ editor }: MenuBarProps) => {
  if (!editor) return null

  const addImage = useCallback(() => {
    const url = window.prompt('URL')

    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) return

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()

      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className='control-group flex gap-1'>
      <div className='button-group flex gap-3 flex-wrap'>
        <div className={'flex gap-1'}>
          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            icon={<BoldOutlined />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            icon={<ItalicOutlined />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            icon={<StrikethroughOutlined />}
          />
        </div>

        <div className={'flex gap-1'}>
          <Button
            size={'small'}
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={editor.isActive('paragraph') ? 'is-active' : ''}
            icon={<BiParagraph />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            icon={<TbH1 />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            icon={<TbH2 />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            icon={<TbH3 />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
            icon={<TbH4 />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
            icon={<TbH5 />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
            className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
            icon={<TbH6 />}
          />
        </div>

        <div className={'flex gap-1'}>
          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            icon={<UnorderedListOutlined />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            icon={<OrderedListOutlined />}
          />
        </div>

        <div className={'flex gap-1'}>
          <Button
            size={'small'}
            onClick={() => {
              editor.isActive('link') ? editor.chain().focus().unsetLink().run() : setLink()
            }}
            className={editor.isActive('link') ? 'is-active' : ''}
            icon={<LinkOutlined />}
          />

          <Button size={'small'} onClick={addImage} icon={<CiImageOn />} />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            icon={<RxQuote />}
          />
        </div>

        <div className={'flex gap-1'}>
          <Button
            size={'small'}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            icon={<IoIosUndo />}
          />

          <Button
            size={'small'}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            icon={<IoIosRedo />}
          />
        </div>
      </div>
    </div>
  )
}

export const TextEditor = ({ content, onChange }: TextEditor) => {
  const editorRef = useRef<ClassicEditor>()

  const classes = styles()

  // const editor = useEditor({
  //   extensions: [
  //     StarterKit,
  //     Image.configure({ inline: false }),
  //     Link.configure({
  //       openOnClick: false,
  //       autolink: true,
  //       defaultProtocol: 'https',
  //       protocols: ['http', 'https'],
  //       isAllowedUri: (url, ctx) => {
  //         try {
  //           // construct URL
  //           const parsedUrl = url.includes(':')
  //             ? new URL(url)
  //             : new URL(`${ctx.defaultProtocol}://${url}`)

  //           // use default validation
  //           if (!ctx.defaultValidate(parsedUrl.href)) {
  //             return false
  //           }

  //           // disallowed protocols
  //           const disallowedProtocols = ['ftp', 'file', 'mailto']
  //           const protocol = parsedUrl.protocol.replace(':', '')

  //           if (disallowedProtocols.includes(protocol)) {
  //             return false
  //           }

  //           // only allow protocols specified in ctx.protocols
  //           const allowedProtocols = ctx.protocols.map((p) =>
  //             typeof p === 'string' ? p : p.scheme,
  //           )

  //           if (!allowedProtocols.includes(protocol)) {
  //             return false
  //           }

  //           // disallowed domains
  //           const disallowedDomains = ['example-phishing.com', 'malicious-site.net']
  //           const domain = parsedUrl.hostname

  //           if (disallowedDomains.includes(domain)) {
  //             return false
  //           }

  //           // all checks have passed
  //           return true
  //         } catch (error) {
  //           return false
  //         }
  //       },
  //       shouldAutoLink: (url) => {
  //         try {
  //           // construct URL
  //           const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`)

  //           // only auto-link if the domain is not in the disallowed list
  //           const disallowedDomains = ['example-no-autolink.com', 'another-no-autolink.com']
  //           const domain = parsedUrl.hostname

  //           return !disallowedDomains.includes(domain)
  //         } catch (error) {
  //           return false
  //         }
  //       },
  //     }),
  //     TextAlign.configure({ types: ['heading', 'paragraph'] }),
  //   ],
  //   onUpdate: ({ editor }) => {
  //     if (!isEmpty(editor.getText()) || !isEmpty(editor.getHTML())) {
  //       onUpdate?.(editor.getHTML())
  //       onChange?.(editor.getHTML())
  //     } else {
  //       onUpdate?.('')
  //       onChange?.('')
  //     }
  //   },
  //   content,
  // })

  // useEffect(() => {
  //   if (!editor) return
  //   if (editor.getHTML() !== content) editor.commands.setContent(content)
  // }, [content, editor])

  return (
    <>
      {/* <div className={`${classes.textEditorWrapper} flex gap-1 flex-col`}>
        <div className={classes.textEditorToolbar}>
          <MenuBar editor={editor} />
        </div>

        <div className={`${classes.textEditorContent}`}>
          <EditorContent editor={editor} />
        </div>
        {errors ? <span className={`text-red-6 mb-2.5 mt-1`}>{errors}</span> : null}
      </div> */}

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
              'undo',
              'redo',
              '|',
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
            console.log(`******* event ******* `, event)
            onChange?.(editorRef.current?.getData())
          }}
          data={content}
          onReady={(editor) => {
            editorRef.current = editor
            // You can store the "editor" and use when it is needed.
            console.log('Editor 2 is ready to use!', editor)
          }}
        />
      </div>
    </>
  )
}
