import { GripVertical } from 'lucide-react'
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { TemplateField } from '../../types/documentTemplate'
import {
  fieldGridStyle,
  fieldSupportsHeightResize,
  patchFieldLayout,
  resolveFieldColSpan,
  resolveFieldMinHeightMm,
  snapColSpan,
  TEMPLATE_GRID_COLUMNS,
} from '../../utils/documentTemplate/fieldLayout'
import { TemplateFieldPreview } from './templateFieldUtils'

interface TemplateCanvasProps {
  fields: TemplateField[]
  lang: 'de' | 'en'
  selectedFieldId: string | null
  onSelectField: (fieldId: string | null) => void
  onMoveField: (fromIndex: number, toIndex: number) => void
  onPatchField: (fieldId: string, patch: Partial<TemplateField>) => void
  onOpenInsertMenu: (event: React.MouseEvent, insertAt: number) => void
}

interface CanvasBlockProps {
  field: TemplateField
  index: number
  lang: 'de' | 'en'
  selected: boolean
  isDragging: boolean
  isDropTarget: boolean
  gridRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onPatch: (patch: Partial<TemplateField>) => void
  onDragStart: (index: number, event: DragEvent<HTMLElement>) => void
  onDragOver: (index: number, event: DragEvent<HTMLElement>) => void
  onDrop: (index: number, event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onOpenInsertMenu: (event: React.MouseEvent, insertAt: number) => void
}

function CanvasBlock({
  field,
  index,
  lang,
  selected,
  isDragging,
  isDropTarget,
  gridRef,
  onSelect,
  onPatch,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onOpenInsertMenu,
}: CanvasBlockProps) {
  const { t } = useTranslation()
  const blockRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<{ axis: 'x' | 'y'; start: number; startSpan: number; startHeight: number } | null>(
    null,
  )

  const handleWidthResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      event.preventDefault()
      const grid = gridRef.current
      if (!grid) return

      resizeRef.current = {
        axis: 'x',
        start: event.clientX,
        startSpan: resolveFieldColSpan(field),
        startHeight: resolveFieldMinHeightMm(field) ?? 0,
      }

      const onMove = (ev: PointerEvent) => {
        const state = resizeRef.current
        const gridEl = gridRef.current
        if (!state || !gridEl || state.axis !== 'x') return
        const colWidth = gridEl.clientWidth / TEMPLATE_GRID_COLUMNS
        const deltaCols = (ev.clientX - state.start) / colWidth
        const nextSpan = snapColSpan(state.startSpan + deltaCols)
        if (nextSpan !== resolveFieldColSpan(field)) {
          onPatch({ layout: patchFieldLayout(field, { colSpan: nextSpan }) })
        }
      }

      const onUp = () => {
        resizeRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [field, gridRef, onPatch],
  )

  const handleHeightResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      event.preventDefault()
      if (!fieldSupportsHeightResize(field)) return

      const startHeight = resolveFieldMinHeightMm(field) ?? (field.type === 'spacer' ? 4 : 12)
      resizeRef.current = {
        axis: 'y',
        start: event.clientY,
        startSpan: resolveFieldColSpan(field),
        startHeight,
      }

      const onMove = (ev: PointerEvent) => {
        const state = resizeRef.current
        if (!state || state.axis !== 'y') return
        const pxPerMm = 3.78
        const deltaMm = (ev.clientY - state.start) / pxPerMm
        const nextHeight = Math.max(4, Math.min(80, Math.round(state.startHeight + deltaMm)))
        if (field.type === 'spacer') {
          if (String(nextHeight) !== String(field.defaultValue ?? '')) {
            onPatch({ defaultValue: String(nextHeight) })
          }
        } else if (nextHeight !== field.layout?.minHeightMm) {
          onPatch({ layout: patchFieldLayout(field, { minHeightMm: nextHeight }) })
        }
      }

      const onUp = () => {
        resizeRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [field, onPatch],
  )

  const style: CSSProperties = fieldGridStyle(field)
  const canResizeWidth = field.type !== 'divider' && field.type !== 'spacer' && field.type !== 'heading'
  const canResizeHeight = fieldSupportsHeightResize(field)

  return (
    <div
      ref={blockRef}
      className={[
        'dt-canvas-grid__item',
        selected ? 'dt-canvas-grid__item--selected' : '',
        isDragging ? 'dt-canvas-grid__item--dragging' : '',
        isDropTarget ? 'dt-canvas-grid__item--drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpenInsertMenu(event, index)
      }}
      onDragOver={(event) => onDragOver(index, event)}
      onDrop={(event) => onDrop(index, event)}
      onDragEnd={onDragEnd}
    >
      {isDropTarget ? <div className="dt-canvas-grid__drop-line" aria-hidden /> : null}
      <div className="dt-canvas-grid__chrome">
        <button
          type="button"
          className="dt-canvas-grid__grip"
          draggable
          onDragStart={(event) => onDragStart(index, event)}
          onClick={(event) => event.stopPropagation()}
          aria-label={t('templateDragHandle')}
          title={t('templateDragHandle')}
        >
          <GripVertical className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
        <div className="dt-canvas-grid__preview">
          <TemplateFieldPreview field={field} lang={lang} selected={selected} onSelect={onSelect} />
        </div>
        {selected && canResizeWidth ? (
          <button
            type="button"
            className="dt-canvas-grid__resize dt-canvas-grid__resize--e"
            onPointerDown={handleWidthResizeStart}
            aria-label={t('templateResizeWidth')}
            title={t('templateResizeWidth')}
          />
        ) : null}
        {selected && canResizeHeight ? (
          <button
            type="button"
            className="dt-canvas-grid__resize dt-canvas-grid__resize--s"
            onPointerDown={handleHeightResizeStart}
            aria-label={t('templateResizeHeight')}
            title={t('templateResizeHeight')}
          />
        ) : null}
      </div>
    </div>
  )
}

export function TemplateCanvas({
  fields,
  lang,
  selectedFieldId,
  onSelectField,
  onMoveField,
  onPatchField,
  onOpenInsertMenu,
}: TemplateCanvasProps) {
  const { t } = useTranslation()
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((index: number, event: DragEvent<HTMLElement>) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((index: number, event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }, [])

  const handleDrop = useCallback(
    (index: number, event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const fromRaw = event.dataTransfer.getData('text/plain')
      const fromIndex = dragIndex ?? Number.parseInt(fromRaw, 10)
      if (!Number.isNaN(fromIndex) && fromIndex !== index) {
        const toIndex = fromIndex < index ? index - 1 : index
        onMoveField(fromIndex, toIndex)
      }
      setDragIndex(null)
      setDropIndex(null)
    },
    [dragIndex, onMoveField],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  const handleGridDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (fields.length === 0) return
    setDropIndex(fields.length)
  }, [fields.length])

  const handleGridDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      const fromRaw = event.dataTransfer.getData('text/plain')
      const fromIndex = dragIndex ?? Number.parseInt(fromRaw, 10)
      if (!Number.isNaN(fromIndex) && fromIndex !== fields.length - 1) {
        onMoveField(fromIndex, fields.length - 1)
      }
      setDragIndex(null)
      setDropIndex(null)
    },
    [dragIndex, fields.length, onMoveField],
  )

  if (fields.length === 0) {
    return (
      <button
        type="button"
        className="dt-canvas-empty"
        onContextMenu={(event) => onOpenInsertMenu(event, 0)}
        onClick={(event) => onOpenInsertMenu(event, 0)}
      >
        {t('templateCanvasEmpty')}
      </button>
    )
  }

  return (
    <div className="dt-canvas-grid-wrap">
      <div
        ref={gridRef}
        className={`dt-canvas-grid${dragIndex != null ? ' dt-canvas-grid--dragging' : ''}`}
        onClick={() => onSelectField(null)}
        onDragOver={handleGridDragOver}
        onDrop={handleGridDrop}
      >
        {fields.map((field, index) => (
          <CanvasBlock
            key={field.id}
            field={field}
            index={index}
            lang={lang}
            selected={selectedFieldId === field.id}
            isDragging={dragIndex === index}
            isDropTarget={dropIndex === index && dragIndex !== index}
            gridRef={gridRef}
            onSelect={() => onSelectField(field.id)}
            onPatch={(patch) => onPatchField(field.id, patch)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onOpenInsertMenu={onOpenInsertMenu}
          />
        ))}
      </div>

      <button
        type="button"
        className="dt-canvas-insert dt-canvas-insert--end"
        aria-label={t('templateAddFieldHere')}
        onContextMenu={(event) => onOpenInsertMenu(event, fields.length)}
        onClick={(event) => onOpenInsertMenu(event, fields.length)}
      >
        + {t('templateAddField')}
      </button>

      {dropIndex === fields.length && dragIndex != null ? (
        <div className="dt-canvas-grid__drop-line dt-canvas-grid__drop-line--end" aria-hidden />
      ) : null}
    </div>
  )
}
