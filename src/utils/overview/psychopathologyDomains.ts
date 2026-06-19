import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { SymptomStructuredCue } from '../../components/notion/overview/types'
import {
  PSYCHOPATH_EXTRACT_FIELD_LABELS,
  PSYCHOPATH_OVERVIEW_DOMAIN_ORDER,
  type PsychopathDomainAssessment,
  type PsychopathDomainStatus,
  type PsychopathExtractFields,
  type PsychopathOverviewDomainKey,
} from '../../schemas/psychopath/extraction'

/** Imprint fields surfaced as structured psychopathology cues. */
export type PsychopathologyImprintField = keyof Pick<
  ClinicalImprintRecord,
  | 'affect'
  | 'drive'
  | 'thoughtContent'
  | 'thoughtForm'
  | 'perception'
  | 'selfDisturbance'
  | 'cognition'
  | 'sleep'
  | 'insight'
  | 'suicidality'
  | 'riskSelf'
  | 'riskOthers'
  | 'cooperation'
  | 'functioning'
  | 'socialInteraction'
  | 'hygieneSelfCare'
  | 'aggression'
>

export interface PsychopathologyDomainSlot {
  field: PsychopathologyImprintField
  label: string
}

export type PsychopathologyDisorderGroup =
  | 'psychotic'
  | 'mood'
  | 'anxiety_ocd'
  | 'adhd'
  | 'substance'
  | 'personality'

interface DisorderGroupProfile {
  /** Short German context label for the overview card subtitle. */
  contextLabel: string
  slots: PsychopathologyDomainSlot[]
}

/** AMDP risk axes — shown in the safety strip, not the compact domain grid. */
export const RISK_OVERVIEW_DOMAIN_KEYS = new Set<PsychopathOverviewDomainKey>([
  'suicidality',
  'riskSelf',
  'riskOthers',
])

/** Map AMDP overview keys to clinical imprint fields (null = AI-only). */
const AMDP_TO_IMPRINT: Partial<Record<PsychopathOverviewDomainKey, PsychopathologyImprintField>> = {
  attention: 'cognition',
  memory: 'cognition',
  affect: 'affect',
  drive: 'drive',
  psychomotor: 'drive',
  thoughtContent: 'thoughtContent',
  thoughtForm: 'thoughtForm',
  perception: 'perception',
  selfDisturbance: 'selfDisturbance',
  sleep: 'sleep',
  cooperation: 'cooperation',
  insight: 'insight',
  suicidality: 'suicidality',
  riskSelf: 'riskSelf',
  riskOthers: 'riskOthers',
  aggression: 'aggression',
  functioning: 'functioning',
  socialInteraction: 'socialInteraction',
  hygieneSelfCare: 'hygieneSelfCare',
}

/** Default four cues when no diagnosis profile applies or as documented fallback. */
export const GENERIC_PSYCHOPATHOLOGY_SLOTS: PsychopathologyDomainSlot[] = [
  { field: 'affect', label: 'Affekt' },
  { field: 'drive', label: 'Antrieb' },
  { field: 'thoughtContent', label: 'Denkinhalt' },
  { field: 'insight', label: 'Krankheitseinsicht' },
]

