/**
 * Clinical Metadata Extraction Agent (CMEA) — the ONE server-side LLM extractor.
 *
 * "Compute once, reuse many": instead of every feature (Butterfly criteria,
 * prior therapies, why-failed, …) de-identifying + calling the LLM over the same
 * Aufnahme/Verlauf, this service runs a SINGLE batched, de-identified call for
 * all changed sections of a case and returns a flat, provenance-tagged
 * {@link ClinicalFact}[] keyed by sourceId. Downstream consumers read those
 * facts via the client accessor — they never call the LLM themselves.
 *
 * Privacy + safety guarantees (mirrors butterflyExtract.ts):
 *  - Section text is DE-IDENTIFIED here (authoritative, server-side) before the
 *    model ever sees it.
 *  - Output is ADVISORY: every fact carries an evidence quote + confidence and
 *    `extractor: 'llm'`. Facts are suggestions; deterministic/ISDM data stays
 *    the source of truth. Promotion to truth happens only via clinician accept.
 *  - Mock mode / parse failure → EMPTY facts, so the deterministic regex pass
 *    (Pass A, client-side) always stands. Nothing is ever fabricated.
 */

import { runAiFeature } from '../ai/runAiFeature'
import { tierToMode } from '../ai/aiRouter'
import { deidentifyPackageContent } from './discussCaseDeidentify'
import type { DiscussPackageContent, DiscussPackageSection } from '../../src/types/discussCase'
import type { AiModelTier } from '../modelTierMapping'
import type { AiUsageContext } from '../ai/types'
import { clinicalLanguagePromptInstruction, type ClinicalLanguage } from '../utils/resolveClinicalLanguage'
import type { ClinicalSourceType, EvidenceStrength } from '../../src/types/clinicalImprint'
import {
  CMEA_EXTRACTOR_VERSION,
  type ClinicalFact,
  type ClinicalFactKind,
  type FactProvenance,
} from '../../src/types/clinicalMetadata'

/** One changed source handed to the agent (text is de-identified here). */
export interface CmeaSectionInput {
  sourceId: string
  sourceType: ClinicalSourceType
  sourceDate: string
  text: string
}

export interface CmeaExtractionParams {
  caseId: string
  sections: CmeaSectionInput[]
  patientName?: string
  tier: AiModelTier
  model?: { provider: string; modelId: string }
  language: ClinicalLanguage
  usageContext?: AiUsageContext
}

export interface CmeaExtractionOutput {
  facts: ClinicalFact[]
  model: { provider: string; modelId: string }
  mock: boolean
}

const MAX_CONTEXT_CHARS = 14_000
const MAX_QUOTE_CHARS = 320
const MAX_FACTS = 120
const LLM_CONFIDENCE_DEFAULT = 0.6

const FACT_KINDS: ClinicalFactKind[] = [
  'symptom',
  'course',
  'risk',
  'substance',
  'lifestyle',
  'medication_trial',
  'lab_signal',
  'diagnosis_hint',
  'functioning',
]

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'x'
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return LLM_CONFIDENCE_DEFAULT
  return Math.min(1, Math.max(0, n))
}

function str(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T | null): T | null {
  const s = typeof value === 'string' ? (value.trim() as T) : null
  return s && allowed.includes(s) ? s : fallback
}

/** De-identify + size-cap the sections into prompt text. */
export function buildCmeaContextText(params: {
  sections: CmeaSectionInput[]
  patientName?: string
}): string {
  const pkg: DiscussPackageContent = {
    version: 1,
    builtAt: new Date().toISOString(),
    caseId: 'cmea',
    patientLabel: 'Patient',
    sections: params.sections.map<DiscussPackageSection>((section) => ({
      key: 'anamnesis',
      id: section.sourceId,
      label: section.sourceType,
      content: section.text,
    })),
    isDeidentified: false,
  }
  const deidentified = deidentifyPackageContent(pkg, params.patientName)
  return deidentified.sections
    .map((section) => `### sourceId: ${section.id} (${section.label})\n${section.content}`)
    .join('\n\n')
    .slice(0, MAX_CONTEXT_CHARS)
}

