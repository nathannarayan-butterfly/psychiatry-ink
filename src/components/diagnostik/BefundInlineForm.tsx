import { useCallback, useState } from 'react'
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

interface BefundInlineFormProps {
  caseId: string
  type: BefundType
  recordId?: string
  disabled?: boolean
  onCancel: () => void
  onSaved: (record: BefundRecord) => void
}

/** Inline structured Befund entry (workspace panel — no modal overlay). */
export function BefundInlineForm({
  caseId,
  type,
  recordId,
  disabled = false,
  onCancel,
  onSaved,
}: BefundInlineFormProps) {
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

  const handleFieldChange = useCallback((fieldId: string, value: string | string[] | boolean) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const persist = useCallback(
    (status: BefundRecord['status']) => {
      if (disabled || saving) return
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
    },
    [caseId, disabled, examDate, existing, fieldValues, language, onSaved, saving, schema.version, t, type],
  )

  return (
    <div className="befund-inline-form">
      <BefundSchemaForm
        schema={schema}
        values={fieldValues}
        onChange={handleFieldChange}
        examDate={examDate}
        onExamDateChange={setExamDate}
      />

      <footer className="befund-inline-form__footer">
        <button type="button" className="befund-popup__btn befund-popup__btn--ghost" onClick={onCancel}>
          {t('dokumenteClose')}
        </button>
        <div className="befund-inline-form__footer-actions">
          <button
            type="button"
            className="befund-popup__btn befund-popup__btn--secondary"
            disabled={disabled || saving}
            onClick={() => persist('draft')}
          >
            {t('befundSaveDraft')}
          </button>
          <button
            type="button"
            className="befund-popup__btn befund-popup__btn--primary"
            disabled={disabled || saving}
            onClick={() => persist('vidert')}
          >
            {t('befundVidieren')}
          </button>
        </div>
      </footer>
    </div>
  )
}
