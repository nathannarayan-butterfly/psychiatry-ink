import { defaultAufnahmeSections } from '../data/aufnahmeSections'
import {
  DEMO_CASE_ID,
  DEMO_PATIENT_ID,
  DEMO_SEED_VERSION,
} from './constants'
import type { DemoPatientFixture, DemoValidationIssue, DemoValidationResult } from './types'

const PHI_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHI_PHONE = /\b(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/
const REAL_ADDRESS_HINT = /\b(str\.|straße|strasse|weg\s+\d|platz\s+\d)\b/i

function pushError(errors: DemoValidationIssue[], code: string, message: string, path?: string): void {
  errors.push({ level: 'error', code, message, path })
}

function pushWarn(warnings: DemoValidationIssue[], code: string, message: string, path?: string): void {
  warnings.push({ level: 'warn', code, message, path })
}

function scanTextForPhi(text: string, path: string, errors: DemoValidationIssue[], warnings: DemoValidationIssue[]): void {
  if (PHI_EMAIL.test(text)) pushError(errors, 'phi_email', 'E-Mail-Muster erkannt (kein echtes PHI erlaubt)', path)
  if (PHI_PHONE.test(text) && !text.includes('DEMO-')) {
    pushWarn(warnings, 'phi_phone', 'Telefonnummer-ähnliches Muster — prüfen', path)
  }
  if (REAL_ADDRESS_HINT.test(text) && !text.toLowerCase().includes('fiktiv')) {
    pushWarn(warnings, 'address_hint', 'Adress-ähnlicher Text ohne Fiktiv-Hinweis', path)
  }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value))
}

