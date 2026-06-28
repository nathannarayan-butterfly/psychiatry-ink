/**
 * ADR causality + management AI service.
 *
 * Routes through {@link runAiFeature} so credit accounting (`checkBalance` →
 * `deductCreditsTransactionally`), the central PHI guard (`callLlmSafely`
 * re-sanitizes + asserts before egress) and metadata-only `AiUsageLog` writes
 * all run uniformly. No direct provider `fetch` from this file.
 *
 * Given a reported side effect and the patient's CURRENT medication list, the
 * model returns (1) a causality assessment ranking the likely causative
 * drug(s) with a brief rationale, and (2) ordered, actionable management steps.
 * Causality wording is a licensing-safe paraphrase of WHO-UMC / Naranjo
 * concepts — cautious language, never asserted certainty.
 *
 * @module adrCausalityAi
 */
import type { AiModelTier } from '../modelTierMapping'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { llmResultModel } from './safeLlmEgress'
import { runAiFeature } from '../ai/runAiFeature'
import { tierToMode } from '../ai/aiRouter'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import { deidentifyText } from './discussCaseDeidentify'
import type { AiUsageContext } from '../ai/types'
import {
  ADR_CAUSALITY_LIKELIHOODS,
  type AdrCausalityAssessment,
  type AdrCausalityLikelihood,
  type AdrCausalityMedicationInput,
  type AdrManagementStep,
  type AdrSuspectedDrugAssessment,
} from '../../src/types/adrCausality'

const DEFAULT_DISCLAIMER_DE =
  'KI-gestützter Vorschlag zur Unterstützung der klinischen Entscheidung — kein Ersatz für die ärztliche Beurteilung. Keine automatische Verordnung; Kausalität ist nicht gesichert. Vor jeder Maßnahme individuell prüfen.'

const DEFAULT_SOURCES_DE =
  'Kausalitätseinstufung in Anlehnung an gängige Pharmakovigilanz-Konzepte (WHO-UMC-System, Naranjo-Algorithmus) — paraphrasiert.'

function coerceString(value: unknown, max = 600): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function coerceLikelihood(value: unknown): AdrCausalityLikelihood {
  const s = String(value ?? '').trim() as AdrCausalityLikelihood
  return ADR_CAUSALITY_LIKELIHOODS.includes(s) ? s : 'unknown'
}

function matchMedicationId(
  substance: string,
  medications: AdrCausalityMedicationInput[],
): string | undefined {
  const norm = substance.trim().toLowerCase()
  if (!norm) return undefined
  const exact = medications.find((m) => m.substance.trim().toLowerCase() === norm)
  if (exact) return exact.id
  const partial = medications.find((m) => {
    const candidate = m.substance.trim().toLowerCase()
    return candidate.length >= 3 && (candidate.includes(norm) || norm.includes(candidate))
  })
  return partial?.id
}

function sanitizeSuspectedDrugs(
  raw: unknown,
  medications: AdrCausalityMedicationInput[],
): AdrSuspectedDrugAssessment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): AdrSuspectedDrugAssessment | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const substance = coerceString(r.substance ?? r.drug ?? r.medication, 160)
      if (!substance) return null
      const rationale = coerceString(r.rationale ?? r.reason ?? r.begruendung, 600)
      const likelihood = coerceLikelihood(r.likelihood ?? r.plausibility ?? r.kausalitaet)
      const explicitId = coerceString(r.medicationId, 80)
      const medicationId =
        (explicitId && medications.some((m) => m.id === explicitId) ? explicitId : undefined) ??
        matchMedicationId(substance, medications)
      return { medicationId, substance, likelihood, rationale }
    })
    .filter((entry): entry is AdrSuspectedDrugAssessment => entry != null)
    .slice(0, 12)
}

