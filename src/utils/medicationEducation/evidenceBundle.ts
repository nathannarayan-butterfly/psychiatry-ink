import type { MedicationEntry, MedicationPlanState } from '../../types/medicationPlan'
import type { KnowledgeBaseDrug } from '../../types/knowledgeBase'
import type {
  MedicationEducationDetailStyle,
  MedicationEducationEvidenceBundle,
  MedicationEducationLanguage,
  MedicationEducationScope,
  MedicationEducationTemplate,
} from '../../types/medicationEducation'
import { buildDiscussionPackage } from '../discussCase/buildPackage'
import { deidentifyPackageContent } from '../discussCase/deidentify'
import { collectClinicalPayload } from '../workspaceVault'
import { loadBefunde } from '../laborArchive'
import { getParameterMonitoringRows } from '../overview/medicationMonitoring'
import { activeMedications } from '../medication/planOps'
import {
  extractCombinationRisksFromFindings,
  requiresCombinationSynthesis,
} from './combinationSynthesis'
import { loadCombinationCheckStore } from '../combinationCheck/storage'
import { getMedicationEducationKbTemplate } from './kbTemplateStorage'
import { assessKbTemplateCompleteness } from './kbCompleteness'

function ageBandFromYear(year?: number): string | undefined {
  if (!year) return undefined
  const age = new Date().getFullYear() - year
  if (age < 18) return 'under-18'
  if (age < 30) return '18-29'
  if (age < 40) return '30-39'
  if (age < 50) return '40-49'
  if (age < 60) return '50-59'
  if (age < 70) return '60-69'
  return '70+'
}

function parseBirthYear(dob?: string): number | undefined {
  if (!dob?.trim()) return undefined
  const match = dob.match(/(\d{4})/)
  return match ? Number(match[1]) : undefined
}

function timingFromSchedule(entry: MedicationEntry): string {
  const s = entry.doseSchedule
  const parts: string[] = []
  if (s.morning) parts.push(`morgens ${s.morning}`)
  if (s.noon) parts.push(`mittags ${s.noon}`)
  if (s.evening) parts.push(`abends ${s.evening}`)
  if (s.night) parts.push(`nachts ${s.night}`)
  return parts.join(', ') || entry.doseLineGerman
}

function templateToKbSummary(template: MedicationEducationTemplate | null, substanceName: string) {
  return {
    substanceName,
    mechanismSimple: template?.mechanismSimple ?? '',
    commonSideEffects: template?.commonSideEffects ?? '',
    seriousWarnings: template?.seriousWarnings ?? '',
    monitoringRequirements: template?.monitoringRequirements ?? '',
    interactions: template?.interactions ?? '',
    pregnancyLactation: template?.pregnancyLactation ?? '',
    missedDose: template?.missedDose ?? '',
    drivingWork: template?.drivingWork ?? '',
    approvalStatus: template?.approvalStatus ?? ('draft' as const),
  }
}

export async function buildMedicationEducationEvidenceBundle(params: {
  caseId?: string
  scope: MedicationEducationScope
  documentVariant: MedicationEducationEvidenceBundle['documentVariant']
  detailStyle: MedicationEducationDetailStyle
  language: MedicationEducationLanguage
  medications: MedicationEntry[]
  planState?: MedicationPlanState
  patientName?: string
  patientDob?: string
  patientSex?: string
  allergies?: string[]
  kbDrugs?: KnowledgeBaseDrug[]
}): Promise<MedicationEducationEvidenceBundle> {
  const builtAt = new Date().toISOString()
  const missing: string[] = []
  const meds = params.medications

  const kbSummaries = await Promise.all(
    meds.map(async (m) => {
      const medId = m.kbDrugId ?? m.substanceId ?? m.id
      const template = await getMedicationEducationKbTemplate(medId, params.language)
      const assessment = assessKbTemplateCompleteness(template)
      if (!assessment.isSufficientForAi) {
        missing.push(`KB unvollständig: ${m.substance}`)
      }
      return templateToKbSummary(template, m.substance)
    }),
  )

  const medicationLines = meds.map((m) => ({
    substanceName: m.substance,
    brandName: m.displayBrandName,
    doseDescription: m.strength,
    route: m.formulation,
    frequency: m.prn ? 'bei Bedarf' : 'regelmäßig',
    timing: timingFromSchedule(m),
    startDescription: m.startDate || 'unbekannt',
    titrationNote: m.reasonForChange || undefined,
    prn: m.prn,
    depot: m.formulation === 'depot' || !!m.depotInterval,
    indication: m.indication || '',
    patientReportedSideEffects: m.sideEffects ?? [],
    adherenceNote: m.adherenceNote || '',
    allergies: params.allergies ?? [],
  }))

  let diagnoses: string[] = []
  if (params.caseId) {
    const payload = collectClinicalPayload(undefined, params.caseId)
    const { deidentified } = buildDiscussionPackage({
      caseId: params.caseId,
      payload,
      selectedSections: ['diagnosis', 'medication', 'side-effects'],
    })
    const scrubbed = deidentifyPackageContent(deidentified, params.patientName)
    diagnoses = scrubbed.sections
      .filter((s) => s.key === 'diagnosis')
      .map((s) => s.content)
      .filter(Boolean)
  }

  const monitoring: string[] = []
  if (params.caseId && meds.length > 0) {
    const rows = getParameterMonitoringRows({
      medications: activeMedications(meds),
      befunde: loadBefunde(params.caseId),
    })
    for (const row of rows) {
      monitoring.push(`${row.label}: ${row.valueLabel ?? (row.missing ? 'fehlend' : '—')}`)
    }
  }

  let combinationRisks: MedicationEducationEvidenceBundle['combinationRisks'] = []
  if (params.caseId && meds.length > 1 && requiresCombinationSynthesis(params.scope)) {
    const findings = loadCombinationCheckStore(params.caseId).findings
    combinationRisks = extractCombinationRisksFromFindings(findings)
    if (combinationRisks.length === 0) {
      missing.push('Keine Kombinationsrisiko-Analyse vorhanden — Gründliche Prüfung empfohlen')
    }
  }

  const summaryParts = [
    `Medikamente: ${meds.map((m) => m.substance).join(', ')}`,
    ...medicationLines.map((m) => `${m.substanceName}: ${m.timing}, Indikation: ${m.indication || '—'}`),
    ...kbSummaries.map((k) => `${k.substanceName} KB: ${k.mechanismSimple.slice(0, 200)}`),
    ...combinationRisks.map((r) => `Kombination ${r.substances}: ${r.mainRisk}`),
  ]

  return {
    builtAt,
    isDeidentified: true,
    scope: params.scope,
    documentVariant: params.documentVariant,
    detailStyle: params.detailStyle,
    language: params.language,
    ageBand: ageBandFromYear(parseBirthYear(params.patientDob)),
    sexAtBirth: params.patientSex,
    medications: medicationLines,
    diagnoses,
    monitoring,
    kbSummaries,
    combinationRisks,
    missingOrUncertain: missing,
    summaryText: summaryParts.join('\n'),
    requiresCombinationSynthesis: requiresCombinationSynthesis(params.scope),
  }
}

/** Strip any accidental PHI patterns from bundle text before API send. */
export function scrubEvidenceText(text: string, patientName?: string): string {
  let out = text
  if (patientName?.trim()) {
    const parts = patientName.trim().split(/\s+/)
    for (const part of parts) {
      if (part.length > 2) {
        out = out.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[PATIENT]')
      }
    }
  }
  out = out.replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '[DATUM]')
  return out.slice(0, 14000)
}
