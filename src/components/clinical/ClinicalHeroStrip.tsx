import { useEffect, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { upsertCaseMeta } from '../../hooks/useCaseRegistry'

interface ClinicalHeroStripProps {
  name: string
  metaLine?: string | null
  caseId?: string | null
  thesis?: string | null
  className?: string
  /** When true, show pencil to edit the one-line clinical subheading. */
  thesisEditable?: boolean
  /** Called after the clinician saves an edited subheading. */
  onThesisChange?: () => void
}

/** Typographic patient hero — name in theme accent, demographics inline, optional clinical thesis. */
export function ClinicalHeroStrip({
  name,
  metaLine,
  caseId,
  thesis,
  className,
  thesisEditable = false,
  onThesisChange,
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
        {metaLine ? <span className="cm-hero__meta">{metaLine}</span> : null}
        {caseId ? <span className="cm-hero__case-id">{caseId}</span> : null}
      </div>
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
