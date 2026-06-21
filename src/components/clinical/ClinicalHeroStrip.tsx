import { useEffect, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { upsertCaseMeta } from '../../hooks/useCaseRegistry'
import {
  CLINICAL_HERO_MISSING,
  type ClinicalHeroDemographics,
} from '../../utils/overview/clinicalHeroMeta'

interface ClinicalHeroStripProps {
  name: string
  demographics: ClinicalHeroDemographics
  /** @deprecated Use `demographics` — retained for legacy callers during migration. */
  metaLine?: string | null
  caseId?: string | null
  thesis?: string | null
  className?: string
  /** When true, show pencil to edit the one-line clinical subheading. */
  thesisEditable?: boolean
  /** Called after the clinician saves an edited subheading. */
  onThesisChange?: () => void
  /** When false, hide the demographics row (empty/free workspace with no linked patient). */
  showDemographics?: boolean
}

const DEMOGRAPHIC_FIELDS: Array<{
  key: keyof ClinicalHeroDemographics
  labelKey: 'patientFieldGeburtsdatum' | 'patientAgeLabel' | 'patientFieldGeschlecht' | 'patientFieldAufnahmedatum'
}> = [
  { key: 'dob', labelKey: 'patientFieldGeburtsdatum' },
  { key: 'age', labelKey: 'patientAgeLabel' },
  { key: 'sex', labelKey: 'patientFieldGeschlecht' },
  { key: 'admission', labelKey: 'patientFieldAufnahmedatum' },
]

/** Typographic patient hero — name in theme accent, demographics inline, optional clinical thesis. */
export function ClinicalHeroStrip({
  name,
  demographics,
  metaLine: _metaLine,
  caseId,
  thesis,
  className,
  thesisEditable = false,
  onThesisChange,
  showDemographics = true,
}: ClinicalHeroStripProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(thesis ?? '')

  useEffect(() => {
    if (!editing) setDraft(thesis ?? '')
  }, [editing, thesis])

  const classes = ['cm-hero', className ?? ''].filter(Boolean).join(' ')
  const canEdit = thesisEditable && Boolean(caseId)

  const handleSave = () => {
    if (!caseId) return
    const trimmed = draft.trim()
    upsertCaseMeta(caseId, { localClinicalSubheading: trimmed || undefined })
    onThesisChange?.()
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(thesis ?? '')
    setEditing(false)
  }

  return (
    <header className={classes} aria-label="Patient">
      <div className="cm-hero__row">
        <h1 className="cm-hero__name">{name}</h1>
        {caseId ? <span className="cm-hero__case-id">{caseId}</span> : null}
      </div>
      {showDemographics ? (
        <dl className="cm-hero__demographics">
          {DEMOGRAPHIC_FIELDS.map(({ key, labelKey }) => (
            <div key={key} className="cm-hero__fact">
              <dt className="cm-hero__fact-label">{t(labelKey)}</dt>
              <dd className="cm-hero__fact-value">{demographics[key] ?? CLINICAL_HERO_MISSING}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {canEdit || thesis ? (
        <div className="cm-hero__thesis-row">
          {editing ? (
            <div className="cm-hero__thesis-editor">
              <textarea
                className="cm-hero__thesis-input"
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('clinicalSubheadingPlaceholder')}
                aria-label={t('clinicalSubheadingEditLabel')}
              />
              <div className="cm-hero__thesis-actions">
                <button
                  type="button"
                  className="cm-hero__thesis-btn cm-hero__thesis-btn--save"
                  onClick={handleSave}
                  aria-label={t('clinicalSubheadingSave')}
                >
                  <Check strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  className="cm-hero__thesis-btn"
                  onClick={handleCancel}
                  aria-label={t('clinicalSubheadingCancel')}
                >
                  <X strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          ) : (
            <>
              {thesis ? <p className="cm-hero__thesis">{thesis}</p> : null}
              {canEdit ? (
                <button
                  type="button"
                  className="cm-hero__thesis-edit"
                  onClick={() => setEditing(true)}
                  title={t('clinicalSubheadingEdit')}
                  aria-label={t('clinicalSubheadingEdit')}
                >
                  <Pencil strokeWidth={1.75} aria-hidden />
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </header>
  )
}
