/**
 * Clinical Intelligence — prompt assembly (DE-primary, clinical-minimal).
 *
 * These helpers are shared between the client (for the development diagnostics
 * payload preview) and the server (which actually calls the model). Keep the
 * two prompt bodies bit-for-bit identical to avoid drift.
 */

import {
  CLINICAL_INTELLIGENCE_DIMENSIONS,
  clinicalIntelligenceDimensionName,
} from './dimensions'
import {
  CLINICAL_INTELLIGENCE_MECHANISMS,
  clinicalIntelligenceMechanismLabel,
} from './mechanisms'
import type {
  CompactEvidenceItem,
  CompactEvidencePayload,
  DimensionalIntegrationResult,
  ClinicalIntelligenceDimensionId,
  ClinicalIntelligenceMechanismId,
} from '../../types/clinicalIntelligence'

const HARD_CAP_EVIDENCE_CHARS = 14_000

/** Build a single de-identified evidence excerpt block for the prompt. */
export function formatCompactEvidenceForPrompt(
  payload: CompactEvidencePayload,
): { text: string; itemCount: number } {
  let total = 0
  const blocks: string[] = []
  for (const item of payload.items) {
    const body = item.text.trim()
    if (!body) continue
    const header = item.label ? `## ${item.label} (id: ${item.id})` : `## ${item.id}`
    const block = `${header}\n${body}`
    if (total + block.length > HARD_CAP_EVIDENCE_CHARS) break
    blocks.push(block)
    total += block.length
  }
  return { text: blocks.join('\n\n'), itemCount: blocks.length }
}

function dimensionCatalogBullet(
  id: ClinicalIntelligenceDimensionId,
  language: 'de' | 'en' | 'fr' | 'es',
): string {
  const name = clinicalIntelligenceDimensionName(id, language)
  return `- ${id} — ${name}`
}

function mechanismCatalogBullet(
  id: ClinicalIntelligenceMechanismId,
  language: 'de' | 'en' | 'fr' | 'es',
): string {
  const label = clinicalIntelligenceMechanismLabel(id, language)
  return `- ${id} — ${label}`
}

function languageInstruction(language: 'de' | 'en' | 'fr' | 'es'): string {
  if (language === 'en') return 'Write all human-readable strings in clinical English.'
  if (language === 'fr') return 'Write all human-readable strings in clinical French.'
  if (language === 'es') return 'Write all human-readable strings in clinical Spanish.'
  return 'Write all human-readable strings in clinical German (DE primary).'
}

export interface DimensionalPromptInput {
  language: 'de' | 'en' | 'fr' | 'es'
  evidence: CompactEvidencePayload
  rejectedDimensionIds: ClinicalIntelligenceDimensionId[]
}

export function buildDimensionalSystemPrompt(language: 'de' | 'en' | 'fr' | 'es'): string {
  const catalog = CLINICAL_INTELLIGENCE_DIMENSIONS.map((dim) =>
    dimensionCatalogBullet(dim.id, language),
  ).join('\n')

  return [
    'You are the Dimensional Integration layer of the Clinical Intelligence module of a psychiatry application.',
    'You work strictly from DE-IDENTIFIED, compact evidence excerpts. You never receive raw clinical documents and you never produce diagnoses.',
    'Every assertion you make is an AI-generated clinical hypothesis that a treating clinician will review.',
    '',
    'Catalog of dimensions (use exact id slugs):',
    catalog,
    '',
    'Task: For each dimension where the evidence supports an assessment, produce ONE finding object.',
    'Rules:',
    '- Do not infer that a dimension is active without evidence. Weak evidence -> confidence "low".',
    '- severity is an integer 0-4 (0 = nicht vorhanden, 4 = ausgeprägt/krisenrelevant).',
    '- confidence ∈ {"low","moderate","high"}.',
    '- supportingEvidenceIds and contradictingEvidenceIds MUST be drawn from the provided evidence item ids only.',
    '- clinicalSummary is short (≤ 280 chars), clinical-minimal, evidence-grounded.',
    '- For dimensions where the evidence is genuinely insufficient, emit an entry in exploratoryInsufficientEvidence instead — NEVER mix into activeDimensions.',
    '- source: "evidence_based" for activeDimensions; "exploratory" for exploratoryInsufficientEvidence.',
    '- reviewStatus is always "pending".',
    '',
    'Return STRICT JSON of the exact shape:',
    '{',
    '  "activeDimensions": [',
    '    {',
    '      "dimensionId": <one of the catalog ids>,',
    '      "dimensionName": <human-readable label in the requested language>,',
    '      "severity": 0-4,',
    '      "confidence": "low"|"moderate"|"high",',
    '      "longitudinalPattern": <short string or "">,',
    '      "supportingEvidenceIds": [<evidence ids>],',
    '      "contradictingEvidenceIds": [<evidence ids>],',
    '      "clinicalSummary": <≤ 280 char string>,',
    '      "uncertainty": <short string or "">,',
    '      "missingData": <short string or "">,',
    '      "reviewStatus": "pending",',
    '      "source": "evidence_based"',
    '    }',
    '  ],',
    '  "exploratoryInsufficientEvidence": [',
    '    { "topic": <dimension name or short topic>, "rationale": <why evidence is insufficient> }',
    '  ]',
    '}',
    '',
    languageInstruction(language),
    'Return ONLY the JSON object, no surrounding prose.',
  ].join('\n')
}

