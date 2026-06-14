import { Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import { CANONICAL_KB_SECTIONS } from '../../data/knowledgeBaseSectionRegistry'
import {
  PRESCRIBING_COUNTRIES,
  PRESCRIBING_COUNTRY_LABELS,
  usePrescribingCountry,
} from '../../hooks/usePrescribingCountry'
import { submitKbContribution } from '../../services/kbContributionsApi'
import type { PrescribingCountryCode } from '../../types/knowledgeBase'
import type { DrugSectionKey } from '../../types/knowledgeBase'
import { kbT } from '../medication/kb/kbStrings'
import { showNotionToast } from '../notion/NotionToast'

export type KbContributionSectionKey = DrugSectionKey | 'rezeptorprofil' | 'verfuegbare_praeparate'

const SOURCE_TYPES = [
  'fachinformation',
  'stahl',
  'literature',
  'guideline',
  'fda_label',
  'unknown',
] as const

type SourceType = (typeof SOURCE_TYPES)[number]

const PREPARATION_SECTION_KEY: KbContributionSectionKey = 'verfuegbare_praeparate'

interface PreparationDraftRow {
  id: string
  tradeName: string
  strengthValue: string
  strengthUnit: string
  dosageForm: string
  notes: string
}

function newPreparationRow(): PreparationDraftRow {
  return {
    id: `prep-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tradeName: '',
    strengthValue: '',
    strengthUnit: 'mg',
    dosageForm: '',
    notes: '',
  }
}

function buildSectionOptions(): { key: KbContributionSectionKey; label: string }[] {
  const options: { key: KbContributionSectionKey; label: string }[] = []
  for (const section of CANONICAL_KB_SECTIONS) {
    if (section.subsections) {
      for (const sub of section.subsections) {
        options.push({ key: sub.id, label: sub.title })
      }
    } else if (section.sectionKey) {
      options.push({ key: section.sectionKey, label: section.title })
    } else if (section.id === 'rezeptorprofil') {
      options.push({ key: 'rezeptorprofil', label: section.title })
    }
  }
  options.push({
    key: PREPARATION_SECTION_KEY,
    label: kbT('de', 'contributionPreparationSection'),
  })
  return options
}

const SECTION_OPTIONS = buildSectionOptions()

function isPreparationMode(sectionKey: KbContributionSectionKey): boolean {
  return sectionKey === PREPARATION_SECTION_KEY
}

function rowIsComplete(row: PreparationDraftRow): boolean {
  return row.strengthValue.trim().length > 0 && row.dosageForm.trim().length > 0 && row.strengthUnit.trim().length > 0
}

interface KbSectionContributionDialogProps {
  substanceId: string | null
  drugName: string
  language: string
  initialSectionKey: KbContributionSectionKey
  onClose: () => void
}

export function KbSectionContributionDialog({
  substanceId,
  drugName,
  language,
  initialSectionKey,
  onClose,
}: KbSectionContributionDialogProps) {
  const { t } = useTranslation()
  const { defaultPrescribingCountry } = usePrescribingCountry()
  const [sectionKey, setSectionKey] = useState<KbContributionSectionKey>(initialSectionKey)
  const [proposedContent, setProposedContent] = useState('')
  const [preparationCountry, setPreparationCountry] = useState<PrescribingCountryCode>(defaultPrescribingCountry)
  const [preparationRows, setPreparationRows] = useState<PreparationDraftRow[]>(() => [newPreparationRow()])
  const [sourceCitation, setSourceCitation] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('fachinformation')
  const [licenseAccepted, setLicenseAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceError, setReferenceError] = useState<string | null>(null)
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [preparationError, setPreparationError] = useState<string | null>(null)

  const preparationMode = isPreparationMode(sectionKey)

  useEffect(() => {
    setSectionKey(initialSectionKey)
  }, [initialSectionKey])

  useEffect(() => {
    setPreparationCountry(defaultPrescribingCountry)
  }, [defaultPrescribingCountry])

  const sectionLabel = useMemo(
    () => SECTION_OPTIONS.find((opt) => opt.key === sectionKey)?.label ?? sectionKey,
    [sectionKey],
  )

  const completePreparationRows = useMemo(
    () => preparationRows.filter(rowIsComplete),
    [preparationRows],
  )

  const canSubmit = preparationMode
    ? completePreparationRows.length > 0 &&
      sourceCitation.trim().length > 0 &&
      SOURCE_TYPES.includes(sourceType) &&
      licenseAccepted &&
      !submitting
    : proposedContent.trim().length > 0 &&
      sourceCitation.trim().length > 0 &&
      SOURCE_TYPES.includes(sourceType) &&
      licenseAccepted &&
      !submitting

  const updatePreparationRow = useCallback((id: string, patch: Partial<PreparationDraftRow>) => {
    setPreparationRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    if (preparationError) setPreparationError(null)
  }, [preparationError])

  const handleSubmit = useCallback(async () => {
    const citation = sourceCitation.trim()
    let hasValidationError = false

    if (!citation) {
      setReferenceError(kbT(language, 'contributionReferenceRequired'))
      hasValidationError = true
    } else {
      setReferenceError(null)
    }

    if (!licenseAccepted) {
      setLicenseError(kbT(language, 'contributionLicenseRequired'))
      hasValidationError = true
    } else {
      setLicenseError(null)
    }

    if (preparationMode) {
      if (completePreparationRows.length === 0) {
        setPreparationError(kbT(language, 'contributionPreparationRowRequired'))
        hasValidationError = true
      } else {
        setPreparationError(null)
      }
    } else if (!proposedContent.trim()) {
      if (!hasValidationError) return
      return
    }

    if (hasValidationError || submitting) return

    setError(null)
    setSubmitting(true)
    try {
      if (preparationMode) {
        await submitKbContribution({
          substanceId,
          contributionType: 'add_preparation',
          payload: {
            countryCode: preparationCountry,
            genericName: drugName,
            preparations: completePreparationRows.map((row) => ({
              tradeName: row.tradeName.trim() || undefined,
              strengthValue: row.strengthValue.trim(),
              strengthUnit: row.strengthUnit.trim(),
              dosageForm: row.dosageForm.trim(),
              notes: row.notes.trim() || undefined,
            })),
            sourceCitation: citation,
            sourceType,
            sectionKey: PREPARATION_SECTION_KEY,
            sectionLabel,
          },
          licenseAccepted: true,
        })
      } else {
        await submitKbContribution({
          substanceId,
          contributionType: 'edit_field',
          payload: {
            sectionKey,
            proposedContent: proposedContent.trim(),
            sourceCitation: citation,
            sourceType,
            drugName,
            sectionLabel,
          },
          licenseAccepted: true,
        })
      }
      showNotionToast(kbT(language, 'contributionSuccess'))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : kbT(language, 'contributionError'))
    } finally {
      setSubmitting(false)
    }
  }, [
    proposedContent,
    licenseAccepted,
    submitting,
    substanceId,
    sectionKey,
    sourceCitation,
    sourceType,
    drugName,
    sectionLabel,
    language,
    onClose,
    preparationMode,
    preparationCountry,
    completePreparationRows,
  ])

  return createPortal(
    <div className="kbp-overlay" role="dialog" aria-modal aria-labelledby="kb-contribution-title">
      <div className="kbp-dialog kbp-dialog--contribution">
        <div className="kbp-dialog__header">
          <div>
            <h2 id="kb-contribution-title" className="kbp-dialog__title">
              {kbT(language, 'contributionDialogTitle')}
            </h2>
            <p className="kbp-contribution-dialog__subtitle">{kbT(language, 'contributionDialogSubtitle')}</p>
          </div>
          <button
            type="button"
            className="kbp-icon-btn"
            onClick={onClose}
            aria-label={t('kbPharmaCancel')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <form
          className="kbp-dialog__form"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <label className="kbp-field">
            <span className="kbp-field__label">{kbT(language, 'contributionSectionLabel')}</span>
            <select
              className="kbp-field__select"
              value={sectionKey}
              onChange={(e) => setSectionKey(e.target.value as KbContributionSectionKey)}
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.key === PREPARATION_SECTION_KEY
                    ? kbT(language, 'contributionPreparationSection')
                    : opt.label}
                </option>
              ))}
            </select>
          </label>

          {preparationMode ? (
            <>
              <label className="kbp-field">
                <span className="kbp-field__label">{kbT(language, 'contributionPreparationCountryLabel')}</span>
                <select
                  className="kbp-field__select"
                  value={preparationCountry}
                  onChange={(e) => setPreparationCountry(e.target.value as PrescribingCountryCode)}
                >
                  {PRESCRIBING_COUNTRIES.map((code) => (
                    <option key={code} value={code}>
                      {code} · {PRESCRIBING_COUNTRY_LABELS[code]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="kbp-contribution-prep-rows">
                <span className="kbp-field__label">{kbT(language, 'contributionPreparationSection')}</span>
                {preparationRows.map((row, index) => (
                  <div key={row.id} className="kbp-contribution-prep-row">
                    <div className="kbp-contribution-prep-row__grid">
                      <label className="kbp-field kbp-field--compact">
                        <span className="kbp-field__label">{kbT(language, 'contributionPreparationTradeNameLabel')}</span>
                        <input
                          type="text"
                          className="kbp-field__input"
                          value={row.tradeName}
                          onChange={(e) => updatePreparationRow(row.id, { tradeName: e.target.value })}
                          placeholder="z. B. Risperdal"
                        />
                      </label>
                      <label className="kbp-field kbp-field--compact">
                        <span className="kbp-field__label">{kbT(language, 'contributionPreparationStrengthLabel')}</span>
                        <div className="kbp-contribution-prep-strength">
                          <input
                            type="text"
                            className="kbp-field__input"
                            value={row.strengthValue}
                            onChange={(e) => updatePreparationRow(row.id, { strengthValue: e.target.value })}
                            placeholder="50"
                            required={index === 0}
                          />
                          <input
                            type="text"
                            className="kbp-field__input kbp-field__input--unit"
                            value={row.strengthUnit}
                            onChange={(e) => updatePreparationRow(row.id, { strengthUnit: e.target.value })}
                            placeholder="mg"
                            required={index === 0}
                          />
                        </div>
                      </label>
                      <label className="kbp-field kbp-field--compact">
                        <span className="kbp-field__label">{kbT(language, 'contributionPreparationFormLabel')}</span>
                        <input
                          type="text"
                          className="kbp-field__input"
                          value={row.dosageForm}
                          onChange={(e) => updatePreparationRow(row.id, { dosageForm: e.target.value })}
                          placeholder="Tabletten"
                          required={index === 0}
                        />
                      </label>
                      <label className="kbp-field kbp-field--compact kbp-field--wide">
                        <span className="kbp-field__label">{kbT(language, 'contributionPreparationNotesLabel')}</span>
                        <input
                          type="text"
                          className="kbp-field__input"
                          value={row.notes}
                          onChange={(e) => updatePreparationRow(row.id, { notes: e.target.value })}
                        />
                      </label>
                    </div>
                    {preparationRows.length > 1 ? (
                      <button
                        type="button"
                        className="kbp-icon-btn kbp-icon-btn--xs"
                        onClick={() => setPreparationRows((rows) => rows.filter((r) => r.id !== row.id))}
                        aria-label={kbT(language, 'contributionPreparationRemoveRow')}
                        title={kbT(language, 'contributionPreparationRemoveRow')}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className="kbp-btn kbp-btn--sm"
                  onClick={() => setPreparationRows((rows) => [...rows, newPreparationRow()])}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {kbT(language, 'contributionPreparationAddRow')}
                </button>
                {preparationError ? (
                  <p className="kbp-field__error" role="alert">
                    {preparationError}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <label className="kbp-field">
              <span className="kbp-field__label">{kbT(language, 'contributionContentLabel')}</span>
              <textarea
                className="kbp-section__textarea"
                value={proposedContent}
                onChange={(e) => setProposedContent(e.target.value)}
                placeholder={kbT(language, 'contributionContentPlaceholder')}
                rows={6}
                required
                autoFocus
              />
            </label>
          )}

          <label className="kbp-field">
            <span className="kbp-field__label">{kbT(language, 'contributionSourceLabel')}</span>
            <input
              type="text"
              className="kbp-field__input"
              value={sourceCitation}
              onChange={(e) => {
                setSourceCitation(e.target.value)
                if (referenceError && e.target.value.trim()) setReferenceError(null)
              }}
              placeholder={kbT(language, 'contributionSourcePlaceholder')}
              required
              aria-invalid={referenceError ? true : undefined}
              aria-describedby={referenceError ? 'kb-contribution-reference-error' : undefined}
            />
            {referenceError ? (
              <span id="kb-contribution-reference-error" className="kbp-field__error" role="alert">
                {referenceError}
              </span>
            ) : null}
          </label>

          <label className="kbp-field">
            <span className="kbp-field__label">{kbT(language, 'contributionSourceTypeLabel')}</span>
            <select
              className="kbp-field__select"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              required
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {kbT(language, `contributionSourceType_${type}` as const)}
                </option>
              ))}
            </select>
          </label>

          <label className="kbp-contribution-dialog__license">
            <input
              type="checkbox"
              checked={licenseAccepted}
              onChange={(e) => {
                setLicenseAccepted(e.target.checked)
                if (licenseError && e.target.checked) setLicenseError(null)
              }}
              required
              aria-invalid={licenseError ? true : undefined}
              aria-describedby={licenseError ? 'kb-contribution-license-error' : undefined}
            />
            <span>{t('kbPharmaCommunityLicense')}</span>
          </label>
          {licenseError ? (
            <p id="kb-contribution-license-error" className="kbp-field__error" role="alert">
              {licenseError}
            </p>
          ) : null}

          {error ? <p className="kbp-ai-error" role="alert">{error}</p> : null}

          <div className="kbp-dialog__actions">
            <button
              type="submit"
              className="kbp-btn kbp-btn--primary"
              disabled={!canSubmit}
            >
              {submitting ? kbT(language, 'contributionSubmitting') : kbT(language, 'contributionSubmit')}
            </button>
            <button type="button" className="kbp-btn" onClick={onClose} disabled={submitting}>
              {t('kbPharmaCancel')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
