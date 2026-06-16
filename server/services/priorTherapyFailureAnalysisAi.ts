import type { AiModelSpec, AiModelTier } from '../modelTierMapping'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { callLlm, llmResultModel } from './llmProvider'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import { isLlmMockMode } from './priorTherapiesAi'
import {
  VALID_FAILURE_CAUSES,
  buildFailureAnalysisFromSignals,
  sanitizeFailureCauses,
} from '../../src/utils/medication/failureAnalysisSynthesis'
import type {
  PriorTherapyFailureAnalysisResult,
  PriorTherapyFailureDrugInput,
} from '../../src/types/priorTherapies'

/**
 * LLM synthesis of "mögliche Ursache" hypotheses for failed prior therapies.
 * Reuses the prior-therapies infrastructure (de-identify upstream, `callLlm`,
 * featureKey 'prior_therapies', mock mode). The deterministic signals computed
 * client-side are the backbone; the LLM turns them + the de-identified narrative
 * into concise German hypotheses and may add a `receptor_mismatch` note.
 *
 * In mock mode (no API key) it falls back to the shared deterministic synthesis
 * so dev + tests stay green and nothing is fabricated.
 */

export interface FailureAnalysisExtractionResult {
  analyses: PriorTherapyFailureAnalysisResult[]
  model: AiModelSpec
  mock: boolean
}

/** Compact, identifier-free description of a drug's deterministic signals. */
function describeSignals(drug: PriorTherapyFailureDrugInput): string {
  const s = drug.signals
  const parts: string[] = []
  if (s.subtherapeuticLevel) {
    const lvl = s.subtherapeuticLevel
    const range =
      lvl.refMin !== undefined && lvl.refMax !== undefined ? `${lvl.refMin}-${lvl.refMax}` : '?'
    parts.push(`Spiegel ${lvl.value} ${lvl.unit} (Ref ${range}) → subtherapeutisch`)
  } else if (s.levelMeasured) {
    parts.push('Spiegel gemessen, im/über Referenzbereich')
  } else {
    parts.push('kein Spiegel dokumentiert')
  }
  if (s.cyp1a2Smoking) parts.push('CYP1A2-Substrat + Raucher (Spiegelsenkung möglich)')
  else if (s.smoking === true) parts.push('Raucher')
  else if (s.smoking === false) parts.push('Nichtraucher')
  if (s.poorAdherence) parts.push(`Adhärenzhinweis: ${s.poorAdherence.note}`)
  if (s.inadequateDoseDuration) parts.push(`Dosis/Dauer: ${s.inadequateDoseDuration.detail}`)
  if (s.receptorProfileSummary) parts.push(`Rezeptorprofil: ${s.receptorProfileSummary}`)
  return parts.join('; ')
}

function buildPrompt(params: {
  drugs: PriorTherapyFailureDrugInput[]
  aufnahmeText: string
  verlaufText: string
  language: ClinicalLanguage
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'Du bist ein klinisch-pharmakologischer Assistent für Psychiatrie.',
    'Aufgabe: Für jedes genannte FRÜHER versuchte Medikament, das NICHT gewirkt hat',
    '(kein/partielles Ansprechen bzw. Absetzen wegen Unwirksamkeit), nenne die WAHRSCHEINLICHE URSACHE.',
    'Stütze dich AUSSCHLIESSLICH auf die übergebenen deterministischen Signale und den Text.',
    'Erfinde KEINE Spiegelwerte, Diagnosen oder Gründe. Wenn nichts dokumentiert ist,',
    'gib genau eine Ursache "insufficient_data" mit kurzer Begründung zurück.',
    'Mögliche Ursachen: Subtherapeutischer Spiegel, CYP-Induktion durch Rauchen,',
    'pharmakodynamischer Mismatch (Rezeptorprofil passt nicht zur Zielsymptomatik),',
    'Adhärenz, inadäquate Dosis/Therapiedauer.',
    clinicalLanguagePromptInstruction(params.language),
    'Antworte NUR als valides JSON-Objekt (json) ohne Markdown.',
    'Format: {"analyses":[{"substance","likelyCauses":[{"cause","explanation_de","evidence","confidence"}]}]}',
    `cause ∈ ${JSON.stringify(VALID_FAILURE_CAUSES)}`,
    'confidence ∈ [0,1]. explanation_de: max. 1–2 kurze Sätze. Nur beratend, nie verordnend.',
  ].join(' ')

  const drugLines = params.drugs
    .map((drug, i) => `${i + 1}. ${drug.substance} (${drug.event}) — Signale: ${describeSignals(drug)}`)
    .join('\n')

  const userPrompt = [
    '=== FEHLGESCHLAGENE VORTHERAPIEN + SIGNALE ===',
    drugLines || '(keine)',
    '',
    '=== AUFNAHME (Kontext) ===',
    params.aufnahmeText.trim().slice(0, 6000) || '(leer)',
    '',
    '=== VERLAUF (Kontext) ===',
    params.verlaufText.trim().slice(0, 6000) || '(leer)',
  ].join('\n')

  return { systemPrompt, userPrompt }
}

function deterministicAnalyses(
  drugs: PriorTherapyFailureDrugInput[],
): PriorTherapyFailureAnalysisResult[] {
  return drugs.map((drug) => ({
    substance: drug.substance,
    likelyCauses: buildFailureAnalysisFromSignals(drug.signals).likelyCauses,
  }))
}

function sanitizeAnalyses(
  parsed: unknown,
  drugs: PriorTherapyFailureDrugInput[],
): PriorTherapyFailureAnalysisResult[] {
  const root =
    parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).analyses)
      ? ((parsed as Record<string, unknown>).analyses as unknown[])
      : Array.isArray(parsed)
        ? parsed
        : []

  const bySubstance = new Map<string, PriorTherapyFailureDrugInput>()
  for (const drug of drugs) bySubstance.set(drug.substance.trim().toLowerCase(), drug)

  const out: PriorTherapyFailureAnalysisResult[] = []
  for (const raw of root) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const substance = typeof r.substance === 'string' ? r.substance.trim() : ''
    if (!substance) continue
    const likelyCauses = sanitizeFailureCauses(r.likelyCauses)
    // Drop hallucinated drugs that weren't in the requested set.
    if (!bySubstance.has(substance.toLowerCase())) continue
    if (likelyCauses.length === 0) continue
    out.push({ substance, likelyCauses })
  }
  return out
}

export async function extractFailureAnalyses(params: {
  drugs: PriorTherapyFailureDrugInput[]
  aufnahmeText: string
  verlaufText: string
  language: ClinicalLanguage
  caseId?: string
  tier?: AiModelTier
}): Promise<FailureAnalysisExtractionResult> {
  const { systemPrompt, userPrompt } = buildPrompt({
    drugs: params.drugs,
    aufnahmeText: params.aufnahmeText,
    verlaufText: params.verlaufText,
    language: params.language,
  })

  const llm = await callLlm({
    tier: params.tier ?? 'standard',
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 1400,
    usageContext: {
      featureKey: 'prior_therapies',
      caseId: params.caseId ?? null,
      metadata: { route: 'medication/prior-therapies/failure-analysis' },
    },
  })

  const mock = isLlmMockMode()
  let analyses = mock ? [] : sanitizeAnalyses(parseStructuredJson(llm.text), params.drugs)

  // Mock mode (or an unparseable response) → deterministic synthesis from the
  // already-computed signals. Never fabricates.
  if (analyses.length === 0) {
    analyses = deterministicAnalyses(params.drugs)
  }

  return { analyses, model: llmResultModel(llm), mock }
}
