import { Bold, Italic, List, ListOrdered } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'

interface SimpleRichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  readOnly?: boolean
  /** Enable drag-to-resize (Langtext fields only). */
  resizable?: boolean
}

export function SimpleRichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = '4rem',
  readOnly = false,
  resizable = false,
}: SimpleRichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    const sanitized = sanitizeRichHtml(value)
    if (el.innerHTML !== sanitized) el.innerHTML = sanitized
  }, [value])

  const exec = useCallback((command: string) => {
    document.execCommand(command, false)
    const el = ref.current
    if (el) onChange(sanitizeRichHtml(el.innerHTML))
  }, [onChange])

  const handleInput = useCallback(() => {
    const el = ref.current
    if (!el) return
    onChange(sanitizeRichHtml(el.innerHTML))
  }, [onChange])

  return (
    <div
      className={[
        'dt-rte',
        readOnly ? 'dt-rte--readonly' : '',
        resizable ? 'dt-rte--resizable' : '',
      ].filter(Boolean).join(' ')}
    >
      {!readOnly ? (
        <div className="dt-rte__toolbar" role="toolbar" aria-label="Text formatting">
          <button type="button" className="dt-rte__btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} title="Fett">
            <Bold className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button type="button" className="dt-rte__btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} title="Kursiv">
            <Italic className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button type="button" className="dt-rte__btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Liste">
            <List className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button type="button" className="dt-rte__btn" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')} title="Nummerierte Liste">
            <ListOrdered className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : null}
      <div
        ref={ref}
        className="dt-rte__editor"
        contentEditable={!readOnly}
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={handleInput}
        suppressContentEditableWarning
      />
    </div>
  )
}
