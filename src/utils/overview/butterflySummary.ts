import { matchDisorderToCodes } from '../../data/diagnosisCriteria/match'
import { getLocalizedDisorder } from '../../data/diagnosisCriteria/i18n'
import { resolveDisorderForCodingSystem } from '../../data/diagnosisCriteria/version'
import type { UiLanguage } from '../../types/settings'
import type { DiagnoseEntry } from '../diagnosenArchive'
import { loadDiagnosen } from '../diagnosenArchive'
import { loadDiagnosenCodingSystem } from '../diagnosenCodingSystem'
import { loadAttestations } from '../butterfly/attestationStorage'
import { loadIsdmAnalysis } from '../isdm/storage'
import { buildEvaluationContext } from '../diagnosisCriteria/context'
import { evaluateDisorder } from '../diagnosisCriteria/evaluateDisorder'
import { buildDisorderAdvice } from '../diagnosisCriteria/advice'
import type { SemanticTone } from '../../components/notion/overview/OverviewCard'
import type { DisorderVerdict } from '../diagnosisCriteria/evaluateDisorder'

export interface ButterflySummaryItem {
  id: string
  label: string
  code: string
  verdict: DisorderVerdict | 'unavailable'
  tone: SemanticTone
  headline: string
  openCriteriaCount: number
}

function toneForVerdict(verdict: DisorderVerdict | 'unavailable'): SemanticTone {
  if (verdict === 'criteria_met') return 'moderate'
  if (verdict === 'not_met') return 'ok'
  if (verdict === 'insufficient_data') return 'info'
  return 'neutral'
}

function toButterflyIcdVersion(system: ReturnType<typeof loadDiagnosenCodingSystem>): 'icd10' | 'icd11' {
  return system === 'icd11' ? 'icd11' : 'icd10'
}

function hasCodeOrLabel(entry: DiagnoseEntry): boolean {
  return Boolean(
    entry.icd10.code.trim() ||
      entry.icd10.label.trim() ||
      entry.icd11.code.trim() ||
      entry.icd11.label.trim() ||
      entry.dsm.code.trim() ||
      entry.dsm.label.trim(),
  )
}

/** Compact Butterfly criteria status for entered diagnoses (Diagnose tab teaser). */
export function buildButterflySummary(caseId: string, language: UiLanguage, limit = 3): ButterflySummaryItem[] {
  const analysis = loadIsdmAnalysis(caseId)
  if (!analysis) return []

  const codingSystem = loadDiagnosenCodingSystem(caseId)
  const icdVersion = toButterflyIcdVersion(codingSystem)
  const attestations = loadAttestations(caseId)
  const ctx = buildEvaluationContext({
    phenomenology: analysis.phenomenology,
    coursePattern: analysis.coursePattern,
    attestations,
  })

  const seenDisorders = new Set<string>()
  const out: ButterflySummaryItem[] = []

  for (const entry of loadDiagnosen(caseId).filter(hasCodeOrLabel)) {
    const sourceDisorder = matchDisorderToCodes(entry.icd10.code, entry.icd11.code)
    const code = entry.icd10.code.trim() || entry.icd11.code.trim()
    const label = entry.icd10.label.trim() || entry.icd11.label.trim() || code

    if (!sourceDisorder) {
      out.push({
        id: entry.id,
        label,
        code,
        verdict: 'unavailable',
        tone: 'neutral',
        headline: '',
        openCriteriaCount: 0,
      })
      continue
    }

    const versioned = resolveDisorderForCodingSystem(sourceDisorder, icdVersion)
    const disorder = getLocalizedDisorder(versioned, language)
    if (seenDisorders.has(disorder.id)) continue
    seenDisorders.add(disorder.id)

    const evaluation = evaluateDisorder(disorder, ctx)
    const advice = buildDisorderAdvice(evaluation, disorder)
    const openCriteriaCount = evaluation.perCriterion.filter(
      (c) => c.status === 'unknown' && c.source !== 'attested',
    ).length

    out.push({
      id: entry.id,
      label,
      code: icdVersion === 'icd11' ? entry.icd11.code.trim() || versioned.codingSystems.icd11?.code || code : code,
      verdict: evaluation.verdict,
      tone: toneForVerdict(evaluation.verdict),
      headline: advice.headline,
      openCriteriaCount,
    })
  }

  const rank = (item: ButterflySummaryItem) => {
    if (item.verdict === 'criteria_met') return 0
    if (item.verdict === 'insufficient_data') return 1
    if (item.verdict === 'not_met') return 2
    return 3
  }

  return out.sort((a, b) => rank(a) - rank(b)).slice(0, limit)
}

export function hasButterflyCriteriaSupport(caseId: string): boolean {
  const analysis = loadIsdmAnalysis(caseId)
  if (!analysis) return false
  return loadDiagnosen(caseId).some((entry) => hasCodeOrLabel(entry) && matchDisorderToCodes(entry.icd10.code, entry.icd11.code))
}