export function buildDimensionalUserPrompt(input: DimensionalPromptInput): string {
  const { text: evidenceText } = formatCompactEvidenceForPrompt(input.evidence)
  const rejected = input.rejectedDimensionIds.length
    ? input.rejectedDimensionIds.map((id) => `- ${id}`).join('\n')
    : '(none)'
  return [
    `Case identifier (already de-identified): ${input.evidence.caseId}`,
    `Patient label: ${input.evidence.patientLabel}`,
    `Evidence built at: ${input.evidence.builtAt}`,
    '',
    'Previously rejected dimensions (do NOT emit findings for these unless evidence has fundamentally changed):',
    rejected,
    '',
    'De-identified compact evidence (each block is one referenceable evidence item):',
    '---',
    evidenceText || '(no evidence)',
    '---',
  ].join('\n')
}

export interface MechanismPromptInput {
  language: 'de' | 'en' | 'fr' | 'es'
  evidence: CompactEvidencePayload
  acceptedDimensions: DimensionalIntegrationResult['activeDimensions']
  rejectedMechanismIds: ClinicalIntelligenceMechanismId[]
}

export function buildMechanismSystemPrompt(language: 'de' | 'en' | 'fr' | 'es'): string {
  const catalog = CLINICAL_INTELLIGENCE_MECHANISMS.map((mech) =>
    mechanismCatalogBullet(mech.id, language),
  ).join('\n')

  return [
    'You are the Mechanism Inference layer of the Clinical Intelligence module of a psychiatry application.',
    'You operate STRICTLY on (a) the already-evaluated, evidence_based dimensional findings and (b) the same DE-IDENTIFIED compact evidence excerpts.',
    'You never receive raw clinical documents and you never produce diagnoses. Every assertion is an AI-generated clinical hypothesis.',
    '',
    'Catalog of mechanism hypotheses (use exact id slugs):',
    catalog,
    '',
    'Task: For each mechanism that is meaningfully supported by the accepted/evidence_based dimensions AND the evidence, produce ONE hypothesis object.',
    'Rules:',
    '- Only infer a mechanism when the supporting dimensional pattern and evidence ids are concrete.',
    '- Phrase the clinicalImplication and treatmentRelevance as clinical hypotheses (NOT prescriptions).',
    '- linkedDimensions MUST refer to dimension ids actually present in the input acceptedDimensions list.',
    '- supportingEvidenceIds / contradictingEvidenceIds MUST be drawn from the provided evidence item ids only.',
    '- confidence ∈ {"low","moderate","high"}.',
    '- When the dimensional or evidence basis is too thin, emit an entry in exploratoryInsufficientEvidence instead of activeMechanisms.',
    '- source: "evidence_based" for activeMechanisms; "exploratory" for exploratoryInsufficientEvidence.',
    '- reviewStatus is always "pending".',
    '',
    'Return STRICT JSON of the exact shape:',
    '{',
    '  "activeMechanisms": [',
    '    {',
    '      "mechanismId": <one of the catalog ids>,',
    '      "label": <human-readable label in the requested language>,',
    '      "confidence": "low"|"moderate"|"high",',
    '      "linkedDimensions": [<dimension ids>],',
    '      "supportingEvidenceIds": [<evidence ids>],',
    '      "contradictingEvidenceIds": [<evidence ids>],',
    '      "clinicalImplication": <short string>,',
    '      "treatmentRelevance": <hypothesis-framed short string>,',
    '      "uncertainty": <short string or "">,',
    '      "reviewStatus": "pending",',
    '      "source": "evidence_based"',
    '    }',
    '  ],',
    '  "exploratoryInsufficientEvidence": [',
    '    { "topic": <mechanism label or short topic>, "rationale": <why evidence is insufficient> }',
    '  ]',
    '}',
    '',
    languageInstruction(language),
    'Return ONLY the JSON object, no surrounding prose.',
  ].join('\n')
}

export function buildMechanismUserPrompt(input: MechanismPromptInput): string {
  const { text: evidenceText } = formatCompactEvidenceForPrompt(input.evidence)
  const dimensionLines = input.acceptedDimensions.length
    ? input.acceptedDimensions
        .map(
          (dim) =>
            `- ${dim.dimensionId} (${dim.dimensionName}) | severity=${dim.severity} | confidence=${dim.confidence} | summary: ${dim.clinicalSummary}`,
        )
        .join('\n')
    : '(no accepted dimensions)'
  const rejected = input.rejectedMechanismIds.length
    ? input.rejectedMechanismIds.map((id) => `- ${id}`).join('\n')
    : '(none)'

  return [
    `Case identifier (already de-identified): ${input.evidence.caseId}`,
    `Evidence built at: ${input.evidence.builtAt}`,
    '',
    'Accepted / evidence-based dimensional findings:',
    dimensionLines,
    '',
    'Previously rejected mechanisms (do NOT emit hypotheses for these unless evidence has fundamentally changed):',
    rejected,
    '',
    'De-identified compact evidence (each block is one referenceable evidence item):',
    '---',
    evidenceText || '(no evidence)',
    '---',
  ].join('\n')
}

/** Re-export catalog items so callers can reference them without two imports. */
export function describeEvidenceItems(items: CompactEvidenceItem[]): string {
  return items
    .map((item) => `${item.id} (${item.category}${item.label ? ': ' + item.label : ''})`)
    .join('; ')
}
