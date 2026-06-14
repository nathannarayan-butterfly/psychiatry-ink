import type { AiModelSpec, AiModelTier } from '../modelTierMapping'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { callLlm, llmResultModel } from './llmProvider'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import type {
  CombinationCheckAIResult,
  CombinationCheckMedicationInput,
  CombinationInteractionType,
  CombinationSeverity,
  MedicationCombinationKnowledge,
  PatientRiskFactors,
} from '../../src/types/combinationCheck'
import { buildCombinationKeyFromNames } from '../../src/utils/combinationCheck/combinationKey'

const VALID_TYPES: CombinationInteractionType[] = [
  'pharmacodynamic',
  'pharmacokinetic',
  'additive_side_effect',
  'contraindication',
  'monitoring_required',
  'uncertain',
]

const VALID_SEVERITIES: CombinationSeverity[] = [
  'none',
  'low',
  'moderate',
  'high',
  'critical',
]

function coerceType(value: unknown): CombinationInteractionType {
  const s = String(value ?? '').trim() as CombinationInteractionType
  return VALID_TYPES.includes(s) ? s : 'uncertain'
}

function coerceSeverity(value: unknown): CombinationSeverity {
  const s = String(value ?? '').trim() as CombinationSeverity
  return VALID_SEVERITIES.includes(s) ? s : 'moderate'
}

function coerceString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function formatRiskFactors(risk?: PatientRiskFactors, labNotes?: string): string {
  const parts: string[] = []
  if (risk?.renal) parts.push(`Nierenfunktion: ${risk.renal}`)
  if (risk?.hepatic) parts.push(`Leberfunktion: ${risk.hepatic}`)
  if (risk?.qtc) parts.push(`QTc: ${risk.qtc}`)
  if (risk?.epilepsy) parts.push(`Epilepsie/Krampfschwelle: ${risk.epilepsy}`)
  if (risk?.sedation) parts.push(`Sedierung: ${risk.sedation}`)
  if (risk?.age) parts.push(`Alter: ${risk.age}`)
  if (risk?.other) parts.push(`Sonstiges: ${risk.other}`)
  if (labNotes?.trim()) parts.push(`Labor-/Kliniknotizen: ${labNotes.trim()}`)
  return parts.length ? parts.join('\n') : '(keine dokumentiert)'
}

function buildPrompt(params: {
  medA: CombinationCheckMedicationInput
  medB: CombinationCheckMedicationInput
  risk?: PatientRiskFactors
  labNotes?: string
  thorough: boolean
  kbHint?: MedicationCombinationKnowledge | null
  language: ClinicalLanguage
}): { systemPrompt: string; userPrompt: string } {
  const { medA, medB, risk, labNotes, thorough, kbHint, language } = params
  const depth = thorough
    ? 'Führe eine gründliche klinische Analyse durch — Mechanismen, Dosisabhängigkeit, Literaturhinweise, Monitoring und Alternativen.'
    : 'Kompakte klinische Einschätzung für den psychiatrischen Alltag.'

  const systemPrompt = [
    'Du bist ein klinisch-pharmakologischer Assistent für Psychiatrie.',
    'Beurteile ausschließlich die Wechselwirkung zwischen zwei Wirkstoffen.',
    depth,
    clinicalLanguagePromptInstruction(language),
    'Antworte NUR als valides JSON-Objekt (json) ohne Markdown.',
    'Felder: interactionType, severity, mainRisk, mechanism, monitoring, clinicalManagement, rationale, uncertainties (Array).',
    `interactionType ∈ ${JSON.stringify(VALID_TYPES)}`,
    `severity ∈ ${JSON.stringify(VALID_SEVERITIES)}`,
    'Bei fehlender relevanter Interaktion: severity "none", interactionType "uncertain".',
  ].join(' ')

  const userPrompt = [
    `Wirkstoff A: ${medA.substance}`,
    medA.strength ? `Stärke A: ${medA.strength}` : '',
    medA.doseLineGerman ? `Dosierung A: ${medA.doseLineGerman}` : '',
    medA.formulation ? `Form A: ${medA.formulation}` : '',
    '',
    `Wirkstoff B: ${medB.substance}`,
    medB.strength ? `Stärke B: ${medB.strength}` : '',
    medB.doseLineGerman ? `Dosierung B: ${medB.doseLineGerman}` : '',
    medB.formulation ? `Form B: ${medB.formulation}` : '',
    '',
    'Patienten-Risikofaktoren:',
    formatRiskFactors(risk, labNotes),
    kbHint
      ? `\nHinweis aus interner Wissensdatenbank (nur zur Abgleich — nicht blind übernehmen): ${kbHint.mainRisk}`
      : '',
    '',
    'JSON-Beispiel:',
    '{"interactionType":"pharmacodynamic","severity":"moderate","mainRisk":"…","mechanism":"…","monitoring":"…","clinicalManagement":"…","rationale":"…","uncertainties":[]}',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}

function parseAiResult(
  raw: unknown,
  substanceAName: string,
  substanceBName: string,
): CombinationCheckAIResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const mainRisk = coerceString(r.mainRisk)
  if (!mainRisk && coerceSeverity(r.severity) === 'none') {
    return {
      combinationKey: buildCombinationKeyFromNames(substanceAName, substanceBName),
      substanceAName,
      substanceBName,
      interactionType: 'uncertain',
      severity: 'none',
      mainRisk: 'Keine relevante Wechselwirkung identifiziert',
    }
  }
  if (!mainRisk) return null

  const uncertainties = Array.isArray(r.uncertainties)
    ? r.uncertainties.map((u) => String(u).trim()).filter(Boolean)
    : undefined

  return {
    combinationKey: buildCombinationKeyFromNames(substanceAName, substanceBName),
    substanceAName,
    substanceBName,
    interactionType: coerceType(r.interactionType),
    severity: coerceSeverity(r.severity),
    mainRisk,
    mechanism: coerceString(r.mechanism) || undefined,
    monitoring: coerceString(r.monitoring) || undefined,
    clinicalManagement: coerceString(r.clinicalManagement) || undefined,
    rationale: coerceString(r.rationale) || undefined,
    uncertainties,
  }
}

export async function assessCombinationWithAi(params: {
  medA: CombinationCheckMedicationInput
  medB: CombinationCheckMedicationInput
  risk?: PatientRiskFactors
  labNotes?: string
  thorough?: boolean
  kbHint?: MedicationCombinationKnowledge | null
  tier?: AiModelTier
  language: ClinicalLanguage
}): Promise<{ result: CombinationCheckAIResult | null; model: AiModelSpec } | null> {
  const tier: AiModelTier = params.thorough ? 'thorough' : 'standard'
  const language = params.language
  const { systemPrompt, userPrompt } = buildPrompt({
    medA: params.medA,
    medB: params.medB,
    risk: params.risk,
    labNotes: params.labNotes,
    thorough: Boolean(params.thorough),
    kbHint: params.kbHint,
    language,
  })

  const llm = await callLlm({
    tier,
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: params.thorough ? 2400 : 1200,
    usageContext: {
      featureKey: 'medication_combination_check',
      metadata: { thorough: Boolean(params.thorough) },
    },
  })

  const parsed = parseStructuredJson(llm.text)
  const result = parseAiResult(parsed, params.medA.substance, params.medB.substance)
  if (!result) return null
  return { result, model: llmResultModel(llm) }
}

// Deferred (not MVP): triple combinations, lab-linked triggers, receptor burden scoring, country-specific formularies.
