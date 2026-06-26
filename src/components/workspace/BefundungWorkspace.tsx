import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { getBefundSchema } from '../../data/befundSchemas'
import type { BefundType } from '../../types/befund'
import {
  DiagnostikBefundeSidebar,
  useDiagnostikBefunde,
} from '../diagnostik/DiagnostikBefundeSection'
import { BefundInlineForm } from '../diagnostik/BefundInlineForm'
import { EcgBefundCard } from '../diagnostik/EcgBefundCard'
import {
  formatBefundDate,
  renderBefundContent,
} from '../../utils/befundRender'
import { deleteDiagnostikBefund } from '../../utils/befundArchive'
import { removeBefundDokument } from '../../utils/befundDokumente'
import { Pencil, Trash2 } from 'lucide-react'
import type { BefundRecord } from '../../types/befund'
import { CopyButton } from '../common/CopyButton'

interface BefundungWorkspaceProps {
  caseId: string
  disabled?: boolean
  /** Pre-select EKG or EEG entry from the workspace context menu. */
  initialType?: BefundType | null
  onInitialTypeConsumed?: () => void
}

function buildBefundClipboardText(
  record: BefundRecord,
  language: ReturnType<typeof useTranslation>['language'],
): string {
  const text = renderBefundContent(record, language)
  const header = `${getBefundSchema(record.type, language).title} — ${formatBefundDate(record.examDate)}`
  return `${header}\n\n${text}`
}

/** Workspace panel for structured EKG / EEG Befunde entry. */
export function BefundungWorkspace({
  caseId,
  disabled = false,
  initialType = null,
  onInitialTypeConsumed,
}: BefundungWorkspaceProps) {
  const { t, language } = useTranslation()
  const diagnostik = useDiagnostikBefunde(caseId)
  const records = useMemo(
    () => diagnostik.records.filter((r) => r.type === 'ecg' || r.type === 'eeg'),
    [diagnostik.records],
  )

  const [formType, setFormType] = useState<BefundType | null>(null)
  const [editRecordId, setEditRecordId] = useState<string | undefined>()

  useEffect(() => {
    if (!initialType) return
    setFormType(initialType)
    setEditRecordId(undefined)
    onInitialTypeConsumed?.()
  }, [initialType, onInitialTypeConsumed])

  const selected = useMemo(
    () => records.find((r) => r.id === diagnostik.selectedId) ?? null,
    [records, diagnostik.selectedId],
  )

  const openNew = useCallback(
    (type: BefundType) => {
      if (disabled) return
      setEditRecordId(undefined)
      setFormType(type)
    },
    [disabled],
  )

  const openEdit = useCallback(
    (record: BefundRecord) => {
      if (disabled) return
      setEditRecordId(record.id)
      setFormType(record.type)
    },
    [disabled],
  )

  const closeForm = useCallback(() => {
    setFormType(null)
    setEditRecordId(undefined)
  }, [])

  const handleDelete = useCallback(
    (record: BefundRecord) => {
      if (disabled) return
      if (!window.confirm(t('befundDeleteConfirm'))) return
      deleteDiagnostikBefund(caseId, record.id)
      removeBefundDokument(caseId, record.id)
      diagnostik.refresh()
      diagnostik.setSelectedId(null)
      closeForm()
    },
    [caseId, closeForm, disabled, diagnostik, t],
  )

  const handleSaved = useCallback(
    (record: BefundRecord) => {
      diagnostik.refresh()
      diagnostik.setSelectedId(record.id)
      closeForm()
    },
    [closeForm, diagnostik],
  )

  return (
    <div className="befundung-workspace workspace-panel">
      <header className="befundung-workspace__header workspace-panel__header">
        <div className="workspace-panel__title-block">
          <h1 className="workspace-panel__title">{t('workspaceBefundungTitle')}</h1>
        </div>
      </header>

      <div className="befundung-workspace__body workspace-panel__body">
        <aside className="befundung-workspace__sidebar workspace-panel__sidebar">
          <p className="befundung-workspace__sidebar-label">{t('workspaceBefundungTypes')}</p>
          <div className="befundung-workspace__type-row">
            {(['ecg', 'eeg'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className="befundung-workspace__type-btn"
                disabled={disabled}
                onClick={() => openNew(type)}
              >
                + {getBefundSchema(type, language).shortLabel}
              </button>
            ))}
          </div>
          <DiagnostikBefundeSidebar
            caseId={caseId}
            records={records}
            selectedId={diagnostik.selectedId}
            onSelect={diagnostik.setSelectedId}
          />
        </aside>

        <main className="befundung-workspace__main workspace-panel__main">
          {formType ? (
            <div className="befundung-workspace__form workspace-panel__card">
              <div className="workspace-panel__card-head">
                <button
                  type="button"
                  className="workspace-panel__back"
                  onClick={closeForm}
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  {t('workspaceBackToList')}
                </button>
                <h2 className="workspace-panel__card-title">
                  {editRecordId
                    ? t('workspaceBefundungEdit')
                    : getBefundSchema(formType, language).title}
                </h2>
              </div>
              <BefundInlineForm
                caseId={caseId}
                type={formType}
                recordId={editRecordId}
                disabled={disabled}
                onCancel={closeForm}
                onSaved={handleSaved}
              />
            </div>
          ) : selected ? (
            <div className="befundung-workspace__detail workspace-panel__card">
              {selected.type === 'ecg' ? (
                <EcgBefundCard
                  record={selected}
                  readOnly={disabled}
                  onEdit={() => openEdit(selected)}
                  copyText={buildBefundClipboardText(selected, language)}
                  onDelete={() => handleDelete(selected)}
                />
              ) : (
                <>
                  <header className="labor-befund-header">
                    <div className="labor-befund-header__left">
                      <h2 className="labor-befund-header__date">
                        {getBefundSchema(selected.type, language).title} —{' '}
                        {formatBefundDate(selected.examDate)}
                      </h2>
                      <span
                        className={[
                          'befund-status-pill',
                          selected.status === 'vidert'
                            ? 'befund-status-pill--vidert'
                            : 'befund-status-pill--draft',
                        ].join(' ').trim()}
                      >
                        {selected.status === 'vidert'
                          ? t('befundStatusVidert')
                          : t('befundStatusDraft')}
                      </span>
                    </div>
                    <div className="labor-befund-header__actions">
                      <CopyButton
                        text={() => buildBefundClipboardText(selected, language)}
                        label={t('befundCopy')}
                      />
                      {!disabled ? (
                        <>
                          <button
                            type="button"
                            className="icon-action-btn"
                            title={t('befundEdit')}
                            aria-label={t('befundEdit')}
                            onClick={() => openEdit(selected)}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-btn--danger"
                            title={t('befundDelete')}
                            aria-label={t('befundDelete')}
                            onClick={() => handleDelete(selected)}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </header>
                  <pre className="diagnostik-befunde__rendered">{renderBefundContent(selected, language)}</pre>
                </>
              )}
            </div>
          ) : (
            <div className="befundung-workspace__empty workspace-panel__card workspace-panel__empty">
              <p className="workspace-panel__empty-title">{t('workspaceBefundungEmpty')}</p>
              <p className="workspace-panel__empty-hint">{t('workspaceBefundungEmptyHint')}</p>
              <div className="befundung-workspace__type-row befundung-workspace__type-row--center">
                {(['ecg', 'eeg'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="befundung-workspace__type-btn"
                    disabled={disabled}
                    onClick={() => openNew(type)}
                  >
                    + {getBefundSchema(type, language).shortLabel}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
