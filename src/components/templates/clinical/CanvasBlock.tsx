import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  PanelLeft,
  PanelRight,
  RectangleHorizontal,
  Trash2,
} from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { BlockAlign, BlockWidth, TemplateBlock } from '../../../types/clinicalTemplate'
import type { ResolvedClinicalData } from '../../../utils/clinicalTemplate/clinicalData'
import { ClinicalDocumentRenderer } from './ClinicalDocumentRenderer'

interface CanvasBlockProps {
  block: TemplateBlock
  data: ResolvedClinicalData
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onPatch: (patch: Partial<TemplateBlock>) => void
}

const MIN_BLOCK_HEIGHT = 48

export function CanvasBlock({ block, data, selected, onSelect, onDelete, onPatch }: CanvasBlockProps) {
  const { t } = useTranslation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const width = block.width ?? 'full'
  const align = block.align ?? 'left'

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    width: width === 'half' ? '50%' : undefined,
    marginLeft: width === 'half' && align === 'right' ? 'auto' : undefined,
  }

  const setWidth = (nextWidth: BlockWidth, nextAlign?: BlockAlign) => {
    const patch: Partial<TemplateBlock> = { width: nextWidth }
    if (nextWidth === 'half' && nextAlign) patch.align = nextAlign
    onPatch(patch)
  }

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const startY = event.clientY
    const startHeight = block.height ?? bodyRef.current?.offsetHeight ?? MIN_BLOCK_HEIGHT
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)

    const onMove = (e: PointerEvent) => {
      const next = Math.max(MIN_BLOCK_HEIGHT, Math.round(startHeight + (e.clientY - startY)))
      onPatch({ height: next })
    }
    const onUp = () => {
      target.releasePointerCapture(event.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const widthBtn = (value: BlockWidth, valueAlign: BlockAlign | undefined, Icon: typeof PanelLeft, label: string) => {
    const active = value === 'full' ? width === 'full' : width === 'half' && align === valueAlign
    return (
      <button
        type="button"
        className={`ct-canvas-block__layout-btn${active ? ' ct-canvas-block__layout-btn--active' : ''}`}
        aria-label={label}
        aria-pressed={active}
        title={label}
        onClick={(e) => {
          e.stopPropagation()
          setWidth(value, valueAlign)
        }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ct-canvas-block${selected ? ' ct-canvas-block--selected' : ''}${width === 'half' ? ' ct-canvas-block--half' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div className="ct-canvas-block__bar">
        <button
          type="button"
          className="ct-canvas-block__grip"
          aria-label={t('vorlageReorderBlock')}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          className="ct-canvas-block__delete"
          aria-label={t('vorlageDeleteBlock')}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className="ct-canvas-block__layout" role="group" aria-label={t('vorlageLayoutWidth')}>
        {widthBtn('full', undefined, RectangleHorizontal, t('vorlageWidthFull'))}
        {widthBtn('half', 'left', PanelLeft, t('vorlageWidthLeft'))}
        {widthBtn('half', 'right', PanelRight, t('vorlageWidthRight'))}
      </div>

      <div ref={bodyRef} className="ct-canvas-block__body">
        <ClinicalDocumentRenderer blocks={[block]} data={data} />
      </div>

      <div
        className="ct-canvas-block__resize"
        role="separator"
        aria-label={t('vorlageResizeHeight')}
        title={t('vorlageResizeHeight')}
        onPointerDown={startResize}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="ct-canvas-block__resize-grip" aria-hidden />
      </div>
    </div>
  )
}
