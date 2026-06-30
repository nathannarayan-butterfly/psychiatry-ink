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
import { translateUi, type UiTranslationKey } from '../../data/uiTranslations'
import { isMeaningfulDetail } from './psychopathologyDomains'
import { getParameterMonitoringRows } from './medicationMonitoring'
import type { CombinationSeverity } from '../../types/combinationCheck'
import { loadCombinationCheckStore } from '../combinationCheck/storage'
import {
  formatCombinationPairLabel,
  isSignificantCombinationFinding,
} from '../../hooks/useCombinationCheck'
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

const COMBINATION_LABEL_KEYS: Record<CombinationRiskKind, UiTranslationKey> = {
  duplicateClass: 'overviewSafetyCombDuplicateClass',
  anticholinergic: 'overviewSafetyCombAnticholinergic',
  sedation: 'overviewSafetyCombSedation',
  orthostatic: 'overviewSafetyCombOrthostatic',
  qtc: 'overviewSafetyCombQtc',
  serotonergic: 'overviewSafetyCombSerotonergic',
}

const SEVERITY_LABEL_KEYS: Record<string, UiTranslationKey> = {
  contraindicated: 'overviewSafetySeverityContraindicated',
  severe: 'overviewSafetySeveritySevere',
  moderate: 'overviewSafetySeverityModerate',
  minor: 'overviewSafetySeverityMinor',
}

function combinationLabel(language: UiLanguage, kind: CombinationRiskKind): string {
  return translateUi(language, COMBINATION_LABEL_KEYS[kind])
}

function severityLabel(language: UiLanguage, severity: string): string {
  const key = SEVERITY_LABEL_KEYS[severity]
  return key ? translateUi(language, key) : severity
}