export function buildCmeaSystemPrompt(language: ClinicalLanguage): string {
  return [
    'You are the central clinical metadata extraction agent for a psychiatry app.',
    'You receive DE-IDENTIFIED clinical text from one or more sources, each marked with a sourceId.',
    'Extract a flat list of structured clinical facts STRICTLY from the provided text. Never infer beyond the text, never diagnose, never invent quotes or values.',
    `Each fact MUST include: sourceId (copy the exact sourceId of the source it came from), kind (one of ${JSON.stringify(FACT_KINDS)}), an evidenceQuote (a short literal quote from that source, max one sentence) and confidence (0..1).`,
    'Kind-specific fields:',
    '- symptom: {label, domain?, severity? ("mild"|"moderate"|"severe"), negated (true if absence documented)}',
    '- course: {direction ("new"|"improved"|"worsened"|"stable"|"fluctuating"|"resolved"|"unclear"), summary?}',
    '- risk: {axis ("suicide"|"self_harm"|"harm_others"|"aggression"|"self_neglect"), status ("present"|"absent"|"unclear"), acuity? ("acute"|"subacute"|"chronic"|"unclear")}',
    '- substance: {substance, use ("current"|"past"|"denied"|"unclear"), pattern?}',
    '- lifestyle: {factor ("smoking"|"alcohol"|"caffeine"|"exercise"|"diet"|"other"), status ("present"|"absent"|"unclear"), detail?}',
    '- medication_trial: {substance, doseText?, doseAdequacy? ("adequate"|"subtherapeutic"|"unclear"), durationText?, outcome? ("discontinued"|"no_response"|"partial_response"|"switched"|"side_effect"|"mentioned"), reasonStopped?, adherenceSignal? ("good"|"poor"|"unclear"), timeframe? ("current_admission"|"history")}',
    '- lab_signal: {parameter, value?, unit?, interpretation? ("low"|"normal"|"high"|"critical"|"unclear")}',
    '- diagnosis_hint: {label, code? (ICD/DSM code if literally documented), status ("suspected"|"confirmed"|"differential"|"ruled_out"|"unclear")}',
    '- functioning: {domain ("social"|"occupational"|"self_care"|"global"|"other"), impairment ("none"|"mild"|"moderate"|"severe"|"unclear"), detail?}',
    'Return ONLY a JSON object: {"facts":[ ... ]}. If nothing is extractable, return {"facts":[]}.',
    clinicalLanguagePromptInstruction(language),
  ].join(' ')
}

export function buildCmeaUserPrompt(contextText: string): string {
  return [
    'De-identified clinical sources:',
    '---',
    contextText || '(no documentation available)',
    '---',
    'Extract all supportable clinical facts as JSON now.',
  ].join('\n')
}

/** Default evidence strength for an LLM-derived fact based on its source. */
function llmEvidenceStrength(sourceType: ClinicalSourceType): EvidenceStrength {
  if (sourceType === 'lab' || sourceType === 'diagnosis') return 'direct_observation'
  return 'inferred'
}

function buildProvenance(
  section: CmeaSectionInput,
  evidenceQuote: string | null,
  confidence: number,
): FactProvenance {
  return {
    sourceType: section.sourceType,
    sourceId: section.sourceId,
    sourceDate: section.sourceDate,
    evidenceStrength: llmEvidenceStrength(section.sourceType),
    evidenceQuote,
    confidence,
    extractor: 'llm',
    extractorVersion: CMEA_EXTRACTOR_VERSION,
  }
}

