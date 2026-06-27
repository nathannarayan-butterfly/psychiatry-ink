import { getCaseMeta } from '../../hooks/useCaseRegistry'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { DEFAULT_CASE_ID, shortCaseId } from '../caseContext'
import { calculateAgeFromIsoDate } from '../clinicalDate'
import { loadBefunde } from '../laborArchive'
import { loadNotionPageDate } from '../notionPageDate'
import { loadVerlaufFeed } from '../verlaufFeed'
import { resolveCaseAnthropometry } from '../documentTemplate/anthropometryContext'
import { formatDateDe } from './dateLabels'

type TranslateFn = (key: UiTranslationKey) => string

export const CLINICAL_HERO_MISSING = '—'

export interface ClinicalHeroDemographics {
  dob: string | null
  age: string | null
  sex: string | null
  admission: string | null
  height: string | null
  weight: string | null
}

export interface ClinicalHeroMeta {
  name: string
  demographics: ClinicalHeroDemographics
  /** @deprecated Prefer `demographics` — kept for compact print/export strings. */
  metaLine: string
  isAssigned: boolean
}

function formatAgeYears(age: number, t: TranslateFn): string {
  return `${age} ${t('patientAgeYearsAbbrev')}`
}

function resolveAgeLabel(
  geburtsdatum: string | undefined,
  storedAge: string | undefined,
  t: TranslateFn,
): string | null {
  const calculated = calculateAgeFromIsoDate(geburtsdatum)
  if (calculated !== null) return formatAgeYears(calculated, t)

  const trimmed = storedAge?.trim()
  if (!trimmed) return null
  const numeric = trimmed.replace(/[^\d]/g, '')
  if (!numeric) return null
  return formatAgeYears(Number(numeric), t)
}

function resolveSexLabel(
  geschlecht: string | undefined,
  t: TranslateFn,
): string | null {
  if (geschlecht === 'maennlich') return t('patientGeschlechtMaennlich')
  if (geschlecht === 'weiblich') return t('patientGeschlechtWeiblich')
  if (geschlecht === 'divers') return t('patientGeschlechtDivers')
  return null
}

export function formatClinicalHeroDemographicsLine(
  demographics: ClinicalHeroDemographics,
  t: TranslateFn,
): string {
  const missing = CLINICAL_HERO_MISSING
  return [
    `${t('patientFieldGeburtsdatum')}: ${demographics.dob ?? missing}`,
    `${t('patientAgeLabel')}: ${demographics.age ?? missing}`,
    `${t('patientFieldGeschlecht')}: ${demographics.sex ?? missing}`,
    `${t('patientFieldAufnahmedatum')}: ${demographics.admission ?? missing}`,
    `${t('patientFieldGroesse')}: ${demographics.height ?? missing}`,
    `${t('patientFieldGewicht')}: ${demographics.weight ?? missing}`,
  ].join(' · ')
}

/** Patient name + demographics for the clinical hero strip. */
export function buildClinicalHeroMeta(caseId: string, t: TranslateFn): ClinicalHeroMeta {
  const meta = getCaseMeta(caseId)
  const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
    .filter(Boolean)
    .join(' ')
  const assignedName =
    structuredName ||
    meta?.localName?.trim() ||
    meta?.pageHeading?.trim() ||
    undefined
  const isAssigned = Boolean(assignedName)
  const displayName =
    assignedName ||
    (caseId === DEFAULT_CASE_ID
      ? t('topNavWorkspaceFall')
      : t('patientCaseUnassigned').replace('{id}', shortCaseId(caseId)))

  const demographics: ClinicalHeroDemographics = {
    dob: formatDateDe(meta?.localGeburtsdatum?.trim()),
    age: resolveAgeLabel(meta?.localGeburtsdatum, meta?.localAge, t),
    sex: resolveSexLabel(meta?.localGeschlecht, t),
    admission: formatDateDe(loadNotionPageDate('aufnahme', caseId)),
    height: null,
    weight: null,
  }

  if (caseId !== DEFAULT_CASE_ID) {
    const anthropometry = resolveCaseAnthropometry(loadBefunde(caseId), loadVerlaufFeed(caseId))
    demographics.height = anthropometry.height ?? null
    demographics.weight = anthropometry.weight ?? null
  }

  return {
    name: displayName,
    demographics,
    metaLine: formatClinicalHeroDemographicsLine(demographics, t),
    isAssigned,
  }
}
