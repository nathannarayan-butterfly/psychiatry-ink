import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { DocumentChecklistItem } from '../../types'
import { ChecklistPanel } from '../ChecklistPanel'

interface NotionStructuredPanelProps {
  open: boolean
  sectionLabel?: string
  items: DocumentChecklistItem[]
  selections: Record<string, boolean>
  disabled?: boolean
  showNormalBefund?: boolean
  onToggle: (itemId: string, checked: boolean) => void
  onInsertNormalBefund?: () => void
  onClose: () => void
}

export function NotionStructuredPanel({
  open,
  sectionLabel,
  items,
  selections,
  disabled = false,
  showNormalBefund = false,
  onToggle,
  onInsertNormalBefund,
  onClose,
}: NotionStructuredPanelProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open || items.length === 0) return null

  return (
    <div className="notion-structured-panel" role="dialog" aria-label={t('notionStructuredInput')}>
      <div ref={panelRef} className="notion-structured-panel__card">
        <div className="notion-structured-panel__header">
          <div className="notion-structured-panel__title-wrap">
            <h4 className="notion-structured-panel__title">{t('notionStructuredInput')}</h4>
            {sectionLabel ? (
              <p className="notion-structured-panel__subtitle">{sectionLabel}</p>
            ) : null}
          </div>
          <div className="notion-structured-panel__actions">
            {showNormalBefund && onInsertNormalBefund ? (
              <button
                type="button"
                className="notion-structured-panel__normal-btn"
                disabled={disabled}
                onClick={onInsertNormalBefund}
              >
                {t('insertNormalBefund')}
              </button>
            ) : null}
            <button
              type="button"
              className="notion-structured-panel__close"
              onClick={onClose}
              aria-label={t('settingsClose')}
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
        <ChecklistPanel
          items={items}
          selections={selections}
          disabled={disabled}
          onToggle={onToggle}
        />
      </div>
    </div>
  )
}