const GROUP_PROFILES: Record<PsychopathologyDisorderGroup, DisorderGroupProfile> = {
  psychotic: {
    contextLabel: 'schizophrenes Spektrum',
    slots: [
      { field: 'thoughtContent', label: 'Denkinhalt' },
      { field: 'perception', label: 'Wahrnehmung' },
      { field: 'selfDisturbance', label: 'Ich-Störungen' },
      { field: 'thoughtForm', label: 'Formaler Denkablauf' },
      { field: 'insight', label: 'Krankheitseinsicht' },
    ],
  },
  mood: {
    contextLabel: 'affektive Störung',
    slots: [
      { field: 'affect', label: 'Affekt' },
      { field: 'drive', label: 'Antrieb' },
      { field: 'sleep', label: 'Schlaf' },
      { field: 'suicidality', label: 'Suizidalität' },
      { field: 'insight', label: 'Krankheitseinsicht' },
    ],
  },
  anxiety_ocd: {
    contextLabel: 'Angst-/Zwangsspektrum',
    slots: [
      { field: 'affect', label: 'Angst/Spannung' },
      { field: 'thoughtContent', label: 'Zwangsideen' },
      { field: 'cognition', label: 'Grübeln/Aufmerksamkeit' },
      { field: 'functioning', label: 'Vermeidung/Funktion' },
      { field: 'insight', label: 'Krankheitseinsicht' },
    ],
  },
  adhd: {
    contextLabel: 'ADHS',
    slots: [
      { field: 'cognition', label: 'Aufmerksamkeit' },
      { field: 'drive', label: 'Impulsivität/Hyperaktivität' },
      { field: 'functioning', label: 'Organisation/Funktion' },
      { field: 'affect', label: 'Affektregulation' },
    ],
  },
  substance: {
    contextLabel: 'substanzbezogen',
    slots: [
      { field: 'insight', label: 'Krankheitseinsicht' },
      { field: 'affect', label: 'Affekt' },
      { field: 'cognition', label: 'Kognition' },
      { field: 'sleep', label: 'Schlaf/Entzug' },
      { field: 'functioning', label: 'Funktionieren' },
    ],
  },
  personality: {
    contextLabel: 'Persönlichkeitsbezogen',
    slots: [
      { field: 'socialInteraction', label: 'Zwischenmenschlich' },
      { field: 'affect', label: 'Affektregulation' },
      { field: 'functioning', label: 'Funktionieren' },
      { field: 'aggression', label: 'Impulsivität/Aggression' },
      { field: 'insight', label: 'Krankheitseinsicht' },
    ],
  },
}

const NEGATIVE_VALUE_PATTERN =
  /\bunauffällig\b|\bunremarkable\b|\bkeine?\b|\bnein\b|\bnicht vorhanden\b|\bnicht dokumentiert\b|\bwithin normal\b|\bnormal\b|\bregelrecht\b|\bintakt\b|\bkein anhalt\b|\bverneint\b|\bausgeschlossen\b/i

const UNCLEAR_VALUE_PATTERN =
  /\bunklar\b|\bnicht beurteilbar\b|\bfraglich\b|\bunsicher\b|\bteilweise\b|\bmöglich\b|\bnicht sicher\b/i

/** Map an ICD-10 code prefix to a psychopathology disorder group. */
export function resolvePsychopathologyGroup(icd10Code: string): PsychopathologyDisorderGroup | null {
  const code = icd10Code.trim().toUpperCase()
  if (!code) return null
  if (/^F90/.test(code)) return 'adhd'
  if (/^F1[0-9]/.test(code)) return 'substance'
  if (/^F2[0-9]/.test(code)) return 'psychotic'
  if (/^F3[0-9]/.test(code)) return 'mood'
  if (/^F4[0-8]/.test(code)) return 'anxiety_ocd'
  if (/^F6[0-9]/.test(code)) return 'personality'
  return null
}

export interface MergedPsychopathologyProfile {
  slots: PsychopathologyDomainSlot[]
  /** Context label from the primary (first) mapped diagnosis group. */
  contextLabel: string | null
  /** Ordered unique groups contributing to the merge. */
  groups: PsychopathologyDisorderGroup[]
}

/**
 * Merge diagnosis-specific psychopathology slots: primary diagnosis first, then
 * secondary; dedupe by imprint field; cap at `maxSlots` (default 6).
 */
