import { useTranslation } from '../../../context/TranslationContext'
import { ClinicalEmpty } from '../ClinicalSection'
import {
  formatCiEvidenceSourceList,
  getCiMechanismLabel,
} from '../../../data/clinicalIntelligenceTranslations'
import type { CompactEvidenceItem, MechanismInferenceResult } from '../../../types/clinicalIntelligence'

interface TreatmentImplicationsCardProps {
  mechanismResult: MechanismInferenceResult
  evidenceItems?: readonly CompactEvidenceItem[]
}

/** Treatment-relevant implications drawn from accepted/evidence-based mechanisms.
 *  Body-only — section chrome (header + collapse) is provided by the parent panel.
 */
export function TreatmentImplicationsCard({
  mechanismResult,
  evidenceItems,
}: TreatmentImplicationsCardProps) {
  const { t, language } = useTranslation()
  const relevant = mechanismResult.activeMechanisms
    .filter((m) => m.reviewStatus !== 'rejected')
    .filter((m) => m.treatmentRelevance.trim().length > 0)

  if (relevant.length === 0) {
    return <ClinicalEmpty>{t('ciTreatmentEmpty')}</ClinicalEmpty>
  }

  return (
    <ul className="ci-list">
      {relevant.map((mechanism) => (
        <li key={mechanism.mechanismId} className="ci-row ci-row--treatment">
          <p className="ci-row__title">{getCiMechanismLabel(mechanism.mechanismId, language)}</p>
          <p className="ci-row__summary">{mechanism.treatmentRelevance}</p>
          <p className="ci-row__meta">
            <span className="ci-row__meta-label">{t('ciClinicalImplication')}:</span>{' '}
            {mechanism.clinicalImplication}
          </p>
          {mechanism.supportingEvidenceIds.length > 0 ? (
            <p className="ci-row__meta">
              <span className="ci-row__meta-label">{t('ciSupportingEvidence')}:</span>{' '}
              {formatCiEvidenceSourceList(
                mechanism.supportingEvidenceIds,
                language,
                evidenceItems,
              )}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