/** Build a typed fact from one raw LLM row; returns null when invalid. */
function buildFact(
  raw: Record<string, unknown>,
  section: CmeaSectionInput,
  caseId: string,
): ClinicalFact | null {
  const kind = oneOf<ClinicalFactKind>(raw.kind, FACT_KINDS, null)
  if (!kind) return null
  const evidenceQuote = str(raw.evidenceQuote ?? raw.evidence ?? raw.quote, MAX_QUOTE_CHARS)
  const confidence = clampConfidence(raw.confidence)
  const provenance = buildProvenance(section, evidenceQuote, confidence)
  const base = { caseId, provenance } as const

  switch (kind) {
    case 'symptom': {
      const label = str(raw.label, 120)
      if (!label) return null
      return {
        ...base,
        id: `${section.sourceId}:symptom:${slug(label)}`,
        kind,
        label,
        domain: oneOf(raw.domain, ISDM_DOMAINS, null),
        severity: oneOf(raw.severity, ['mild', 'moderate', 'severe'] as const, null),
        onset: oneOf(raw.onset, ['acute', 'subacute', 'insidious', 'unclear'] as const, null),
        durationDays: num(raw.durationDays),
        negated: raw.negated === true,
      }
    }
    case 'course': {
      const direction = oneOf(
        raw.direction,
        ['new', 'improved', 'worsened', 'stable', 'fluctuating', 'resolved', 'unclear'] as const,
        null,
      )
      if (!direction) return null
      return { ...base, id: `${section.sourceId}:course:${slug(direction)}`, kind, direction, summary: str(raw.summary, 200) }
    }
    case 'risk': {
      const axis = oneOf(
        raw.axis,
        ['suicide', 'self_harm', 'harm_others', 'aggression', 'self_neglect'] as const,
        null,
      )
      if (!axis) return null
      return {
        ...base,
        id: `${section.sourceId}:risk:${axis}`,
        kind,
        axis,
        status: oneOf(raw.status, ['present', 'absent', 'unclear'] as const, 'unclear')!,
        acuity: oneOf(raw.acuity, ['acute', 'subacute', 'chronic', 'unclear'] as const, null),
      }
    }
    case 'substance': {
      const substance = str(raw.substance, 120)
      if (!substance) return null
      return {
        ...base,
        id: `${section.sourceId}:substance:${slug(substance)}`,
        kind,
        substance,
        use: oneOf(raw.use, ['current', 'past', 'denied', 'unclear'] as const, 'unclear')!,
        pattern: str(raw.pattern, 200),
      }
    }
    case 'lifestyle': {
      const factor = oneOf(
        raw.factor,
        ['smoking', 'alcohol', 'caffeine', 'exercise', 'diet', 'other'] as const,
        null,
      )
      if (!factor) return null
      return {
        ...base,
        id: `${section.sourceId}:lifestyle:${factor}`,
        kind,
        factor,
        status: oneOf(raw.status, ['present', 'absent', 'unclear'] as const, 'unclear')!,
        detail: str(raw.detail, 200),
      }
    }
    case 'medication_trial': {
      const substance = str(raw.substance, 120)
      if (!substance) return null
      const serumLevelRaw = raw.serumLevel
      const serumLevel =
        serumLevelRaw && typeof serumLevelRaw === 'object'
          ? (() => {
              const s = serumLevelRaw as Record<string, unknown>
              const value = num(s.value)
              const unit = str(s.unit, 32)
              if (value === null || !unit) return null
              return {
                value,
                unit,
                interpretation: oneOf(
                  s.interpretation,
                  ['subtherapeutic', 'therapeutic', 'supratherapeutic', 'unclear'] as const,
                  'unclear',
                )!,
              }
            })()
          : null
      return {
        ...base,
        id: `${section.sourceId}:medication_trial:${slug(substance)}`,
        kind,
        substance,
        doseText: str(raw.doseText, 80),
        doseAdequacy: oneOf(raw.doseAdequacy, ['adequate', 'subtherapeutic', 'unclear'] as const, null),
        durationText: str(raw.durationText, 80),
        serumLevel,
        outcome: oneOf(
          raw.outcome,
          ['discontinued', 'no_response', 'partial_response', 'switched', 'side_effect', 'mentioned'] as const,
          null,
        ),
        reasonStopped: str(raw.reasonStopped ?? raw.reason, 200),
        adherenceSignal: oneOf(raw.adherenceSignal, ['good', 'poor', 'unclear'] as const, null),
        smokingInteractionFlag: raw.smokingInteractionFlag === true,
        timeframe: oneOf(raw.timeframe, ['current_admission', 'history'] as const, null),
      }
    }
    case 'lab_signal': {
      const parameter = str(raw.parameter, 80)
      if (!parameter) return null
      const refRangeRaw = raw.refRange
      const refRange =
        refRangeRaw && typeof refRangeRaw === 'object'
          ? (() => {
              const r = refRangeRaw as Record<string, unknown>
              const min = num(r.min)
              const max = num(r.max)
              if (min === null && max === null) return null
              return { ...(min !== null ? { min } : {}), ...(max !== null ? { max } : {}) }
            })()
          : null
      return {
        ...base,
        id: `${section.sourceId}:lab_signal:${slug(parameter)}`,
        kind,
        parameter,
        value: num(raw.value),
        unit: str(raw.unit, 32),
        interpretation: oneOf(
          raw.interpretation,
          ['low', 'normal', 'high', 'critical', 'unclear'] as const,
          null,
        ),
        refRange,
      }
    }
    case 'diagnosis_hint': {
      const label = str(raw.label, 160)
      if (!label) return null
      return {
        ...base,
        id: `${section.sourceId}:diagnosis_hint:${slug(label)}`,
        kind,
        label,
        code: str(raw.code, 16),
        status: oneOf(
          raw.status,
          ['suspected', 'confirmed', 'differential', 'ruled_out', 'unclear'] as const,
          'suspected',
        )!,
      }
    }
    case 'functioning': {
      const domain = oneOf(
        raw.domain,
        ['social', 'occupational', 'self_care', 'global', 'other'] as const,
        null,
      )
      if (!domain) return null
      return {
        ...base,
        id: `${section.sourceId}:functioning:${domain}`,
        kind,
        domain,
        impairment: oneOf(
          raw.impairment,
          ['none', 'mild', 'moderate', 'severe', 'unclear'] as const,
          'unclear',
        )!,
        detail: str(raw.detail, 200),
      }
    }
    default:
      return null
  }
}

