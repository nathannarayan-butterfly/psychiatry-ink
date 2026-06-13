/**
 * Serialize the structured payloads of a {@link DrugSection} (PK / titration /
 * taper / depot / side-effects / CYP) into readable plain text.
 *
 * Used in two places so structured sections keep working everywhere:
 *   - the Ask-AI section serializer (gives the model real context), and
 *   - the export/print pipeline (Markdown / HTML / PDF) which otherwise only
 *     emits `section.content`.
 *
 * Language-light on purpose: short German labels (the KB is German-primary) and
 * raw values, so it reads cleanly as bullet text in any output target.
 */

import {
  getCypProfile,
  getDepotOptions,
  getPharmacokinetics,
  getSectionKind,
  getSideEffects,
  getTitrationSchedule,
  type CypProfile,
  type DepotOption,
  type DrugSection,
  type PharmacokineticData,
  type SideEffectEntry,
  type SideEffectFrequency,
  type SideEffectSeverity,
  type TitrationSchedule,
} from '../../types/knowledgeBase'

const FREQUENCY_DE: Record<SideEffectFrequency, string> = {
  veryCommon: 'sehr häufig',
  common: 'häufig',
  uncommon: 'gelegentlich',
  rare: 'selten',
  unknown: 'unbekannt',
}

const SEVERITY_DE: Record<SideEffectSeverity, string> = {
  mild: 'leicht',
  moderate: 'mäßig',
  severe: 'schwer',
  dangerous: 'gefährlich',
}

const QTC_DE: Record<'low' | 'moderate' | 'high', string> = {
  low: 'niedrig',
  moderate: 'moderat',
  high: 'hoch',
}

function num(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : String(value)
}

export function pkToLines(pk: PharmacokineticData): string[] {
  const out: string[] = []
  if (pk.halfLifeHours != null) {
    out.push(`Halbwertszeit: ${num(pk.halfLifeHours)} h${pk.halfLifeNote ? ` (${pk.halfLifeNote})` : ''}`)
  } else if (pk.halfLifeNote) {
    out.push(`Halbwertszeit: ${pk.halfLifeNote}`)
  }
  if (pk.tmaxHours != null) out.push(`Tmax: ${num(pk.tmaxHours)} h`)
  if (pk.timeToSteadyStateDays != null) out.push(`Steady State: ~${num(pk.timeToSteadyStateDays)} Tage`)
  if (pk.bioavailabilityPercent != null) out.push(`Bioverfügbarkeit: ${num(pk.bioavailabilityPercent)} %`)
  if (pk.proteinBindingPercent != null) out.push(`Proteinbindung: ${num(pk.proteinBindingPercent)} %`)
  if (pk.tdm && (pk.tdm.lowNgMl != null || pk.tdm.highNgMl != null)) {
    const unit = pk.tdm.unit ?? 'ng/ml'
    out.push(
      `TDM-Referenzbereich: ${num(pk.tdm.lowNgMl)}–${num(pk.tdm.highNgMl)} ${unit}${
        pk.tdm.note ? ` (${pk.tdm.note})` : ''
      }`,
    )
  }
  if (pk.isEstimated) out.push('(Werte geschätzt — gegen Fachinformation prüfen)')
  if (pk.sourceNote) out.push(`Quelle: ${pk.sourceNote}`)
  return out
}

export function titrationToLines(t: TitrationSchedule, isTaper: boolean): string[] {
  const unit = t.unit ?? 'mg'
  const out: string[] = []
  out.push(isTaper ? 'Absetzschema:' : 'Titrationsschema:')
  for (const step of t.steps) {
    const label = step.label ? `${step.label} · ` : ''
    const dose = step.doseMg == null ? 'Stopp' : `${step.doseMg} ${unit}`
    out.push(`  • Tag ${step.startDay}: ${label}${dose}${step.note ? ` — ${step.note}` : ''}`)
  }
  if (t.targetDoseMg != null) out.push(`Zieldosis: ${t.targetDoseMg} ${unit}`)
  if (t.maxDoseMg != null) out.push(`Maximaldosis: ${t.maxDoseMg} ${unit}`)
  if (t.isEstimated) out.push('(Schema illustrativ/geschätzt — gegen Fachinformation prüfen)')
  return out
}

