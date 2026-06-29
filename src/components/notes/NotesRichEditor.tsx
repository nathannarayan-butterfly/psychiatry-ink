import { Ban, Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Highlight } from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { FontFamily, TextStyle } from '@tiptap/extension-text-style'
import { useTranslation } from '../../context/TranslationContext'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'
import { ensureRichHtml, FONT_FAMILY_OPTIONS } from '../../utils/documentTemplate/richText'
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_COLOR_HEX,
  type HighlightColor,
} from '../../types/knowledgeBaseAnnotations'

interface NotesRichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  ariaLabel?: string
  minHeight?: string
}

/**
 * Lightweight rich-text editor for the Notizen popup. Reuses the app's TipTap
 * stack (already a dependency, same engine as the document-template editor) with
 * a compact toolbar covering bold / italic / underline plus the two formatting
 * affordances the Knowledge-Base notes editor offers: a **font-family** selector
 * (TipTap {@link FontFamily}) and a **multi-colour highlight** palette (TipTap
 * {@link Highlight} in `multicolor` mode, sharing the KB highlight tints). Emits
 * sanitised HTML via the shared {@link sanitizeRichHtml} (which preserves
 * `font-family` + highlight `background-color`); legacy plain-text notes are
 * upconverted for editing by {@link ensureRichHtml}.
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
      fontFamily: (ed.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
    }),
  })

  return (
    <div className="notizen-rte__toolbar" role="toolbar" aria-label={t('notizenFormatToolbar')}>
      <select
        className="notizen-rte__font-select"
        value={state.fontFamily}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const next = e.target.value
          if (next) editor.chain().focus().setFontFamily(next).run()
          else editor.chain().focus().unsetFontFamily().run()
        }}
        title={t('notizenFormatFont')}
        aria-label={t('notizenFormatFont')}
      >
        <option value="">{t('notizenFontDefault')}</option>
        {FONT_FAMILY_OPTIONS.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>

      <span className="notizen-rte__sep" aria-hidden />

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

      <span className="notizen-rte__sep" aria-hidden />

      <span
        className="notizen-rte__highlight-group"
        role="group"
        aria-label={t('notizenFormatHighlight')}
      >
        {HIGHLIGHT_COLORS.map((color: HighlightColor) => (
          <button
            key={color}
            type="button"
            className={`notizen-rte__swatch notizen-rte__swatch--${color}`}
            style={{ backgroundColor: HIGHLIGHT_COLOR_HEX[color] }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor.chain().focus().setHighlight({ color: HIGHLIGHT_COLOR_HEX[color] }).run()
            }
            title={`${t('notizenFormatHighlight')}: ${t(`notizenColor_${color}` as const)}`}
            aria-label={`${t('notizenFormatHighlight')}: ${t(`notizenColor_${color}` as const)}`}
          />
        ))}
        <button
          type="button"
          className={`notizen-rte__btn notizen-rte__btn--highlight-off${state.highlight ? ' notizen-rte__btn--active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetHighlight().run()}
          title={t('notizenFormatHighlightNone')}
          aria-label={t('notizenFormatHighlightNone')}
        >
          <Ban className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </span>
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
      TextStyle,
      FontFamily,
      Highlight.configure({ multicolor: true }),
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
