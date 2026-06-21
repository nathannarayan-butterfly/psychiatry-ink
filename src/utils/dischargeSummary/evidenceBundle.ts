import type {
  DischargeSummaryEvidenceBundle,
  DischargeSummaryRegion,
  HospitalCourseLength,
} from '../../types/dischargeSummary'
import type { DischargeSummaryDocumentType } from '../../types/dischargeSummary'
import { buildDiscussionPackage } from '../discussCase/buildPackage'
import { collectClinicalPayload } from '../workspaceVault'
import { deidentifyPackageContent } from '../discussCase/deidentify'

function linesFromSections(keys: string[], sections: Record<string, string>): string[] {
  return keys.map((k) => sections[k]?.trim()).filter(Boolean) as string[]
}

/**
 * Build a compact de-identified evidence bundle for Discharge Summary AI sections.
 * Never includes patient name, DOB, or raw vault payloads.
 */
export function buildDischargeSummaryEvidenceBundle(params: {
  caseId?: string
  documentType: DischargeSummaryDocumentType
  region: DischargeSummaryRegion
  hospitalCourseLength: HospitalCourseLength
  manualContext?: string
  patientName?: string
}): DischargeSummaryEvidenceBundle {
  const builtAt = new Date().toISOString()

  if (!params.caseId && !params.manualContext?.trim()) {
    return {
      builtAt,
      isDeidentified: true,
      documentType: params.documentType,
      region: params.region,
      hospitalCourseLength: params.hospitalCourseLength,
      keyEvents: [],
      diagnoses: [],
      symptoms: [],
      medicationCourse: [],
      sideEffects: [],
      therapy: [],
      incidents: [],
      risk: [],
      diagnostics: [],
      dischargeStatus: [],
      missingOrUncertain: ['No clinical evidence provided'],
      summaryText: '',
    }
  }

  if (!params.caseId) {
    const manual = params.manualContext?.trim() ?? ''
    const deid = manual
      .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, '[DATE]')
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]')
    return {
      builtAt,
      isDeidentified: true,
      documentType: params.documentType,
      region: params.region,
      hospitalCourseLength: params.hospitalCourseLength,
      keyEvents: [deid],
      diagnoses: [],
      symptoms: [],
      medicationCourse: [],
      sideEffects: [],
      therapy: [],
      incidents: [],
      risk: [],
      diagnostics: [],
      dischargeStatus: [],
      missingOrUncertain: [],
      summaryText: deid,
    }
  }

  const payload = collectClinicalPayload(undefined, params.caseId)
  const { deidentified } = buildDiscussionPackage({
    caseId: params.caseId,
    payload,
    selectedSections: [
      'diagnosis',
      'anamnesis',
      'therapie-verlauf',
      'investigations',
      'current-therapy',
      'medication',
      'side-effects',
      'risk',
    ],
  })

  const scrubbed = deidentifyPackageContent(deidentified, params.patientName)

  const byKey: Record<string, string> = {}
  for (const section of scrubbed.sections) {
    const existing = byKey[section.key] ?? ''
    byKey[section.key] = existing ? `${existing}\n\n${section.content}` : section.content
  }

  const diagnoses = linesFromSections(['diagnosis'], byKey)
  const symptoms = linesFromSections(['anamnesis'], byKey)
  const medicationCourse = linesFromSections(['medication'], byKey)
  const sideEffects = linesFromSections(['side-effects'], byKey)
  const therapy = linesFromSections(['current-therapy'], byKey)
  const keyEvents = linesFromSections(['therapie-verlauf'], byKey)
  const diagnostics = linesFromSections(['investigations'], byKey)
  const risk = linesFromSections(['risk'], byKey)

  const incidents = keyEvents.filter((line) =>
    /restraint|seclusion|rapid.?tranquill|rapid.?tranquil|aggress|suicid|self.?harm|assault/i.test(line),
  )
  const dischargeStatus = keyEvents.filter((line) =>
    /discharg|transfer|stabil|condition at discharge|ready for discharge/i.test(line),
  )

  const missingOrUncertain: string[] = []
  if (!diagnoses.length) missingOrUncertain.push('Diagnoses incomplete or not documented')
  if (!keyEvents.length) missingOrUncertain.push('Hospital course not documented')
  if (!medicationCourse.length) missingOrUncertain.push('Medication not documented')

  const summaryParts = [
    diagnoses.length ? `Diagnoses:\n${diagnoses.join('\n')}` : '',
    symptoms.length ? `Symptoms / history:\n${symptoms.join('\n').slice(0, 2000)}` : '',
    keyEvents.length ? `Hospital course:\n${keyEvents.join('\n').slice(0, 4000)}` : '',
    medicationCourse.length ? `Medication:\n${medicationCourse.join('\n')}` : '',
    sideEffects.length ? `Adverse effects:\n${sideEffects.join('\n')}` : '',
    therapy.length ? `Therapy / follow-up:\n${therapy.join('\n')}` : '',
    risk.length ? `Risk:\n${risk.join('\n').slice(0, 1500)}` : '',
    diagnostics.length ? `Investigations:\n${diagnostics.join('\n')}` : '',
    missingOrUncertain.length ? `Missing / unclear: ${missingOrUncertain.join('; ')}` : '',
  ].filter(Boolean)

  const summaryText = summaryParts.join('\n\n').slice(0, 12000)

  return {
    builtAt,
    isDeidentified: true,
    documentType: params.documentType,
    region: params.region,
    hospitalCourseLength: params.hospitalCourseLength,
    keyEvents,
    diagnoses,
    symptoms,
    medicationCourse,
    sideEffects,
    therapy,
    incidents,
    risk,
    diagnostics,
    dischargeStatus,
    missingOrUncertain,
    summaryText,
  }
}

export function evidenceBundleCharCount(bundle: DischargeSummaryEvidenceBundle): number {
  return bundle.summaryText.length
}