export function mergePsychopathologyProfiles(
  icd10Codes: string[],
  maxSlots = 6,
): MergedPsychopathologyProfile {
  const codes = icd10Codes.map((c) => c.trim()).filter(Boolean)
  const groups: PsychopathologyDisorderGroup[] = []

  for (const code of codes) {
    const group = resolvePsychopathologyGroup(code)
    if (group && !groups.includes(group)) groups.push(group)
  }

  if (groups.length === 0) {
    return {
      slots: GENERIC_PSYCHOPATHOLOGY_SLOTS,
      contextLabel: null,
      groups: [],
    }
  }

  const slots: PsychopathologyDomainSlot[] = []
  const seenFields = new Set<PsychopathologyImprintField>()

  for (const group of groups) {
    for (const slot of GROUP_PROFILES[group].slots) {
      if (seenFields.has(slot.field)) continue
      seenFields.add(slot.field)
      slots.push(slot)
      if (slots.length >= maxSlots) break
    }
    if (slots.length >= maxSlots) break
  }

  return {
    slots,
    contextLabel: GROUP_PROFILES[groups[0]].contextLabel,
    groups,
  }
}

function imprintFieldValue(
  imprint: ClinicalImprintRecord,
  field: PsychopathologyImprintField,
): string | null {
  const raw = imprint[field]
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeAiFieldValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Single-word fragments that are never valid positive/unclear detail on their own. */
const GENERIC_DETAIL_TOKENS = new Set([
  'unklar',
  'positiv',
  'positive',
  'negativ',
  'negative',
  'gedanken',
  'kontakt',
  'antrieb',
  'suizidale',
  'suizidal',
  'suizid',
  'suizidalität',
  'krankheitseinsicht',
  'einsicht',
  'sozial',
  'sozialverhalten',
  'denken',
  'denkablauf',
  'wahrnehmung',
  'affekt',
  'affektivität',
  'stimmung',
  'kooperation',
  'kooperativ',
  'hygiene',
  'appetit',
  'schlaf',
  'orientierung',
  'bewusstsein',
  'vigilanz',
  'gedächtnis',
  'aufmerksamkeit',
  'kognition',
  'psychomotorik',
  'psychomotor',
  'selbstgefährdung',
  'fremdgefährdung',
  'eigengefährdung',
  'selbstgefährd',
  'eigengefährd',
  'fremdgefährd',
  'funktionieren',
  'sexualität',
  'aggression',
  'impulsivität',
  'selbstfürsorge',
  'grübeln',
])

function detailWordTokens(detail: string): string[] {
  return normalizeComparableText(detail)
    .split(/[\s,;/·-]+/)
    .map((word) => word.replace(/[^a-zäöüß0-9]/g, ''))
    .filter((word) => word.length >= 3)
}

function labelWordParts(domainKey: PsychopathOverviewDomainKey): string[] {
  return normalizeComparableText(PSYCHOPATH_EXTRACT_FIELD_LABELS[domainKey])
    .split(/[\s/]+/)
    .map((part) => part.replace(/[^a-zäöüß0-9]/g, ''))
    .filter((part) => part.length >= 4)
}

/**
 * True when `detail` is a concise clinical qualifier — not a domain-label echo or
 * generic keyword fragment extracted by regex heuristics.
 */
export function isMeaningfulDetail(
  detail: string | null | undefined,
  domainKey: PsychopathOverviewDomainKey,
): boolean {
  const trimmed = detail?.trim()
  if (!trimmed || trimmed.length < 3) return false

  const normalized = normalizeComparableText(trimmed)
  const label = normalizeComparableText(PSYCHOPATH_EXTRACT_FIELD_LABELS[domainKey])
  const words = detailWordTokens(trimmed)

  if (normalized === label) return false

  if (words.length === 1) {
    const word = words[0]!
    if (GENERIC_DETAIL_TOKENS.has(word)) return false
    if (labelWordParts(domainKey).some((part) => part === word || part.startsWith(word) || word.startsWith(part))) {
      return false
    }
  }

  if (
    normalized.length <= 14 &&
    label.includes(normalized) &&
    words.every((word) => GENERIC_DETAIL_TOKENS.has(word) || label.includes(word))
  ) {
    return false
  }

  if (domainKey === 'suicidality') {
    if (/^suizid(?:ale|al)?$/.test(normalized.replace(/\s+/g, ''))) return false
    if (words.length === 1 && /^suizid/.test(words[0]!) && words[0]!.length <= 10) return false
  }

  return true
}

/** Downgrade positive/unclear rows whose detail is a label echo or generic fragment. */
export function sanitizePsychopathDomainAssessment(
  assessment: PsychopathDomainAssessment,
): PsychopathDomainAssessment {
  if (assessment.status === 'negative') {
    return { ...assessment, detail: null }
  }
  const detail = assessment.detail?.trim() ?? null
  if (!detail || !isMeaningfulDetail(detail, assessment.domainKey)) {
    return { ...assessment, status: 'negative', detail: null }
  }
  return { ...assessment, detail }
}

function sanitizeDomainAssessments(assessments: PsychopathDomainAssessment[]): PsychopathDomainAssessment[] {
  return assessments.map(sanitizePsychopathDomainAssessment)
}

/** Re-sanitize cached AI domains on load (guards against stale label-echo positives). */
export function sanitizePsychopathDomainAssessments(
  assessments: PsychopathDomainAssessment[],
): PsychopathDomainAssessment[] {
  return dedupeRiskDomainAssessments(sanitizeDomainAssessments(assessments))
}

function excludeRiskDomainsFromCues(cues: SymptomStructuredCue[]): SymptomStructuredCue[] {
  return cues.filter((cue) => !cue.domainKey || !RISK_OVERVIEW_DOMAIN_KEYS.has(cue.domainKey))
}

/** Infer tri-state status from a documented imprint or legacy string value. */
export function inferTriStateFromText(value: string | null | undefined): PsychopathDomainStatus {
  const trimmed = value?.trim()
  if (!trimmed) return 'negative'
  if (NEGATIVE_VALUE_PATTERN.test(trimmed)) return 'negative'
  if (UNCLEAR_VALUE_PATTERN.test(trimmed)) return 'unclear'
  return 'positive'
}

function resolveAmdpDomainValue(
  domainKey: PsychopathOverviewDomainKey,
  imprint: ClinicalImprintRecord | null,
  aiFields: PsychopathExtractFields | null | undefined,
): string | null {
  const aiValue = normalizeAiFieldValue(aiFields?.[domainKey])
  if (aiValue) return aiValue

  if (domainKey === 'attention') {
    const legacyCognition = normalizeAiFieldValue(aiFields?.cognition)
    if (legacyCognition) return legacyCognition
  }

  const imprintField = AMDP_TO_IMPRINT[domainKey]
  if (!imprintField || !imprint) return null

  const imprintValue = imprintFieldValue(imprint, imprintField)
  if (!imprintValue) return null

  // cognition maps to both attention and memory — prefer attention only
  if (imprintField === 'cognition' && domainKey === 'memory') return null
  // drive maps to both antrieb and psychomotor — show on antrieb only
  if (imprintField === 'drive' && domainKey === 'psychomotor') return null

  return imprintValue
}

/**
 * When suicidality and riskSelf carry the same clinical phrase, keep only
 * suicidality (AMDP: Suizidalität vs Selbstgefährdung are distinct concepts).
 */
export function dedupeRiskDomainAssessments(
  assessments: PsychopathDomainAssessment[],
): PsychopathDomainAssessment[] {
  const suicide = assessments.find((a) => a.domainKey === 'suicidality')
  const selfRisk = assessments.find((a) => a.domainKey === 'riskSelf')
  if (!suicide || !selfRisk) return assessments

  const suicideDetail = normalizeComparableText(suicide.detail ?? '')
  const selfDetail = normalizeComparableText(selfRisk.detail ?? '')
  const overlaps =
    (suicideDetail && selfDetail && (suicideDetail === selfDetail || selfDetail.includes(suicideDetail))) ||
    (suicide.status !== 'negative' && selfRisk.status !== 'negative' && /suizid/i.test(selfDetail))

  if (!overlaps) return assessments

  return assessments.map((assessment) =>
    assessment.domainKey === 'riskSelf' ? { ...assessment, status: 'negative' as const, detail: null } : assessment,
  )
}

/** Heuristic tri-state inference from imprint + legacy AI string fields. */
export function inferDomainAssessmentsFromSources(
  imprint: ClinicalImprintRecord | null,
  aiFields?: PsychopathExtractFields | null,
): PsychopathDomainAssessment[] {
  const assessments = sanitizeDomainAssessments(
    PSYCHOPATH_OVERVIEW_DOMAIN_ORDER.map((domainKey) => {
      const raw = resolveAmdpDomainValue(domainKey, imprint, aiFields)
      const status = inferTriStateFromText(raw)
      return {
        domainKey,
        status,
        detail: status === 'negative' ? null : raw,
      }
    }),
  )
  return dedupeRiskDomainAssessments(assessments)
}

export interface BuildAmdpOverviewGridOptions {
  imprint: ClinicalImprintRecord | null
  aiFields?: PsychopathExtractFields | null
  /** Tri-state domain assessments — preferred over legacy string fields. */
  domains?: PsychopathDomainAssessment[] | null
  /** When true, emit every AMDP subheading regardless of status (debug/print). */
  showAllDomains?: boolean
}

export interface BuildAmdpOverviewGridResult {
  cues: SymptomStructuredCue[]
  /** True when at least one domain is negative and compact mode hides them. */
  hasUnremarkableDomains: boolean
}

function assessmentToCue(assessment: PsychopathDomainAssessment): SymptomStructuredCue {
  return {
    domainKey: assessment.domainKey,
    label: PSYCHOPATH_EXTRACT_FIELD_LABELS[assessment.domainKey],
    value: assessment.detail?.trim() || undefined,
    status: assessment.status,
  }
}

/**
 * Build the compact AMDP overview grid. Only positive and unclear domains are
 * shown unless `showAllDomains` is true.
 */
export function buildAmdpOverviewGrid(options: BuildAmdpOverviewGridOptions): SymptomStructuredCue[] {
  return buildAmdpOverviewGridWithMeta(options).cues
}

export function buildAmdpOverviewGridWithMeta(
  options: BuildAmdpOverviewGridOptions,
): BuildAmdpOverviewGridResult {
  const { imprint, aiFields, domains, showAllDomains = false } = options
  const assessments = dedupeRiskDomainAssessments(
    sanitizeDomainAssessments(domains ?? inferDomainAssessmentsFromSources(imprint, aiFields)),
  )

  const cues: SymptomStructuredCue[] = []
  let hasUnremarkableDomains = false

  for (const assessment of assessments) {
    if (assessment.status === 'negative') {
      hasUnremarkableDomains = true
      if (!showAllDomains) continue
    }
    cues.push(assessmentToCue(assessment))
  }

  return { cues: excludeRiskDomainsFromCues(cues), hasUnremarkableDomains }
}

/**
 * Build structured psychopathology cues for the overview card from the latest
 * imprint and optional AI tri-state domains.
 */
export function buildPsychopathologyStructuredCues(
  imprint: ClinicalImprintRecord | null,
  icd10Codes: string[],
  aiFields?: PsychopathExtractFields | null,
  options: {
    showAllDomains?: boolean
    domains?: PsychopathDomainAssessment[] | null
  } = {},
): SymptomStructuredCue[] {
  void icd10Codes
  if (!imprint && !aiFields && !options.domains) return []
  return buildAmdpOverviewGrid({
    imprint,
    aiFields,
    domains: options.domains,
    showAllDomains: options.showAllDomains ?? false,
  })
}

/** Exported for tests — summary of all disorder groups and their priority slots. */
export function listPsychopathologyGroupProfiles(): Record<
  PsychopathologyDisorderGroup,
  DisorderGroupProfile
> {
  return GROUP_PROFILES
}

/** Count of AMDP overview subheadings (complete set, no sampling). */
export function amdpOverviewDomainCount(): number {
  return PSYCHOPATH_OVERVIEW_DOMAIN_ORDER.length
}
