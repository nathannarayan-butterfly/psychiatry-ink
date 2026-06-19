import { z } from 'zod'
import type { CourseDirection } from '../../types/clinicalImprint'
import type { UiTranslationKey } from '../../data/uiTranslations'

/**
 * Full AMDP-System psychopathology field keys accepted by the extraction API.
 * `cognition` is legacy — merged into `attention` at display time when attention is empty.
 */
export const PSYCHOPATH_EXTRACT_FIELD_KEYS = [
  'consciousness',
  'orientation',
  'attention',
  'memory',
  'thoughtForm',
  'thoughtContent',
  'perception',
  'selfDisturbance',
  'affect',
  'drive',
  'psychomotor',
  'suicidality',
  'riskSelf',
  'riskOthers',
  'sleep',
  'appetite',
  'sexuality',
  'socialInteraction',
  'cooperation',
  'aggression',
  'insight',
  'functioning',
  'hygieneSelfCare',
  'cognition',
] as const

export type PsychopathExtractFieldKey = (typeof PSYCHOPATH_EXTRACT_FIELD_KEYS)[number]

/** Canonical AMDP overview grid order — every subheading sent to KI extraction. */
export const PSYCHOPATH_OVERVIEW_DOMAIN_ORDER = [
  'consciousness',
  'orientation',
  'attention',
  'memory',
  'thoughtForm',
  'thoughtContent',
  'perception',
  'selfDisturbance',
  'affect',
  'drive',
  'psychomotor',
  'suicidality',
  'riskSelf',
  'riskOthers',
  'sleep',
  'appetite',
  'sexuality',
  'socialInteraction',
  'cooperation',
  'aggression',
  'insight',
  'functioning',
  'hygieneSelfCare',
] as const satisfies readonly PsychopathExtractFieldKey[]

export type PsychopathOverviewDomainKey = (typeof PSYCHOPATH_OVERVIEW_DOMAIN_ORDER)[number]

export const PsychopathDomainStatusSchema = z.enum(['positive', 'unclear', 'negative'])
export type PsychopathDomainStatus = z.infer<typeof PsychopathDomainStatusSchema>

export const PsychopathDomainAssessmentSchema = z.object({
  domainKey: z.enum(PSYCHOPATH_OVERVIEW_DOMAIN_ORDER),
  status: PsychopathDomainStatusSchema,
  /** Concise clinical qualifier when positive or unclear (e.g. "reduziert", "gedrückt"). */
  detail: z.string().nullable().optional(),
})

export type PsychopathDomainAssessment = z.infer<typeof PsychopathDomainAssessmentSchema>

export const PsychopathExtractFieldsSchema = z.object(
  Object.fromEntries(
    PSYCHOPATH_EXTRACT_FIELD_KEYS.map((key) => [key, z.string().nullable().optional()]),
  ) as Record<PsychopathExtractFieldKey, z.ZodOptional<z.ZodNullable<z.ZodString>>>,
)

export const PsychopathDomainHeadingSchema = z.object({
  domainKey: z.enum(PSYCHOPATH_OVERVIEW_DOMAIN_ORDER),
  label: z.string().min(1),
})

export const PsychopathExtractRequestSchema = z.object({
  /** De-identified PPB narrative — PHI must be scrubbed client-side before send. */
  deidentifiedText: z.string().min(20).max(20_000),
  language: z.enum(['de', 'en', 'fr', 'es']),
  /** Hash of the original (pre-deid) text for cache invalidation. */
  sourceTextHash: z.string().min(4).max(64),
  icd10Codes: z.array(z.string()).max(20).optional(),
  /** AMDP domain headings shown to the model (all 23 overview domains). */
  domainHeadings: z.array(PsychopathDomainHeadingSchema).min(1).max(30).optional(),
})

export type PsychopathExtractRequest = z.infer<typeof PsychopathExtractRequestSchema>

export const PsychopathExtractResponseSchema = z.object({
  mock: z.boolean().optional(),
  /** Advisory note when heuristic fallback was used (no secrets). */
  warning: z.string().optional(),
  /** Tri-state assessment per AMDP domain — primary structured output. */
  domains: z.array(PsychopathDomainAssessmentSchema).optional(),
  /** Legacy string fields — derived from domains when absent. */
  fields: PsychopathExtractFieldsSchema.optional(),
  courseDirection: z
    .enum(['new', 'improved', 'worsened', 'stable', 'fluctuating', 'resolved', 'unclear'])
    .nullable()
    .optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
})

