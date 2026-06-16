/**
 * Pass A of the CMEA hybrid extractor — DETERMINISTIC regex facts.
 *
 * Derives cheap, always-on `ClinicalFact[]` from the regex-extracted
 * {@link StructuredClinicalMetadata} + the source text. This pass is synchronous,
 * never calls the network, and is the permanent fallback: when the LLM
 * enrichment pass (Pass B) is disabled, unavailable, or in mock mode, these
 * facts still stand. Every fact carries a literal evidence quote — nothing is
 * fabricated.
 */

import type {
  ClinicalImprintJob,
  StructuredClinicalMetadata,
} from '../../types/clinicalImprint'
import {
  CMEA_EXTRACTOR_VERSION,
  type ClinicalFact,
  type CourseFact,
  type DiagnosisHintFact,
  type FactProvenance,
  type LifestyleFact,
  type MedicationTrialFact,
  type RiskFact,
  type SymptomFact,
  type SymptomSeverity,
} from '../../types/clinicalMetadata'
import type { IsdmPhenomenologyDomain } from '../../types/isdm'
import type { PriorTherapyEvent, PriorTherapyTimeframe } from '../../types/priorTherapies'
import { DOMAIN_KEYWORD_PATTERNS } from '../isdm/domainMap'
import { redactIdentifierPatterns } from '../clinicalImprint/redactEvidence'

const REGEX_CONFIDENCE = 0.5
const MAX_QUOTE_CHARS = 320

