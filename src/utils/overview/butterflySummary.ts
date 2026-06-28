import { matchDisorderToCodes } from '../../data/diagnosisCriteria/match'
import { getLocalizedDisorder } from '../../data/diagnosisCriteria/i18n'
import { resolveDisorderForCodingSystem } from '../../data/diagnosisCriteria/version'
import type { UiLanguage } from '../../types/settings'
import type { DiagnoseEntry } from '../diagnosenArchive'
import { loadDiagnosen } from '../diagnosenArchive'
import { loadDiagnosenCodingSystem } from '../diagnosenCodingSystem'
import {
  codingSystemToTitleVersion,
  resolveDiagnosisLabelSync,
} from '../diagnosisDisplayRequests'
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
  version: 'icd10' | 'icd11' | 'dsm'
  overridden: boolean
  enteredLabel: string
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
  const titleVersion = codingSystemToTitleVersion(codingSystem)
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
    const activeCoding =
      codingSystem === 'icd11' && entry.icd11.code.trim()
        ? entry.icd11
        : entry.icd10.code.trim()
          ? entry.icd10
          : entry.icd11
    const code = activeCoding.code.trim() || entry.icd11.code.trim() || entry.icd10.code.trim()
    const disorderCriteriaLabel = sourceDisorder
      ? icdVersion === 'icd11'
        ? sourceDisorder.codingSystems.icd11?.label_de
        : sourceDisorder.codingSystems.icd10?.label_de
      : null
    const label = resolveDiagnosisLabelSync(activeCoding, titleVersion, disorderCriteriaLabel)

    if (!sourceDisorder) {
      out.push({
        id: entry.id,
        label,
        code,
        version: titleVersion,
        overridden: activeCoding.overridden,
        enteredLabel: activeCoding.label,
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
    const advice = buildDisorderAdvice(evaluation, disorder, language)
    const openCriteriaCount = evaluation.perCriterion.filter(
      (c) => c.status === 'unknown' && c.source !== 'attested',
    ).length

    out.push({
      id: entry.id,
      label,
      code: icdVersion === 'icd11' ? entry.icd11.code.trim() || versioned.codingSystems.icd11?.code || code : code,
      version: titleVersion,
      overridden: activeCoding.overridden,
      enteredLabel: activeCoding.label,
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
