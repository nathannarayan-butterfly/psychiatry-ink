import type { MedicationEntry } from '../../types/medicationPlan'
import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import {
  computeMedicationInsights,
  interactionLevel,
  type CombinationRiskKind,
  type RiskLevel,
} from '../medication/medicationInsights'
import { analyteLabel, buildLabRelevance, type AnalyteKey } from '../diagnostics/labRelevance'
import type { SemanticTone } from '../../components/notion/overview/OverviewCard'
import type { SafetyAlert, SafetyData } from '../../components/notion/overview/types'

export interface PatientSafetyInput {
  medications: MedicationEntry[]
  language: string
  /** Latest-first clinical imprints (structured risk fields), may be empty. */
  imprints: ClinicalImprintRecord[]
  /** Free-text risk section (e.g. Verlauf → "risiko"), fallback when no imprint. */
  riskText?: string | null
  /** Free-text anamnesis covering allergies/intolerances. */
  allergyText?: string | null
}

const COMBINATION_LABELS: Record<CombinationRiskKind, string> = {
  duplicateClass: 'Doppelte Medikationsklasse',
  anticholinergic: 'Anticholinerge Last',
  sedation: 'Additive Sedierung',
  orthostatic: 'Orthostase-Risiko',
  qtc: 'Additive QTc-Verlängerung',
  serotonergic: 'Serotonerge Last',
}

const SEVERITY_LABELS: Record<string, string> = {
  contraindicated: 'kontraindiziert',
  severe: 'schwer',
  moderate: 'moderat',
  minor: 'gering',
}

/** Safety-critical analytes get a stronger tone in the monitoring list. */
const CRITICAL_ANALYTES = new Set<AnalyteKey>([
  'neutrophils',
  'leukocytes',
  'troponin',
  'sodium',
  'platelets',
  'liverEnzymes',
  'ammonia',
])

const MONITORING_ORDER: AnalyteKey[] = [
  'neutrophils',
  'leukocytes',
  'troponin',
  'sodium',
  'platelets',
  'liverEnzymes',
  'ammonia',
  'creatinine',
  'egfr',
  'tsh',
  'calcium',
  'qtc',
  'prolactin',
  'glucose',
  'hba1c',
  'lipids',
  'weight',
]

function riskToneFromText(value: string | null | undefined): SemanticTone | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (/\bkeine?\b|\bnein\b|verneint|negativ|unauff|nicht\s+(akut|vorhanden)|ausgeschlossen/.test(v)) {
    return 'ok'
  }
  if (/akut|\bja\b|aktiv|hoch|positiv|konkret|imperativ|drängend/.test(v)) return 'high'
  if (/passiv|latent|gedanken|fraglich|leicht|gering|chronisch|ambivalen/.test(v)) return 'moderate'
  return null
}

function combineTone(a: SemanticTone | null, b: SemanticTone | null): SemanticTone | null {
  const rank: Record<SemanticTone, number> = { ok: 1, low: 1, info: 2, neutral: 0, moderate: 3, high: 4 }
  if (a === null) return b
  if (b === null) return a
  return rank[a] >= rank[b] ? a : b
}

function levelToTone(level: RiskLevel): SemanticTone {
  return level === 'high' ? 'high' : level === 'moderate' ? 'moderate' : 'info'
}

function buildRisk(input: PatientSafetyInput): SafetyData['risk'] {
  const latest = [...input.imprints]
    .filter((i) => i.suicidality || i.riskSelf || i.riskOthers)
    .sort((a, b) => (b.sourceDate ?? '').localeCompare(a.sourceDate ?? ''))[0]

  if (latest) {
    const parts: string[] = []
    let tone: SemanticTone | null = null
    if (latest.suicidality) {
      parts.push(`Suizidalität: ${latest.suicidality}`)
      tone = combineTone(tone, riskToneFromText(latest.suicidality))
    }
    if (latest.riskSelf) {
      parts.push(`Eigengef.: ${latest.riskSelf}`)
      tone = combineTone(tone, riskToneFromText(latest.riskSelf))
    }
    if (latest.riskOthers) {
      parts.push(`Fremdgef.: ${latest.riskOthers}`)
      tone = combineTone(tone, riskToneFromText(latest.riskOthers))
    }
    if (parts.length > 0) {
      return { tone: tone ?? 'info', label: 'Risiko', detail: parts.join(' · ') }
    }
  }

  const text = input.riskText?.trim()
  if (text) {
    const tone = riskToneFromText(text) ?? 'info'
    const detail = text.length > 140 ? `${text.slice(0, 137)}…` : text
    return { tone, label: 'Risiko', detail }
  }
  return null
}

