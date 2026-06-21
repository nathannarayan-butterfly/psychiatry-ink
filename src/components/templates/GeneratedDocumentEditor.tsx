import { Copy, FileDown, Printer, RefreshCw, Save, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { getDocumentTemplate } from '../../utils/documentTemplateStore'
import {
  buildInitialFieldValues,
  buildPrintHtmlDocument,
  renderTemplate,
  renderTemplateDocumentHtml,
} from '../../utils/documentTemplate/renderTemplate'
import { buildTemplateRenderContext } from '../../utils/documentTemplate/placeholderContext'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'
import type { DocumentTemplate, GeneratedDocument, TemplateField, TemplateRenderContext } from '../../types/documentTemplate'
import { getGeneratedDocument, saveGeneratedDocument } from '../../utils/generatedDocumentsVault'
import { recordAuditEvent } from '../../services/auditApi'
import { appendDokument } from '../../utils/dokumenteArchive'
import { A4PageView } from './A4PageView'
import { RichTextField } from './RichTextField'

interface GeneratedDocumentEditorProps {
  template: DocumentTemplate
  caseId?: string
  existingDoc?: GeneratedDocument
  saveToPatientDocuments?: boolean
  onClose: () => void
  onSaved?: (doc: GeneratedDocument) => void
}

function FieldInput({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField
  value: string | boolean | string[]
  onChange: (value: string | boolean | string[]) => void
  readOnly?: boolean
}) {
  const { t } = useTranslation()

  if (field.type === 'static_text') {
    return (
      <div
        className="dt-field-static"
        dangerouslySetInnerHTML={{
          __html: sanitizeRichHtml((field.defaultValue as string | undefined) ?? field.label ?? ''),
        }}
      />
    )
  }

  if (field.type === 'heading') {
    return <h3 className="dt-field-heading">{field.label ?? (field.defaultValue as string)}</h3>
  }

  if (field.type === 'divider') {
    return <hr className="dt-field-divider" />
  }

  if (field.type === 'spacer') {
    const mm = Math.max(2, Number(field.defaultValue) || 4)
    return <div className="dt-field-spacer" style={{ height: `${mm}mm` }} aria-hidden />
  }

  if (field.type === 'checkbox') {
    return (
      <label className="dt-field-check">
        <input
          type="checkbox"
          checked={value === true}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    )
  }

  if (field.type === 'multi_select' || field.type === 'checkbox_group') {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset className="dt-field-label">
        <legend>{field.label}</legend>
        {field.options?.map((opt) => (
          <label key={opt.id} className="dt-field-check">
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              disabled={readOnly}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, opt.id]
                  : selected.filter((id) => id !== opt.id)
                onChange(next)
              }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  if (field.type === 'radio_group') {
    const selected = typeof value === 'string' ? value : ''
    return (
      <fieldset className="dt-field-label">
        <legend>{field.label}</legend>
        {field.options?.map((opt) => (
          <label key={opt.id} className="dt-field-check">
            <input
              type="radio"
              name={field.id}
              checked={selected === opt.id}
              disabled={readOnly}
              onChange={() => onChange(opt.id)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  if (field.type === 'yes_no') {
    const selected = typeof value === 'string' ? value : ''
    return (
      <fieldset className="dt-field-label">
        <legend>{field.label}</legend>
        <label className="dt-field-check">
          <input
            type="radio"
            name={field.id}
            checked={selected === 'yes'}
            disabled={readOnly}
            onChange={() => onChange('yes')}
          />
          <span>Ja</span>
        </label>
        <label className="dt-field-check">
          <input
            type="radio"
            name={field.id}
            checked={selected === 'no'}
            disabled={readOnly}
            onChange={() => onChange('no')}
          />
          <span>Nein</span>
        </label>
      </fieldset>
    )
  }

  if (field.type === 'select') {
    return (
      <label className="dt-field-label">
        {field.label}
        <select
          className="dt-input"
          value={typeof value === 'string' ? value : ''}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t('templateSelectEmpty')}</option>
          {field.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </label>
    )
  }

  if (field.type === 'long_text' || field.type === 'ai_assisted_text') {
    return (
      <label className="dt-field-label">
        {field.label}
        <RichTextField
          value={typeof value === 'string' ? value : ''}
          onChange={(html) => onChange(html)}
          readOnly={readOnly}
          minHeight="5rem"
          resizable
          ariaLabel={field.label}
        />
      </label>
    )
  }

  if (field.type === 'short_text') {
    return (
      <label className="dt-field-label">
        {field.label}
        <RichTextField
          value={typeof value === 'string' ? value : ''}
          onChange={(html) => onChange(html)}
          readOnly={readOnly}
          minHeight="2.5rem"
          ariaLabel={field.label}
        />
      </label>
    )
  }

  if (
    field.type === 'patient_placeholder' ||
    field.type === 'case_placeholder' ||
    field.type === 'clinician_placeholder' ||
    field.type === 'organization_placeholder'
  ) {
    const text = typeof value === 'string' ? value : ''
    const unresolved = !text.trim()
    return (
      <label className="dt-field-label">
        {field.label ?? field.binding}
        <input
          className={`dt-input${unresolved ? ' dt-input--unresolved' : ''}`}
          value={text}
          readOnly={readOnly}
          placeholder={t('templatePlaceholderUnresolved')}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  if (field.type === 'dynamic') {
    const text = typeof value === 'string' ? value : ''
    const unresolved = !text.trim() || text === '—'
    return (
      <label className="dt-field-label">
        {field.label}
        <input
          className={`dt-input dt-input--dynamic${unresolved ? ' dt-input--unresolved' : ''}`}
          value={text}
          readOnly
          placeholder={t('templatePlaceholderUnresolved')}
        />
      </label>
    )
  }

  if (field.type === 'signature' || field.type === 'initials' || field.type === 'name_line') {
    return (
      <label className="dt-field-label">
        {field.label}
        <input
          className="dt-input dt-input--line"
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          placeholder="________________________"
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  if (field.type === 'number_with_unit') {
    return (
      <label className="dt-field-label">
        {field.label}
        <div className="dt-input-group">
          <input
            className="dt-input"
            type="number"
            value={typeof value === 'string' ? value : ''}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.unit ? <span className="dt-input-suffix">{field.unit}</span> : null}
        </div>
      </label>
    )
  }

  const inputType =
    field.type === 'date'
      ? 'date'
      : field.type === 'time'
        ? 'time'
        : field.type === 'number'
          ? 'number'
          : field.type === 'email'
            ? 'email'
            : field.type === 'phone'
              ? 'tel'
              : 'text'

  if (
    field.type === 'date' ||
    field.type === 'time' ||
    field.type === 'number' ||
    field.type === 'email' ||
    field.type === 'phone'
  ) {
    return (
      <label className="dt-field-label">
        {field.label}
        <input
          className="dt-input"
          type={inputType}
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  return null
}

export function GeneratedDocumentEditor({
  template,
  caseId,
  existingDoc,
  saveToPatientDocuments = false,
  onClose,
  onSaved,
}: GeneratedDocumentEditorProps) {
  const { t } = useTranslation()
  const [context, setContext] = useState<TemplateRenderContext>({})
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean | string[]>>({})
  const [previewMode, setPreviewMode] = useState(false)
  const [docId] = useState(existingDoc?.id ?? crypto.randomUUID())
  const [status, setStatus] = useState(existingDoc?.status ?? 'draft')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void buildTemplateRenderContext(caseId).then((ctx) => {
      setContext(ctx)
      if (existingDoc) {
        setFieldValues(existingDoc.fieldValues)
      } else {
        setFieldValues(buildInitialFieldValues(template, ctx))
      }
    })
  }, [caseId, template, existingDoc])

  const sortedFields = useMemo(
    () => [...template.fields].sort((a, b) => a.order - b.order),
    [template.fields],
  )

  const renderedText = useMemo(
    () => renderTemplate(template, fieldValues, context, { mode: 'document', markUnresolved: !caseId }),
    [template, fieldValues, context, caseId],
  )

  const previewHtml = useMemo(
    () => renderTemplateDocumentHtml(template, fieldValues, context, { markUnresolved: !caseId }),
    [template, fieldValues, context, caseId],
  )

  const handleFieldChange = useCallback((fieldId: string, value: string | boolean | string[]) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const buildDoc = useCallback((): GeneratedDocument => {
    const now = new Date().toISOString()
    return {
      id: docId,
      templateId: template.id,
      templateVersion: template.version,
      patientId: caseId,
      caseId,
      title: template.title,
      fieldValues,
      renderedText,
      status,
      createdAt: existingDoc?.createdAt ?? now,
      updatedAt: now,
    }
  }, [docId, template, caseId, fieldValues, renderedText, status, existingDoc])

  const persist = useCallback(
    async (nextStatus: GeneratedDocument['status']) => {
      if (!caseId && nextStatus !== 'draft') return
      setSaving(true)
      try {
        const doc: GeneratedDocument = { ...buildDoc(), status: nextStatus, renderedText }
        if (caseId) {
          await saveGeneratedDocument(caseId, doc)
          if (!existingDoc) {
            void recordAuditEvent('document_created', { caseId, documentId: doc.id, metadata: { templateId: template.id } })
          } else if (nextStatus === 'draft') {
            void recordAuditEvent('document_edited', { caseId, documentId: doc.id })
          } else if (nextStatus === 'finalized') {
            void recordAuditEvent('document_finalized', { caseId, documentId: doc.id })
          }
          if (saveToPatientDocuments && nextStatus === 'finalized') {
            appendDokument(caseId, {
              category: 'formulare',
              title: doc.title,
              content: doc.renderedText,
              date: doc.updatedAt,
              source: 'manual',
              pageType: `template-doc:${doc.id}`,
              sourceRefId: doc.id,
            })
          }
        }
        setStatus(nextStatus)
        onSaved?.(doc)
      } finally {
        setSaving(false)
      }
    },
    [buildDoc, caseId, existingDoc, saveToPatientDocuments, onSaved, renderedText, template.id],
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedText)
    } catch {
      // ignore
    }
  }, [renderedText])

  const handlePrint = useCallback(() => {
    const html = buildPrintHtmlDocument(template, fieldValues, context, { markUnresolved: !caseId })
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    if (caseId) {
      void recordAuditEvent('document_exported', {
        caseId,
        documentId: docId,
        metadata: { format: 'print', templateId: template.id },
      })
    }
  }, [template, fieldValues, context, caseId, docId])

  const handleRegenerate = useCallback(() => {
    void buildTemplateRenderContext(caseId).then((ctx) => {
      setContext(ctx)
      setFieldValues(buildInitialFieldValues(template, ctx))
    })
  }, [caseId, template])

  const readOnly = status === 'finalized'

  return (
    <div className="dt-editor-overlay">
      <div className="dt-editor">
        <header className="dt-editor__header">
          <div>
            <h2 className="dt-editor__title">{template.title}</h2>
            <p className="dt-editor__meta">
              {t('templateSourceLabel')}: v{template.version}
              {status === 'finalized' ? ` · ${t('templateStatusFinalized')}` : ''}
            </p>
          </div>
          <div className="dt-editor__header-actions">
            <button
              type="button"
              className={`dt-btn dt-btn--ghost${previewMode ? ' dt-btn--active' : ''}`}
              onClick={() => setPreviewMode((v) => !v)}
            >
              {previewMode ? t('templateEditMode') : t('templatePreviewMode')}
            </button>
            <button type="button" className="dt-icon-btn" onClick={onClose} aria-label={t('dokumenteClose')}>
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className="dt-editor__body">
          {!previewMode ? (
            <form className="dt-editor__form" onSubmit={(e) => e.preventDefault()}>
              {sortedFields.map((field) => (
                <div key={field.id} className="dt-editor__field">
                  <FieldInput
                    field={field}
                    value={fieldValues[field.id] ?? ''}
                    onChange={(v) => handleFieldChange(field.id, v)}
                    readOnly={readOnly}
                  />
                  {field.helperText ? <p className="dt-field-help">{field.helperText}</p> : null}
                </div>
              ))}
            </form>
          ) : (
            <A4PageView className="dt-a4-page--preview">
              <div className="dt-a4-page__inner" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </A4PageView>
          )}
        </div>

        <footer className="dt-editor__footer">
          <div className="dt-editor__footer-left">
            <button type="button" className="dt-btn dt-btn--ghost" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateCopyText')}
            </button>
            <button type="button" className="dt-btn dt-btn--ghost" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templatePrint')}
            </button>
            <button type="button" className="dt-btn dt-btn--ghost" onClick={handleRegenerate}>
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateRegenerate')}
            </button>
          </div>
          <div className="dt-editor__footer-right">
            {caseId ? (
              <>
                <button
                  type="button"
                  className="dt-btn dt-btn--secondary"
                  disabled={saving || readOnly}
                  onClick={() => void persist('draft')}
                >
                  <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {t('templateSaveDraft')}
                </button>
                <button
                  type="button"
                  className="dt-btn dt-btn--primary"
                  disabled={saving || readOnly}
                  onClick={() => void persist('finalized')}
                >
                  <FileDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {t('templateFinalize')}
                </button>
              </>
            ) : (
              <button type="button" className="dt-btn dt-btn--secondary" onClick={onClose}>
                {t('dokumenteClose')}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

export function GeneratedDocumentEditorLoader({
  caseId,
  docId,
  onClose,
  onSaved,
}: {
  caseId: string
  docId: string
  onClose: () => void
  onSaved?: (doc: GeneratedDocument) => void
}) {
  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<GeneratedDocument | null>(null)
  const [template, setTemplate] = useState<DocumentTemplate | null>(null)

  useEffect(() => {
    void (async () => {
      const loaded = await getGeneratedDocument(caseId, docId)
      setDoc(loaded)
      if (loaded) setTemplate(getDocumentTemplate(loaded.templateId))
      setLoading(false)
    })()
  }, [caseId, docId])

  if (loading || !doc || !template) return null

  return (
    <GeneratedDocumentEditor
      template={template}
      caseId={caseId}
      existingDoc={doc}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
