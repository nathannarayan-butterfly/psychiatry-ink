import { useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Pencil, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { ClinicalImportCandidate, CandidateModule } from '../../schemas/documentImport/envelope'
import { canRemap, remapCandidate } from '../../utils/documentImport/remap'
import { candidateSummary, confidenceLabelKey, moduleLabelKey, REMAP_MODULES } from './labels'
import { GermanDateInput } from './GermanDateInput'

export type ReviewStatus = 'pending' | 'accepted' | 'rejected'

interface CandidateReviewRowProps {
  candidate: ClinicalImportCandidate
  status: ReviewStatus
  onAccept: () => void
  onReject: () => void
  onChange: (updated: ClinicalImportCandidate) => void
}

export function CandidateReviewRow({
  candidate,
  status,
  onAccept,
  onReject,
  onChange,
}: CandidateReviewRowProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)

  const data = candidate.data as Record<string, unknown>
  const summary = candidateSummary(data, candidate.module)
  const location = formatLocation(candidate)
  const clarifications = candidate.clarifications ?? []
  const needsClarification = clarifications.length > 0

  const updateData = (patch: Record<string, unknown>, resolveCodes: string[] = []) => {
    const nextClar =
      resolveCodes.length > 0
        ? clarifications.filter((c) => !resolveCodes.includes(c.code))
        : candidate.clarifications
    onChange({
      ...candidate,
      data: { ...candidate.data, ...patch },
      clarifications: nextClar && nextClar.length > 0 ? nextClar : undefined,
    } as ClinicalImportCandidate)
  }

  const resolveAll = () => {
    onChange({ ...candidate, clarifications: undefined } as ClinicalImportCandidate)
  }

  const handleRemap = (target: CandidateModule) => {
    // Remapping away from the fallback resolves a "mapping uncertain" flag.
    const remapped = remapCandidate(candidate, target)
    const nextClar = clarifications.filter((c) => c.code !== 'mapping_uncertain')
    onChange({
      ...remapped,
      clarifications: nextClar.length > 0 ? nextClar : undefined,
    } as ClinicalImportCandidate)
  }

  return (
    <article
      className={`doc-import-row doc-import-row--${status}${
        needsClarification ? ' doc-import-row--needs-clarification' : ''
      }`}
    >
      <div className="doc-import-row__head">
        <div className="doc-import-row__meta">
          <span className="doc-import-row__module">{t(moduleLabelKey(candidate.module))}</span>
          <span className={`doc-import-row__confidence doc-import-row__confidence--${candidate.confidence}`}>
            {t(confidenceLabelKey(candidate.confidence))}
          </span>
          {needsClarification && (
            <span className="doc-import-row__clarify-badge">
              <AlertTriangle aria-hidden strokeWidth={1.75} />
              {t('documentImportClarificationBadge')}
            </span>
          )}
          {candidate.aiSuggested && (
            <span className="doc-import-row__ai-badge">{t('documentImportAiSuggestedBadge')}</span>
          )}
          {status === 'accepted' && (
            <span className="doc-import-row__status doc-import-row__status--accepted">
              {t('documentImportAcceptedBadge')}
            </span>
          )}
          {status === 'rejected' && (
            <span className="doc-import-row__status doc-import-row__status--rejected">
              {t('documentImportRejectedBadge')}
            </span>
          )}
        </div>
        <div className="doc-import-row__actions">
          <button
            type="button"
            className="doc-import-icon-btn"
            onClick={() => setEditing((v) => !v)}
            title={t('documentImportEdit')}
            aria-label={t('documentImportEdit')}
            aria-pressed={editing}
          >
            <Pencil strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className={`doc-import-icon-btn doc-import-icon-btn--accept${
              status === 'accepted' ? ' is-active' : ''
            }`}
            onClick={onAccept}
            title={t('documentImportAccept')}
            aria-label={t('documentImportAccept')}
          >
            <Check strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={`doc-import-icon-btn doc-import-icon-btn--reject${
              status === 'rejected' ? ' is-active' : ''
            }`}
            onClick={onReject}
            title={t('documentImportReject')}
            aria-label={t('documentImportReject')}
          >
            <X strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      <p className="doc-import-row__summary">{summary}</p>
      {location && <p className="doc-import-row__location">{location}</p>}

      {needsClarification && (
        <div className="doc-import-row__clarify">
          <ul className="doc-import-row__clarify-list">
            {clarifications.map((c, i) => (
              <li key={`${c.code}-${i}`}>{c.message}</li>
            ))}
          </ul>
          {(candidate.module === 'verlauf' ||
            candidate.module === 'therapy' ||
            candidate.module === 'complementaryTherapy') && (
            <label className="doc-import-field doc-import-row__clarify-field">
              <span className="doc-import-field__label">{t('documentImportFieldDate')}</span>
              <GermanDateInput
                className="doc-import-input"
                isoValue={(candidate.data as { date?: string }).date}
                onIsoChange={(iso) =>
                  updateData({ date: iso }, iso ? ['date_uncertain', 'date_unparsed'] : [])
                }
              />
            </label>
          )}
          <button type="button" className="doc-import-textbtn" onClick={resolveAll}>
            {t('documentImportMarkResolved')}
          </button>
        </div>
      )}

      {editing && (
        <div className="doc-import-row__editor">
          <label className="doc-import-row__remap">
            <span className="doc-import-row__editor-label">{t('documentImportRemap')}</span>
            <span className="doc-import-row__remap-control">
              <select
                className="doc-import-select"
                value={candidate.module}
                onChange={(e) => handleRemap(e.target.value as CandidateModule)}
              >
                {REMAP_MODULES.filter((m) => m === candidate.module || canRemap(candidate.module, m)).map(
                  (module) => (
                    <option key={module} value={module}>
                      {t(moduleLabelKey(module))}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown className="doc-import-row__remap-icon" aria-hidden strokeWidth={1.75} />
            </span>
          </label>

          <CandidateFields candidate={candidate} onChange={updateData} />
        </div>
      )}
    </article>
  )
}

function CandidateFields({
  candidate,
  onChange,
}: {
  candidate: ClinicalImportCandidate
  onChange: (patch: Record<string, unknown>, resolveCodes?: string[]) => void
}) {
  const { t } = useTranslation()

  if (candidate.module === 'diagnosis') {
    return (
      <div className="doc-import-row__fields">
        <Field label={t('documentImportFieldIcd10')}>
          <input
            className="doc-import-input"
            value={candidate.data.icd10Code ?? ''}
            onChange={(e) => onChange({ icd10Code: e.target.value })}
          />
        </Field>
        <Field label={t('documentImportFieldLabel')}>
          <input
            className="doc-import-input"
            value={candidate.data.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </Field>
      </div>
    )
  }

  if (candidate.module === 'medication') {
    return (
      <div className="doc-import-row__fields">
        <Field label={t('documentImportFieldSubstance')}>
          <input
            className="doc-import-input"
            value={candidate.data.substance}
            onChange={(e) => onChange({ substance: e.target.value })}
          />
        </Field>
        <Field label={t('documentImportFieldStrength')}>
          <input
            className="doc-import-input"
            value={candidate.data.strength ?? ''}
            onChange={(e) => onChange({ strength: e.target.value })}
          />
        </Field>
        <Field label={t('documentImportFieldDose')}>
          <input
            className="doc-import-input"
            value={candidate.data.doseText ?? ''}
            onChange={(e) => onChange({ doseText: e.target.value })}
          />
        </Field>
      </div>
    )
  }

  if (candidate.module === 'lab') {
    return (
      <div className="doc-import-row__fields">
        <Field label={t('documentImportFieldLabel')}>
          <input
            className="doc-import-input"
            value={candidate.data.panelLabel ?? ''}
            onChange={(e) => onChange({ panelLabel: e.target.value })}
          />
        </Field>
        <ul className="doc-import-row__lab-values">
          {candidate.data.values.map((v, i) => (
            <li key={`${v.name}-${i}`}>
              {v.name}: {v.value} {v.unit ?? ''}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Text-based modules: anamnese / verlauf / investigation / therapy / risk / document
  const data = candidate.data as {
    title?: string
    text?: string
    date?: string
    sectionLabel?: string
    subheading?: string
  }
  const hasDate =
    candidate.module === 'verlauf' ||
    candidate.module === 'therapy' ||
    candidate.module === 'complementaryTherapy'
  return (
    <div className="doc-import-row__fields">
      {candidate.module === 'verlauf' && (
        <>
          <Field label={t('documentImportFieldSectionLabel')}>
            <input
              className="doc-import-input"
              value={data.sectionLabel ?? ''}
              onChange={(e) => onChange({ sectionLabel: e.target.value })}
            />
          </Field>
          <Field label={t('documentImportFieldSubheading')}>
            <input
              className="doc-import-input"
              value={data.subheading ?? ''}
              onChange={(e) => onChange({ subheading: e.target.value })}
            />
          </Field>
        </>
      )}
      {'title' in candidate.data && (
        <Field label={t('documentImportFieldTitle')}>
          <input
            className="doc-import-input"
            value={data.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
      )}
      {hasDate && (
        <Field label={t('documentImportFieldDate')}>
          <GermanDateInput
            className="doc-import-input"
            isoValue={data.date}
            onIsoChange={(iso) =>
              onChange({ date: iso }, iso ? ['date_uncertain', 'date_unparsed'] : [])
            }
          />
        </Field>
      )}
      <Field label={t('documentImportFieldText')}>
        <textarea
          className="doc-import-textarea doc-import-textarea--section"
          rows={sectionTextRows(data.text)}
          value={data.text ?? ''}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="doc-import-field">
      <span className="doc-import-field__label">{label}</span>
      {children}
    </label>
  )
}

/** Size section editors so full imported text is visible without excessive scrolling. */
function sectionTextRows(text: string | undefined): number {
  const lines = (text ?? '').split('\n').length
  return Math.max(10, Math.min(32, lines + 2))
}

function formatLocation(candidate: ClinicalImportCandidate): string {
  const loc = candidate.sourceLocation
  const parts: string[] = []
  if (loc.section) parts.push(loc.section)
  if (loc.sheet) parts.push(loc.sheet)
  if (typeof loc.row === 'number') parts.push(`Zeile ${loc.row}`)
  if (typeof loc.lineNumber === 'number') parts.push(`Z. ${loc.lineNumber}`)
  if (loc.path) parts.push(loc.path)
  return parts.join(' · ')
}
