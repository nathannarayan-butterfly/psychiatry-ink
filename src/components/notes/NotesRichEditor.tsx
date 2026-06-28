import { Bold, Highlighter, Italic, Underline as UnderlineIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Highlight } from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { useTranslation } from '../../context/TranslationContext'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'
import { ensureRichHtml } from '../../utils/documentTemplate/richText'

interface NotesRichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  ariaLabel?: string
  minHeight?: string
}

/**
 * Lightweight rich-text editor for the Notizen popup. Reuses the app's TipTap
 * stack (already a dependency, same engine as the document-template editor) but
 * with a compact toolbar focused on the four requested marks: bold, italic,
 * underline, highlight. Emits sanitised HTML via the shared
 * {@link sanitizeRichHtml}; legacy plain-text notes are upconverted for editing
 * by {@link ensureRichHtml}.
 */
function NotesToolbar({ editor }: { editor: Editor }) {
  const { t } = useTranslation()
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      highlight: ed.isActive('highlight'),
    }),
  })

  return (
    <div className="notizen-rte__toolbar" role="toolbar" aria-label={t('notizenFormatToolbar')}>
      <button
        type="button"
        className={`notizen-rte__btn${state.bold ? ' notizen-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title={t('notizenFormatBold')}
        aria-label={t('notizenFormatBold')}
        aria-pressed={state.bold}
      >
        <Bold className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        className={`notizen-rte__btn${state.italic ? ' notizen-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title={t('notizenFormatItalic')}
        aria-label={t('notizenFormatItalic')}
        aria-pressed={state.italic}
      >
        <Italic className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        className={`notizen-rte__btn${state.underline ? ' notizen-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title={t('notizenFormatUnderline')}
        aria-label={t('notizenFormatUnderline')}
        aria-pressed={state.underline}
      >
        <UnderlineIcon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        className={`notizen-rte__btn${state.highlight ? ' notizen-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title={t('notizenFormatHighlight')}
        aria-label={t('notizenFormatHighlight')}
        aria-pressed={state.highlight}
      >
        <Highlighter className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}

export function NotesRichEditor({
  value,
  onChange,
  placeholder,
  ariaLabel,
  minHeight = '8rem',
}: NotesRichEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: ensureRichHtml(value),
    editorProps: {
      attributes: {
        class: 'notizen-rte__editor',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current(sanitizeRichHtml(ed.getHTML()))
    },
  })

  // Sync external value changes that did not originate from this editor (e.g.
  // switching which note is being edited).
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const incoming = sanitizeRichHtml(ensureRichHtml(value))
    const current = sanitizeRichHtml(editor.getHTML())
    if (incoming !== current) {
      editor.commands.setContent(ensureRichHtml(value), { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <div className="notizen-rte">
      {editor ? <NotesToolbar editor={editor} /> : null}
      <EditorContent editor={editor} className="notizen-rte__content" />
    </div>
  )
}
