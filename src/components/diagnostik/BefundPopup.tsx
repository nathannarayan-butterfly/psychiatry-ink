import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { getBefundSchema, getDefaultFieldValues } from '../../data/befundSchemas'
import type { BefundRecord, BefundType } from '../../types/befund'
import {
  createBefundRecord,
  getDiagnostikBefund,
  upsertDiagnostikBefund,
} from '../../utils/befundArchive'
import { syncBefundDokument } from '../../utils/befundDokumente'
import { showNotionToast } from '../notion/NotionToast'
import { BefundSchemaForm } from './BefundSchemaForm'

interface BefundPopupProps {
  caseId: string
  type: BefundType
  /** Edit existing record; omit for new befund. */
  recordId?: string
  onClose: () => void
  onSaved: (record: BefundRecord) => void
}

export function BefundPopup({ caseId, type, recordId, onClose, onSaved }: BefundPopupProps) {
  const { t, language } = useTranslation()
  const schema = getBefundSchema(type, language)

  const existing = recordId ? getDiagnostikBefund(caseId, recordId) : null

  const [fieldValues, setFieldValues] = useState<Record<string, string | string[] | boolean>>(
    () => existing?.fieldValues ?? getDefaultFieldValues(schema),
  )
  const [examDate, setExamDate] = useState(
    () => existing?.examDate ?? new Date().toISOString().slice(0, 10),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleFieldChange = useCallback((fieldId: string, value: string | string[] | boolean) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const persist = useCallback(
    (status: BefundRecord['status']) => {
      setSaving(true)
      const now = new Date().toISOString()
      let record: BefundRecord

      if (existing) {
        record = {
          ...existing,
          fieldValues,
          examDate,
          status,
          updatedAt: now,
          vidertAt: status === 'vidert' ? now : existing.vidertAt,
        }
      } else {
        record = createBefundRecord(caseId, type, schema.version, fieldValues, status)
        record = { ...record, examDate }
      }

      upsertDiagnostikBefund(caseId, record)
      syncBefundDokument(record, language)
      showNotionToast(status === 'vidert' ? t('befundSavedVidert') : t('befundSavedDraft'))
      onSaved(record)
      setSaving(false)
      onClose()
    },
    [caseId, existing, examDate, fieldValues, language, onClose, onSaved, schema.version, t, type],
  )

  return (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={schema.title}
      onClick={onClose}
    >
      <div
        className="therapy-modal therapy-modal--wide befund-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h2 className="therapy-modal__title">{schema.title}</h2>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={onClose}
            aria-label={t('dokumenteClose')}
          >
            ×
          </button>
        </div>

        <div className="therapy-modal__body">
          <BefundSchemaForm
            schema={schema}
            values={fieldValues}
            onChange={handleFieldChange}
            examDate={examDate}
            onExamDateChange={setExamDate}
          />
        </div>

        <div className="therapy-modal__footer befund-popup__footer">
          <button
            type="button"
            className="befund-popup__btn befund-popup__btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            {t('dokumenteClose')}
          </button>
          <div className="befund-popup__footer-actions">
            <button
              type="button"
              className="befund-popup__btn befund-popup__btn--secondary"
              onClick={() => persist('draft')}
              disabled={saving}
            >
              {t('befundSaveDraft')}
            </button>
            <button
              type="button"
              className="befund-popup__btn befund-popup__btn--primary"
              onClick={() => persist('vidert')}
              disabled={saving}
            >
              {t('befundVidieren')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