export type PsychopathExtractResponse = z.infer<typeof PsychopathExtractResponseSchema>

export type PsychopathExtractFields = Partial<Record<PsychopathExtractFieldKey, string | null>>

/** German fallback labels for the Übersicht AMDP grid. */
export const PSYCHOPATH_EXTRACT_FIELD_LABELS: Record<PsychopathExtractFieldKey, string> = {
  consciousness: 'Bewusstsein / Vigilanz',
  orientation: 'Orientierung',
  attention: 'Aufmerksamkeit',
  memory: 'Gedächtnis',
  thoughtForm: 'Formales Denken',
  thoughtContent: 'Inhaltliches Denken',
  perception: 'Wahrnehmung',
  selfDisturbance: 'Ich-Störungen',
  affect: 'Affektivität',
  drive: 'Antrieb',
  psychomotor: 'Psychomotorik',
  suicidality: 'Suizidalität',
  riskSelf: 'Selbstgefährdung',
  riskOthers: 'Fremdgefährdung',
  sleep: 'Schlaf',
  appetite: 'Appetit',
  sexuality: 'Sexualität',
  socialInteraction: 'Sozialverhalten / Kontakt',
  cooperation: 'Kooperation',
  aggression: 'Aggression / Impulsivität',
  insight: 'Krankheitseinsicht',
  functioning: 'Funktionieren',
  hygieneSelfCare: 'Hygiene / Selbstfürsorge',
  cognition: 'Aufmerksamkeit / Kognition',
}

/** i18n keys for AMDP overview domain labels (de/en/fr/es). */
export const PSYCHOPATH_DOMAIN_I18N_KEYS: Record<PsychopathOverviewDomainKey, UiTranslationKey> = {
  consciousness: 'psychopathDomainConsciousness',
  orientation: 'psychopathDomainOrientation',
  attention: 'psychopathDomainAttention',
  memory: 'psychopathDomainMemory',
  thoughtForm: 'psychopathDomainThoughtForm',
  thoughtContent: 'psychopathDomainThoughtContent',
  perception: 'psychopathDomainPerception',
  selfDisturbance: 'psychopathDomainSelfDisturbance',
  affect: 'psychopathDomainAffect',
  drive: 'psychopathDomainDrive',
  psychomotor: 'psychopathDomainPsychomotor',
  suicidality: 'psychopathDomainSuicidality',
  riskSelf: 'psychopathDomainRiskSelf',
  riskOthers: 'psychopathDomainRiskOthers',
  sleep: 'psychopathDomainSleep',
  appetite: 'psychopathDomainAppetite',
  sexuality: 'psychopathDomainSexuality',
  socialInteraction: 'psychopathDomainSocialInteraction',
  cooperation: 'psychopathDomainCooperation',
  aggression: 'psychopathDomainAggression',
  insight: 'psychopathDomainInsight',
  functioning: 'psychopathDomainFunctioning',
  hygieneSelfCare: 'psychopathDomainHygieneSelfCare',
}

export function isCourseDirection(value: unknown): value is CourseDirection {
  return (
    value === 'new' ||
    value === 'improved' ||
    value === 'worsened' ||
    value === 'stable' ||
    value === 'fluctuating' ||
    value === 'resolved' ||
    value === 'unclear'
  )
}

/** Build AMDP headings for the extraction API from i18n labels. */
export function buildPsychopathDomainHeadings(
  labels: Record<PsychopathOverviewDomainKey, string>,
): Array<{ domainKey: PsychopathOverviewDomainKey; label: string }> {
  return PSYCHOPATH_OVERVIEW_DOMAIN_ORDER.map((domainKey) => ({
    domainKey,
    label: labels[domainKey],
  }))
}

/** Map tri-state domains to legacy string fields for imprint sync. */
export function domainsToFields(domains: PsychopathDomainAssessment[]): PsychopathExtractFields {
  const fields: PsychopathExtractFields = {}
  for (const assessment of domains) {
    if (assessment.status === 'negative') {
      fields[assessment.domainKey] = null
      continue
    }
    const detail = assessment.detail?.trim()
    fields[assessment.domainKey] = detail || null
  }
  return fields
}
