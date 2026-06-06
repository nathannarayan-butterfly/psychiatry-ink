import { Plus } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

export interface SavedItemSummary {
  id: string
  title: string
  entryCount: number
  updatedAt: string
}

interface SavedItemsPanelProps {
  items: SavedItemSummary[]
  activeId: string | null
  newLabel: string
  openLabel: string
  addDataLabel: string
  emptyLabel: string
  entryCountLabel: string
  lastEditedLabel: string
  onOpen: (id: string) => void
  onAddData: (id: string) => void
  onCreateNew: () => void
}

function formatUpdatedAt(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function SavedItemsPanel({
  items,
  activeId,
  newLabel,
  openLabel,
  addDataLabel,
  emptyLabel,
  entryCountLabel,
  lastEditedLabel,
  onOpen,
  onAddData,
  onCreateNew,
}: SavedItemsPanelProps) {
  const { language } = useTranslation()

  return (
    <section className="saved-items-panel" aria-label={newLabel}>
      <div className="saved-items-panel__header">
        <button type="button" className="saved-items-panel__new" onClick={onCreateNew}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          {newLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="saved-items-panel__empty">{emptyLabel}</p>
      ) : (
        <ul className="saved-items-panel__list">
          {items.map((item) => {
            const isActive = item.id === activeId
            return (
              <li
                key={item.id}
                className={`saved-items-panel__item${isActive ? ' saved-items-panel__item--active' : ''}`}
              >
                <div className="saved-items-panel__item-main">
                  <span className="saved-items-panel__item-title">{item.title}</span>
                  <span className="saved-items-panel__item-meta">
                    {entryCountLabel.replace('{count}', String(item.entryCount))} ·{' '}
                    {lastEditedLabel} {formatUpdatedAt(item.updatedAt, language)}
                  </span>
                </div>
                <div className="saved-items-panel__item-actions">
                  <button type="button" onClick={() => onOpen(item.id)}>
                    {openLabel}
                  </button>
                  <button type="button" onClick={() => onAddData(item.id)}>
                    {addDataLabel}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
