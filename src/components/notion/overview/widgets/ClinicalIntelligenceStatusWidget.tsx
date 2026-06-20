import { useMemo } from 'react'
import { useTranslation } from '../../../../context/TranslationContext'
import { useClinicalIntelligence } from '../../../../hooks/useClinicalIntelligence'
import { OverviewCardShell } from '../OverviewCard'
import { ClinicalEyebrow } from '../../../clinical/ClinicalEyebrow'
import { CiHypothesisBanner } from '../../../clinical/clinicalIntelligence/CiHypothesisBanner'

interface ClinicalIntelligenceStatusWidgetProps {
  caseId: string
  onOpenSection?: () => void
}

export function ClinicalIntelligenceStatusWidget({
  caseId,
  onOpenSection,
}: ClinicalIntelligenceStatusWidgetProps) {
  const { t, language } = useTranslation()
  const ci = useClinicalIntelligence(caseId)

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language],
  )

  const run = ci.latestRun
  let acceptedTotal = 0
  let pendingTotal = 0
  let uncertaintyCount = 0
  if (run) {
    for (const d of run.dimensional.activeDimensions) {
      if (d.reviewStatus === 'accepted' || d.reviewStatus === 'edited') acceptedTotal++
      else if (d.reviewStatus === 'pending') pendingTotal++
      if (d.uncertainty.trim()) uncertaintyCount++
    }
    for (const m of run.mechanism.activeMechanisms) {
      if (m.reviewStatus === 'accepted' || m.reviewStatus === 'edited') acceptedTotal++
      else if (m.reviewStatus === 'pending') pendingTotal++
      if (m.uncertainty.trim()) uncertaintyCount++
    }
    uncertaintyCount += run.dimensional.exploratoryInsufficientEvidence.length
    uncertaintyCount += run.mechanism.exploratoryInsufficientEvidence.length
  }

  const reviewLabel =
    !run || pendingTotal > 0 ? t('ciWidgetReviewPending') : t('ciWidgetReviewComplete')

  return (
    <OverviewCardShell>
      <ClinicalEyebrow inline>{t('overviewWidgetCiStatus')}</ClinicalEyebrow>
      <CiHypothesisBanner compact />
      <div className="ci-widget">
        <p className="ci-widget__meta">
          {t('ciLastRunLabel')}:{' '}
          <strong>{run ? dateFormatter.format(new Date(run.builtAt)) : '—'}</strong>
        </p>
        <p className="ci-widget__meta">
          {ci.hasEvidenceBase
            ? t('ciWidgetEvidenceBaseOk')
            : t('ciWidgetEvidenceBaseMissing')}
        </p>
        <p className="ci-widget__meta">
          {t('ciWidgetClinicianReviewLabel')}: <strong>{reviewLabel}</strong>
        </p>
        <div className="ci-widget__counts">
          <span className="ci-widget__pill">
            {t('ciStatusAccepted')}: {acceptedTotal}
          </span>
          <span className="ci-widget__pill">
            {t('ciWidgetUncertaintyCount')}: {uncertaintyCount}
          </span>
        </div>
        {onOpenSection ? (
          <button type="button" className="ci-widget__open" onClick={onOpenSection}>
            {t('ciOpenSection')} →
          </button>
        ) : null}
      </div>
    </OverviewCardShell>
  )
}