export function depotOptionToLines(opt: DepotOption): string[] {
  const out: string[] = []
  const name = opt.brandName ? `${opt.name} (${opt.brandName})` : opt.name
  out.push(`Depot: ${name}`)
  if (opt.isShortActingNotDepot) {
    out.push('  • Kurzwirksames Acetat — KEIN Erhaltungsdepot (keine Erhaltungs-Timeline).')
  }
  out.push(`  • Injektionsintervall: alle ${opt.injectionIntervalDays} Tage`)
  if (opt.loadingRegimen.length > 0) {
    out.push('  • Aufsättigung:')
    for (const dose of opt.loadingRegimen) {
      out.push(
        `      – Tag ${dose.day}: ${dose.doseLabel}${dose.route ? ` ${dose.route}` : ''}${
          dose.note ? ` (${dose.note})` : ''
        }`,
      )
    }
  }
  out.push(
    opt.oralOverlapDays > 0
      ? `  • Orales Overlap: ${opt.oralOverlapDays} Tage`
      : '  • Kein orales Overlap erforderlich',
  )
  if (opt.doseEquivalence) out.push(`  • Dosisäquivalenz: ${opt.doseEquivalence}`)
  if (opt.firstMaintenanceDay != null) out.push(`  • Erste Erhaltungsinjektion: Tag ${opt.firstMaintenanceDay}`)
  if (opt.timeToSteadyStateWeeks != null) out.push(`  • Steady State: ~${opt.timeToSteadyStateWeeks} Wochen`)
  if (opt.flexWindowDays != null) out.push(`  • Flexibles Fenster: ±${opt.flexWindowDays} Tage`)
  if (opt.postInjectionMonitoring) out.push(`  • Post-Injektions-Monitoring: ${opt.postInjectionMonitoring}`)
  if (opt.isEstimated) out.push('  • (Regime illustrativ/geschätzt — gegen Fachinformation prüfen)')
  if (opt.sourceNote) out.push(`  • Quelle: ${opt.sourceNote}`)
  return out
}

export function sideEffectsToLines(entries: SideEffectEntry[]): string[] {
  const out: string[] = []
  for (const e of entries) {
    const sys = e.system ? `[${e.system}] ` : ''
    const warn = e.severity === 'dangerous' ? '⚠ ' : ''
    out.push(
      `  • ${warn}${sys}${e.effect} — ${FREQUENCY_DE[e.frequency]}, ${SEVERITY_DE[e.severity]}${
        e.note ? ` (${e.note})` : ''
      }`,
    )
  }
  return out
}

export function cypToLines(cyp: CypProfile): string[] {
  const out: string[] = []
  if (cyp.enzymes.length > 0) {
    out.push('CYP450-Enzyme:')
    for (const en of cyp.enzymes) {
      const role =
        en.role === 'substrate' ? 'Substrat' : en.role === 'inhibitor' ? 'Inhibitor' : 'Induktor'
      out.push(`  • ${en.enzyme}: ${role}${en.strength ? ` (${en.strength})` : ''}${en.note ? ` — ${en.note}` : ''}`)
    }
  }
  if (cyp.interactions && cyp.interactions.length > 0) {
    out.push('Wechselwirkungen:')
    for (const ix of cyp.interactions) {
      out.push(`  • ${ix.withDrugOrClass} [${ix.severity}]: ${ix.effect}`)
    }
  }
  if (cyp.qtcRisk) out.push(`QTc-Risiko: ${QTC_DE[cyp.qtcRisk]}`)
  if (cyp.isEstimated) out.push('(Angaben geschätzt — gegen Fachinformation prüfen)')
  return out
}

/**
 * Plain-text serialization of a section's structured payload, or '' when the
 * section is plain text / has no structured data.
 */
export function structuredSectionToText(section: DrugSection): string {
  const kind = getSectionKind(section)
  switch (kind) {
    case 'pk': {
      const pk = getPharmacokinetics(section)
      return pk ? pkToLines(pk).join('\n') : ''
    }
    case 'titration':
    case 'taper': {
      const t = getTitrationSchedule(section)
      return t ? titrationToLines(t, kind === 'taper').join('\n') : ''
    }
    case 'depot': {
      const opts = getDepotOptions(section)
      return opts.map((o) => depotOptionToLines(o).join('\n')).join('\n\n')
    }
    case 'sideEffects': {
      const entries = getSideEffects(section)
      return entries.length > 0 ? sideEffectsToLines(entries).join('\n') : ''
    }
    case 'cyp': {
      const cyp = getCypProfile(section)
      return cyp ? cypToLines(cyp).join('\n') : ''
    }
    default:
      return ''
  }
}

/** Section content followed by any structured serialization (both optional). */
export function sectionToFullText(section: DrugSection): string {
  const structured = structuredSectionToText(section)
  return [section.content.trim(), structured].filter(Boolean).join('\n\n')
}
