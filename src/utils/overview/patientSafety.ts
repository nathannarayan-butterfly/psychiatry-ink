import type { LaborBefund } from '../laborArchive'
import type { VerlaufFeedEntry } from '../verlaufFeed'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import {
  computeMedicationInsights,
  interactionLevel,
  type CombinationRiskKind,
  type RiskLevel,
} from '../medication/medicationInsights'
import type { SemanticTone } from '../../components/notion/overview/OverviewCard'
import type { SafetyAlert, SafetyData, SafetyRiskSignal } from '../../components/notion/overview/types'
import type { PsychopathOverviewDomainKey } from '../../schemas/psychopath/extraction'
import type { UiLanguage } from '../../types/settings'
import { translateUi } from '../../data/uiTranslations'
import { isMeaningfulDetail } from './psychopathologyDomains'
import { getParameterMonitoringRows } from './medicationMonitoring'
import { filterCombinationRisksByClinicianDecisions } from '../combinationCheck/combinationRiskDisplay'

export interface PatientSafetyInput {
  medications: MedicationEntry[]
  language: string
  caseId?: string
  /** Latest-first clinical imprints (structured risk fields), may be empty. */
  imprints: ClinicalImprintRecord[]
  /** Free-text risk section (e.g. Verlauf → "risiko"), fallback when no imprint. */
  riskText?: string | null
  /** Free-text anamnesis covering allergies/intolerances. */
  allergyText?: string | null
  /** Lab befunde for medication-driven parameter monitoring rows. */
  befunde?: LaborBefund[]
  /** Verlauf feed — somatic Befund anthropometrics supplement labs. */
  verlaufEntries?: VerlaufFeedEntry[]
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

function trimRiskValue(value: string, max = 80): string {
  const trimmed = value.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

const RISK_SIGNAL_DOMAIN: Record<SafetyRiskSignal['id'], PsychopathOverviewDomainKey> = {
  suicidality: 'suicidality',
  riskSelf: 'riskSelf',
  riskOthers: 'riskOthers',
}

/** True when imprint / parsed risk text documents a clinically specific finding. */
export function isMeaningfulRiskRawValue(
  id: SafetyRiskSignal['id'],
  rawValue: string | null | undefined,
): boolean {
  const trimmed = rawValue?.trim()
  if (!trimmed || trimmed.length < 3) return false

  const tone = riskToneFromText(trimmed)
  if (tone === 'ok' || tone === 'low') return false

  return isMeaningfulDetail(trimmed, RISK_SIGNAL_DOMAIN[id])
}

/** PPB safety strip: only elevated axes with clinically specific detail. */
export function filterElevatedHarmSignals(signals: SafetyRiskSignal[]): SafetyRiskSignal[] {
  return signals.filter(
    (signal) =>
      (signal.tone === 'high' || signal.tone === 'moderate') &&
      isMeaningfulRiskRawValue(signal.id, signal.value ?? signal.label),
  )
}

type HarmAxis = 'self' | 'other'

function harmAxisForSignal(id: SafetyRiskSignal['id']): HarmAxis {
  return id === 'riskOthers' ? 'other' : 'self'
}

function derivePillLabel(rawValue: string, tone: SemanticTone): string | null {
  if (tone === 'ok' || tone === 'low' || tone === 'neutral') return null
  const v = rawValue.toLowerCase()
  if (/passiv/.test(v)) return 'passiv'
  if (/aktiv|akut|imperativ|drängend|konkret/.test(v)) return 'akut'
  if (/suizidgedanken|gedanken|latent|ambivalen|fraglich|leicht|gering|chronisch/.test(v)) {
    return 'erhöht'
  }
  if (tone === 'high') return 'akut'
  if (tone === 'moderate') return 'erhöht'
  return null
}

function pillAddsInformation(
  value: string | undefined,
  pillLabel: string,
  primaryLabel: string,
): boolean {
  const haystack = `${primaryLabel} ${value ?? ''}`.toLowerCase()
  return !haystack.includes(pillLabel.toLowerCase())
}

function composeRiskSignal(id: SafetyRiskSignal['id'], rawValue: string): SafetyRiskSignal {
  const detail = trimRiskValue(rawValue)
  const tone = riskToneFromText(detail) ?? 'info'
  const axis = harmAxisForSignal(id)

  if (tone === 'ok' || tone === 'low' || !isMeaningfulRiskRawValue(id, detail)) {
    const calmLabel =
      id === 'suicidality'
        ? 'keine Suizidalität'
        : axis === 'self'
          ? 'keine Eigengefährdung'
          : 'keine Fremdgefährdung'
    return {
      id,
      label: calmLabel,
      tone,
      showPill: false,
    }
  }

  const primaryLabel =
    id === 'suicidality'
      ? tone === 'high'
        ? 'Akute Suizidalität'
        : 'Suizidalität'
      : tone === 'high'
        ? axis === 'self'
          ? 'Akute Eigengefährdung'
          : 'Akute Fremdgefährdung'
        : axis === 'self'
          ? 'Eigengefährdung'
          : 'Fremdgefährdung'

  const pillLabel = derivePillLabel(detail, tone)
  const showPill =
    pillLabel !== null && pillAddsInformation(detail, pillLabel, primaryLabel)

  return {
    id,
    label: primaryLabel,
    value: detail,
    tone,
    showPill,
    pillLabel: showPill ? pillLabel ?? undefined : undefined,
  }
}

function parseRiskTextSignals(text: string): SafetyRiskSignal[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const combined = trimmed.match(
    /^(.+?suizid\w*)[^.]*\s+oder\s+(.+?fremd\s*gef\w*[^.]*)/i,
  )
  if (combined) {
    const suicidality = trimRiskValue(combined[1])
    const riskOthers = trimRiskValue(combined[2].replace(/\.$/, ''))
    return [
      composeRiskSignal('suicidality', suicidality),
      composeRiskSignal('riskOthers', riskOthers),
    ]
  }

  const signals: SafetyRiskSignal[] = []
  if (/suizid/i.test(trimmed)) {
    const value =
      /\bkeine?\b[^.!?]*suizid\w*/i.exec(trimmed)?.[0]?.trim() ??
      trimmed
        .split(/(?<=[.!?])\s+/)
        .find((sentence) => /suizid/i.test(sentence))
        ?.trim() ??
      trimmed
    signals.push(composeRiskSignal('suicidality', trimRiskValue(value)))
  }
  if (/fremd\s*gef/i.test(trimmed)) {
    const value =
      /\bkeine?\b[^.!?]*fremd\s*gef\w*/i.exec(trimmed)?.[0]?.trim() ??
      /fremd\s*gef[^.!?]*/i.exec(trimmed)?.[0]?.trim() ??
      trimmed
    signals.push(composeRiskSignal('riskOthers', trimRiskValue(value)))
  }
  if (/eigengef|selbstgef/i.test(trimmed) && !signals.some((signal) => signal.id === 'riskSelf')) {
    const value =
      /eigengef[^.!?]*/i.exec(trimmed)?.[0]?.trim() ??
      /selbstgef[^.!?]*/i.exec(trimmed)?.[0]?.trim() ??
      trimmed
    signals.push(composeRiskSignal('riskSelf', trimRiskValue(value)))
  }
  return dedupeRiskSignals(signals)
}

function normalizeRiskComparable(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function dedupeRiskSignals(signals: SafetyRiskSignal[]): SafetyRiskSignal[] {
  const suicide = signals.find((signal) => signal.id === 'suicidality')
  if (!suicide) return signals

  const suicideText = normalizeRiskComparable(`${suicide.value ?? ''} ${suicide.label}`)
  return signals.filter((signal) => {
    if (signal.id !== 'riskSelf') return true
    const selfText = normalizeRiskComparable(`${signal.value ?? ''} ${signal.label}`)
    if (!selfText || !suicideText) return true
    return selfText !== suicideText && !selfText.includes(suicideText) && !/suizid/i.test(selfText)
  })
}

function buildRiskSignals(
  suicidality: string | null | undefined,
  riskSelf: string | null | undefined,
  riskOthers: string | null | undefined,
): SafetyRiskSignal[] {
  const signals: SafetyRiskSignal[] = []
  if (suicidality && isMeaningfulRiskRawValue('suicidality', suicidality)) {
    signals.push(composeRiskSignal('suicidality', suicidality))
  }
  if (riskSelf && isMeaningfulRiskRawValue('riskSelf', riskSelf)) {
    signals.push(composeRiskSignal('riskSelf', riskSelf))
  }
  if (riskOthers && isMeaningfulRiskRawValue('riskOthers', riskOthers)) {
    signals.push(composeRiskSignal('riskOthers', riskOthers))
  }
  return dedupeRiskSignals(signals)
}

function resolveRiskRawValue(
  explicit: string | null | undefined,
  id: SafetyRiskSignal['id'],
  parsedSignals: SafetyRiskSignal[],
): string {
  const trimmed = explicit?.trim()
  if (trimmed) return trimmed
  const parsed = parsedSignals.find((signal) => signal.id === id)
  if (parsed?.value?.trim()) return parsed.value.trim()
  if (parsed?.label?.trim() && !/^keine /i.test(parsed.label)) return parsed.label.trim()
  return 'keine'
}

function isCalmHarmSignal(signal: SafetyRiskSignal): boolean {
  return signal.tone === 'ok' || signal.tone === 'low'
}

export interface BuildPpbHarmSignalsOptions {
  language: UiLanguage
  text?: string | null
  suicidality?: string | null
  riskSelf?: string | null
  riskOthers?: string | null
}

/**
 * PPB widget safety strip: always documents Suizidalität, Eigengefährdung, and
 * Fremdgefährdung. When all three are unremarkable, one combined calm line is shown.
 */
export function buildPpbHarmSignals(options: BuildPpbHarmSignalsOptions): SafetyRiskSignal[] {
  const parsedSignals = options.text?.trim() ? parseRiskTextSignals(options.text) : []
  const signals = dedupeRiskSignals([
    composeRiskSignal(
      'suicidality',
      resolveRiskRawValue(options.suicidality, 'suicidality', parsedSignals),
    ),
    composeRiskSignal(
      'riskSelf',
      resolveRiskRawValue(options.riskSelf, 'riskSelf', parsedSignals),
    ),
    composeRiskSignal(
      'riskOthers',
      resolveRiskRawValue(options.riskOthers, 'riskOthers', parsedSignals),
    ),
  ])

  if (signals.every(isCalmHarmSignal)) {
    return [
      {
        id: 'suicidality',
        label: translateUi(options.language, 'overviewPsySafetyAllNegative'),
        tone: 'ok',
        showPill: false,
      },
    ]
  }

  return signals
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
      return {
        tone: tone ?? 'info',
        label: 'Risiko',
        detail: parts.join(' · '),
        signals: buildRiskSignals(latest.suicidality, latest.riskSelf, latest.riskOthers),
      }
    }
  }

  const text = input.riskText?.trim()
  if (text) {
    const tone = riskToneFromText(text) ?? 'info'
    const detail = text.length > 140 ? `${text.slice(0, 137)}…` : text
    const signals = parseRiskTextSignals(text)
    return {
      tone,
      label: 'Risiko',
      detail,
      signals: signals.length > 0 ? signals : undefined,
    }
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
  for (const risk of filterCombinationRisksByClinicianDecisions(
    insights.combinationRisks,
    input.caseId,
  )) {
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
  const medicationMonitoring = getParameterMonitoringRows({
    medications: input.medications,
    befunde: input.befunde ?? [],
    verlaufEntries: input.verlaufEntries,
  })
  const hasAnySignal = risk !== null || alerts.length > 0 || medicationMonitoring.length > 0

  return { risk, alerts, medicationMonitoring, hasAnySignal }
}
