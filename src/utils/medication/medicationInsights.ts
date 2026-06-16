import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import type { DrugReference, InteractionEntry, ReceptorProfile } from '../../data/psychDrugReference/schema'
import type { MedicationEntry } from '../../types/medicationPlan'
import { isMedicationVisible } from './planOps'
import {
  affinityScore,
  RECEPTOR_AXES,
  type ReceptorAxisKey,
} from './referenceReceptorProfile'

/**
 * Intelligent clinical-analysis layer for the Medikation plan.
 *
 * Everything here is DERIVED from data already in the app — the patient's
 * medication plan + per-medication change history, and the local
 * psychopharmacology reference (`getDrugsForSubstance`) that the Präparate /
 * Rezeptorprofil / Nebenwirkungen sections already rely on. Nothing is
 * fabricated; when a substance has no reference entry it simply does not
 * contribute to the aggregates, and the relevant summary degrades gracefully
 * to an empty state at the UI layer.
 */

/** A receptor meaningfully (≥ moderate affinity) engaged across the active regimen. */
export interface TargetedReceptor {
  key: ReceptorAxisKey
  label: string
  /** How many active medications meaningfully engage this receptor. */
  count: number
  /** Strongest affinity score seen across the active regimen (0–4). */
  maxScore: number
  /** Active substances meaningfully engaging this receptor. */
  drugs: string[]
}

export interface SideEffectSignal {
  label: string
  /** How many active medications list this (shortened) adverse effect. */
  count: number
}

export interface MedicationClassTally {
  label: string
  count: number
}

export type RiskLevel = 'info' | 'moderate' | 'high'

export type CombinationRiskKind =
  | 'duplicateClass'
  | 'anticholinergic'
  | 'sedation'
  | 'orthostatic'
  | 'qtc'
  | 'serotonergic'

/** An additive / cumulative risk that emerges from combining the active drugs. */
export interface CombinationRisk {
  kind: CombinationRiskKind
  level: RiskLevel
  /** Active substances contributing to this cumulative risk. */
  drugs: string[]
  /** Extra qualifier, e.g. the shared drug class for duplicateClass. */
  detail?: string
}

/** A pairwise interaction between two active drugs, from the reference KB. */
export interface CrossInteraction {
  drugA: string
  drugB: string
  severity: InteractionEntry['severity']
  note: string
}

/** A monitoring parameter required by one or more active drugs. */
export interface MonitoringItem {
  parameter: string
  drugs: string[]
}

export interface MedicationInsights {
  activeCount: number
  /** Distinct substance classes across the active regimen (reference-derived). */
  activeClasses: MedicationClassTally[]
  /** Previously tried (discontinued) antipsychotics — distinct substance names. */
  triedAntipsychotics: string[]
  /** ISO timestamp of the most recent change anywhere in the plan. */
  lastModifiedAt: string | null
  /** Substance(s) touched at the most recent change. */
  lastModifiedSubstances: string[]
  /** Receptors meaningfully engaged by the active regimen, strongest first. */
  targetedReceptors: TargetedReceptor[]
  /** Adverse effects shared across / notable in the active regimen. */
  keySideEffects: SideEffectSignal[]
  /**
   * Combined receptor fingerprint for the active regimen: per axis, the
   * strongest qualitative affinity label across active drugs. Feeds the
   * headline receptor radar. Null when no active drug has reference data.
   */
  combinedReceptorProfile: ReceptorProfile | null
  /** Number of active drugs that contributed to the combined receptor profile. */
  receptorContributors: number
  /** Additive/cumulative pharmacodynamic risks across the regimen. */
  combinationRisks: CombinationRisk[]
  /** Pairwise reference interactions among the active drugs. */
  crossInteractions: CrossInteraction[]
  /** Highest severity present across risks + interactions (for the panel tone). */
  combinationRiskLevel: RiskLevel | null
  /** Monitoring parameters required across the active regimen. */
  monitoringBurden: MonitoringItem[]
  /** True when at least one active substance resolved to a reference entry. */
  hasReferenceData: boolean
}

const ACTIVE_STATUSES = new Set(['active', 'reduced', 'increased'])

/** Affinity score at/above which a receptor counts as a clinical "target". */
const TARGET_THRESHOLD = 3

function isAntipsychoticClass(substanceClass: string): boolean {
  return /antipsychotik|antipsychotic|neurolept/i.test(substanceClass)
}

/** First reference match for a substance, or null when none is known. */
function referenceFor(entry: MedicationEntry): DrugReference | null {
  return getDrugsForSubstance(entry.substance)[0] ?? null
}

