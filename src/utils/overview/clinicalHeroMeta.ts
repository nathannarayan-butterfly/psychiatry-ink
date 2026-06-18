import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { isDemoCase } from '../../demo'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { loadNotionPageDate } from '../notionPageDate'
import { formatDateDe } from './dateLabels'

type TranslateFn = (key: UiTranslationKey) => string

/** Patient name + demographics line for the clinical hero strip. */
export function buildClinicalHeroMeta(
  caseId: string,
  t: TranslateFn,
): { name: string; metaLine: string | null } {
  const meta = getCaseMeta(caseId)
  const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
    .filter(Boolean)
    .join(' ')
  const displayName =
    structuredName ||
    meta?.localName?.trim() ||
    (isDemoCase(caseId) ? t('demoPatientDisplayName') : t('patientNavFallback'))

  const geschlecht = meta?.localGeschlecht
  const genderLabel =
    geschlecht === 'maennlich'
      ? t('patientGeschlechtMaennlich')
      : geschlecht === 'weiblich'
        ? t('patientGeschlechtWeiblich')
        : geschlecht === 'divers'
          ? t('patientGeschlechtDivers')
          : null

  const ageLabel = meta?.localAge?.trim() ? `${meta.localAge} J` : null
  const admissionIso = loadNotionPageDate('aufnahme', caseId)
  const admissionLabel = admissionIso ? formatDateDe(admissionIso) : null

  const parts = [
    ageLabel,
    genderLabel,
    admissionLabel ? t('overviewHeroAdmission').replace('{date}', admissionLabel) : null,
  ].filter(Boolean)

  return { name: displayName, metaLine: parts.length > 0 ? parts.join(' · ') : null }
}
