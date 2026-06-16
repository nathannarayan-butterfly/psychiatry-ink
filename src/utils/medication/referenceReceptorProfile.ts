import type { ReceptorProfile } from '../../data/psychDrugReference/schema'

/**
 * Helpers for the *static* psychopharmacology reference (`psychDrugReference`),
 * whose receptor profiles are qualitative German/English strings (e.g.
 * "Sehr hohe Affinität", "Gering", "Minimal"). This is intentionally separate
 * from `receptorAffinity.ts`, which handles the numeric KnowledgeBaseDrug data.
 */

export type ReceptorAxisKey = keyof Omit<ReceptorProfile, 'notes'>

/** Canonical receptor axes with display labels, shared by the radar chart and insights. */
export const RECEPTOR_AXES: { key: ReceptorAxisKey; labelDe: string; labelEn: string }[] = [
  { key: 'd2', labelDe: 'D2', labelEn: 'D2' },
  { key: 'serotonin5HT2A', labelDe: '5-HT2A', labelEn: '5-HT2A' },
  { key: 'h1', labelDe: 'H1', labelEn: 'H1' },
  { key: 'm1', labelDe: 'M1', labelEn: 'M1' },
  { key: 'alpha1', labelDe: 'α1', labelEn: 'α1' },
  { key: 'netSert', labelDe: 'SERT/NET', labelEn: 'SERT/NET' },
  { key: 'serotonin5HT1A', labelDe: '5-HT1A', labelEn: '5-HT1A' },
  { key: 'd3', labelDe: 'D3', labelEn: 'D3' },
  { key: 'norepinephrine', labelDe: 'NET', labelEn: 'NET' },
  { key: 'gaba', labelDe: 'GABA', labelEn: 'GABA' },
]

/**
 * Maps a qualitative receptor-affinity label onto a 0–4 score. Single source of
 * truth shared by the receptor radar chart and the medication insights layer.
 */
export function affinityScore(value: string | null | undefined): number {
  if (!value) return 0
  const v = value.toLowerCase()
  if (/sehr hoch|very high|\bhoch\b|\bhigh\b|stark|potent|ausgeprägt|strong/.test(v)) return 4
  if (/moderat|moderate|mäßig/.test(v)) return 3
  if (/\bgering\b|\blow\b|\bweak\b|leicht|niedrig/.test(v)) return 2
  if (/minimal|partiell|partial|sehr gering/.test(v)) return 1
  return v.trim().length > 2 ? 1 : 0
}

export function receptorAxisLabel(key: ReceptorAxisKey, language: string): string {
  const axis = RECEPTOR_AXES.find((entry) => entry.key === key)
  if (!axis) return key
  return language === 'de' ? axis.labelDe : axis.labelEn
}
