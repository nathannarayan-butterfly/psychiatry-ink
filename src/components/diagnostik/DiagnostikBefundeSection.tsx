import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clipboard, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useDemoPatient } from '../../hooks/useDemoPatient'
import { BEFUND_TYPES, getBefundSchema } from '../../data/befundSchemas'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { BefundRecord, BefundType } from '../../types/befund'
import {
  BEFUND_ARCHIVE_CHANGED_EVENT,
  deleteDiagnostikBefund,
  loadDiagnostikBefunde,
} from '../../utils/befundArchive'
import { removeBefundDokument } from '../../utils/befundDokumente'
import {
  formatBefundDate,
  getBefundTypeLabel,
  renderBefundContent,
} from '../../utils/befundRender'
import { BefundPopup } from './BefundPopup'
import { EcgBefundCard } from './EcgBefundCard'

export interface DiagnostikBefundeSidebarProps {
  caseId: string
  records: BefundRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DiagnostikBefundeSidebar({
  records,
  selectedId,
  onSelect,
}: DiagnostikBefundeSidebarProps) {
  const { t } = useTranslation()

  if (records.length === 0) {
    return <p className="labor-page__sidebar-empty">{t('befundSidebarEmpty')}</p>
  }

  return (
    <ul className="labor-page__befund-list" role="listbox" aria-label={t('diagnosticsSectionBefunde')}>
      {records.map((record) => (
        <li key={record.id}>
          <button
            type="button"
            role="option"
            aria-selected={record.id === selectedId}
            className={[
              'labor-page__befund-item',
              record.id === selectedId ? 'labor-page__befund-item--active' : '',
            ].join(' ').trim()}
            onClick={() => onSelect(record.id)}
          >
            <span className="labor-page__befund-date">{formatBefundDate(record.examDate)}</span>
            <span className="labor-page__befund-label">
              {getBefundTypeLabel(record.type)}
              {record.status === 'draft' ? (
                <span className="befund-status-badge befund-status-badge--draft"> {t('befundStatusDraft')}</span>
              ) : (
                <span className="befund-status-badge befund-status-badge--vidert"> {t('befundStatusVidert')}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

const BEFUND_ADD_LABEL_KEY: Record<BefundType, UiTranslationKey> = {
  ecg: 'befundAddEcg',
  eeg: 'befundAddEeg',
}

interface DiagnostikBefundeMainProps {
  caseId: string
  records: BefundRecord[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onRecordsChange: () => void
}

function copyBefundToClipboard(record: BefundRecord): void {
  const text = renderBefundContent(record)
  const header = `${getBefundSchema(record.type).title} — ${formatBefundDate(record.examDate)}`
  const payload = `${header}\n\n${text}`
  navigator.clipboard.writeText(payload).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = payload
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
}

export function DiagnostikBefundeMain({
  caseId,
  records,
  selectedId,
  onSelect,
  onRecordsChange,
}: DiagnostikBefundeMainProps) {
  const { t } = useTranslation()
  const { readOnly } = useDemoPatient(caseId)
  const [popupType, setPopupType] = useState<BefundType | null>(null)
  const [editRecordId, setEditRecordId] = useState<string | undefined>()

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId],
  )

  const openNew = useCallback((type: BefundType) => {
    if (readOnly) return
    setEditRecordId(undefined)
    setPopupType(type)
  }, [readOnly])

  const openEdit = useCallback((record: BefundRecord) => {
    if (readOnly) return
    setEditRecordId(record.id)
    setPopupType(record.type)
  }, [readOnly])

  const handleDelete = useCallback((record: BefundRecord) => {
    if (readOnly) return
    if (!window.confirm(t('befundDeleteConfirm'))) return
    deleteDiagnostikBefund(caseId, record.id)
    removeBefundDokument(caseId, record.id)
    onRecordsChange()
    onSelect(null)
  }, [caseId, onRecordsChange, onSelect, readOnly, t])

  const handleCopy = useCallback((record: BefundRecord) => {
    copyBefundToClipboard(record)
  }, [])

  return (
    <>
      <div className="labor-page__content diagnostik-befunde__main">
        <div className="diagnostik-befunde__actions">
          <span className="diagnostik-befunde__actions-label">{t('befundActionLabel')}</span>
          <div className="diagnostik-befunde__action-row">
            {BEFUND_TYPES.map((type) => {
              const addLabel = t(BEFUND_ADD_LABEL_KEY[type])
              return (
                <button
                  key={type}
                  type="button"
                  className="diagnostik-befunde__action-btn diagnostik-befunde__action-btn--add"
                  disabled={readOnly}
                  onClick={() => openNew(type)}
                  title={addLabel}
                  aria-label={addLabel}
                >
                  <span aria-hidden="true">+ {getBefundSchema(type).shortLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {selected ? (
          <div className="diagnostik-befunde__detail">
            {selected.type === 'ecg' ? (
              <EcgBefundCard
                record={selected}
                readOnly={readOnly}
                onEdit={() => openEdit(selected)}
                onCopy={() => handleCopy(selected)}
                onDelete={() => handleDelete(selected)}
              />
            ) : (
              <>
                <header className="labor-befund-header">
                  <div className="labor-befund-header__left">
                    <h2 className="labor-befund-header__date">
                      {getBefundSchema(selected.type).title} — {formatBefundDate(selected.examDate)}
                    </h2>
                    <span
                      className={[
                        'befund-status-pill',
                        selected.status === 'vidert' ? 'befund-status-pill--vidert' : 'befund-status-pill--draft',
                      ].join(' ').trim()}
                    >
                      {selected.status === 'vidert' ? t('befundStatusVidert') : t('befundStatusDraft')}
                    </span>
                  </div>
                  <div className="labor-befund-header__actions">
                    <button
                      type="button"
                      className="icon-action-btn"
                      title={t('befundCopy')}
                      aria-label={t('befundCopy')}
                      onClick={() => handleCopy(selected)}
                    >
                      <Clipboard strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn"
                      title={t('befundEdit')}
                      aria-label={t('befundEdit')}
                      disabled={readOnly}
                      onClick={() => openEdit(selected)}
                    >
                      <Pencil strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn icon-action-btn--danger"
                      title={t('befundDelete')}
                      aria-label={t('befundDelete')}
                      disabled={readOnly}
                      onClick={() => handleDelete(selected)}
                    >
                      <Trash2 strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </header>
                <pre className="diagnostik-befunde__content">{renderBefundContent(selected)}</pre>
              </>
            )}
          </div>
        ) : (
          <div className="diagnostik-befunde__empty">
            <p className="labor-page__empty-text">{t('befundEmptySelect')}</p>
          </div>
        )}
      </div>

      {popupType && !readOnly && (
        <BefundPopup
          caseId={caseId}
          type={popupType}
          recordId={editRecordId}
          onClose={() => setPopupType(null)}
          onSaved={(record) => {
            onRecordsChange()
            onSelect(record.id)
          }}
        />
      )}
    </>
  )
}

export function useDiagnostikBefunde(caseId: string) {
  const [records, setRecords] = useState<BefundRecord[]>(() =>
    [...loadDiagnostikBefunde(caseId)].sort((a, b) => b.examDate.localeCompare(a.examDate)),
  )
  const [selectedId, setSelectedId] = useState<string | null>(() => records[0]?.id ?? null)

  const refresh = useCallback(() => {
    const next = [...loadDiagnostikBefunde(caseId)].sort((a, b) =>
      b.examDate.localeCompare(a.examDate),
    )
    setRecords(next)
    setSelectedId((current) => {
      if (current && next.some((r) => r.id === current)) return current
      return next[0]?.id ?? null
    })
  }, [caseId])

  useEffect(() => {
    refresh()
  }, [caseId, refresh])

  useEffect(() => {
    function handleChange(e: Event) {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === caseId) refresh()
    }
    window.addEventListener(BEFUND_ARCHIVE_CHANGED_EVENT, handleChange)
    return () => window.removeEventListener(BEFUND_ARCHIVE_CHANGED_EVENT, handleChange)
  }, [caseId, refresh])

  return { records, selectedId, setSelectedId, refresh }
}
