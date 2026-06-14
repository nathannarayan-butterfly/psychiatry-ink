/**
 * FHIR R4 mapping stubs — canonical ↔ FHIR Bundle.
 * LOINC/SNOMED binding deferred; returns valid JSON structure.
 */

import type {
  CanonicalCaseSnapshot,
  DiagnosisItem,
  LabResult,
  MedicationItem,
  PatientProfile,
} from '../../../types/integration/canonicalClinical'

export interface FhirBundle {
  resourceType: 'Bundle'
  type: 'collection' | 'document' | 'transaction'
  timestamp?: string
  entry: Array<{ fullUrl?: string; resource: Record<string, unknown> }>
}

function uuidRef(prefix: string, id: string): string {
  return `urn:uuid:${prefix}-${id}`
}

function mapPatient(profile: PatientProfile | undefined, caseId: string): Record<string, unknown> {
  return {
    resourceType: 'Patient',
    id: caseId,
    identifier: profile?.identifiers?.map((id) => ({
      system: id.system,
      value: id.value,
    })) ?? [{ system: 'urn:psychiatry-ink:case', value: caseId }],
    name: profile?.name
      ? [{ text: profile.name, family: profile.name.split(' ').slice(-1)[0], given: profile.name.split(' ').slice(0, -1) }]
      : undefined,
    birthDate: profile?.geburtsdatum || undefined,
    gender: profile?.geschlecht || undefined,
  }
}

function mapCondition(dx: DiagnosisItem): Record<string, unknown> {
  return {
    resourceType: 'Condition',
    id: dx.id,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: dx.status ?? 'active' }],
    },
    code: {
      coding: [
        dx.icd10Code
          ? { system: 'http://hl7.org/fhir/sid/icd-10', code: dx.icd10Code, display: dx.icd10Label }
          : null,
        dx.icd11Code
          ? { system: 'http://id.who.int/icd/release/11', code: dx.icd11Code, display: dx.icd11Label }
          : null,
      ].filter(Boolean),
      text: dx.icd10Label || dx.icd11Label,
    },
  }
}

function mapMedicationStatement(med: MedicationItem, patientRef: string): Record<string, unknown> {
  return {
    resourceType: 'MedicationStatement',
    id: med.id,
    status: med.status === 'stopped' ? 'stopped' : 'active',
    subject: { reference: patientRef },
    medicationCodeableConcept: { text: med.name },
    dosage: med.dose || med.frequency
      ? [{ text: [med.dose, med.frequency, med.route].filter(Boolean).join(' ') }]
      : undefined,
    note: med.notes ? [{ text: med.notes }] : undefined,
  }
}

function mapObservation(lab: LabResult, patientRef: string): Record<string, unknown> {
  return {
    resourceType: 'Observation',
    id: lab.id,
    status: 'final',
    subject: { reference: patientRef },
    code: { text: lab.name },
    effectiveDateTime: lab.observedAt,
    valueQuantity: lab.value
      ? { value: Number.isFinite(Number(lab.value)) ? Number(lab.value) : undefined, unit: lab.unit, text: lab.value }
      : undefined,
    referenceRange: lab.referenceRange ? [{ text: lab.referenceRange }] : undefined,
  }
}

function mapEncounter(enc: CanonicalCaseSnapshot['encounters'][0], patientRef: string): Record<string, unknown> {
  return {
    resourceType: 'Encounter',
    id: enc.id,
    status: enc.status,
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
    subject: { reference: patientRef },
    period: { start: enc.periodStart, end: enc.periodEnd },
    type: enc.type ? [{ text: enc.type }] : undefined,
  }
}

