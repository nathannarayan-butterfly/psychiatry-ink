import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTranslation } from '../../../context/TranslationContext'
import type { DocumentBand as DocumentBandModel, TemplateBlock } from '../../../types/clinicalTemplate'
import type { ResolvedClinicalData } from '../../../utils/clinicalTemplate/clinicalData'
import { CanvasBlock } from './CanvasBlock'
import { DocumentBand } from './DocumentBand'

export const CANVAS_END_DROPPABLE = '__canvas_end__'

export type BandSelection = 'header' | 'footer' | null

interface BuilderCanvasProps {
  blocks: TemplateBlock[]
  data: ResolvedClinicalData
  selectedBlockId: string | null
  onSelect: (id: string | null) => void
  onDelete: (id: string) => void
  onPatchBlock: (id: string, patch: Partial<TemplateBlock>) => void
  header: DocumentBandModel | undefined
  footer: DocumentBandModel | undefined
  selectedBand: BandSelection
  onSelectBand: (band: BandSelection) => void
}

export function BuilderCanvas({
  blocks,
  data,
  selectedBlockId,
  onSelect,
  onDelete,
  onPatchBlock,
  header,
  footer,
  selectedBand,
  onSelectBand,
}: BuilderCanvasProps) {
  const { t } = useTranslation()
  const { setNodeRef: setEndRef, isOver: isOverEnd } = useDroppable({ id: CANVAS_END_DROPPABLE })

  return (
    <div
      className="ct-canvas"
      onClick={() => {
        onSelect(null)
        onSelectBand(null)
      }}
    >
      <div className="ct-canvas__page">
        <DocumentBand
          position="header"
          band={header}
          data={data}
          mode="edit"
          selected={selectedBand === 'header'}
          onSelect={() => {
            onSelect(null)
            onSelectBand('header')
          }}
        />

        <div className="ct-canvas__body">
          {blocks.length === 0 ? (
            <div ref={setEndRef} className={`ct-canvas__empty${isOverEnd ? ' ct-canvas__empty--over' : ''}`}>
              {t('vorlageCanvasEmpty')}
            </div>
          ) : (
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((block) => (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  data={data}
                  selected={selectedBlockId === block.id}
                  onSelect={() => {
                    onSelectBand(null)
                    onSelect(block.id)
                  }}
                  onDelete={() => onDelete(block.id)}
                  onPatch={(patch) => onPatchBlock(block.id, patch)}
                />
              ))}
              <div
                ref={setEndRef}
                className={`ct-canvas__drop-end${isOverEnd ? ' ct-canvas__drop-end--over' : ''}`}
                aria-hidden
              />
            </SortableContext>
          )}
        </div>

        <DocumentBand
          position="footer"
          band={footer}
          data={data}
          mode="edit"
          selected={selectedBand === 'footer'}
          onSelect={() => {
            onSelect(null)
            onSelectBand('footer')
          }}
        />
      </div>
    </div>
  )
}
