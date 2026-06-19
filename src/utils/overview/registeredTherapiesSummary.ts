import type { ComplementaryTherapy } from '../../types/complementaryTherapy'
import type { PsychotherapySummary } from '../../types/psychotherapy'
import type { SozialtherapieTarget } from '../../types/sozialtherapie'
import type { WeitereTherapie } from '../../types/weitereTherapie'
import type { UiLanguage } from '../../types/settings'
import { translateSozialtherapieArea } from '../../data/sozialtherapieUiTranslations'
import { translateWeitereTherapieType } from '../../data/weitereTherapieUiTranslations'
import { formatDateDe } from './dateLabels'

export interface RegisteredTherapyLine {
  id: string
  kind: string
  label: string
  goalSummary: string | null
  nextSessionLabel: string | null
}

export interface RegisteredTherapiesSummary {
  lines: RegisteredTherapyLine[]
}

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function buildRegisteredTherapiesSummary(input: {
  language: UiLanguage
  psychotherapy: { summary: PsychotherapySummary; hasPlan: boolean }
  complementaryTherapies: ComplementaryTherapy[]
  weitereEntries: WeitereTherapie[]
  sozialTargets: SozialtherapieTarget[]
}): RegisteredTherapiesSummary {
  const lines: RegisteredTherapyLine[] = []

  if (input.psychotherapy.hasPlan) {
    const s = input.psychotherapy.summary
    lines.push({
      id: 'psychotherapy',
      kind: 'Psychotherapie',
      label: s.method?.trim() || 'Psychotherapie',
      goalSummary: s.mainGoal ? clamp(s.mainGoal, 72) : null,
      nextSessionLabel: s.nextFocus
        ? `Nächster Fokus: ${clamp(s.nextFocus, 48)}`
        : s.lastSessionDate
          ? `Letzte Sitzung ${s.lastSessionDate}`
          : null,
    })
  }

  for (const entry of input.weitereEntries) {
    if (entry.status === 'completed' || entry.status === 'declined' || entry.status === 'contraindicated') {
      continue
    }
    const label = translateWeitereTherapieType(input.language, entry.type)
    lines.push({
      id: `weitere:${entry.id}`,
      kind: label,
      label,
      goalSummary: entry.clinicalGoal
        ? clamp(entry.clinicalGoal, 72)
        : entry.notes
          ? clamp(entry.notes, 72)
          : null,
      nextSessionLabel: entry.nextReviewDate
        ? `Nächste Kontrolle ${formatDateDe(entry.nextReviewDate) ?? entry.nextReviewDate}`
        : entry.frequency?.trim() || null,
    })
  }

  for (const therapy of input.complementaryTherapies) {
    if (therapy.status === 'completed') continue
    lines.push({
      id: `complementary:${therapy.id}`,
      kind: 'Komplementär',
      label: therapy.name.trim(),
      goalSummary: therapy.mainGoal ? clamp(therapy.mainGoal, 72) : null,
      nextSessionLabel: therapy.frequency?.trim() || null,
    })
  }

  for (const target of input.sozialTargets) {
    if (target.status === 'resolved' || target.status === 'not-relevant') continue
    const label = translateSozialtherapieArea(input.language, target.area)
    lines.push({
      id: `sozial:${target.id}`,
      kind: 'Sozialtherapie',
      label,
      goalSummary: target.goal ? clamp(target.goal, 72) : null,
      nextSessionLabel: target.currentMeasure ? clamp(target.currentMeasure, 56) : null,
    })
  }

  return { lines }
}
