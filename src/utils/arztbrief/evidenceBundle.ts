import type { ArztbriefEvidenceBundle, TherapieVerlaufLength } from '../../types/arztbrief'
import type { ArztbriefDocumentType } from '../../types/arztbrief'
import { buildDiscussionPackage } from '../discussCase/buildPackage'
import { collectClinicalPayload } from '../workspaceVault'
import { deidentifyPackageContent } from '../discussCase/deidentify'

function linesFromSections(keys: string[], sections: Record<string, string>): string[] {
  return keys.map((k) => sections[k]?.trim()).filter(Boolean) as string[]
}

/**
 * Build a compact de-identified evidence bundle for Arztbrief AI sections.
 * Never includes patient name, DOB, or raw vault payloads.
 */
export function buildArztbriefEvidenceBundle(params: {
  caseId?: string
  documentType: ArztbriefDocumentType
  therapieVerlaufLength: TherapieVerlaufLength
  manualContext?: string
  patientName?: string
}): ArztbriefEvidenceBundle {
  const builtAt = new Date().toISOString()

  if (!params.caseId && !params.manualContext?.trim()) {
    return {
      builtAt,
      isDeidentified: true,
      documentType: params.documentType,
      therapieVerlaufLength: params.therapieVerlaufLength,
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
      missingOrUncertain: ['Keine klinische Evidenz bereitgestellt'],
      summaryText: '',
    }
  }

  if (!params.caseId) {
    const manual = params.manualContext?.trim() ?? ''
    const deid = manual.replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '[DATUM]')
    return {
      builtAt,
      isDeidentified: true,
      documentType: params.documentType,
      therapieVerlaufLength: params.therapieVerlaufLength,
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
    /fixierung|bgh|zwang|eskala|aggress|suizid/i.test(line),
  )
  const dischargeStatus = keyEvents.filter((line) =>
    /entlass|rückverleg|stabil|zustand/i.test(line),
  )

  const missingOrUncertain: string[] = []
  if (!diagnoses.length) missingOrUncertain.push('Diagnosen unvollständig oder nicht dokumentiert')
  if (!keyEvents.length) missingOrUncertain.push('Verlauf nicht dokumentiert')
  if (!medicationCourse.length) missingOrUncertain.push('Medikation nicht dokumentiert')

  const summaryParts = [
    diagnoses.length ? `Diagnosen:\n${diagnoses.join('\n')}` : '',
    symptoms.length ? `Symptome/Anamnese:\n${symptoms.join('\n').slice(0, 2000)}` : '',
    keyEvents.length ? `Verlauf:\n${keyEvents.join('\n').slice(0, 4000)}` : '',
    medicationCourse.length ? `Medikation:\n${medicationCourse.join('\n')}` : '',
    sideEffects.length ? `Nebenwirkungen:\n${sideEffects.join('\n')}` : '',
    therapy.length ? `Therapie:\n${therapy.join('\n')}` : '',
    risk.length ? `Risiko:\n${risk.join('\n').slice(0, 1500)}` : '',
    diagnostics.length ? `Diagnostik:\n${diagnostics.join('\n')}` : '',
    missingOrUncertain.length ? `Fehlend/unklar: ${missingOrUncertain.join('; ')}` : '',
  ].filter(Boolean)

  const summaryText = summaryParts.join('\n\n').slice(0, 12000)

  return {
    builtAt,
    isDeidentified: true,
    documentType: params.documentType,
    therapieVerlaufLength: params.therapieVerlaufLength,
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

export function evidenceBundleCharCount(bundle: ArztbriefEvidenceBundle): number {
  return bundle.summaryText.length
}
