import type { CourseDirection, ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { SafetyRiskSignal } from '../../components/notion/overview/types'
import type { VerlaufFeedEntry } from '../verlaufFeed'
import type {
  VerlaufstendenzDomain,
  VerlaufstendenzDomainDirection,
  VerlaufstendenzEvidence,
} from '../../types/verlaufstendenz'
import { inferCourseDirection } from '../overview/psychopathFindingOps'
import { isMeaningfulRiskRawValue } from '../overview/patientSafety'

/** Signed numeric score for aggregation (−2 … +2). */
export type DomainScore = -2 | -1 | 0 | 1 | 2

export interface DomainSignal {
  domain: VerlaufstendenzDomain
  score: DomainScore
  evidence: VerlaufstendenzEvidence
}

const COURSE_TO_SCORE: Partial<Record<CourseDirection, DomainScore>> = {
  improved: 1,
  resolved: 2,
  stable: 0,
  fluctuating: 0,
  new: 0,
  unclear: 0,
  worsened: -1,
}

function genEvidenceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `vt-ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function evidence(
  snippet: string,
  sourceLabel: string,
  sourceRef?: string,
  dateIso?: string,
): VerlaufstendenzEvidence {
  return {
    id: genEvidenceId(),
    snippet: snippet.replace(/\s+/g, ' ').trim().slice(0, 200),
    sourceLabel,
    sourceRef,
    dateIso,
  }
}

function scoreFromCourseComparison(
  earlier: CourseDirection | null | undefined,
  later: CourseDirection | null | undefined,
): DomainScore | null {
  if (!earlier || !later) return null
  const a = COURSE_TO_SCORE[earlier]
  const b = COURSE_TO_SCORE[later]
  if (a === undefined || b === undefined) return null
  const delta = b - a
  if (delta >= 2) return 2
  if (delta === 1) return 1
  if (delta === 0) return 0
  if (delta === -1) return -1
  return -2
}

function scoreFromTextTrend(text: string): DomainScore | null {
  const dir = inferCourseDirection(text)
  if (!dir) return null
  return COURSE_TO_SCORE[dir] ?? null
}

function scanDomainText(text: string, domain: VerlaufstendenzDomain): DomainScore | null {
  const t = text.toLowerCase()
  const improved =
    domain === 'sleep_drive_affect'
      ? /\b(schlaf\s+gebessert|antrieb\s+(?:zunehmend|gebessert)|affekt\s+(?:aufgehellt|gebessert)|stimmung\s+(?:aufgehellt|gebessert))\b/.test(
          t,
        )
      : domain === 'ward_behavior'
        ? /\b(kooperativ(?:er)?|mitarbeit(?:end)?|regelkonform(?:er)?|angepasst)\b/.test(t) &&
          !/\b(auffällig|aggressiv|verweiger)\b/.test(t)
        : domain === 'insight_compliance'
          ? /\b(einsicht\s+(?:zunehmend|gut)|compliance\s+(?:gut|verbessert)|medikation\s+(?:zuverlässig|regelmäßig))\b/.test(
              t,
            )
          : domain === 'somatic_side_effects'
            ? /\b(nebenwirkungen\s+(?:rückläufig|gebessert)|labor\s+(?:normalisiert|unauffällig))\b/.test(
                t,
              )
            : domain === 'social_functioning'
              ? /\b(sozial(?:er)?\s+(?:kontakt|teilnahme)\s+(?:zunehmend|aktiver)|funktion(?:s)?fähigkeit\s+gebessert)\b/.test(
                  t,
                )
              : /\b(gebessert|besser|remittiert|rückläufig|verbessert|aufgehellt)\b/.test(t)

  const worsened =
    domain === 'sleep_drive_affect'
      ? /\b(schlaf\s+(?:gestört|verschlechtert)|antrieb\s+(?:gemindert|reduziert)|affekt\s+(?:gedämpft|verschlechtert))\b/.test(
          t,
        )
      : domain === 'ward_behavior'
        ? /\b(auffällig(?:es)?\s+verhalten|aggressiv|verweiger|stör(?:end|ung))\b/.test(t)
        : domain === 'insight_compliance'
          ? /\b(einsicht\s+(?:fehlend|mangelhaft)|compliance\s+(?:schlecht|mangelhaft)|medikament(?:en)?verweigerung)\b/.test(
              t,
            )
          : domain === 'somatic_side_effects'
            ? /\b(nebenwirkungen?\s+(?:zunehmend|neu)|labor\s+auffällig|vital\s+instabil)\b/.test(t)
            : domain === 'social_functioning'
              ? /\b(sozial(?:er)?\s+rückzug|isolation|funktion(?:s)?fähigkeit\s+(?:eingeschränkt|verschlechtert))\b/.test(
                  t,
                )
              : /\b(verschlechtert|schlechter|zunehmend|aggraviert|progredient)\b/.test(t)

  if (improved && worsened) return 0
  if (improved) return 1
  if (worsened) return -1
  return scoreFromTextTrend(text)
}

function withinWindow(dateIso: string, startMs: number | null, endMs: number): boolean {
  const ts = new Date(dateIso).getTime()
  if (Number.isNaN(ts)) return false
  if (startMs !== null && ts < startMs) return false
  return ts <= endMs
}

export function extractImprintSignals(
  imprints: ClinicalImprintRecord[],
  startMs: number | null,
  endMs: number,
): DomainSignal[] {
  const inWindow = imprints
    .filter((i) => i.sourceDate && withinWindow(i.sourceDate, startMs, endMs))
    .sort((a, b) => (a.sourceDate ?? '').localeCompare(b.sourceDate ?? ''))

  const signals: DomainSignal[] = []
  const psych = inWindow.filter((i) => i.clinicalDomain === 'psychopathology')

  if (psych.length >= 2) {
    const earlier = psych[0]
    const later = psych[psych.length - 1]
    const delta = scoreFromCourseComparison(earlier.courseDirection, later.courseDirection)
    if (delta !== null) {
      signals.push({
        domain: 'core_psychopathology',
        score: delta,
        evidence: evidence(
          `Verlaufsrichtung: ${earlier.courseDirection ?? '—'} → ${later.courseDirection ?? '—'}`,
          'Psychopathologie',
          later.imprintKey,
          later.sourceDate ?? undefined,
        ),
      })
    }
  } else if (psych.length === 1 && psych[0].courseDirection) {
    const score = COURSE_TO_SCORE[psych[0].courseDirection as CourseDirection]
    if (score !== undefined) {
      signals.push({
        domain: 'core_psychopathology',
        score,
        evidence: evidence(
          `Verlaufsrichtung: ${psych[0].courseDirection}`,
          'Psychopathologie',
          psych[0].imprintKey,
          psych[0].sourceDate ?? undefined,
        ),
      })
    }
  }

  const latestPsych = psych[psych.length - 1]
  if (latestPsych) {
    const fieldSignals: Array<{ domain: VerlaufstendenzDomain; field: keyof ClinicalImprintRecord; label: string }> =
      [
        { domain: 'sleep_drive_affect', field: 'sleep', label: 'Schlaf' },
        { domain: 'sleep_drive_affect', field: 'drive', label: 'Antrieb' },
        { domain: 'sleep_drive_affect', field: 'affect', label: 'Affekt' },
        { domain: 'ward_behavior', field: 'cooperation', label: 'Kooperation' },
        { domain: 'insight_compliance', field: 'insight', label: 'Einsicht' },
        { domain: 'insight_compliance', field: 'adherence', label: 'Compliance' },
        { domain: 'social_functioning', field: 'functioning', label: 'Funktionieren' },
        { domain: 'social_functioning', field: 'socialInteraction', label: 'Sozialverhalten' },
        { domain: 'somatic_side_effects', field: 'sideEffects', label: 'Nebenwirkungen' },
      ]

    for (const { domain, field, label } of fieldSignals) {
      const raw = latestPsych[field]
      if (typeof raw !== 'string' || !raw.trim()) continue
      const score = scanDomainText(raw, domain) ?? scoreFromTextTrend(raw)
      if (score === null) continue
      signals.push({
        domain,
        score,
        evidence: evidence(`${label}: ${raw.trim()}`, 'Psychopathologie', latestPsych.imprintKey, latestPsych.sourceDate ?? undefined),
      })
    }
  }

  const riskImprints = inWindow.filter(
    (i) => i.clinicalDomain === 'risk' || i.suicidality || i.riskSelf || i.riskOthers,
  )
  for (const imprint of riskImprints) {
    for (const [field, label] of [
      ['suicidality', 'Suizidalität'],
      ['riskSelf', 'Eigengefährdung'],
      ['riskOthers', 'Fremdgefährdung'],
    ] as const) {
      const raw = imprint[field]?.trim()
      if (!raw) continue
      const id = field === 'suicidality' ? 'suicidality' : field === 'riskSelf' ? 'riskSelf' : 'riskOthers'
      if (!isMeaningfulRiskRawValue(id, raw)) continue
      const acute = /akut|imperativ|drängend|konkret|aktiv|hoch/.test(raw.toLowerCase())
      signals.push({
        domain: 'safety_risk',
        score: acute ? -2 : -1,
        evidence: evidence(`${label}: ${raw}`, 'Risiko', imprint.imprintKey, imprint.sourceDate ?? undefined),
      })
    }
  }

  return signals
}

export function extractVerlaufFeedSignals(
  entries: VerlaufFeedEntry[],
  startMs: number | null,
  endMs: number,
): DomainSignal[] {
  const signals: DomainSignal[] = []
  const inWindow = entries.filter((e) => withinWindow(e.date, startMs, endMs))

  for (const entry of inWindow) {
    const text = entry.content.trim()
    if (!text) continue
    const general = scoreFromTextTrend(text)
    if (general !== null) {
      signals.push({
        domain: 'core_psychopathology',
        score: general,
        evidence: evidence(text.slice(0, 160), entry.pageType === 'therapie-verlauf' ? 'Therapie-Verlauf' : 'Verlauf', entry.id, entry.date),
      })
    }

    for (const domain of [
      'sleep_drive_affect',
      'ward_behavior',
      'insight_compliance',
      'somatic_side_effects',
      'social_functioning',
    ] as VerlaufstendenzDomain[]) {
      const score = scanDomainText(text, domain)
      if (score === null) continue
      signals.push({
        domain,
        score,
        evidence: evidence(text.slice(0, 160), 'Verlauf', entry.id, entry.date),
      })
    }

    if (/\b(suizid|eigengefährdung|fremdgefährdung|aggressiv(?:ität)?)\b/i.test(text)) {
      const acute = /akut|imperativ|drängend|konkret/.test(text.toLowerCase())
      signals.push({
        domain: 'safety_risk',
        score: acute ? -2 : -1,
        evidence: evidence(text.slice(0, 160), 'Verlauf', entry.id, entry.date),
      })
    }
  }

  return signals
}

export function extractSafetySignals(signals: SafetyRiskSignal[]): DomainSignal[] {
  const out: DomainSignal[] = []
  for (const signal of signals) {
    if (signal.tone !== 'high' && signal.tone !== 'moderate') continue
    if (!isMeaningfulRiskRawValue(signal.id, signal.value ?? signal.label)) continue
    out.push({
      domain: 'safety_risk',
      score: signal.tone === 'high' ? -2 : -1,
      evidence: evidence(
        signal.value ? `${signal.label}: ${signal.value}` : signal.label,
        'Sicherheit',
        signal.id,
      ),
    })
  }
  return out
}

export function extractComplianceSignal(overallPercent: number | null): DomainSignal | null {
  if (overallPercent == null) return null
  if (overallPercent >= 80) {
    return {
      domain: 'insight_compliance',
      score: 1,
      evidence: evidence(`Compliance ${overallPercent}% im Beobachtungsfenster`, 'Compliance'),
    }
  }
  if (overallPercent < 50) {
    return {
      domain: 'insight_compliance',
      score: -1,
      evidence: evidence(`Compliance ${overallPercent}% im Beobachtungsfenster`, 'Compliance'),
    }
  }
  return {
    domain: 'insight_compliance',
    score: 0,
    evidence: evidence(`Compliance ${overallPercent}% im Beobachtungsfenster`, 'Compliance'),
  }
}

export function extractSomaticLabSignal(abnormalCount: number): DomainSignal | null {
  if (abnormalCount <= 0) return null
  return {
    domain: 'somatic_side_effects',
    score: abnormalCount >= 2 ? -1 : 0,
    evidence: evidence(
      `${abnormalCount} auffällige Laborwerte im jüngsten Befund`,
      'Labor',
    ),
  }
}

export function scoreToDomainDirection(score: number): VerlaufstendenzDomainDirection {
  if (score >= 1.5) return 'deutlich_gebessert'
  if (score >= 0.5) return 'leicht_gebessert'
  if (score <= -1.5) return 'deutlich_verschlechtert'
  if (score <= -0.5) return 'leicht_verschlechtert'
  if (Math.abs(score) < 0.25) return 'stabil'
  return 'nicht_beurteilbar'
}