const ISDM_DOMAINS = [
  'appearance_behavior',
  'speech_language',
  'consciousness_orientation',
  'attention_concentration',
  'memory_cognition',
  'mood_affect',
  'drive_psychomotor_activity',
  'formal_thought_disorder',
  'thought_content',
  'delusions_overvalued_ideas',
  'perception_hallucinations',
  'self_experience_ego_disturbance',
  'anxiety_panic_phobic_symptoms',
  'obsessions_compulsions',
  'trauma_intrusions_dissociation',
  'somatic_preoccupation',
  'sleep_appetite_vegetative',
  'substance_related_features',
  'personality_interpersonal_style',
  'insight_judgment',
  'risk_self',
  'risk_others',
  'functional_impairment',
] as const

/**
 * Parse the model's JSON output into typed facts keyed by sourceId. Robust by
 * design: any unparseable / unmatched row is dropped, so a parse failure (incl.
 * the mock provider's non-JSON echo) yields an empty list and the deterministic
 * regex pass stands.
 */
export function parseCmeaResponse(
  text: string,
  sections: CmeaSectionInput[],
  caseId: string,
): ClinicalFact[] {
  const sectionById = new Map(sections.map((s) => [s.sourceId, s] as const))
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace <= firstBrace) return []

  let rows: unknown[] = []
  try {
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as unknown
    rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { facts?: unknown })?.facts)
        ? (parsed as { facts: unknown[] }).facts
        : []
  } catch {
    return []
  }

  const out: ClinicalFact[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const hasSourceId = typeof r.sourceId === 'string' && r.sourceId.trim().length > 0
    // A provided-but-unknown sourceId is a hallucinated source → drop it.
    // Only a fully-omitted sourceId falls back to the sole section.
    const section = hasSourceId
      ? sectionById.get((r.sourceId as string).trim())
      : sections.length === 1
        ? sections[0]
        : undefined
    if (!section) continue
    const fact = buildFact(r, section, caseId)
    if (!fact) continue
    if (seen.has(fact.id)) continue
    seen.add(fact.id)
    out.push(fact)
    if (out.length >= MAX_FACTS) break
  }
  return out
}

/** Run ONE batched, de-identified extraction for all changed sections of a case. */
export async function runClinicalMetadataExtraction(
  params: CmeaExtractionParams,
): Promise<CmeaExtractionOutput> {
  const contextText = buildCmeaContextText({
    sections: params.sections,
    patientName: params.patientName,
  })
  const systemPrompt = buildCmeaSystemPrompt(params.language)
  const userPrompt = buildCmeaUserPrompt(contextText)

  const result = await runAiFeature({
    featureKey: 'clinical_metadata_extraction',
    tier: params.tier,
    mode: tierToMode(params.tier),
    model: params.model,
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 3_000,
    usageContext: params.usageContext,
  })

  const mock = /\[AI draft —/.test(result.text)
  return {
    // Mock mode / parse failure → empty, so the regex pass stands.
    facts: mock ? [] : parseCmeaResponse(result.text, params.sections, params.caseId),
    model: { provider: result.provider, modelId: result.model },
    mock,
  }
}
