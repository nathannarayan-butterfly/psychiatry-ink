import { useDraggable } from '@dnd-kit/core'
import { GripVertical, Plus } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  PALETTE_GROUPS,
  PALETTE_ITEMS,
  type PaletteItem,
} from '../../../utils/clinicalTemplate/blockCatalog'

interface BlockPaletteProps {
  onAdd: (paletteId: string) => void
}

export function BlockPalette({ onAdd }: BlockPaletteProps) {
  const { t } = useTranslation()
  return (
    <aside className="ct-palette" aria-label={t('vorlagePaletteTitle')}>
      <div className="ct-palette__head">{t('vorlagePaletteTitle')}</div>
      <div className="ct-palette__scroll">
        {PALETTE_GROUPS.map((group) => (
          <div key={group.id} className="ct-palette__group">
            <div className="ct-palette__group-title">{t(group.labelKey)}</div>
            {PALETTE_ITEMS.filter((item) => item.group === group.id).map((item) => (
              <PaletteCard key={item.id} item={item} onAdd={onAdd} />
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}

function PaletteCard({ item, onAdd }: { item: PaletteItem; onAdd: (id: string) => void }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${item.id}`,
    data: { paletteId: item.id },
  })
  return (
    <div className={`ct-palette__card${isDragging ? ' ct-palette__card--dragging' : ''}`}>
      <button
        type="button"
        ref={setNodeRef}
        className="ct-palette__grip"
        aria-label={`${t(item.labelKey)} — ${t('vorlageDragToAdd')}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      <button type="button" className="ct-palette__card-body" onClick={() => onAdd(item.id)}>
        <span className="ct-palette__card-label">{t(item.labelKey)}</span>
        <span className="ct-palette__card-desc">{t(item.descKey)}</span>
        {item.binding ? <span className="ct-palette__binding">{item.binding}</span> : null}
      </button>
      <button
        type="button"
        className="ct-palette__add"
        aria-label={`${t('vorlageAddBlock')}: ${t(item.labelKey)}`}
        onClick={() => onAdd(item.id)}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
