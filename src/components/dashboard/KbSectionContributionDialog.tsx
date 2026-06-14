import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import { CANONICAL_KB_SECTIONS } from '../../data/knowledgeBaseSectionRegistry'
import { submitKbContribution } from '../../services/kbContributionsApi'
import type { DrugSectionKey } from '../../types/knowledgeBase'
import { kbT } from '../medication/kb/kbStrings'
import { showNotionToast } from '../notion/NotionToast'

export type KbContributionSectionKey = DrugSectionKey | 'rezeptorprofil'

const SOURCE_TYPES = [
  'fachinformation',
  'stahl',
  'literature',
  'guideline',
  'fda_label',
  'unknown',
] as const

type SourceType = (typeof SOURCE_TYPES)[number]

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
  return options
}

const SECTION_OPTIONS = buildSectionOptions()

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
  const [sectionKey, setSectionKey] = useState<KbContributionSectionKey>(initialSectionKey)
  const [proposedContent, setProposedContent] = useState('')
  const [sourceCitation, setSourceCitation] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('fachinformation')
  const [licenseAccepted, setLicenseAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceError, setReferenceError] = useState<string | null>(null)
  const [licenseError, setLicenseError] = useState<string | null>(null)

  useEffect(() => {
    setSectionKey(initialSectionKey)
  }, [initialSectionKey])

  const sectionLabel = useMemo(
    () => SECTION_OPTIONS.find((opt) => opt.key === sectionKey)?.label ?? sectionKey,
    [sectionKey],
  )

  const canSubmit =
    proposedContent.trim().length > 0 &&
    sourceCitation.trim().length > 0 &&
    SOURCE_TYPES.includes(sourceType) &&
    licenseAccepted &&
    !submitting

  const handleSubmit = useCallback(async () => {
    const content = proposedContent.trim()
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

    if (!content || !citation || !licenseAccepted || submitting) {
      if (!content && !hasValidationError) return
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await submitKbContribution({
        substanceId,
        contributionType: 'edit_field',
        payload: {
          sectionKey,
          proposedContent: content,
          sourceCitation: citation,
          sourceType,
          drugName,
          sectionLabel,
        },
        licenseAccepted: true,
      })
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
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

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
