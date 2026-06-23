import type {
  ClinicalBinding,
  ConditionalBlock,
  InstitutionField,
  PatientDataField,
  TemplateFieldValues,
} from '../../types/clinicalTemplate'
import type { ResolvedClinicalData } from './clinicalData'

/** Flatten a clinical binding into a single human-readable string (AI context, conditions). */
export function bindingToText(binding: ClinicalBinding | 'all', data: ResolvedClinicalData): string {
  switch (binding) {
    case 'patient.demographics': {
      const d = data.demographics
      return [d.name, d.geburtsdatum, d.age, d.geschlecht].filter(Boolean).join(', ')
    }
    case 'case.admissionReason':
      return data.admissionReason ?? ''
    case 'diagnoses.current':
      return data.diagnoses.map((dx) => [dx.code, dx.label].filter(Boolean).join(' ')).join('; ')
    case 'medication.current':
      return data.medications
        .map((m) => [m.substance, m.dose].filter(Boolean).join(' ') + (m.prn ? ' (b.B.)' : ''))
        .join('; ')
    case 'labs.latest':
      return data.labs.panels
        .flatMap((p) => p.values.map((v) => `${v.name} ${v.value}${v.unit ? ' ' + v.unit : ''}`))
        .join('; ')
    case 'verlauf.selectedRange':
      return data.verlauf.entries.map((e) => [e.date, e.text].filter(Boolean).join(': ')).join('\n')
    case 'psychopathology.latest':
      return data.psychopathology?.text ?? ''
    case 'risk.current':
      return data.risk?.text ?? ''
    case 'therapy.current':
      return data.therapy.map((t) => [t.label, t.detail].filter(Boolean).join(' – ')).join('; ')
    case 'socialTherapy.current':
      return data.socialTherapy.map((s) => `${s.area} (${s.status})`).join('; ')
    case 'all':
      return (
        [
          ['Demographie', bindingToText('patient.demographics', data)],
          ['Aufnahmegrund', bindingToText('case.admissionReason', data)],
          ['Diagnosen', bindingToText('diagnoses.current', data)],
          ['Medikation', bindingToText('medication.current', data)],
          ['Labor', bindingToText('labs.latest', data)],
          ['Verlauf', bindingToText('verlauf.selectedRange', data)],
          ['Psychopathologie', bindingToText('psychopathology.latest', data)],
          ['Risiko', bindingToText('risk.current', data)],
          ['Therapie', bindingToText('therapy.current', data)],
          ['Sozialtherapie', bindingToText('socialTherapy.current', data)],
        ] as const
      )
        .filter(([, value]) => value.trim().length > 0)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n')
    default:
      return ''
  }
}

export function patientDataValue(field: PatientDataField, data: ResolvedClinicalData): string {
  const d = data.demographics
  switch (field) {
    case 'name':
      return d.name ?? ''
    case 'vorname':
      return d.vorname ?? ''
    case 'nachname':
      return d.nachname ?? ''
    case 'geburtsdatum':
      return d.geburtsdatum ?? ''
    case 'age':
      return d.age ?? ''
    case 'geschlecht':
      return d.geschlecht ?? ''
    case 'address':
      return d.address ?? ''
    case 'kostentraeger':
      return d.kostentraeger ?? ''
    case 'caseId':
      return d.caseId ?? ''
    case 'admissionReason':
      return data.admissionReason ?? ''
    default:
      return ''
  }
}

export function institutionValue(field: InstitutionField, data: ResolvedClinicalData): string {
  switch (field) {
    case 'clinician.name':
      return data.clinician.name ?? ''
    case 'clinician.title':
      return data.clinician.title ?? ''
    case 'organization.name':
      return data.organization.name ?? ''
    case 'organization.address':
      return data.organization.address ?? ''
    case 'system.date':
      return data.system.date
    case 'system.documentDate':
      return data.system.documentDate
    default:
      return ''
  }
}

/** Evaluate a conditional block's condition against resolved data + manual field values. */
export function evaluateCondition(
  block: ConditionalBlock,
  data: ResolvedClinicalData,
  values: TemplateFieldValues = {},
): boolean {
  const { source, operator, value } = block.condition
  const subject =
    source === 'manual'
      ? String(values[block.id] ?? '')
      : bindingToText(source, data)
  const haystack = subject.trim().toLowerCase()
  const needle = (value ?? '').trim().toLowerCase()
  switch (operator) {
    case 'exists':
      return haystack.length > 0
    case 'not_exists':
      return haystack.length === 0
    case 'equals':
      return haystack === needle
    case 'contains':
      return needle.length > 0 && haystack.includes(needle)
    default:
      return true
  }
}