function mapComposition(snapshot: CanonicalCaseSnapshot, patientRef: string): Record<string, unknown> {
  const sections = snapshot.anamnesisDocuments.map((doc, index) => ({
    title: doc.title || `Section ${index + 1}`,
    text: { status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${doc.content.replace(/\n/g, '<br/>')}</div>` },
  }))
  return {
    resourceType: 'Composition',
    id: `${snapshot.case.caseId}:composition`,
    status: 'preliminary',
    type: { text: 'Clinical documentation' },
    subject: { reference: patientRef },
    date: snapshot.exportedAt,
    title: snapshot.case.displayTitle || 'Clinical case export',
    section: sections,
  }
}

function mapDocumentReference(doc: CanonicalCaseSnapshot['anamnesisDocuments'][0]): Record<string, unknown> {
  return {
    resourceType: 'DocumentReference',
    id: doc.id,
    status: 'current',
    type: { text: doc.title || 'Anamnesis' },
    description: doc.title,
    content: [{ attachment: { contentType: 'text/plain', data: btoa(unescape(encodeURIComponent(doc.content))) } }],
  }
}

function mapCarePlan(snapshot: CanonicalCaseSnapshot, patientRef: string): Record<string, unknown> | null {
  if (!snapshot.therapyPlan) return null
  return {
    resourceType: 'CarePlan',
    id: `${snapshot.case.caseId}:careplan`,
    status: 'active',
    intent: 'plan',
    subject: { reference: patientRef },
    description: snapshot.therapyPlan.modality,
    goal: snapshot.therapyPlan.goals?.map((g) => ({ description: { text: g } })),
  }
}

function mapClinicalImpression(snapshot: CanonicalCaseSnapshot, patientRef: string): Record<string, unknown> | null {
  if (!snapshot.mentalStatusExam) return null
  const summary = Object.entries(snapshot.mentalStatusExam.sections)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
  return {
    resourceType: 'ClinicalImpression',
    id: `${snapshot.case.caseId}:mse`,
    status: 'in-progress',
    subject: { reference: patientRef },
    summary,
  }
}

function mapDiagnosticReport(lab: LabResult, patientRef: string): Record<string, unknown> {
  return {
    resourceType: 'DiagnosticReport',
    id: `dr-${lab.id}`,
    status: 'final',
    subject: { reference: patientRef },
    code: { text: lab.name },
    effectiveDateTime: lab.observedAt,
    conclusion: lab.value ? `${lab.value}${lab.unit ? ` ${lab.unit}` : ''}` : undefined,
  }
}

function mapServiceRequest(snapshot: CanonicalCaseSnapshot, patientRef: string): Record<string, unknown> | null {
  const req = snapshot.consultationRequests[0]
  if (!req) return null
  return {
    resourceType: 'ServiceRequest',
    id: req.id,
    status: 'active',
    intent: 'order',
    subject: { reference: patientRef },
    code: { text: 'Consultation' },
    note: [{ text: req.question }],
  }
}

function mapBinaryPlaceholder(snapshot: CanonicalCaseSnapshot): Record<string, unknown> {
  return {
    resourceType: 'Binary',
    id: `${snapshot.case.caseId}:canonical-json`,
    contentType: 'application/json',
    data: btoa(unescape(encodeURIComponent(JSON.stringify({ schemaVersion: snapshot.schemaVersion, caseId: snapshot.case.caseId })))),
  }
}

export function mapToFHIR(snapshot: CanonicalCaseSnapshot): FhirBundle {
  const patientRef = uuidRef('patient', snapshot.case.caseId)
  const entries: FhirBundle['entry'] = []

  entries.push({ fullUrl: patientRef, resource: mapPatient(snapshot.case.patient, snapshot.case.caseId) })

  for (const enc of snapshot.encounters) {
    entries.push({ fullUrl: uuidRef('encounter', enc.id), resource: mapEncounter(enc, patientRef) })
  }

  for (const dx of snapshot.diagnoses) {
    entries.push({ fullUrl: uuidRef('condition', dx.id), resource: mapCondition(dx) })
  }

  for (const med of snapshot.medicationPlan?.items ?? []) {
    entries.push({
      fullUrl: uuidRef('medication', med.id),
      resource: mapMedicationStatement(med, patientRef),
    })
  }

  for (const lab of snapshot.labResults) {
    entries.push({ fullUrl: uuidRef('observation', lab.id), resource: mapObservation(lab, patientRef) })
    entries.push({
      fullUrl: uuidRef('diagnostic-report', lab.id),
      resource: mapDiagnosticReport(lab, patientRef),
    })
  }

  for (const doc of snapshot.anamnesisDocuments) {
    entries.push({ fullUrl: uuidRef('document', doc.id), resource: mapDocumentReference(doc) })
  }

  entries.push({ fullUrl: uuidRef('composition', snapshot.case.caseId), resource: mapComposition(snapshot, patientRef) })

  const carePlan = mapCarePlan(snapshot, patientRef)
  if (carePlan) entries.push({ fullUrl: uuidRef('careplan', snapshot.case.caseId), resource: carePlan })

  const impression = mapClinicalImpression(snapshot, patientRef)
  if (impression) entries.push({ fullUrl: uuidRef('impression', snapshot.case.caseId), resource: impression })

  const serviceRequest = mapServiceRequest(snapshot, patientRef)
  if (serviceRequest) entries.push({ fullUrl: uuidRef('service-request', serviceRequest.id as string), resource: serviceRequest })

  entries.push({
    fullUrl: uuidRef('binary', snapshot.case.caseId),
    resource: mapBinaryPlaceholder(snapshot),
  })

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: snapshot.exportedAt,
    entry: entries,
  }
}

export function mapFromFHIR(bundle: FhirBundle): CanonicalCaseSnapshot {
  const empty: CanonicalCaseSnapshot = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    case: { caseId: 'imported', updatedAt: new Date().toISOString() },
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

  if (bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) return empty

  let caseId = 'imported'
  const diagnoses: DiagnosisItem[] = []
  const labResults: LabResult[] = []

  for (const entry of bundle.entry) {
    const resource = entry.resource
    if (!resource?.resourceType) continue

    if (resource.resourceType === 'Patient') {
      caseId = String(resource.id ?? caseId)
      empty.case = {
        caseId,
        updatedAt: new Date().toISOString(),
        patient: {
          caseId,
          name: Array.isArray(resource.name) ? String((resource.name[0] as { text?: string }).text ?? '') : undefined,
          geburtsdatum: resource.birthDate ? String(resource.birthDate) : undefined,
        },
      }
    }

    if (resource.resourceType === 'Condition') {
      const coding = (resource.code as { coding?: Array<{ code?: string; display?: string; system?: string }> })?.coding?.[0]
      diagnoses.push({
        id: String(resource.id ?? `cond-${diagnoses.length}`),
        icd10Code: coding?.code,
        icd10Label: coding?.display,
        status: 'active',
      })
    }

    if (resource.resourceType === 'Observation') {
      const code = (resource.code as { text?: string })?.text ?? 'Observation'
      labResults.push({
        id: String(resource.id ?? `obs-${labResults.length}`),
        caseId,
        name: code,
        value: String((resource.valueQuantity as { text?: string; value?: number })?.text ??
          (resource.valueQuantity as { value?: number })?.value ?? ''),
        observedAt: resource.effectiveDateTime ? String(resource.effectiveDateTime) : undefined,
      })
    }
  }

  empty.case.caseId = caseId
  empty.diagnoses = diagnoses
  empty.labResults = labResults
  return empty
}