function buildAllergyAlert(allergyText: string | null | undefined): SafetyAlert | null {
  const text = allergyText?.trim()
  if (!text) return null
  const v = text.toLowerCase()
  const mentionsAllergy = /allerg|unverträglich|intoleran/.test(v)
  if (!mentionsAllergy) return null
  const negated = /keine?\s+(bekannten?\s+)?(medikamenten)?allerg|allerg\w*\s*(nicht\s+bekannt|verneint|negativ)|keine bekannten/.test(
    v,
  )
  if (negated) {
    return {
      id: 'allergy',
      category: 'allergy',
      tone: 'ok',
      title: 'Keine Allergien bekannt',
    }
  }
  // Surface the sentence that mentions the allergy as the detail.
  const sentence =
    text
      .split(/(?<=[.!?])\s+/)
      .find((s) => /allerg|unverträglich|intoleran/i.test(s)) ?? text
  return {
    id: 'allergy',
    category: 'allergy',
    tone: 'moderate',
    title: 'Allergie / Unverträglichkeit',
    detail: sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence,
  }
}

/**
 * Compose the at-a-glance safety picture from the active regimen + structured
 * risk + anamnesis text. All inputs are real; absent sources simply contribute
 * nothing (the card degrades to a calm "no signals" state).
 */
export function buildPatientSafety(input: PatientSafetyInput): SafetyData {
  const insights = computeMedicationInsights(input.medications, input.language)
  const alerts: SafetyAlert[] = []

  // Pairwise drug–drug interactions (reference KB).
  for (const ix of insights.crossInteractions) {
    alerts.push({
      id: `ix:${ix.drugA}:${ix.drugB}`,
      category: 'interaction',
      tone: levelToTone(interactionLevel(ix.severity)),
      title: `${ix.drugA} ✕ ${ix.drugB}`,
      detail: `${SEVERITY_LABELS[ix.severity] ?? ix.severity}: ${ix.note}`,
    })
  }

  // Additive / cumulative pharmacodynamic risks.
  for (const risk of insights.combinationRisks) {
    const label = COMBINATION_LABELS[risk.kind] ?? risk.kind
    const title = risk.detail ? `${label} (${risk.detail})` : label
    alerts.push({
      id: `comb:${risk.kind}`,
      category: 'interaction',
      tone: levelToTone(risk.level),
      title,
      detail: risk.drugs.join(', '),
    })
  }

  // Active monitoring obligations driven by the regimen (clozapine→ANC, lithium→level/renal/TSH …).
  const activeSubstances = input.medications
    .filter((m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased')
    .map((m) => m.substance)
  const relevance = buildLabRelevance(activeSubstances)
  const monitoringKeys = [...relevance.rationaleByKey.keys()].sort(
    (a, b) =>
      (MONITORING_ORDER.indexOf(a) + 1 || 99) - (MONITORING_ORDER.indexOf(b) + 1 || 99),
  )
  for (const key of monitoringKeys.slice(0, 4)) {
    const rationale = relevance.rationaleByKey.get(key) ?? []
    if (rationale.length === 0) continue
    const drugs = [...new Set(rationale.map((r) => r.drug))].join(', ')
    const reasons = [...new Set(rationale.map((r) => r.reason))].join(' · ')
    alerts.push({
      id: `mon:${key}`,
      category: 'monitoring',
      tone: CRITICAL_ANALYTES.has(key) ? 'moderate' : 'info',
      title: `${analyteLabel(key)} überwachen`,
      detail: `${drugs}: ${reasons}`,
    })
  }

  const allergyAlert = buildAllergyAlert(input.allergyText)
  if (allergyAlert) alerts.unshift(allergyAlert)

  const toneRank: Record<SemanticTone, number> = {
    high: 5,
    moderate: 4,
    info: 3,
    low: 2,
    ok: 1,
    neutral: 0,
  }
  alerts.sort((a, b) => toneRank[b.tone] - toneRank[a.tone])

  const risk = buildRisk(input)
  const hasAnySignal = risk !== null || alerts.length > 0

  return { risk, alerts, hasAnySignal }
}
