import { useMemo } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { MedicationCorrelationLabels } from '../../../utils/standalone/medicationCorrelation'

/**
 * Localized section-heading labels for {@link buildMedicationCorrelationSummary}.
 * Kept out of the pure util so the summary builder stays testable without a
 * React/i18n context (the dynamic risk / monitoring labels resolve from
 * `translateMedicationUi` inside the util).
 */
export function useMedicationCorrelationLabels(): MedicationCorrelationLabels {
  const { t } = useTranslation()
  return useMemo<MedicationCorrelationLabels>(
    () => ({
      heading: t('standaloneMedicationSummaryHeading'),
      drugs: t('standaloneMedicationSummaryDrugs'),
      risks: t('standaloneMedicationSummaryRisks'),
      interactions: t('standaloneMedicationSummaryInteractions'),
      sideEffects: t('standaloneMedicationSummarySideEffects'),
      monitoring: t('standaloneMedicationSummaryMonitoring'),
      none: t('standaloneMedicationSummaryNone'),
      sideEffectCount: (count: number) =>
        t('standaloneMedicationSideEffectCount').replace('{count}', String(count)),
    }),
    [t],
  )
}