function riskToneFromText(value: string | null | undefined): SemanticTone | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (
    /\bkeine?\b|\bnein\b|\bno\b|\bnone\b|verneint|negativ|unauff|nicht\s+(akut|vorhanden)|ausgeschlossen|denied|not\s+(?:present|documented|reported)/.test(
      v,
    )
  ) {
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

function derivePillLabel(
  language: UiLanguage,
  rawValue: string,
  tone: SemanticTone,
): string | null {
  if (tone === 'ok' || tone === 'low' || tone === 'neutral') return null
  const v = rawValue.toLowerCase()
  if (/passiv|passive/.test(v)) return translateUi(language, 'overviewRiskPillPassive')
  if (/aktiv|akut|imperativ|drängend|konkret|active|acute/.test(v)) {
    return translateUi(language, 'overviewRiskToneHigh')
  }
  if (/suizidgedanken|gedanken|latent|ambivalen|fraglich|leicht|gering|chronisch|thoughts|elevated/.test(v)) {
    return translateUi(language, 'overviewRiskToneModerate')
  }
  if (tone === 'high') return translateUi(language, 'overviewRiskToneHigh')
  if (tone === 'moderate') return translateUi(language, 'overviewRiskToneModerate')
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

function composeRiskSignal(
  language: UiLanguage,
  id: SafetyRiskSignal['id'],
  rawValue: string,
): SafetyRiskSignal {
  const detail = trimRiskValue(rawValue)
  const tone = riskToneFromText(detail) ?? 'info'
  const axis = harmAxisForSignal(id)

  if (tone === 'ok' || tone === 'low' || !isMeaningfulRiskRawValue(id, detail)) {
    const calmKey: UiTranslationKey =
      id === 'suicidality'
        ? 'overviewSafetyRiskNoneSuicidality'
        : axis === 'self'
          ? 'overviewSafetyRiskNoneSelf'
          : 'overviewSafetyRiskNoneOthers'
    return {
      id,
      label: translateUi(language, calmKey),
      tone,
      showPill: false,
    }
  }

  const primaryLabel =
    id === 'suicidality'
      ? tone === 'high'
        ? translateUi(language, 'overviewSafetyRiskAcuteSuicidality')
        : translateUi(language, 'psychopathDomainSuicidality')
      : tone === 'high'
        ? axis === 'self'
          ? translateUi(language, 'overviewSafetyRiskAcuteSelf')
          : translateUi(language, 'overviewSafetyRiskAcuteOthers')
        : axis === 'self'
          ? translateUi(language, 'overviewSafetyRiskSelf')
          : translateUi(language, 'psychopathDomainRiskOthers')

  const pillLabel = derivePillLabel(language, detail, tone)
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

function parseRiskTextSignals(language: UiLanguage, text: string): SafetyRiskSignal[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const combined = trimmed.match(
    /^(.+?suizid\w*)[^.]*\s+oder\s+(.+?fremd\s*gef\w*[^.]*)/i,
  )
  if (combined) {
    const suicidality = trimRiskValue(combined[1])
    const riskOthers = trimRiskValue(combined[2].replace(/\.$/, ''))
    return [
      composeRiskSignal(language, 'suicidality', suicidality),
      composeRiskSignal(language, 'riskOthers', riskOthers),
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
    signals.push(composeRiskSignal(language, 'suicidality', trimRiskValue(value)))
  }
  if (/fremd\s*gef/i.test(trimmed)) {
    const value =
      /\bkeine?\b[^.!?]*fremd\s*gef\w*/i.exec(trimmed)?.[0]?.trim() ??
      /fremd\s*gef[^.!?]*/i.exec(trimmed)?.[0]?.trim() ??
      trimmed
    signals.push(composeRiskSignal(language, 'riskOthers', trimRiskValue(value)))
  }
  if (/eigengef|selbstgef/i.test(trimmed) && !signals.some((signal) => signal.id === 'riskSelf')) {
    const value =
      /eigengef[^.!?]*/i.exec(trimmed)?.[0]?.trim() ??
      /selbstgef[^.!?]*/i.exec(trimmed)?.[0]?.trim() ??
      trimmed
    signals.push(composeRiskSignal(language, 'riskSelf', trimRiskValue(value)))
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
  language: UiLanguage,
  suicidality: string | null | undefined,
  riskSelf: string | null | undefined,
  riskOthers: string | null | undefined,
): SafetyRiskSignal[] {
  const signals: SafetyRiskSignal[] = []
  if (suicidality && isMeaningfulRiskRawValue('suicidality', suicidality)) {
    signals.push(composeRiskSignal(language, 'suicidality', suicidality))
  }
  if (riskSelf && isMeaningfulRiskRawValue('riskSelf', riskSelf)) {
    signals.push(composeRiskSignal(language, 'riskSelf', riskSelf))
  }
  if (riskOthers && isMeaningfulRiskRawValue('riskOthers', riskOthers)) {
    signals.push(composeRiskSignal(language, 'riskOthers', riskOthers))
  }
  return dedupeRiskSignals(signals)
}

function defaultNegativeRiskValue(language: UiLanguage): string {
  return language === 'de' ? 'keine' : 'none'
}

function isCalmTranslatedLabel(
  language: UiLanguage,
  id: SafetyRiskSignal['id'],
  label: string,
): boolean {
  const axis = harmAxisForSignal(id)
  const calmKey: UiTranslationKey =
    id === 'suicidality'
      ? 'overviewSafetyRiskNoneSuicidality'
      : axis === 'self'
        ? 'overviewSafetyRiskNoneSelf'
        : 'overviewSafetyRiskNoneOthers'
  return label.trim().toLowerCase() === translateUi(language, calmKey).trim().toLowerCase()
}

function resolveRiskRawValue(
  language: UiLanguage,
  explicit: string | null | undefined,
  id: SafetyRiskSignal['id'],
  parsedSignals: SafetyRiskSignal[],
): string {
  const trimmed = explicit?.trim()
  if (trimmed) return trimmed
  const parsed = parsedSignals.find((signal) => signal.id === id)
  if (parsed?.value?.trim()) return parsed.value.trim()
  if (parsed?.label?.trim() && !isCalmTranslatedLabel(language, id, parsed.label)) {
    return parsed.label.trim()
  }
  return defaultNegativeRiskValue(language)
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
  const { language } = options
  const parsedSignals = options.text?.trim() ? parseRiskTextSignals(language, options.text) : []
  const signals = dedupeRiskSignals([
    composeRiskSignal(
      language,
      'suicidality',
      resolveRiskRawValue(language, options.suicidality, 'suicidality', parsedSignals),
    ),
    composeRiskSignal(
      language,
      'riskSelf',
      resolveRiskRawValue(language, options.riskSelf, 'riskSelf', parsedSignals),
    ),
    composeRiskSignal(
      language,
      'riskOthers',
      resolveRiskRawValue(language, options.riskOthers, 'riskOthers', parsedSignals),
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
  const language = input.language as UiLanguage
  const latest = [...input.imprints]
    .filter((i) => i.suicidality || i.riskSelf || i.riskOthers)
    .sort((a, b) => (b.sourceDate ?? '').localeCompare(a.sourceDate ?? ''))[0]

  if (latest) {
    const parts: string[] = []
    let tone: SemanticTone | null = null
    if (latest.suicidality) {
      parts.push(
        translateUi(language, 'overviewSafetyRiskDetailSuicidality').replace(
          '{value}',
          latest.suicidality,
        ),
      )
      tone = combineTone(tone, riskToneFromText(latest.suicidality))
    }
    if (latest.riskSelf) {
      parts.push(
        translateUi(language, 'overviewSafetyRiskDetailSelf').replace('{value}', latest.riskSelf),
      )
      tone = combineTone(tone, riskToneFromText(latest.riskSelf))
    }
    if (latest.riskOthers) {
      parts.push(
        translateUi(language, 'overviewSafetyRiskDetailOthers').replace(
          '{value}',
          latest.riskOthers,
        ),
      )
      tone = combineTone(tone, riskToneFromText(latest.riskOthers))
    }
    if (parts.length > 0) {
      return {
        tone: tone ?? 'info',
        label: translateUi(language, 'overviewSafetyRiskLabel'),
        detail: parts.join(' · '),
        signals: buildRiskSignals(
          language,
          latest.suicidality,
          latest.riskSelf,
          latest.riskOthers,
        ),
      }
    }
  }

  const text = input.riskText?.trim()
  if (text) {
    const tone = riskToneFromText(text) ?? 'info'
    const detail = text.length > 140 ? `${text.slice(0, 137)}…` : text
    const signals = parseRiskTextSignals(language, text)
    return {
      tone,
      label: translateUi(language, 'overviewSafetyRiskLabel'),
      detail,
      signals: signals.length > 0 ? signals : undefined,
    }
  }
  return null
}

function buildAllergyAlert(
  language: UiLanguage,
  allergyText: string | null | undefined,
): SafetyAlert | null {
  const text = allergyText?.trim()
  if (!text) return null
  const v = text.toLowerCase()
  const mentionsAllergy = /allerg|unverträglich|intoleran/.test(v)
  if (!mentionsAllergy) return null
  const negated =
    /keine?\s+(bekannten?\s+)?(medikamenten)?allerg|allerg\w*\s*(nicht\s+bekannt|verneint|negativ)|keine bekannten|\bno\s+(?:known\s+)?(?:drug\s+|medication\s+)?allerg|\ballerg(?:y|ies)\s*(?:not\s+(?:known|reported|documented)|denied|negative)|\bno\s+known\s+(?:drug\s+|medication\s+)?allerg/.test(
      v,
    )
  if (negated) {
    return {
      id: 'allergy',
      category: 'allergy',
      tone: 'ok',
      title: translateUi(language, 'overviewSafetyAllergyNone'),
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
    title: translateUi(language, 'overviewSafetyAllergyTitle'),
    detail: sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence,
  }
}

function combinationSeverityToTone(severity: CombinationSeverity): SemanticTone {
  if (severity === 'critical' || severity === 'high') return 'high'
  if (severity === 'moderate') return 'moderate'
  if (severity === 'low') return 'info'
  return 'neutral'
}

/**
 * Stable, case-insensitive key for a drug pair regardless of authoring order.
 * Used to detect that a KB cross-interaction and an AI Kombinationscheck
 * finding describe the SAME pair, since their alert IDs live in disjoint
 * namespaces (`ix:A:B` vs `cc:<uuid>`) and so never collide via id-based dedupe.
 */
function pairNameKey(drugA: string, drugB: string): string {
  const a = drugA.trim().toLowerCase()
  const b = drugB.trim().toLowerCase()
  if (!a || !b) return ''
  return `pair:${[a, b].sort().join('|')}`
}

/**
 * risk + anamnesis text. All inputs are real; absent sources simply contribute
 * nothing (the card degrades to a calm "no signals" state).
 */
export function buildPatientSafety(input: PatientSafetyInput): SafetyData {
  const language = input.language as UiLanguage
  const insights = computeMedicationInsights(input.medications, input.language)
  const alerts: SafetyAlert[] = []

  // Track the drug-pair names already emitted so the AI loop below cannot
  // produce a second row for a pair already covered by the structured KB
  // cross-interactions. KB findings are emitted FIRST (here) and AI findings
  // second — so this set, combined with the `seen` id set, makes "KB wins"
  // the natural outcome whenever both sources flag the same pair.
  const seenPairKeys = new Set<string>()

  // Pairwise drug–drug interactions (reference KB).
  for (const ix of insights.crossInteractions) {
    alerts.push({
      id: `ix:${ix.drugA}:${ix.drugB}`,
      category: 'interaction',
      tone: levelToTone(interactionLevel(ix.severity)),
      title: `${ix.drugA} ✕ ${ix.drugB}`,
      detail: `${severityLabel(language, ix.severity)}: ${ix.note}`,
    })
    const pairKey = pairNameKey(ix.drugA, ix.drugB)
    if (pairKey) seenPairKeys.add(pairKey)
  }

  // Additive / cumulative pharmacodynamic risks.
  for (const risk of filterCombinationRisksByClinicianDecisions(
    insights.combinationRisks,
    input.caseId,
  )) {
    const label = combinationLabel(language, risk.kind)
    const title = risk.detail ? `${label} (${risk.detail})` : label
    alerts.push({
      id: `comb:${risk.kind}`,
      category: 'interaction',
      tone: levelToTone(risk.level),
      title,
      detail: risk.drugs.join(', '),
    })
  }

  // AI / manual Kombinationscheck findings (including free-text drug names).
  if (input.caseId) {
    const seen = new Set(alerts.map((a) => a.id))
    for (const finding of loadCombinationCheckStore(input.caseId).findings) {
      if (!isSignificantCombinationFinding(finding)) continue
      if (finding.status === 'rejected' || finding.status === 'not_relevant') continue
      const id = `cc:${finding.id}`
      if (seen.has(id)) continue
      // The id namespaces (`ix:A:B`, `comb:kind`, `cc:<uuid>`) are disjoint, so
      // id-based dedupe alone cannot catch a KB cross-interaction and an AI
      // finding that describe the same drug pair. Drop AI duplicates here so
      // the Übersicht surfaces at most one row per pair, preferring the
      // higher-fidelity KB entry already in `alerts`.
      const pairKey = pairNameKey(finding.substanceAName, finding.substanceBName)
      if (pairKey && seenPairKeys.has(pairKey)) continue
      seen.add(id)
      if (pairKey) seenPairKeys.add(pairKey)
      alerts.push({
        id,
        category: 'interaction',
        tone: combinationSeverityToTone(finding.severity),
        title: formatCombinationPairLabel(finding),
        detail: finding.mainRisk,
      })
    }
  }

  const allergyAlert = buildAllergyAlert(language, input.allergyText)
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
    language,
  })
  const hasAnySignal = risk !== null || alerts.length > 0 || medicationMonitoring.length > 0

  return { risk, alerts, medicationMonitoring, hasAnySignal }
}