/** Deterministic 32-bit FNV-1a hash (hex) of normalized text — freshness gating. */
export function computeContentHash(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  let h = 0x811c9dc5
  for (let i = 0; i < normalized.length; i += 1) {
    h ^= normalized.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** First sentence containing the pattern, redacted + clamped — the evidence quote. */
function findQuote(text: string, pattern: RegExp): string | null {
  for (const sentence of sentences(text)) {
    if (pattern.test(sentence)) {
      return redactIdentifierPatterns(sentence).slice(0, MAX_QUOTE_CHARS)
    }
  }
  return null
}

function domainForLabel(label: string): IsdmPhenomenologyDomain | null {
  for (const [domain, patterns] of Object.entries(DOMAIN_KEYWORD_PATTERNS) as Array<
    [IsdmPhenomenologyDomain, RegExp[]]
  >) {
    if (patterns.some((p) => p.test(label))) return domain
  }
  return null
}

function normalizeSeverity(value: string | null): SymptomSeverity | null {
  if (!value) return null
  if (/leicht|mild/i.test(value)) return 'mild'
  if (/mittel|moderat|moderate/i.test(value)) return 'moderate'
  if (/schwer|severe/i.test(value)) return 'severe'
  return null
}

function provenance(
  metadata: StructuredClinicalMetadata,
  evidenceQuote: string | null,
  confidence = REGEX_CONFIDENCE,
): FactProvenance {
  return {
    sourceType: metadata.sourceType,
    sourceId: metadata.sourceId,
    sourceDate: metadata.sourceDate,
    evidenceStrength: metadata.evidenceStrength,
    evidenceQuote,
    confidence,
    extractor: 'regex',
    extractorVersion: CMEA_EXTRACTOR_VERSION,
  }
}

// ── Medication trial heuristics (free-text prior therapies) ──────────────────

const KNOWN_SUBSTANCES = [
  'Risperidon', 'Olanzapin', 'Quetiapin', 'Aripiprazol', 'Amisulprid', 'Clozapin',
  'Haloperidol', 'Paliperidon', 'Ziprasidon', 'Flupentixol', 'Zuclopenthixol',
  'Sertralin', 'Citalopram', 'Escitalopram', 'Fluoxetin', 'Paroxetin', 'Venlafaxin',
  'Duloxetin', 'Mirtazapin', 'Bupropion', 'Agomelatin', 'Trazodon', 'Amitriptylin',
  'Lithium', 'Valproat', 'Valproinsäure', 'Lamotrigin', 'Carbamazepin', 'Topiramat',
  'Lorazepam', 'Diazepam', 'Oxazepam', 'Pregabalin', 'Promethazin', 'Pipamperon',
  'Melperon', 'Methylphenidat', 'Atomoxetin',
]

const SIDE_EFFECT_PATTERN =
  /nebenwirkung|unverträg|hyperprolaktin|prolaktin|gewichtszunahme|akathisie|sedier|müdigkeit|übelkeit|qtc|dyskines|tremor|extrapyramidal/i
const SWITCHED_PATTERN = /umstell|wechsel|ausgeschlich|ausschleich/i
const NO_RESPONSE_PATTERN =
  /kein.{0,20}ansprech|nicht angesprochen|wirkungslos|keine besserung|ineffektiv|unwirksam/i
const PARTIAL_PATTERN = /teilremission|teilweise|partiell|unzureichend.{0,12}wirk/i
const DISCONTINUED_PATTERN = /abgesetzt|absetz|beendet|gestoppt|ausgeschlich|pausiert/i
const HISTORY_PATTERN = /vor aufnahme|anamnese|früher|zuvor|in der vorgeschichte|bisher|vorbehandl/i

function classifyTrial(sentence: string): PriorTherapyEvent | null {
  if (SIDE_EFFECT_PATTERN.test(sentence)) return 'side_effect'
  if (NO_RESPONSE_PATTERN.test(sentence)) return 'no_response'
  if (PARTIAL_PATTERN.test(sentence)) return 'partial_response'
  if (SWITCHED_PATTERN.test(sentence)) return 'switched'
  if (DISCONTINUED_PATTERN.test(sentence)) return 'discontinued'
  return null
}

function extractReason(sentence: string): string | null {
  const match = sentence.match(/(?:wegen|aufgrund|infolge)\s+([^.,;]+)/i)
  return match ? match[1]!.trim().slice(0, 300) : null
}

function buildMedicationTrialFacts(
  text: string,
  metadata: StructuredClinicalMetadata,
): MedicationTrialFact[] {
  const out: MedicationTrialFact[] = []
  const seen = new Set<string>()
  for (const sentence of sentences(text)) {
    for (const substance of KNOWN_SUBSTANCES) {
      const pattern = new RegExp(`\\b${substance}\\b`, 'i')
      if (!pattern.test(sentence)) continue
      const isHistory = HISTORY_PATTERN.test(sentence)
      const outcome = classifyTrial(sentence)
      // Only a prior trial when there's a stop/response signal or anamnestic framing.
      if (!outcome && !isHistory) continue
      const key = substance.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      const timeframe: PriorTherapyTimeframe = isHistory
        ? 'history'
        : metadata.sourceType === 'verlauf'
          ? 'current_admission'
          : null

      out.push({
        id: `${metadata.sourceId}:medication_trial:${slug(substance)}`,
        kind: 'medication_trial',
        caseId: metadata.caseId,
        substance,
        doseText: null,
        doseAdequacy: null,
        durationText: null,
        serumLevel: null,
        outcome: outcome ?? 'mentioned',
        reasonStopped: extractReason(sentence),
        adherenceSignal: null,
        smokingInteractionFlag: false,
        timeframe,
        provenance: provenance(
          metadata,
          redactIdentifierPatterns(sentence).slice(0, MAX_QUOTE_CHARS),
          0.45,
        ),
      })
    }
  }
  return out
}

function buildSymptomFacts(
  text: string,
  metadata: StructuredClinicalMetadata,
): SymptomFact[] {
  const severity = normalizeSeverity(metadata.severity)
  const seen = new Set<string>()
  const out: SymptomFact[] = []
  for (const label of metadata.symptoms) {
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const pattern = new RegExp(label.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    out.push({
      id: `${metadata.sourceId}:symptom:${slug(label)}`,
      kind: 'symptom',
      caseId: metadata.caseId,
      label,
      domain: domainForLabel(label),
      severity,
      onset: null,
      durationDays: null,
      negated: false,
      provenance: provenance(metadata, findQuote(text, pattern)),
    })
  }
  return out
}

function buildRiskFacts(text: string, metadata: StructuredClinicalMetadata): RiskFact[] {
  const out: RiskFact[] = []
  const push = (axis: RiskFact['axis'], pattern: RegExp): void => {
    out.push({
      id: `${metadata.sourceId}:risk:${axis}`,
      kind: 'risk',
      caseId: metadata.caseId,
      axis,
      status: 'present',
      acuity: null,
      provenance: provenance(metadata, findQuote(text, pattern), 0.6),
    })
  }
  if (metadata.suicidality) push('suicide', /suizid|selbstmord|suicidal/i)
  if (metadata.riskSelf && !metadata.suicidality) push('self_harm', /selbstgefährd|self\s*harm/i)
  if (metadata.riskOthers) push('harm_others', /fremdgefährd|homicid/i)
  if (metadata.aggression) push('aggression', /aggressiv|aggression/i)
  return out
}

function buildCourseFact(metadata: StructuredClinicalMetadata): CourseFact | null {
  if (!metadata.courseDirection) return null
  return {
    id: `${metadata.sourceId}:course:direction`,
    kind: 'course',
    caseId: metadata.caseId,
    direction: metadata.courseDirection,
    summary: metadata.readableClinicalSentence || null,
    provenance: provenance(metadata, metadata.evidenceText),
  }
}

function buildDiagnosisHintFacts(
  text: string,
  metadata: StructuredClinicalMetadata,
): DiagnosisHintFact[] {
  const seen = new Set<string>()
  const out: DiagnosisHintFact[] = []
  for (const hint of metadata.diagnosisHints) {
    const key = hint.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const codeMatch = hint.match(/\bF\d{2}(?:\.\d+)?\b/)
    const pattern = new RegExp(hint.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    out.push({
      id: `${metadata.sourceId}:diagnosis_hint:${slug(hint)}`,
      kind: 'diagnosis_hint',
      caseId: metadata.caseId,
      label: hint,
      code: codeMatch ? codeMatch[0] : null,
      status: metadata.sourceType === 'diagnosis' ? 'confirmed' : 'suspected',
      provenance: provenance(metadata, findQuote(text, pattern)),
    })
  }
  return out
}

function buildLifestyleFacts(
  text: string,
  metadata: StructuredClinicalMetadata,
): LifestyleFact[] {
  const out: LifestyleFact[] = []
  if (/\bnichtraucher\b|nie geraucht/i.test(text)) {
    out.push({
      id: `${metadata.sourceId}:lifestyle:smoking`,
      kind: 'lifestyle',
      caseId: metadata.caseId,
      factor: 'smoking',
      status: 'absent',
      detail: null,
      provenance: provenance(metadata, findQuote(text, /nichtraucher|nie geraucht/i)),
    })
  } else if (/\braucher\b|nikotin|zigarette|raucht/i.test(text)) {
    out.push({
      id: `${metadata.sourceId}:lifestyle:smoking`,
      kind: 'lifestyle',
      caseId: metadata.caseId,
      factor: 'smoking',
      status: 'present',
      detail: null,
      provenance: provenance(metadata, findQuote(text, /raucher|nikotin|zigarette|raucht/i)),
    })
  }
  return out
}

const NARRATIVE_DOC_TYPES = /^(aufnahme|verlauf|therapie-verlauf)$/i

/**
 * True when the source is narrative free text (Aufnahme/Verlauf). Document
 * snapshots are scheduled with the generic `manual_note` source type but carry
 * a `documentTypeId`, so we check both the resolved type and the document type.
 */
function isNarrativeSource(job: ClinicalImprintJob, metadata: StructuredClinicalMetadata): boolean {
  if (metadata.sourceType === 'anamnesis' || metadata.sourceType === 'verlauf') return true
  return Boolean(job.documentTypeId && NARRATIVE_DOC_TYPES.test(job.documentTypeId))
}

/**
 * Build the deterministic regex facts for one source. The result is keyed by the
 * source via `provenance.sourceId`; callers attach it to the imprint record.
 */
export function buildRegexFacts(
  job: ClinicalImprintJob,
  metadata: StructuredClinicalMetadata,
): ClinicalFact[] {
  const text = job.text ?? ''
  const facts: ClinicalFact[] = [
    ...buildSymptomFacts(text, metadata),
    ...buildRiskFacts(text, metadata),
    ...buildDiagnosisHintFacts(text, metadata),
    ...buildLifestyleFacts(text, metadata),
  ]
  const course = buildCourseFact(metadata)
  if (course) facts.push(course)
  if (isNarrativeSource(job, metadata)) {
    facts.push(...buildMedicationTrialFacts(text, metadata))
  }
  return facts
}

/**
 * Heuristic "is the LLM enrichment worth it?" decision. True when the source is
 * substantial narrative free text (Aufnahme/Verlauf) — short or structured
 * sources rarely benefit from an LLM pass.
 */
export function needsLlmEnrichment(job: ClinicalImprintJob): boolean {
  const narrative =
    job.sourceType === 'anamnesis' ||
    job.sourceType === 'verlauf' ||
    Boolean(job.documentTypeId && NARRATIVE_DOC_TYPES.test(job.documentTypeId))
  if (!narrative) return false
  return (job.text ?? '').trim().length >= 80
}
