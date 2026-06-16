import type {
  ClinicalDomain,
  ClinicalImprintJob,
  ClinicalSourceType,
  CourseDirection,
  EvidenceStrength,
  StructuredClinicalMetadata,
} from '../../types/clinicalImprint'
import {
  CMEA_EXTRACTOR_VERSION,
  CMEA_SCHEMA_VERSION,
  type CanonicalClinicalMetadata,
} from '../../types/clinicalMetadata'
import { buildRegexFacts, computeContentHash } from '../clinicalMetadata/regexFacts'
import { redactIdentifierPatterns } from './redactEvidence'

const MIN_SIGNAL_LENGTH = 12

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function firstSentence(text: string, maxLen = 160): string {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return ''
  const match = normalized.match(/^(.{20,}?[.!?])(?:\s|$)/)
  const sentence = match?.[1] ?? normalized
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1)}…` : sentence
}

function matchPatterns(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return normalizeWhitespace(match[0])
  }
  return null
}

function matchAllLabels(text: string, patterns: RegExp[]): string[] {
  const hits = new Set<string>()
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    const re = new RegExp(pattern.source, flags)
    for (const match of text.matchAll(re)) {
      const value = normalizeWhitespace(match[1] ?? match[0])
      if (value.length >= 3) hits.add(value)
    }
  }
  return [...hits]
}

function resolveSourceType(documentTypeId?: string, explicit?: ClinicalSourceType): ClinicalSourceType {
  if (explicit) return explicit
  switch (documentTypeId) {
    case 'aufnahme':
      return 'anamnesis'
    case 'verlauf':
    case 'therapie-verlauf':
      return 'verlauf'
    case 'arztbrief':
      return 'arztbrief'
    case 'medikation':
      return 'medication'
    default:
      return 'manual_note'
  }
}

function resolveClinicalDomain(
  sourceType: ClinicalSourceType,
  documentTypeId?: string,
  sectionLabel?: string,
  text?: string,
): ClinicalDomain {
  if (sourceType === 'diagnosis') return 'diagnosis'
  if (sourceType === 'medication') return 'medication'
  if (sourceType === 'lab') return 'lab'
  if (sourceType === 'risk') return 'risk'

  if (documentTypeId === 'psychopath' || /psychopath/i.test(sectionLabel ?? '')) {
    return 'psychopathology'
  }
  if (documentTypeId === 'medikation' || /medik/i.test(sectionLabel ?? '')) {
    return 'medication'
  }
  if (documentTypeId === 'therapieplanung' || /therap/i.test(sectionLabel ?? '')) {
    return 'therapy'
  }
  if (/labor|laborwert|blutbild|spiegel/i.test(text ?? '')) return 'lab'
  if (/suizid|fremdgefährd|risiko/i.test(text ?? '')) return 'risk'
  if (/diagnos|icd|dsm/i.test(text ?? '')) return 'diagnosis'
  if (sourceType === 'anamnesis') return 'psychopathology'
  if (sourceType === 'verlauf') return 'psychopathology'
  if (sourceType === 'arztbrief') return 'administrative'
  return 'psychopathology'
}

function resolveCourseDirection(text: string): CourseDirection | null {
  if (/neu aufgetreten|erstmalig|neu/i.test(text)) return 'new'
  if (/besser|gebessert|remittiert|rückläufig|verbessert/i.test(text)) return 'improved'
  if (/schlechter|verschlechter|zunehmend|aggraviert/i.test(text)) return 'worsened'
  if (/stabil|unverändert|gleichbleibend/i.test(text)) return 'stable'
  if (/schwankend|fluktuierend|wechselhaft/i.test(text)) return 'fluctuating'
  if (/remission|abgeklungen|resolved|verschwunden/i.test(text)) return 'resolved'
  if (/unklar|nicht beurteilbar/i.test(text)) return 'unclear'
  return null
}

function resolveSeverity(text: string): string | null {
  return (
    matchPatterns(text, [
      /\b(leicht|mittel|schwer|mild|moderat|severe)\b/i,
      /\b(\d{1,2}\s*\/\s*10)\b/,
    ]) ?? null
  )
}

function resolveEvidenceStrength(job: ClinicalImprintJob): EvidenceStrength {
  if (job.evidenceStrength) return job.evidenceStrength
  if (job.sourceType === 'ai_generation') return 'inferred'
  if (job.sourceType === 'diagnosis') return 'direct_observation'
  if (job.sourceType === 'lab') return 'direct_observation'
  return 'patient_report'
}

function buildReadableSentence(job: ClinicalImprintJob, domain: ClinicalDomain): string {
  const snippet = firstSentence(redactIdentifierPatterns(job.text))
  if (!snippet) return ''
  const label = job.sectionLabel?.trim()
  const prefix = label ? `${label}: ` : `${domain}: `
  return normalizeWhitespace(`${prefix}${snippet}`)
}

function extractFieldHits(text: string): Partial<StructuredClinicalMetadata> {
  const lower = text.toLowerCase()

  const symptoms = matchAllLabels(text, [
    /\b(angst|ängstlichkeit|depression|antriebslosigkeit|schlafstörung|halluzination|wahn|zwang)\w*/gi,
  ])

  const medicationMentioned = matchAllLabels(text, [
    /\b([A-ZÄÖÜ][a-zäöüß-]{3,}(?:\s+\d+\s*mg)?)\b/g,
    /\b(quetiapin|olanzapin|risperidon|aripiprazol|clozapin|lithium|valproat|sertralin|escitalopram|mirtazapin|venlafaxin|duloxetin)\w*/gi,
  ]).filter((name) => !/^(Patient|Herr|Frau|Datum|Verlauf)$/i.test(name))

  const diagnosisHints = matchAllLabels(text, [
    /\b(F\d{2}(?:\.\d+)?)\b/g,
    /\b(depression|schizophren|bipolar|ptbs|borderline|angststörung|zwangstörung)\w*/gi,
  ])

  return {
    symptoms,
    medicationMentioned,
    diagnosisHints,
    suicidality: matchPatterns(text, [
      /suizid\w*/i,
      /selbstmord\w*/i,
      /suizidal\w*/i,
    ]),
    riskSelf: matchPatterns(text, [/selbstgefährd\w*/i, /suizid\w*/i]),
    riskOthers: matchPatterns(text, [/fremdgefährd\w*/i]),
    aggression: matchPatterns(text, [/aggressiv\w*/i, /aggression\w*/i]),
    affect: matchPatterns(text, [/affekt\s+\w+/i, /affektiv\w*/i, /gedrückt\w*/i, /euphor\w*/i]),
    drive: matchPatterns(text, [/antrieb\w*/i, /antriebslos\w*/i]),
    thoughtContent: matchPatterns(text, [/wahn\w*/i, /überwachungs\w*/i]),
    thoughtForm: matchPatterns(text, [/gedanken\w*/i, /grübeln\w*/i]),
    perception: matchPatterns(text, [/halluzin\w*/i, /stimmen\w*/i]),
    sleep: matchPatterns(text, [/schlaf\w*/i, /insomn\w*/i]),
    cooperation: matchPatterns(text, [/kooperativ\w*/i, /mitarbeit\w*/i]),
    insight: matchPatterns(text, [/krankheitseinsicht\w*/i, /einsicht\w*/i]),
    functioning: matchPatterns(text, [/funktionsfähig\w*/i, /alltag\w*/i, /arbeit\w*/i]),
    socialInteraction: matchPatterns(text, [/sozial\w*/i, /kontakt\w*/i]),
    hygieneSelfCare: matchPatterns(text, [/hygiene\w*/i, /selbstfürsorge\w*/i]),
    sideEffects: matchPatterns(text, [/nebenwirk\w*/i, /sedier\w*/i, /gewichtszunahme/i]),
    adherence: matchPatterns(text, [/adhärenz\w*/i, /compliance\w*/i, /einnahme\w*/i]),
    medicationResponse: matchPatterns(text, [/ansprechen\w*/i, /wirkung\w*/i, /response\w*/i]),
    severity: resolveSeverity(text),
    courseDirection: resolveCourseDirection(text),
    uncertainty: /unklar|nicht sicher|verdacht/i.test(lower) ? 'mentioned' : null,
  }
}

export function hasClinicalSignal(text: string): boolean {
  return normalizeWhitespace(text).length >= MIN_SIGNAL_LENGTH
}

export function extractClinicalImprint(job: ClinicalImprintJob): CanonicalClinicalMetadata | null {
  const text = normalizeWhitespace(job.text)
  if (!hasClinicalSignal(text)) return null

  const sourceType = resolveSourceType(job.documentTypeId, job.sourceType)
  const clinicalDomain = resolveClinicalDomain(sourceType, job.documentTypeId, job.sectionLabel, text)
  const readableClinicalSentence = buildReadableSentence(job, clinicalDomain)
  if (!readableClinicalSentence) return null

  const fieldHits = extractFieldHits(text)
  const now = new Date().toISOString()

  const base: StructuredClinicalMetadata = {
    patientId: job.caseId,
    caseId: job.caseId,
    sourceType,
    sourceId: job.sourceId,
    sourceDate: job.sourceDate ?? now,
    createdAt: now,
    readableClinicalSentence,
    clinicalDomain,
    symptoms: fieldHits.symptoms ?? [],
    severity: fieldHits.severity ?? null,
    courseDirection: fieldHits.courseDirection ?? null,
    affect: fieldHits.affect ?? null,
    drive: fieldHits.drive ?? null,
    thoughtForm: fieldHits.thoughtForm ?? null,
    thoughtContent: fieldHits.thoughtContent ?? null,
    perception: fieldHits.perception ?? null,
    selfDisturbance: null,
    cognition: null,
    sleep: fieldHits.sleep ?? null,
    cooperation: fieldHits.cooperation ?? null,
    insight: fieldHits.insight ?? null,
    riskSelf: fieldHits.riskSelf ?? null,
    riskOthers: fieldHits.riskOthers ?? null,
    aggression: fieldHits.aggression ?? null,
    suicidality: fieldHits.suicidality ?? null,
    functioning: fieldHits.functioning ?? null,
    socialInteraction: fieldHits.socialInteraction ?? null,
    hygieneSelfCare: fieldHits.hygieneSelfCare ?? null,
    medicationMentioned: fieldHits.medicationMentioned ?? [],
    medicationResponse: fieldHits.medicationResponse ?? null,
    sideEffects: fieldHits.sideEffects ?? null,
    adherence: fieldHits.adherence ?? null,
    diagnosisHints: fieldHits.diagnosisHints ?? [],
    differentialDiagnosisHints: [],
    uncertainty: fieldHits.uncertainty ?? null,
    evidenceStrength: resolveEvidenceStrength(job),
    evidenceText: (() => {
      const redacted = redactIdentifierPatterns(text)
      return redacted.length <= 400 ? redacted : `${redacted.slice(0, 397)}…`
    })(),
    evidenceQuoteRange: null,
    analysisEligible: true,
    excludeReason: null,
  }

  // Pass A: deterministic regex facts (always on — the permanent fallback).
  // Uses the original job text (preserves sentence boundaries for quotes).
  const facts = buildRegexFacts(job, base)

  return {
    ...base,
    schemaVersion: CMEA_SCHEMA_VERSION,
    extractorVersion: CMEA_EXTRACTOR_VERSION,
    contentHash: computeContentHash(text),
    facts,
  }
}
