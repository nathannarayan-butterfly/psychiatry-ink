import type {
  LabCorrelationStrength,
  LabTemporalPlausibility,
  MedicationLabCorrelationKnowledge,
} from '../../src/types/labMedicationCorrelation'
import { buildCorrelationKey } from '../../src/utils/labMedicationCorrelation/correlationKey'
import { normalizeLabParameter } from '../../src/utils/labMedicationCorrelation/parameterNormalize'
import { MEDICATION_LAB_CORRELATION_SEED } from '../../src/data/kb/medicationLabCorrelationSeed'
import { getDrugsForSubstance } from '../../src/data/psychDrugReference/index'
import { resolveSubstances, type ResolvedSubstance } from './combinationCheckKb'

const seedByKey = new Map(
  MEDICATION_LAB_CORRELATION_SEED.map((rule) => [rule.correlationKey, rule]),
)

const SSRI_IDS = new Set([
  'sertralin',
  'escitalopram',
  'citalopram',
  'fluoxetin',
  'paroxetin',
  'fluvoxamin',
])

const SNRI_IDS = new Set(['venlafaxin', 'duloxetin', 'milnacipran'])

const ANTIPSYCHOTIC_IDS = new Set([
  'clozapin',
  'olanzapin',
  'risperidon',
  'quetiapin',
  'aripiprazol',
  'ziprasidon',
  'paliperidon',
  'amisulprid',
  'haloperidol',
  'chlorpromazin',
  'perphenazin',
  'zuclopenthixol',
  'flupentixol',
])

function substanceClassKeys(substanceId: string): string[] {
  const keys: string[] = []
  if (SSRI_IDS.has(substanceId)) keys.push('class:ssri')
  if (SNRI_IDS.has(substanceId)) keys.push('class:snri')
  if (ANTIPSYCHOTIC_IDS.has(substanceId)) keys.push('class:antipsychotic')
  return keys
}

function resolveSubstanceIdFromReference(inputName: string): string | null {
  const drugs = getDrugsForSubstance(inputName)
  return drugs[0]?.id ?? null
}

export function lookupMedicationLabCorrelation(
  substance: ResolvedSubstance,
  labParameter: string,
): MedicationLabCorrelationKnowledge | null {
  const normalizedParam = normalizeLabParameter(labParameter)
  if (!normalizedParam) return null

  const directKey = buildCorrelationKey(substance.substanceId, normalizedParam)
  const direct = seedByKey.get(directKey)
  if (direct) {
    return {
      ...direct,
      substanceName: substance.displayName,
      substanceId: substance.substanceId,
    }
  }

  const refId = resolveSubstanceIdFromReference(substance.inputName)
  if (refId && refId !== substance.substanceId) {
    const refKey = buildCorrelationKey(refId, normalizedParam)
    const refHit = seedByKey.get(refKey)
    if (refHit) {
      return {
        ...refHit,
        substanceName: substance.displayName,
        substanceId: refId,
        correlationKey: buildCorrelationKey(refId, normalizedParam),
      }
    }
  }

  const classIds = substanceClassKeys(refId ?? substance.substanceId)
  for (const classId of classIds) {
    const classKey = buildCorrelationKey(classId, normalizedParam)
    const classHit = seedByKey.get(classKey)
    if (classHit) {
      return {
        ...classHit,
        substanceName: substance.displayName,
        substanceId: refId ?? substance.substanceId,
        correlationKey: buildCorrelationKey(refId ?? substance.substanceId, normalizedParam),
      }
    }
  }

  return null
}

export async function lookupInternalLabCorrelations(
  substanceNames: string[],
  labParameters: string[],
): Promise<MedicationLabCorrelationKnowledge[]> {
  const resolved = await resolveSubstances(substanceNames)
  const results: MedicationLabCorrelationKnowledge[] = []
  const seen = new Set<string>()

  for (const substance of resolved) {
    for (const param of labParameters) {
      const hit = lookupMedicationLabCorrelation(substance, param)
      if (hit && !seen.has(hit.correlationKey)) {
        seen.add(hit.correlationKey)
        results.push(hit)
      }
    }
  }

  return results
}

const STRENGTH_RANK: Record<LabCorrelationStrength, number> = {
  none: 0,
  possible: 1,
  plausible: 2,
  monitoring_required: 3,
  concerning: 4,
}

export function correlationStrengthsConflict(
  kb: LabCorrelationStrength,
  ai: LabCorrelationStrength,
): boolean {
  return Math.abs(STRENGTH_RANK[kb] - STRENGTH_RANK[ai]) >= 2
}

export function compareTemporalPlausibility(
  medStart?: string,
  doseChange?: string,
  labDate?: string,
): LabTemporalPlausibility {
  if (!labDate) return 'uncertain'
  const lab = new Date(labDate).getTime()
  if (Number.isNaN(lab)) return 'uncertain'

  const ref = doseChange ?? medStart
  if (!ref) return 'uncertain'
  const med = new Date(ref).getTime()
  if (Number.isNaN(med)) return 'uncertain'

  const days = (lab - med) / (1000 * 60 * 60 * 24)
  if (days < 0) return 'unlikely'
  if (days <= 14) return 'highly_plausible'
  if (days <= 90) return 'plausible'
  return 'uncertain'
}

// Deferred (not MVP): Supabase kb_medication_lab_correlations table sync.