/** Short, scannable token for an adverse-effect sentence ("Akathisie (…)" → "Akathisie"). */
function shortenSideEffect(text: string): string {
  const cut = text.split(/\s[–—(:-]|\s*\(/)[0]?.trim() ?? text.trim()
  return cut.length > 0 ? cut : text.trim()
}

interface ActiveDrug {
  name: string
  ref: DrugReference
}

const QTC_PATTERN = /qtc|qt-?zeit|torsade|qt-?verlänger|qt prolong/i
const SEROTONERGIC_CLASS_PATTERN = /antidepress|ssri|snri|serotonin|maoi|mao-hemmer/i

export function computeMedicationInsights(
  medications: MedicationEntry[],
  language: string,
): MedicationInsights {
  const visible = medications.filter(isMedicationVisible)
  const active = visible.filter((med) => ACTIVE_STATUSES.has(med.status))

  // Resolve each active drug to its reference entry once.
  const activeDrugs: ActiveDrug[] = []
  for (const med of active) {
    const ref = referenceFor(med)
    if (ref) activeDrugs.push({ name: med.substance, ref })
  }
  const hasReferenceData = activeDrugs.length > 0

  // ── Active substance classes (reference-derived) ────────────────────────
  const classCounts = new Map<string, string[]>()
  for (const { name, ref } of activeDrugs) {
    const label = simplifyClassLabel(ref.substanceClass)
    const list = classCounts.get(label) ?? []
    list.push(name)
    classCounts.set(label, list)
  }
  const activeClasses = [...classCounts.entries()]
    .map(([label, drugs]) => ({ label, count: drugs.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  // ── Previously tried antipsychotics (discontinued) ──────────────────────
  const tried = new Set<string>()
  for (const med of visible) {
    if (med.status !== 'discontinued') continue
    const ref = referenceFor(med)
    if (ref && isAntipsychoticClass(ref.substanceClass)) tried.add(ref.genericName)
  }
  const triedAntipsychotics = [...tried].sort((a, b) => a.localeCompare(b))

  // ── Last modification across the whole plan ─────────────────────────────
  let lastModifiedAt: string | null = null
  const lastBySubstance = new Map<string, string>()
  for (const med of visible) {
    if (!med.lastChangeAt) continue
    lastBySubstance.set(med.substance, med.lastChangeAt)
    if (lastModifiedAt === null || med.lastChangeAt > lastModifiedAt) {
      lastModifiedAt = med.lastChangeAt
    }
  }
  const lastModifiedSubstances =
    lastModifiedAt === null
      ? []
      : [...lastBySubstance.entries()]
          .filter(([, at]) => at === lastModifiedAt)
          .map(([substance]) => substance)

  // ── Receptors: per-axis aggregate + combined fingerprint profile ────────
  const receptorAgg = new Map<ReceptorAxisKey, { count: number; maxScore: number; drugs: string[] }>()
  const combinedProfile: ReceptorProfile = {}
  const bestScorePerAxis = new Map<ReceptorAxisKey, number>()
  let receptorContributors = 0
  for (const { name, ref } of activeDrugs) {
    const profile = ref.receptorProfile
    if (!profile) continue
    let contributed = false
    for (const axis of RECEPTOR_AXES) {
      const value = profile[axis.key]
      const score = affinityScore(value)
      if (score <= 0) continue
      contributed = true
      // Combined fingerprint = strongest qualitative label seen on this axis.
      if (score > (bestScorePerAxis.get(axis.key) ?? 0)) {
        bestScorePerAxis.set(axis.key, score)
        combinedProfile[axis.key] = value
      }
      if (score < TARGET_THRESHOLD) continue
      const prev = receptorAgg.get(axis.key) ?? { count: 0, maxScore: 0, drugs: [] }
      prev.count += 1
      prev.maxScore = Math.max(prev.maxScore, score)
      prev.drugs.push(name)
      receptorAgg.set(axis.key, prev)
    }
    if (contributed) receptorContributors += 1
  }
  const targetedReceptors: TargetedReceptor[] = [...receptorAgg.entries()]
    .map(([key, agg]) => ({
      key,
      label: receptorLabel(key, language),
      count: agg.count,
      maxScore: agg.maxScore,
      drugs: agg.drugs,
    }))
    .sort((a, b) => b.count - a.count || b.maxScore - a.maxScore)
  const combinedReceptorProfile =
    Object.keys(combinedProfile).length > 0 ? combinedProfile : null

  // ── Key adverse effects across the active regimen ───────────────────────
  const sideEffectCounts = new Map<string, number>()
  for (const { ref } of activeDrugs) {
    const list = language === 'de' ? ref.commonSideEffectsDe : ref.commonSideEffectsEn
    const seen = new Set<string>()
    for (const raw of list) {
      const token = shortenSideEffect(raw)
      if (!token || seen.has(token.toLowerCase())) continue
      seen.add(token.toLowerCase())
      sideEffectCounts.set(token, (sideEffectCounts.get(token) ?? 0) + 1)
    }
  }
  const keySideEffects: SideEffectSignal[] = [...sideEffectCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  // ── Combination / additive pharmacodynamic risks ────────────────────────
  const combinationRisks = computeCombinationRisks(activeDrugs, activeClasses, classCounts)
  const crossInteractions = computeCrossInteractions(activeDrugs, language)
  const combinationRiskLevel = highestLevel(combinationRisks, crossInteractions)

  // ── Monitoring burden across the active regimen ─────────────────────────
  const monitoringMap = new Map<string, string[]>()
  for (const { name, ref } of activeDrugs) {
    const seen = new Set<string>()
    for (const rule of ref.monitoringRules) {
      const param = rule.parameter.trim()
      if (!param || seen.has(param.toLowerCase())) continue
      seen.add(param.toLowerCase())
      const list = monitoringMap.get(param) ?? []
      list.push(name)
      monitoringMap.set(param, list)
    }
  }
  const monitoringBurden: MonitoringItem[] = [...monitoringMap.entries()]
    .map(([parameter, drugs]) => ({ parameter, drugs }))
    .sort((a, b) => b.drugs.length - a.drugs.length || a.parameter.localeCompare(b.parameter))

  return {
    activeCount: active.length,
    activeClasses,
    triedAntipsychotics,
    lastModifiedAt,
    lastModifiedSubstances,
    targetedReceptors,
    keySideEffects,
    combinedReceptorProfile,
    receptorContributors,
    combinationRisks,
    crossInteractions,
    combinationRiskLevel,
    monitoringBurden,
    hasReferenceData,
  }
}

/**
 * Cumulative pharmacodynamic risks that only emerge when drugs are combined.
 * A risk is raised only when ≥ 2 active drugs contribute (additive burden),
 * so single-agent effects are not over-flagged.
 */
function computeCombinationRisks(
  activeDrugs: ActiveDrug[],
  activeClasses: MedicationClassTally[],
  classMembers: Map<string, string[]>,
): CombinationRisk[] {
  const risks: CombinationRisk[] = []

  // Duplicate class therapy (e.g. antipsychotic polypharmacy).
  for (const klass of activeClasses) {
    if (klass.count < 2) continue
    const drugs = classMembers.get(klass.label) ?? []
    const isAntipsychotic = isAntipsychoticClass(klass.label)
    risks.push({
      kind: 'duplicateClass',
      level: isAntipsychotic ? 'high' : 'moderate',
      drugs,
      detail: klass.label,
    })
  }

  // Receptor-driven additive burdens (anticholinergic, sedation, orthostasis).
  const receptorRisk = (
    axis: ReceptorAxisKey,
    kind: CombinationRiskKind,
  ): CombinationRisk | null => {
    const drugs = activeDrugs
      .filter(({ ref }) => affinityScore(ref.receptorProfile?.[axis]) >= TARGET_THRESHOLD)
      .map((d) => d.name)
    if (drugs.length < 2) return null
    return { kind, level: drugs.length >= 3 ? 'high' : 'moderate', drugs }
  }
  const anticholinergic = receptorRisk('m1', 'anticholinergic')
  if (anticholinergic) risks.push(anticholinergic)
  const sedation = receptorRisk('h1', 'sedation')
  if (sedation) risks.push(sedation)
  const orthostatic = receptorRisk('alpha1', 'orthostatic')
  if (orthostatic) risks.push(orthostatic)

  // Additive QTc prolongation — drugs whose reference flags QTc risk.
  const qtcDrugs = activeDrugs
    .filter(({ ref }) => mentionsQtc(ref))
    .map((d) => d.name)
  if (qtcDrugs.length >= 2) {
    risks.push({ kind: 'qtc', level: 'high', drugs: qtcDrugs })
  }

  // Serotonergic load — additive serotonin tone (serotonin syndrome risk).
  const serotonergic = activeDrugs
    .filter(
      ({ ref }) =>
        SEROTONERGIC_CLASS_PATTERN.test(ref.substanceClass) ||
        affinityScore(ref.receptorProfile?.netSert) >= TARGET_THRESHOLD,
    )
    .map((d) => d.name)
  if (serotonergic.length >= 2) {
    risks.push({ kind: 'serotonergic', level: serotonergic.length >= 3 ? 'high' : 'moderate', drugs: serotonergic })
  }

  return risks.sort((a, b) => levelRank(b.level) - levelRank(a.level))
}

function mentionsQtc(ref: DrugReference): boolean {
  if (ref.monitoringRules.some((rule) => QTC_PATTERN.test(rule.parameter))) return true
  return [...ref.seriousSideEffectsDe, ...ref.commonSideEffectsDe].some((se) => QTC_PATTERN.test(se))
}

/** Pairwise reference interactions among the active drugs (deduplicated, strongest first). */
function computeCrossInteractions(activeDrugs: ActiveDrug[], language: string): CrossInteraction[] {
  const out: CrossInteraction[] = []
  const seen = new Set<string>()
  for (let i = 0; i < activeDrugs.length; i += 1) {
    const a = activeDrugs[i]!
    for (let j = i + 1; j < activeDrugs.length; j += 1) {
      const b = activeDrugs[j]!
      const interaction = findInteraction(a.ref, b.ref)
      if (!interaction) continue
      const key = [a.name, b.name].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        drugA: a.name,
        drugB: b.name,
        severity: interaction.severity,
        note: language === 'de' ? interaction.clinicalNoteDe : interaction.clinicalNoteEn,
      })
    }
  }
  return out.sort((x, y) => severityRank(y.severity) - severityRank(x.severity))
}

/** Find a reference interaction entry linking two drugs by generic / brand name. */
function findInteraction(refA: DrugReference, refB: DrugReference): InteractionEntry | null {
  const bNames = [refB.genericName, ...(refB.brandNamesDACH ?? [])].map((n) => n.toLowerCase())
  const matches = (entry: InteractionEntry): boolean => {
    const target = entry.interactsWith.toLowerCase()
    return bNames.some((name) => name.length >= 3 && (target.includes(name) || name.includes(target)))
  }
  return refA.interactions.find(matches) ?? null
}

function severityRank(severity: InteractionEntry['severity']): number {
  switch (severity) {
    case 'contraindicated':
      return 4
    case 'severe':
      return 3
    case 'moderate':
      return 2
    default:
      return 1
  }
}

export function interactionLevel(severity: InteractionEntry['severity']): RiskLevel {
  if (severity === 'contraindicated' || severity === 'severe') return 'high'
  if (severity === 'moderate') return 'moderate'
  return 'info'
}

function levelRank(level: RiskLevel): number {
  return level === 'high' ? 3 : level === 'moderate' ? 2 : 1
}

function highestLevel(risks: CombinationRisk[], interactions: CrossInteraction[]): RiskLevel | null {
  let best: RiskLevel | null = null
  const consider = (level: RiskLevel) => {
    if (best === null || levelRank(level) > levelRank(best)) best = level
  }
  risks.forEach((r) => consider(r.level))
  interactions.forEach((i) => consider(interactionLevel(i.severity)))
  return best
}

function receptorLabel(key: ReceptorAxisKey, language: string): string {
  const axis = RECEPTOR_AXES.find((entry) => entry.key === key)
  if (!axis) return key
  return language === 'de' ? axis.labelDe : axis.labelEn
}

/**
 * Collapse a verbose reference class string into a short, scannable label.
 * e.g. "Butyrophenon (Typisches Antipsychotikum, FGA)" → "Antipsychotikum (FGA)".
 */
function simplifyClassLabel(substanceClass: string): string {
  const lower = substanceClass.toLowerCase()
  if (/antipsychotik|antipsychotic|neurolept/.test(lower)) {
    if (/fga|typisch/.test(lower)) return 'Antipsychotikum (FGA)'
    if (/sga|atypisch/.test(lower)) return 'Antipsychotikum (SGA)'
    return 'Antipsychotikum'
  }
  if (/antidepress/.test(lower)) return 'Antidepressivum'
  if (/mood stabilizer|stimmungsstabil|phasenprophyla/.test(lower)) return 'Phasenprophylaxe'
  if (/benzodiazepin/.test(lower)) return 'Benzodiazepin'
  if (/z-drug|hypnotik/.test(lower)) return 'Hypnotikum'
  if (/stimulan/.test(lower)) return 'Stimulans'
  if (/antikonvulsiv|antiepilept/.test(lower)) return 'Antikonvulsivum'
  if (/anxiolyt/.test(lower)) return 'Anxiolytikum'
  // Fall back to the leading segment before a delimiter.
  return substanceClass.split(/\s[–—(/]/)[0]?.trim() || substanceClass
}