function sanitizeManagementSteps(raw: unknown): AdrManagementStep[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index): AdrManagementStep | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const recommendation = coerceString(r.recommendation ?? r.step ?? r.massnahme ?? r.action, 600)
      if (!recommendation) return null
      const rationale = coerceString(r.rationale ?? r.reason ?? r.begruendung, 600) || undefined
      const ifIneffective =
        coerceString(r.ifIneffective ?? r.nextStep ?? r.beiUnwirksamkeit ?? r.alternative, 600) ||
        undefined
      const orderRaw = Number(r.order)
      const order = Number.isFinite(orderRaw) && orderRaw > 0 ? Math.floor(orderRaw) : index + 1
      return { order, recommendation, rationale, ifIneffective }
    })
    .filter((entry): entry is AdrManagementStep => entry != null)
    .slice(0, 12)
    .map((step, index) => ({ ...step, order: index + 1 }))
}

function buildPrompt(params: {
  symptom: string
  onsetDate?: string
  severity?: string
  temporalRelation?: string
  note?: string
  suspectedSubstance?: string
  medications: AdrCausalityMedicationInput[]
  language: ClinicalLanguage
}): { systemPrompt: string; userPrompt: string } {
  const { symptom, medications, language } = params

  const systemPrompt = [
    'Du bist ein klinisch-pharmakologischer Assistent für Psychiatrie.',
    'Aufgabe: Beurteile eine gemeldete Nebenwirkung (unerwünschte Arzneimittelwirkung) im Hinblick auf die AKTUELLE Medikation des Patienten.',
    'Teil 1 — Kausalitätszuordnung: Nenne die wahrscheinlich verursachenden Wirkstoffe (mit kurzer Begründung: Mechanismus/Rezeptorprofil, zeitlicher Zusammenhang, bekanntes Nebenwirkungsprofil). Ordne jedem eine Wahrscheinlichkeit zu.',
    'Teil 2 — Stufenweises Management: Schlage konkrete, umsetzbare Maßnahmen in sinnvoller Reihenfolge vor (z. B. Dosisanpassung, Zeitpunkt-Verlagerung, gezielte Gegenmaßnahme, Umstellung). Bei jeder Stufe optional angeben, was bei Unwirksamkeit als nächster Schritt zu erwägen ist.',
    'Beispiel-Logik (nur Muster, nicht wörtlich übernehmen): Hypersalivation/Speichelfluss unter Clozapin → Pirenzepin erwägen; bei Unwirksamkeit weitere anticholinerge/lokale Option oder Dosisanpassung erwägen.',
    'Verwende vorsichtige Formulierungen: möglich, vereinbar mit, zeitlich plausibel — niemals gesicherte Kausalität.',
    'Vorschläge dienen der Unterstützung, NICHT dem Ersatz der ärztlichen Entscheidung. Keine automatische Verordnung. Keine wörtlichen Zitate aus urheberrechtlich geschützten Quellen.',
    clinicalLanguagePromptInstruction(language),
    'Antworte NUR als valides JSON-Objekt (json) ohne Markdown.',
    'Felder: suspectedDrugs (Array), managementSteps (Array), disclaimer (string), sources (string).',
    'suspectedDrugs-Element: { substance, likelihood, rationale }.',
    `likelihood ∈ ${JSON.stringify(ADR_CAUSALITY_LIKELIHOODS)} (unlikely=unwahrscheinlich, possible=möglich, probable=wahrscheinlich, highly_probable=sehr wahrscheinlich, unknown=nicht beurteilbar).`,
    'Berücksichtige NUR Wirkstoffe aus der angegebenen aktuellen Medikation; erfinde keine zusätzlichen Medikamente.',
    'managementSteps-Element: { order, recommendation, rationale (optional), ifIneffective (optional) }. order ist 1-basiert und aufsteigend.',
    'sources: nenne das zugrunde liegende Konzept der Kausalitätseinstufung (z. B. WHO-UMC / Naranjo), paraphrasiert.',
  ].join(' ')

  const medBlock = medications.length
    ? medications
        .map((med) =>
          [
            `- ${med.substance}`,
            med.doseLineGerman ? `  Dosierung: ${med.doseLineGerman}` : '',
            med.strength ? `  Stärke: ${med.strength}` : '',
            med.indication ? `  Indikation: ${med.indication}` : '',
            med.startDate ? `  Beginn: ${med.startDate}` : '',
            med.lastChangeAt ? `  Letzte Änderung: ${med.lastChangeAt}` : '',
            `  Status: ${med.status}`,
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n')
    : '- (keine aktiven Medikamente angegeben)'

  const userPrompt = [
    `Gemeldete Nebenwirkung (Symptom): ${symptom}`,
    params.onsetDate ? `Beginn der Nebenwirkung: ${params.onsetDate}` : '',
    params.severity ? `Schweregrad: ${params.severity}` : '',
    params.temporalRelation ? `Zeitlicher Zusammenhang: ${params.temporalRelation}` : '',
    params.suspectedSubstance ? `Klinisch vorab vermutetes Präparat: ${params.suspectedSubstance}` : '',
    params.note ? `Klinische Notiz: ${params.note}` : '',
    '',
    'AKTUELLE MEDIKATION:',
    medBlock,
    '',
    'JSON-Beispiel:',
    '{"suspectedDrugs":[{"substance":"Clozapin","likelihood":"probable","rationale":"Anticholinerge/cholinerge Dysbalance; Hypersalivation ist eine bekannte, dosisabhängige Nebenwirkung; zeitlich vereinbar."}],"managementSteps":[{"order":1,"recommendation":"Dosisbezug prüfen und ggf. abendliche Dosis anpassen","rationale":"Speichelfluss oft nachts betont","ifIneffective":"Gezielte Gegenmaßnahme erwägen"},{"order":2,"recommendation":"Pirenzepin erwägen","ifIneffective":"Alternative anticholinerge/lokale Option oder Dosisreduktion erwägen"}],"disclaimer":"…","sources":"…"}',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}

export async function assessAdrCausalityWithAi(params: {
  symptom: string
  onsetDate?: string
  severity?: string
  temporalRelation?: string
  note?: string
  suspectedSubstance?: string
  medications: AdrCausalityMedicationInput[]
  tier?: AiModelTier
  language: ClinicalLanguage
  usageContext?: AiUsageContext
}): Promise<{
  assessment: AdrCausalityAssessment
  model: { provider: string; modelId: string; label: string }
}> {
  const { systemPrompt, userPrompt } = buildPrompt({
    symptom: params.symptom,
    onsetDate: params.onsetDate,
    severity: params.severity,
    temporalRelation: params.temporalRelation,
    // De-identify free-text clinician note BEFORE it reaches the provider.
    note: deidentifyText(params.note ?? '') || undefined,
    suspectedSubstance: params.suspectedSubstance,
    medications: params.medications,
    language: params.language,
  })

  const result = await runAiFeature({
    featureKey: 'adr_causality_assessment',
    tier: params.tier ?? 'standard',
    mode: tierToMode(params.tier ?? 'standard'),
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 2400,
    usageContext: {
      featureKey: 'adr_causality_assessment',
      ...params.usageContext,
      metadata: { ...params.usageContext?.metadata, symptomLength: params.symptom.length },
    },
  })

  const parsed = parseStructuredJson(result.text) as Record<string, unknown> | null
  const model = llmResultModel(result)

  const suspectedDrugs = sanitizeSuspectedDrugs(parsed?.suspectedDrugs, params.medications)
  const managementSteps = sanitizeManagementSteps(parsed?.managementSteps)
  const disclaimer = coerceString(parsed?.disclaimer, 600) || DEFAULT_DISCLAIMER_DE
  const sources = coerceString(parsed?.sources, 300) || DEFAULT_SOURCES_DE

  const assessment: AdrCausalityAssessment = {
    symptom: params.symptom,
    suspectedDrugs,
    managementSteps,
    disclaimer,
    sources,
    generatedAt: new Date().toISOString(),
    model: model.label,
  }

  return { assessment, model }
}
