import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { SymptomStructuredCue } from '../../components/notion/overview/types'

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

const NOT_DOCUMENTED = 'nicht dokumentiert'

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

function buildDocumentedCues(
  imprint: ClinicalImprintRecord,
  slots: PsychopathologyDomainSlot[],
): SymptomStructuredCue[] {
  return slots.flatMap((slot) => {
    const value = imprintFieldValue(imprint, slot.field)
    return value ? [{ label: slot.label, value }] : []
  })
}

/**
 * Build structured psychopathology cues for the overview card from the latest
 * imprint and active ICD-10 diagnoses. Never invents clinical values — only
 * surfaces documented imprint fields or explicit "nicht dokumentiert" placeholders
 * for diagnosis-priority slots when at least one priority field is documented.
 */
export function buildPsychopathologyStructuredCues(
  imprint: ClinicalImprintRecord | null,
  icd10Codes: string[],
): SymptomStructuredCue[] {
  if (!imprint) return []

  const profile = mergePsychopathologyProfiles(icd10Codes)
  const hasDiagnosisProfile = profile.groups.length > 0

  if (!hasDiagnosisProfile) {
    return buildDocumentedCues(imprint, GENERIC_PSYCHOPATHOLOGY_SLOTS)
  }

  const documentedInProfile = profile.slots.filter((slot) =>
    Boolean(imprintFieldValue(imprint, slot.field)),
  )

  if (documentedInProfile.length === 0) {
    const generic = buildDocumentedCues(imprint, GENERIC_PSYCHOPATHOLOGY_SLOTS)
    if (generic.length > 0) return generic
    return profile.slots.map((slot) => ({ label: slot.label, value: NOT_DOCUMENTED }))
  }

  return profile.slots.map((slot) => ({
    label: slot.label,
    value: imprintFieldValue(imprint, slot.field) ?? NOT_DOCUMENTED,
  }))
}

/** Exported for tests — summary of all disorder groups and their priority slots. */
export function listPsychopathologyGroupProfiles(): Record<
  PsychopathologyDisorderGroup,
  DisorderGroupProfile
> {
  return GROUP_PROFILES
}
