import { useMemo } from 'react'
import { ClinicalHeroStrip } from '../../clinical/ClinicalHeroStrip'
import { DiagnosisDisplayLabel } from '../../diagnosis/DiagnosisDisplayLabel'
import { buildClinicalThesis } from '../../../utils/overview/clinicalThesis'
import { buildClinicalHeroMeta } from '../../../utils/overview/clinicalHeroMeta'
import { DEFAULT_CASE_ID } from '../../../utils/caseContext'
import { resolveDisplayCriteriaLabel } from '../../../utils/diagnosisDisplayRequests'
import { useTranslation } from '../../../context/TranslationContext'
import type { HeroSummaryData } from './types'

interface OverviewHeroProps {
  data: HeroSummaryData
  caseId: string
  /** Bump when local patient meta changes so the hero re-reads registry data. */
  metaVersion?: number
  onClinicalSubheadingChange?: () => void
}

/**
 * Übersicht hero — typographic patient strip with clinical thesis.
 * Supplementary orientation facts render as quiet meta below the hairline.
 */
export function OverviewHero({ data, caseId, metaVersion = 0, onClinicalSubheadingChange }: OverviewHeroProps) {
  const { t, language } = useTranslation()

  const { name, demographics, isAssigned } = useMemo(() => {
    void metaVersion
    return buildClinicalHeroMeta(caseId, t)
  }, [caseId, metaVersion, t])

  const thesis = useMemo(() => {
    void metaVersion
    return buildClinicalThesis(caseId)
  }, [caseId, metaVersion])

  const orientationTail = useMemo(() => {
    const parts: string[] = []
    if (data.risk?.label) {
      parts.push(`Risiko ${data.risk.label}`)
    }
    if (data.activeMedCount > 0) {
      parts.push(
        `${data.activeMedCount} ${data.activeMedCount === 1 ? 'aktives Präparat' : 'aktive Präparate'}`,
      )
    }
    if (data.lastContact?.relativeLabel ?? data.lastContact?.dateLabel) {
      parts.push(`Letzter Kontakt ${data.lastContact.relativeLabel ?? data.lastContact.dateLabel}`)
    }
    if (data.nextAppointment?.relativeLabel ?? data.nextAppointment?.dateLabel) {
      parts.push(
        `Nächster Termin ${data.nextAppointment.relativeLabel ?? data.nextAppointment.dateLabel}`,
      )
    }
    return parts
  }, [data])

  const primaryDiagnosis = data.primaryDiagnosis
  const showOrientation = Boolean(primaryDiagnosis?.code) || orientationTail.length > 0

  return (
    <div className="ov-hero-widget">
      <ClinicalHeroStrip
        name={name}
        demographics={demographics}
        caseId={isAssigned && caseId !== DEFAULT_CASE_ID ? caseId : undefined}
        thesis={thesis}
        thesisEditable
        onThesisChange={onClinicalSubheadingChange}
      />
      {showOrientation ? (
        <p className="ov-hero-widget__orientation" aria-label="Orientierung">
          {primaryDiagnosis?.code ? (
            <>
              {primaryDiagnosis.code}
              {' · '}
              <DiagnosisDisplayLabel
                code={primaryDiagnosis.code}
                version={primaryDiagnosis.version}
                language={language}
                criteriaLabel={resolveDisplayCriteriaLabel(
                  primaryDiagnosis.code,
                  primaryDiagnosis.version,
                )}
                enteredLabel={primaryDiagnosis.overridden ? primaryDiagnosis.label : null}
                overridden={primaryDiagnosis.overridden ?? false}
              />
            </>
          ) : null}
          {primaryDiagnosis?.code && orientationTail.length > 0 ? ' · ' : null}
          {orientationTail.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
