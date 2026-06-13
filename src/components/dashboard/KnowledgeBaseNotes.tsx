import { Bold, ChevronDown, Highlighter, Italic, NotebookPen, Underline, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useKnowledgeBaseNotes } from '../../hooks/useKnowledgeBaseNotes'
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_COLOR_HEX,
  type HighlightColor,
} from '../../types/knowledgeBaseAnnotations'
import { kbT } from '../medication/kb/kbStrings'

interface KnowledgeBaseNotesProps {
  medicationId: string
  language: string
}

type FontKey = 'sans' | 'serif' | 'mono' | 'handwriting'

const FONT_FAMILIES: Record<FontKey, string> = {
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', 'Iowan Old Style', serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace",
  handwriting: "'Comic Sans MS', 'Comic Sans', 'Bradley Hand', cursive",
}

/**
 * Collapsible, per-user rich-text notes section docked beneath the reading
 * panel (Studienbereich). Hidden behind a slim toggle until opened; once open
 * it fills the remaining vertical space of the right column and scrolls
 * internally. Editing uses a `contentEditable` surface with `document.execCommand`
 * for a minimal word-processing toolbar — no heavy editor dependency.
 */
export function KnowledgeBaseNotes({ medicationId, language }: KnowledgeBaseNotesProps) {
  const { html, setHtml } = useKnowledgeBaseNotes(medicationId)
  const [open, setOpen] = useState(false)
  const [font, setFont] = useState<FontKey>('sans')
  const editorRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  // Tracks which (medication) note is currently loaded into the DOM so we only
  // overwrite innerHTML when the underlying note identity changes — never while
  // the user is actively typing (which would reset the caret).
  const loadedKeyRef = useRef<string | null>(null)

  // Load stored HTML into the editor when it becomes visible or the medication
  // changes. Guarded so typing doesn't trigger a re-sync of the DOM.
  useEffect(() => {
    if (!open) return
    const el = editorRef.current
    if (!el) return
    if (loadedKeyRef.current !== medicationId) {
      el.innerHTML = html
      loadedKeyRef.current = medicationId
    }
  }, [open, medicationId, html])

  // Reset the load guard when the section is closed so reopening restores the
  // latest stored value.
  useEffect(() => {
    if (!open) loadedKeyRef.current = null
  }, [open])

  const persist = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    setHtml(el.innerHTML)
  }, [setHtml])

  const saveEditorSelection = useCallback(() => {
    const el = editorRef.current
    const selection = window.getSelection()
    if (!el || !selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) return
    savedSelectionRef.current = range.cloneRange()
  }, [])

  const restoreEditorSelection = useCallback(() => {
    const el = editorRef.current
    const savedRange = savedSelectionRef.current
    const selection = window.getSelection()
    if (!el || !savedRange || !selection) return false
    el.focus()
    selection.removeAllRanges()
    selection.addRange(savedRange)
    return true
  }, [])

  const exec = useCallback(
    (command: string, value?: string) => {
      const el = editorRef.current
      if (!el) return
      restoreEditorSelection()
      el.focus()
      try {
        document.execCommand(command, false, value)
      } catch {
        // execCommand is deprecated but still widely supported; ignore failures.
      }
      saveEditorSelection()
      persist()
    },
    [persist, restoreEditorSelection, saveEditorSelection],
  )

  const applyFont = useCallback(
    (next: FontKey) => {
      setFont(next)
      const el = editorRef.current
      if (!el) return
      restoreEditorSelection()
      el.focus()
      // Apply to the current selection if any; otherwise set the base family
      // for subsequently typed text via the container style.
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed) {
        try {
          document.execCommand('fontName', false, FONT_FAMILIES[next])
        } catch {
          // ignore
        }
      }
      el.style.fontFamily = FONT_FAMILIES[next]
      saveEditorSelection()
      persist()
    },
    [persist, restoreEditorSelection, saveEditorSelection],
  )

  const applyHighlight = useCallback(
    (color: HighlightColor) => {
      exec('hiliteColor', HIGHLIGHT_COLOR_HEX[color])
    },
    [exec],
  )

  if (!open) {
    return (
      <div className="kbp-notes kbp-notes--closed">
        <button
          type="button"
          className="kbp-notes__toggle"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          title={kbT(language, 'notesOpen')}
        >
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          <span className="kbp-notes__toggle-label">{kbT(language, 'notesTitle')}</span>
          <ChevronDown className="h-3.5 w-3.5 kbp-notes__toggle-chevron" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <section className="kbp-notes kbp-notes--open" aria-label={kbT(language, 'notesTitle')}>
      <div className="kbp-notes__header">
        <div className="kbp-notes__title-wrap">
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          <h3 className="kbp-notes__title">{kbT(language, 'notesTitle')}</h3>
          <span className="kbp-notes__private">{kbT(language, 'notesPrivate')}</span>
        </div>
        <button
          type="button"
          className="kbp-icon-btn kbp-icon-btn--xs"
          onClick={() => {
            persist()
            setOpen(false)
          }}
          aria-label={kbT(language, 'notesClose')}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="kbp-notes__toolbar" role="toolbar" aria-label={kbT(language, 'notesTitle')}>
        <select
          className="kbp-notes__font-select"
          value={font}
          onMouseDown={saveEditorSelection}
          onFocus={saveEditorSelection}
          onChange={(e) => applyFont(e.target.value as FontKey)}
          aria-label={kbT(language, 'notesFont')}
          title={kbT(language, 'notesFont')}
        >
          <option value="sans">{kbT(language, 'notesFontSans')}</option>
          <option value="serif">{kbT(language, 'notesFontSerif')}</option>
          <option value="mono">{kbT(language, 'notesFontMono')}</option>
          <option value="handwriting">{kbT(language, 'notesFontHandwriting')}</option>
        </select>
        <span className="kbp-notes__toolbar-sep" aria-hidden />
        <button
          type="button"
          className="kbp-notes__tool"
          // Prevent the editor from losing its selection when the button is pressed.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('bold')}
          title={kbT(language, 'notesBold')}
          aria-label={kbT(language, 'notesBold')}
        >
          <Bold className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="kbp-notes__tool"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('italic')}
          title={kbT(language, 'notesItalic')}
          aria-label={kbT(language, 'notesItalic')}
        >
          <Italic className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="kbp-notes__tool"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('underline')}
          title={kbT(language, 'notesUnderline')}
          aria-label={kbT(language, 'notesUnderline')}
        >
          <Underline className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="kbp-notes__highlight-group" role="group" aria-label={kbT(language, 'notesHighlight')}>
          <Highlighter className="h-3.5 w-3.5 kbp-notes__highlight-icon" strokeWidth={2} aria-hidden />
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`kbp-notes__swatch kbp-swatch--${color}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyHighlight(color)}
              title={`${kbT(language, 'notesHighlight')}: ${kbT(language, `highlightColor_${color}` as const)}`}
              aria-label={`${kbT(language, 'notesHighlight')}: ${kbT(language, `highlightColor_${color}` as const)}`}
            />
          ))}
        </span>
      </div>

      <div
        ref={editorRef}
        className="kbp-notes__editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={kbT(language, 'notesTitle')}
        data-placeholder={kbT(language, 'notesPlaceholder')}
        style={{ fontFamily: FONT_FAMILIES[font] }}
        onInput={() => {
          saveEditorSelection()
          persist()
        }}
        onMouseUp={saveEditorSelection}
        onKeyUp={saveEditorSelection}
        onBlur={() => {
          saveEditorSelection()
          persist()
        }}
      />
    </section>
  )
}
