/**
 * HL7 v2 mapping stubs — canonical ↔ pipe-delimited messages.
 * Small Praxis optional/future; disabled by default.
 */

import type { CanonicalCaseSnapshot } from '../../../types/integration/canonicalClinical'

export interface Hl7v2Message {
  messageType: string
  segments: string[]
  raw: string
}

function escapeHl7(value: string): string {
  return value.replace(/\\/g, '\\E\\').replace(/\|/g, '\\F\\').replace(/\^/g, '\\S\\').replace(/&/g, '\\T\\')
}

export function mapToHL7v2(snapshot: CanonicalCaseSnapshot, messageType: 'ADT' | 'ORU' = 'ADT'): Hl7v2Message {
  const now = snapshot.exportedAt.replace(/[-:T.Z]/g, '').slice(0, 14)
  const caseId = snapshot.case.caseId
  const patientName = snapshot.case.patient?.name ?? 'UNKNOWN'

  const segments = [
    `MSH|^~\\&|PSYCHIATRY-INK|LOCAL|EXTERNAL|KIS|${now}||${messageType}^A08|${caseId}|P|2.5`,
    `PID|1||${escapeHl7(caseId)}^^^LOCAL||${escapeHl7(patientName)}||${escapeHl7(snapshot.case.patient?.geburtsdatum ?? '')}|`,
  ]

  snapshot.diagnoses.forEach((dx, index) => {
    segments.push(
      `DG1|${index + 1}||${escapeHl7(dx.icd10Code ?? '')}^${escapeHl7(dx.icd10Label ?? '')}^I10`,
    )
  })

  if (messageType === 'ORU') {
    snapshot.labResults.forEach((lab, index) => {
      segments.push(
        `OBX|${index + 1}|ST|${escapeHl7(lab.name)}||${escapeHl7(lab.value ?? '')}|${escapeHl7(lab.unit ?? '')}|||F`,
      )
    })
  }

  return {
    messageType,
    segments,
    raw: segments.join('\r'),
  }
}

export function mapFromHL7v2(raw: string): CanonicalCaseSnapshot {
  const segments = raw.split(/\r|\n/).filter(Boolean)
  const empty: CanonicalCaseSnapshot = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    case: { caseId: 'hl7-import', updatedAt: new Date().toISOString() },
    encounters: [],
    anamnesisDocuments: [],
    clinicalCourse: [],
    diagnoses: [],
    labResults: [],
    arztbriefDocuments: [],
    customDocuments: [],
    consultationRequests: [],
    consultationReports: [],
  }

  for (const segment of segments) {
    const fields = segment.split('|')
    if (fields[0] === 'PID') {
      const idField = fields[3]?.split('^')[0] ?? 'hl7-import'
      const nameField = fields[5] ?? ''
      empty.case.caseId = idField
      empty.case.patient = { caseId: idField, name: nameField, geburtsdatum: fields[7] || undefined }
    }
    if (fields[0] === 'DG1') {
      const coding = fields[3]?.split('^') ?? []
      empty.diagnoses.push({
        id: `dg1-${empty.diagnoses.length}`,
        icd10Code: coding[0] || undefined,
        icd10Label: coding[1] || undefined,
        status: 'active',
      })
    }
    if (fields[0] === 'OBX') {
      empty.labResults.push({
        id: `obx-${empty.labResults.length}`,
        caseId: empty.case.caseId,
        name: fields[3]?.split('^')[0] || 'Labor',
        value: fields[5] || undefined,
        unit: fields[6] || undefined,
      })
    }
  }

  return empty
}