export function validateDemoFixture(
  fixture: DemoPatientFixture,
  options?: { expectedSeedVersion?: string },
): DemoValidationResult {
  const errors: DemoValidationIssue[] = []
  const warnings: DemoValidationIssue[] = []
  const expectedSeedVersion = options?.expectedSeedVersion ?? DEMO_SEED_VERSION

  if (!fixture.isDemoPatient) pushError(errors, 'not_demo', 'isDemoPatient muss true sein')
  if (fixture.demoSeedVersion !== expectedSeedVersion) {
    pushError(errors, 'seed_version', `demoSeedVersion muss ${expectedSeedVersion} sein`)
  }
  if (fixture.demoPatientId !== DEMO_PATIENT_ID) {
    pushError(errors, 'patient_id', `demoPatientId muss ${DEMO_PATIENT_ID} sein`)
  }
  if (fixture.demoCaseId !== DEMO_CASE_ID) {
    pushError(errors, 'case_id', `demoCaseId muss ${DEMO_CASE_ID} sein`)
  }

  const { patient } = fixture
  if (!patient.vorname?.trim() || !patient.nachname?.trim()) {
    pushError(errors, 'patient_name', 'Patient Vor-/Nachname fehlt', 'patient')
  }
  if (patient.nachname !== 'Demo') {
    pushWarn(warnings, 'patient_surname', 'Nachname sollte „Demo" sein für synthetischen Fall', 'patient.nachname')
  }
  if (!patient.geburtsdatum?.trim()) pushError(errors, 'patient_dob', 'Geburtsdatum fehlt', 'patient.geburtsdatum')
  if (!isIsoDate(patient.admissionDate)) {
    pushError(errors, 'admission_date', 'Ungültiges Aufnahmedatum', 'patient.admissionDate')
  }

  const requiredAufnahme = defaultAufnahmeSections.map((s) => s.id)
  const aufnahme = fixture.workspace?.documents?.aufnahme
  if (!fixture.workspace?.documents) {
    pushError(errors, 'documents_missing', 'workspace.documents fehlt')
  }
  if (!aufnahme) {
    pushError(errors, 'aufnahme_missing', 'Aufnahme-Dokument fehlt')
  } else {
    for (const sectionId of requiredAufnahme) {
      if (!aufnahme.sectionContents[sectionId]?.trim()) {
        pushError(errors, 'aufnahme_section', `Anamnese-Abschnitt leer: ${sectionId}`, `workspace.documents.aufnahme.${sectionId}`)
      }
    }
  }

  const workspace = fixture.workspace
  if (!workspace) {
    pushError(errors, 'workspace_missing', 'workspace fehlt')
    return { ok: false, errors, warnings }
  }

  if ((workspace.diagnoses?.length ?? 0) < 3) {
    pushError(errors, 'diagnoses_count', 'Mindestens 3 Diagnosen erforderlich')
  }
  if (!workspace.diagnoses?.some((d) => d.icd10.code === 'F20.0')) {
    pushError(errors, 'diagnosis_f200', 'F20.0 fehlt in Diagnoseliste')
  }
  if (!workspace.diagnoses?.some((d) => d.icd10.code === 'F10.2')) {
    pushError(errors, 'diagnosis_f102', 'F10.2 fehlt in Diagnoseliste')
  }
  if (workspace.diagnoses?.some((d) => d.icd10.code.startsWith('F25'))) {
    pushError(errors, 'diagnosis_f25', 'Schizoaffektive Störung (F25.x) darf nicht in der Diagnoseliste stehen')
  }

  if ((fixture.verlaufFeed?.length ?? 0) < 12) {
    pushError(errors, 'verlauf_count', 'Mindestens 12 Verlauf-Einträge erforderlich')
  }

  const annotationComments = (fixture.verlaufAnnotations ?? []).filter((a) => a.type === 'comment').length
  const annotationTodos = (fixture.verlaufAnnotations ?? []).filter((a) => a.type === 'todo').length
  if (annotationComments < 2) {
    pushWarn(warnings, 'verlauf_comments', 'Wenige Verlauf-Kommentare — Demo zeigt Annotationen eingeschränkt')
  }
  if (annotationTodos < 2) {
    pushWarn(warnings, 'verlauf_todos', 'Wenige Verlauf-To-dos — Demo zeigt Aufgaben eingeschränkt')
  }

  if ((workspace.labGraphs?.length ?? 0) === 0) {
    pushError(errors, 'lab_missing', 'Labor-Graph fehlt')
  } else {
    const dates = new Set(workspace.labGraphs[0]?.entries.map((e) => e.date.slice(0, 10)))
    if (dates.size < 2) pushWarn(warnings, 'lab_dates', 'Weniger als 2 Labordaten empfohlen')
  }

  if ((fixture.laborBefunde?.length ?? 0) < 2) {
    pushError(errors, 'labor_befunde_count', 'Mindestens 2 Laborbefunde erforderlich')
  } else {
    const befundDates = fixture.laborBefunde.map((b) => b.date.slice(0, 10)).sort()
    if (!befundDates.includes('2026-06-05') || !befundDates.includes('2026-06-20')) {
      pushWarn(warnings, 'labor_befunde_dates', 'Laborbefund-Daten sollten Aufnahme- und Verlaufskontrolle abdecken')
    }
    const hasSpiegel = fixture.laborBefunde.some((b) =>
      b.categories.some((c) =>
        c.values.some((v) => v.name.toLowerCase().includes('aripiprazol')),
      ),
    )
    if (!hasSpiegel) {
      pushWarn(warnings, 'labor_spiegel', 'Aripiprazol-Spiegel in Verlaufsbefund empfohlen')
    }
  }

  const meds = workspace.medicationPlanState?.plans[0]?.medications ?? []
  if (meds.filter((m) => m.status === 'active').length < 1) {
    pushError(errors, 'med_active', 'Mindestens ein aktives Medikament erforderlich')
  }

  if (!workspace.clinicalImprints?.imprints?.length) {
    pushWarn(warnings, 'imprints', 'Keine Clinical Imprints — werden beim Seed ggf. reindexiert')
  }

  if (!workspace.isdmInput) {
    pushWarn(warnings, 'isdm_input', 'ISDM-Eingabe fehlt — Phänomenologie-Panel leer')
  }
  if (!workspace.isdmAnalysis) {
    pushWarn(warnings, 'isdm_analysis', 'ISDM-Analyse fehlt — wird ggf. beim Öffnen neu berechnet')
  }
  if (!fixture.clinicalIntelligence?.latestRun?.dimensional.activeDimensions.length) {
    pushWarn(warnings, 'clinical_intelligence', 'Pre-baked Clinical Intelligence run recommended for demo')
  }
  if (!workspace.butterflyAttestations || Object.keys(workspace.butterflyAttestations).length < 5) {
    pushWarn(warnings, 'butterfly_attestations', 'Wenige Butterfly-Attestierungen — Kriterienprüfung eingeschränkt')
  }
  if (!workspace.anforderungen || workspace.anforderungen.length < 5) {
    pushWarn(warnings, 'anforderungen', 'Wenige Anforderungen — Workflow-Demo eingeschränkt')
  }
  if ((fixture.befundRecords?.length ?? 0) < 2) {
    pushWarn(warnings, 'befund_records', 'EKG und EEG empfohlen für Befunde-Workflow')
  }

  for (const entry of fixture.verlaufFeed ?? []) {
    scanTextForPhi(entry.content, `verlaufFeed.${entry.id}`, errors, warnings)
  }
  if (aufnahme) {
    for (const [key, text] of Object.entries(aufnahme.sectionContents)) {
      scanTextForPhi(text, `aufnahme.${key}`, errors, warnings)
    }
  }

  for (const item of fixture.calendarItems ?? []) {
    if (item.caseId && item.caseId !== DEMO_CASE_ID) {
      pushError(errors, 'calendar_case_ref', 'Kalender-Eintrag verweist auf falsche caseId', item.id)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}
