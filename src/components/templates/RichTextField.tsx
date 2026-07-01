import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Ban,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { useTranslation } from '../../context/TranslationContext'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'
import {
  cssToFontSizePt,
  DEFAULT_FONT_SIZE_PT,
  ensureRichHtml,
  FONT_FAMILY_OPTIONS,
  fontSizeToCss,
  FONT_SIZE_OPTIONS,
  TEXT_COLOR_OPTIONS,
} from '../../utils/documentTemplate/richText'
import { HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_HEX, type HighlightColor } from '../../types/knowledgeBaseAnnotations'

interface RichTextFieldProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  readOnly?: boolean
  /** Enable drag-to-resize (Langtext fields). */
  resizable?: boolean
  ariaLabel?: string
}

function buildExtensions(placeholder?: string) {
  return [
    StarterKit.configure({ link: false }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: placeholder ?? '' }),
  ]
}

const HEADING_LEVELS = [1, 2, 3] as const

interface ToolbarProps {
  editor: Editor
}

function RichTextToolbar({ editor }: ToolbarProps) {
  const { t } = useTranslation()

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      strike: ed.isActive('strike'),
      alignLeft: ed.isActive({ textAlign: 'left' }),
      alignCenter: ed.isActive({ textAlign: 'center' }),
      alignRight: ed.isActive({ textAlign: 'right' }),
      alignJustify: ed.isActive({ textAlign: 'justify' }),
      bulletList: ed.isActive('bulletList'),
      orderedList: ed.isActive('orderedList'),
      highlight: ed.isActive('highlight'),
      fontFamily: (ed.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
      fontSize: (ed.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      headingLevel: HEADING_LEVELS.find((level) => ed.isActive('heading', { level })) ?? 0,
    }),
  })

  const currentSize = cssToFontSizePt(state.fontSize) ?? DEFAULT_FONT_SIZE_PT

  return (
    <div className="dt-rte__toolbar" role="toolbar" aria-label={t('templateRteToolbar')}>
      <select
        className="dt-rte__select dt-rte__select--heading"
        value={state.headingLevel}
        aria-label={t('templateRteHeading')}
        title={t('templateRteHeading')}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const level = Number(e.target.value)
          if (!level) editor.chain().focus().setParagraph().run()
          else editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
        }}
      >
        <option value={0}>{t('templateRteHeadingNormal')}</option>
        {HEADING_LEVELS.map((level) => (
          <option key={level} value={level}>
            {t('templateRteHeadingLevel').replace('{level}', String(level))}
          </option>
        ))}
      </select>

      <select
        className="dt-rte__select dt-rte__select--font"
        value={state.fontFamily}
        aria-label={t('templateRteFontFamily')}
        title={t('templateRteFontFamily')}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const next = e.target.value
          if (!next) editor.chain().focus().unsetFontFamily().run()
          else editor.chain().focus().setFontFamily(next).run()
        }}
      >
        <option value="">{t('templateRteFontFamily')}</option>
        {FONT_FAMILY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value }}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className="dt-rte__select dt-rte__select--size"
        value={currentSize}
        aria-label={t('templateRteFontSize')}
        title={t('templateRteFontSize')}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const pt = Number(e.target.value)
          if (!pt || pt === DEFAULT_FONT_SIZE_PT) editor.chain().focus().unsetFontSize().run()
          else editor.chain().focus().setFontSize(fontSizeToCss(pt)).run()
        }}
      >
        {FONT_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <span className="dt-rte__divider" aria-hidden />

      <button
        type="button"
        className={`dt-rte__btn${state.bold ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title={t('templateRteBold')}
        aria-label={t('templateRteBold')}
        aria-pressed={state.bold}
      >
        <Bold className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`dt-rte__btn${state.italic ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title={t('templateRteItalic')}
        aria-label={t('templateRteItalic')}
        aria-pressed={state.italic}
      >
        <Italic className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`dt-rte__btn${state.underline ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title={t('templateRteUnderline')}
        aria-label={t('templateRteUnderline')}
        aria-pressed={state.underline}
      >
        <UnderlineIcon className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`dt-rte__btn${state.strike ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title={t('templateRteStrike')}
        aria-label={t('templateRteStrike')}
        aria-pressed={state.strike}
      >
        <Strikethrough className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <span className="dt-rte__divider" aria-hidden />

      <button
        type="button"
        className={`dt-rte__btn${state.alignLeft ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title={t('templateRteAlignLeft')}
        aria-label={t('templateRteAlignLeft')}
        aria-pressed={state.alignLeft}
      >
        <AlignLeft className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`dt-rte__btn${state.alignCenter ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title={t('templateRteAlignCenter')}
        aria-label={t('templateRteAlignCenter')}
        aria-pressed={state.alignCenter}
      >
        <AlignCenter className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`dt-rte__btn${state.alignRight ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title={t('templateRteAlignRight')}
        aria-label={t('templateRteAlignRight')}
        aria-pressed={state.alignRight}
      >
        <AlignRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`dt-rte__btn${state.alignJustify ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        title={t('templateRteAlignJustify')}
        aria-label={t('templateRteAlignJustify')}
        aria-pressed={state.alignJustify}
      >
        <AlignJustify className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <span className="dt-rte__divider" aria-hidden />

      <button
        type="button"
        className={`dt-rte__btn${state.bulletList ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title={t('templateRteBulletList')}
        aria-label={t('templateRteBulletList')}
        aria-pressed={state.bulletList}
      >
        <List className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`dt-rte__btn${state.orderedList ? ' dt-rte__btn--active' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title={t('templateRteOrderedList')}
        aria-label={t('templateRteOrderedList')}
        aria-pressed={state.orderedList}
      >
        <ListOrdered className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <span className="dt-rte__divider" aria-hidden />

      <span className="dt-rte__swatch-group" role="group" aria-label={t('templateRteTextColor')}>
        <Palette className="h-3 w-3 dt-rte__swatch-icon" strokeWidth={2} aria-hidden />
        {TEXT_COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            className="dt-rte__swatch"
            style={{ backgroundColor: color.value }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setColor(color.value).run()}
            title={`${t('templateRteTextColor')}: ${color.label}`}
            aria-label={`${t('templateRteTextColor')}: ${color.label}`}
          />
        ))}
        <button
          type="button"
          className="dt-rte__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetColor().run()}
          title={t('templateRteTextColorNone')}
          aria-label={t('templateRteTextColorNone')}
        >
          <Ban className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </span>

      <span className="dt-rte__swatch-group" role="group" aria-label={t('templateRteHighlight')}>
        <Highlighter className="h-3 w-3 dt-rte__swatch-icon" strokeWidth={2} aria-hidden />
        {HIGHLIGHT_COLORS.map((color: HighlightColor) => (
          <button
            key={color}
            type="button"
            className="dt-rte__swatch"
            style={{ backgroundColor: HIGHLIGHT_COLOR_HEX[color] }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor.chain().focus().setHighlight({ color: HIGHLIGHT_COLOR_HEX[color] }).run()
            }
            title={`${t('templateRteHighlight')}: ${t(`notizenColor_${color}` as const)}`}
            aria-label={`${t('templateRteHighlight')}: ${t(`notizenColor_${color}` as const)}`}
          />
        ))}
        <button
          type="button"
          className={`dt-rte__btn${state.highlight ? ' dt-rte__btn--active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetHighlight().run()}
          title={t('templateRteHighlightNone')}
          aria-label={t('templateRteHighlightNone')}
        >
          <Ban className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </span>
    </div>
  )
}

export function RichTextField({
  value,
  onChange,
  placeholder,
  minHeight = '4rem',
  readOnly = false,
  resizable = false,
  ariaLabel,
}: RichTextFieldProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: ensureRichHtml(value),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'dt-rte__editor',
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

  // Keep editor editable state in sync with the readOnly prop.
  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  // Sync external value changes that did not originate from this editor.
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const incoming = sanitizeRichHtml(ensureRichHtml(value))
    const current = sanitizeRichHtml(editor.getHTML())
    if (incoming !== current) {
      editor.commands.setContent(ensureRichHtml(value), { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <div
      className={[
        'dt-rte',
        readOnly ? 'dt-rte--readonly' : '',
        resizable ? 'dt-rte--resizable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!readOnly && editor ? <RichTextToolbar editor={editor} /> : null}
      <EditorContent editor={editor} className="dt-rte__content" />
    </div>
  )
}
