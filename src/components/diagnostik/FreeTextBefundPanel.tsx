import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { FreeTextBefundModality, FreeTextBefundRecord } from '../../types/freeTextBefund'
import { freeTextBefundTitle } from '../../types/freeTextBefund'
import {
  FREE_TEXT_BEFUND_CHANGED_EVENT,
  createFreeTextBefundRecord,
  deleteFreeTextBefund,
  loadFreeTextBefundeByModality,
  upsertFreeTextBefund,
} from '../../utils/freeTextBefundArchive'
import {
  removeFreeTextBefundDokument,
  syncFreeTextBefundDokument,
} from '../../utils/freeTextBefundDokumente'
import { formatBefundDate } from '../../utils/befundRender'
import { showNotionToast } from '../notion/NotionToast'
import { CopyButton } from '../common/CopyButton'
import type { AnforderungModalPreset } from '../../types/anforderung'

interface FreeTextBefundPanelProps {
  caseId: string
  modality: FreeTextBefundModality
  /** Section/card title shown in the header. */
  title: string
  /** When provided, renders an "Anfordern" button using this preset. */
  requestPreset?: AnforderungModalPreset
  requestLabel?: string
  onRequestAnforderung?: (preset?: AnforderungModalPreset | null) => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function buildClipboardText(record: FreeTextBefundRecord, language: string): string {
  const header = `${freeTextBefundTitle(record.modality, language as never)} — ${formatBefundDate(record.examDate)}`
  return `${header}\n\n${record.text}`
}

export function FreeTextBefundPanel({
  caseId,
  modality,
  title,
  requestPreset,
  requestLabel,
  onRequestAnforderung,
}: FreeTextBefundPanelProps) {
  const { t, language } = useTranslation()

  const [records, setRecords] = useState<FreeTextBefundRecord[]>(() =>
    loadFreeTextBefundeByModality(caseId, modality),
  )
  const [draftText, setDraftText] = useState('')
  const [draftDate, setDraftDate] = useState<string>(() => todayIso())
  const [editingId, setEditingId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setRecords(loadFreeTextBefundeByModality(caseId, modality))
  }, [caseId, modality])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    function handleChange(e: Event) {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === caseId) refresh()
    }
    window.addEventListener(FREE_TEXT_BEFUND_CHANGED_EVENT, handleChange)
    return () => window.removeEventListener(FREE_TEXT_BEFUND_CHANGED_EVENT, handleChange)
  }, [caseId, refresh])

  const resetEditor = useCallback(() => {
    setDraftText('')
    setDraftDate(todayIso())
    setEditingId(null)
  }, [])

  const persist = useCallback(
    (status: FreeTextBefundRecord['status']) => {
      const text = draftText.trim()
      if (!text) return
      const now = new Date().toISOString()

      let record: FreeTextBefundRecord
      if (editingId) {
        const existing = records.find((r) => r.id === editingId)
        if (!existing) return
        record = {
          ...existing,
          text,
          examDate: draftDate,
          status,
          updatedAt: now,
          vidertAt: status === 'vidert' ? now : existing.vidertAt,
        }
      } else {
        record = createFreeTextBefundRecord(caseId, modality, text, status, draftDate)
      }

      upsertFreeTextBefund(caseId, record)
      syncFreeTextBefundDokument(record, language)
      showNotionToast(status === 'vidert' ? t('befundSavedVidert') : t('befundSavedDraft'))
      resetEditor()
      refresh()
    },
    [caseId, draftDate, draftText, editingId, language, modality, records, refresh, resetEditor, t],
  )

  const handleEdit = useCallback((record: FreeTextBefundRecord) => {
    setEditingId(record.id)
    setDraftText(record.text)
    setDraftDate(record.examDate)
  }, [])

  const handleDelete = useCallback(
    (record: FreeTextBefundRecord) => {
      if (!window.confirm(t('befundDeleteConfirm'))) return
      deleteFreeTextBefund(caseId, record.id)
      removeFreeTextBefundDokument(caseId, record.id)
      if (editingId === record.id) resetEditor()
      refresh()
    },
    [caseId, editingId, refresh, resetEditor, t],
  )

  const canSave = draftText.trim().length > 0

  return (
    <section className="freetext-befund" aria-label={title}>
      <header className="freetext-befund__header">
        <h3 className="freetext-befund__title">{title}</h3>
        {onRequestAnforderung && requestPreset ? (
          <button
            type="button"
            className="diagnostik-befunde__action-btn diagnostik-befunde__action-btn--request"
            onClick={() => onRequestAnforderung(requestPreset)}
            title={requestLabel}
          >
            {requestLabel}
          </button>
        ) : null}
      </header>

      <div className="freetext-befund__editor">
        <div className="freetext-befund__editor-head">
          <span className="freetext-befund__editor-label">{t('freeTextBefundNewHeading')}</span>
          <label className="freetext-befund__date">
            <span className="freetext-befund__date-label">{t('freeTextBefundDateLabel')}</span>
            <input
              type="date"
              className="freetext-befund__date-input"
              value={draftDate}
              max={todayIso()}
              onChange={(e) => setDraftDate(e.target.value)}
            />
          </label>
        </div>
        <textarea
          className="freetext-befund__textarea"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder={t('freeTextBefundPlaceholder')}
          rows={6}
        />
        <div className="freetext-befund__editor-actions">
          {editingId ? (
            <button
              type="button"
              className="befund-popup__btn befund-popup__btn--ghost"
              onClick={resetEditor}
            >
              {t('freeTextBefundEditCancel')}
            </button>
          ) : null}
          <button
            type="button"
            className="befund-popup__btn befund-popup__btn--secondary"
            onClick={() => persist('draft')}
            disabled={!canSave}
          >
            {t('befundSaveDraft')}
          </button>
          <button
            type="button"
            className="befund-popup__btn befund-popup__btn--primary"
            onClick={() => persist('vidert')}
            disabled={!canSave}
          >
            {t('befundVidieren')}
          </button>
        </div>
      </div>

      <div className="freetext-befund__list">
        <span className="freetext-befund__list-label">{t('freeTextBefundSavedDocuments')}</span>
        {records.length === 0 ? (
          <p className="freetext-befund__empty">{t('freeTextBefundEmpty')}</p>
        ) : (
          records.map((record) => (
            <article
              key={record.id}
              className={[
                'freetext-befund__card',
                editingId === record.id ? 'freetext-befund__card--editing' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <header className="freetext-befund__card-head">
                <div className="freetext-befund__card-meta">
                  <span className="freetext-befund__card-date">
                    {formatBefundDate(record.examDate)}
                  </span>
                  <span
                    className={[
                      'befund-status-pill',
                      record.status === 'vidert'
                        ? 'befund-status-pill--vidert'
                        : 'befund-status-pill--draft',
                    ].join(' ')}
                  >
                    {record.status === 'vidert' ? t('befundStatusVidert') : t('befundStatusDraft')}
                  </span>
                </div>
                <div className="freetext-befund__card-actions">
                  <CopyButton
                    text={() => buildClipboardText(record, language)}
                    label={t('befundCopy')}
                  />
                  <button
                    type="button"
                    className="icon-action-btn"
                    title={t('befundEdit')}
                    aria-label={t('befundEdit')}
                    onClick={() => handleEdit(record)}
                  >
                    <Pencil strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn icon-action-btn--danger"
                    title={t('befundDelete')}
                    aria-label={t('befundDelete')}
                    onClick={() => handleDelete(record)}
                  >
                    <Trash2 strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              </header>
              <pre className="freetext-befund__card-text">{record.text}</pre>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
