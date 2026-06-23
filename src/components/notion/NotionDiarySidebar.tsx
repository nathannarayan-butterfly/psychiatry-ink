import { X } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { usePanelGraphicSchedule } from '../../hooks/usePanelGraphicSchedule'
import { PanelGraphic } from '../PanelGraphic'
import { PsychopathModeRail } from '../workspace/PsychopathModeRail'
import { LaborSidebarWidget } from './LaborSidebarWidget'
import type { SavedDoc } from '../../utils/savedDocs'
import type { PsychopathSubMode } from '../../utils/psychopathMode'
import { formatClinicalDate } from '../../utils/clinicalDate'

interface NotionDiarySidebarProps {
  panelGraphicEnabled: boolean
  onClosePanelGraphic: () => void
  collapsed?: boolean
  caseId?: string
  onNavigateToLabor?: () => void
  savedDocs?: SavedDoc[]
  onViewSavedDoc?: (doc: SavedDoc) => void
  onRemoveSavedDoc?: (id: string) => void
  /** Label of the currently-open workspace document, if any. */
  openDocumentLabel?: string
  /** Close the currently-open workspace document (guarded by unsaved-changes warning). */
  onCloseDocument?: () => void
  showPsychopathModeRail?: boolean
  psychopathActiveMode?: PsychopathSubMode
  psychopathModeDisabled?: boolean
  onPsychopathModeSelect?: (mode: PsychopathSubMode) => void
}

function formatShortDate(iso: string): string {
  return formatClinicalDate(iso) || iso.slice(0, 10)
}

export function NotionDiarySidebar({
  panelGraphicEnabled,
  onClosePanelGraphic,
  collapsed = false,
  caseId,
  onNavigateToLabor,
  savedDocs,
  onViewSavedDoc,
  onRemoveSavedDoc,
  openDocumentLabel,
  onCloseDocument,
  showPsychopathModeRail = false,
  psychopathActiveMode = 'free',
  psychopathModeDisabled = false,
  onPsychopathModeSelect,
}: NotionDiarySidebarProps) {
  const { t } = useTranslation()
  const { visible: graphicVisible, dismiss: dismissGraphic } = usePanelGraphicSchedule({
    enabled: panelGraphicEnabled,
  })
  const showPanelGraphic = graphicVisible

  const handleClosePanelGraphic = useCallback(() => {
    dismissGraphic()
    onClosePanelGraphic()
  }, [dismissGraphic, onClosePanelGraphic])

  const hasSavedDocs = savedDocs && savedDocs.length > 0

  return (
    <aside
      className={`notion-diary-sidebar${collapsed ? ' notion-diary-sidebar--collapsed' : ''}`}
      aria-label={t('notionMetadata')}
    >
      {collapsed ? null : (
        <>
          {showPsychopathModeRail && onPsychopathModeSelect ? (
            <PsychopathModeRail
              activeMode={psychopathActiveMode}
              disabled={psychopathModeDisabled}
              collapsed={collapsed}
              onSelect={onPsychopathModeSelect}
            />
          ) : null}

          {caseId && (
            <LaborSidebarWidget caseId={caseId} onNavigateToLabor={onNavigateToLabor} />
          )}

          {onCloseDocument && openDocumentLabel ? (
            <div className="notion-diary-sidebar__open-doc">
              <p className="notion-diary-sidebar__saved-docs-heading">
                {t('workspaceOpenDocumentHeading')}
              </p>
              <div className="notion-diary-sidebar__open-doc-row">
                <span
                  className="notion-diary-sidebar__open-doc-label"
                  title={openDocumentLabel}
                >
                  {openDocumentLabel}
                </span>
                <button
                  type="button"
                  className="notion-diary-sidebar__open-doc-close"
                  onClick={onCloseDocument}
                  title={t('workspaceCloseDocument')}
                  aria-label={t('workspaceCloseDocument')}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {hasSavedDocs && (
            <div className="notion-diary-sidebar__saved-docs">
              <p className="notion-diary-sidebar__saved-docs-heading">{t('savedDocsHeading')}</p>
              <ul className="notion-diary-sidebar__saved-docs-list">
                {savedDocs.map((doc) => (
                  <li key={doc.id} className="notion-diary-sidebar__saved-doc-row">
                    <button
                      type="button"
                      className="notion-diary-sidebar__saved-doc-item"
                      onClick={() => onViewSavedDoc?.(doc)}
                      title={doc.typeLabel}
                    >
                      <span className="notion-diary-sidebar__saved-doc-label">
                        {doc.typeLabel}
                      </span>
                      <span className="notion-diary-sidebar__saved-doc-date">
                        {formatShortDate(doc.date)}
                      </span>
                    </button>
                    {onRemoveSavedDoc && (
                      <button
                        type="button"
                        className="notion-diary-sidebar__saved-doc-remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveSavedDoc(doc.id)
                        }}
                        title={t('savedDocsRemove')}
                        aria-label={t('savedDocsRemove')}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showPanelGraphic ? (
            <div className="notion-diary-sidebar__graphic">
              <PanelGraphic onClose={handleClosePanelGraphic} />
            </div>
          ) : null}
        </>
      )}
    </aside>
  )
}
