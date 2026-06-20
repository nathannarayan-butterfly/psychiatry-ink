import type { TemplateCategory, TemplateFieldType } from '../../types/documentTemplate'

export type FieldMenuCategory = 'text' | 'form' | 'placeholders' | 'dynamic' | 'layout' | 'page'

export interface FieldMenuItem {
  type: TemplateFieldType | 'page_settings'
  labelDe: string
  labelEn: string
  category: FieldMenuCategory
  defaultBinding?: string
}

export const FIELD_MENU_ITEMS: FieldMenuItem[] = [
  { type: 'static_text', labelDe: 'Statischer Text', labelEn: 'Static text', category: 'text' },
  { type: 'short_text', labelDe: 'Kurztext', labelEn: 'Short text', category: 'text' },
  { type: 'long_text', labelDe: 'Langtext', labelEn: 'Long text', category: 'text' },
  { type: 'heading', labelDe: 'Überschrift', labelEn: 'Heading', category: 'text' },
  { type: 'checkbox', labelDe: 'Checkbox', labelEn: 'Checkbox', category: 'form' },
  { type: 'multi_select', labelDe: 'Mehrfachauswahl', labelEn: 'Multi-select', category: 'form' },
  { type: 'radio_group', labelDe: 'Einfachauswahl (Radio)', labelEn: 'Radio group', category: 'form' },
  { type: 'yes_no', labelDe: 'Ja / Nein', labelEn: 'Yes / No', category: 'form' },
  { type: 'select', labelDe: 'Dropdown', labelEn: 'Dropdown', category: 'form' },
  { type: 'date', labelDe: 'Datum', labelEn: 'Date', category: 'form' },
  { type: 'time', labelDe: 'Uhrzeit', labelEn: 'Time', category: 'form' },
  { type: 'number', labelDe: 'Zahl', labelEn: 'Number', category: 'form' },
  { type: 'number_with_unit', labelDe: 'Betrag / Einheit', labelEn: 'Amount / unit', category: 'form' },
  { type: 'email', labelDe: 'E-Mail', labelEn: 'Email', category: 'form' },
  { type: 'phone', labelDe: 'Telefon', labelEn: 'Phone', category: 'form' },
  { type: 'signature', labelDe: 'Unterschrift', labelEn: 'Signature', category: 'form' },
  { type: 'initials', labelDe: 'Paraphe', labelEn: 'Initials', category: 'form' },
  { type: 'name_line', labelDe: 'Namenszeile', labelEn: 'Name line', category: 'form' },
  { type: 'patient_placeholder', labelDe: 'Patient', labelEn: 'Patient', category: 'placeholders', defaultBinding: 'patient.name' },
  { type: 'case_placeholder', labelDe: 'Fall', labelEn: 'Case', category: 'placeholders', defaultBinding: 'case.diagnosis' },
  { type: 'clinician_placeholder', labelDe: 'Behandler', labelEn: 'Clinician', category: 'placeholders', defaultBinding: 'clinician.name' },
  { type: 'organization_placeholder', labelDe: 'Organisation', labelEn: 'Organization', category: 'placeholders', defaultBinding: 'organization.name' },
  { type: 'patient_placeholder', labelDe: 'System: Datum', labelEn: 'System: date', category: 'placeholders', defaultBinding: 'system.date' },
  { type: 'divider', labelDe: 'Trennlinie', labelEn: 'Divider', category: 'layout' },
  { type: 'spacer', labelDe: 'Abstand', labelEn: 'Spacer', category: 'layout' },
  { type: 'page_settings', labelDe: 'Kopf- / Fußzeile…', labelEn: 'Header / footer…', category: 'page' },
]

export const FIELD_MENU_CATEGORIES: Array<{ id: FieldMenuCategory; labelDe: string; labelEn: string }> = [
  { id: 'text', labelDe: 'Text', labelEn: 'Text' },
  { id: 'form', labelDe: 'Formular', labelEn: 'Form' },
  { id: 'placeholders', labelDe: 'Platzhalter', labelEn: 'Placeholders' },
  { id: 'dynamic', labelDe: 'Patientendaten', labelEn: 'Patient data' },
  { id: 'layout', labelDe: 'Layout', labelEn: 'Layout' },
  { id: 'page', labelDe: 'Seite', labelEn: 'Page' },
]

export function fieldTypeLabel(type: TemplateFieldType, lang: 'de' | 'en'): string {
  if (type === 'dynamic') return lang === 'de' ? 'Dynamisch' : 'Dynamic'
  const item = FIELD_MENU_ITEMS.find((i) => i.type === type)
  if (item) return lang === 'de' ? item.labelDe : item.labelEn
  return type.replace(/_/g, ' ')
}

export const TEMPLATE_CATEGORIES: Array<{ id: TemplateCategory; labelDe: string; labelEn: string }> = [
  { id: 'gericht-legal', labelDe: 'Gericht / Legal', labelEn: 'Court / Legal' },
  { id: 'zwangsmaßnahmen', labelDe: 'Zwangsmaßnahmen', labelEn: 'Coercive measures' },
  { id: 'gutachten', labelDe: 'Gutachten', labelEn: 'Expert opinions' },
  { id: 'arztbrief', labelDe: 'Arztbrief', labelEn: 'Physician letter' },
  { id: 'atteste-bescheinigungen', labelDe: 'Atteste / Bescheinigungen', labelEn: 'Certificates' },
  { id: 'konsile', labelDe: 'Konsile', labelEn: 'Consultations' },
  { id: 'klinikintern', labelDe: 'Klinikinterne Formulare', labelEn: 'Internal forms' },
  { id: 'freie-vorlagen', labelDe: 'Freie Vorlagen', labelEn: 'Free templates' },
]

export const PLACEHOLDER_BINDINGS: Array<{ value: string; labelDe: string; labelEn: string }> = [
  { value: 'patient.name', labelDe: 'Patient: Name', labelEn: 'Patient: name' },
  { value: 'patient.vorname', labelDe: 'Patient: Vorname', labelEn: 'Patient: first name' },
  { value: 'patient.nachname', labelDe: 'Patient: Nachname', labelEn: 'Patient: last name' },
  { value: 'patient.geburtsdatum', labelDe: 'Patient: Geburtsdatum', labelEn: 'Patient: date of birth' },
  { value: 'patient.geschlecht', labelDe: 'Patient: Geschlecht', labelEn: 'Patient: gender' },
  { value: 'patient.age', labelDe: 'Patient: Alter', labelEn: 'Patient: age' },
  { value: 'case.diagnosis', labelDe: 'Fall: Diagnose', labelEn: 'Case: diagnosis' },
  { value: 'case.ward', labelDe: 'Fall: Station', labelEn: 'Case: ward' },
  { value: 'case.caseId', labelDe: 'Fall: Fall-ID', labelEn: 'Case: case ID' },
  { value: 'clinician.name', labelDe: 'Behandler: Name', labelEn: 'Clinician: name' },
  { value: 'clinician.title', labelDe: 'Behandler: Titel', labelEn: 'Clinician: title' },
  { value: 'organization.name', labelDe: 'Organisation: Name', labelEn: 'Organization: name' },
  { value: 'organization.address', labelDe: 'Organisation: Adresse', labelEn: 'Organization: address' },
  { value: 'system.date', labelDe: 'System: Datum', labelEn: 'System: date' },
  { value: 'system.time', labelDe: 'System: Uhrzeit', labelEn: 'System: time' },
  { value: 'system.year', labelDe: 'System: Jahr', labelEn: 'System: year' },
]

export const UNRESOLVED_PLACEHOLDER = '[—]'

export function categoryLabel(category: TemplateCategory, language: 'de' | 'en'): string {
  const match = TEMPLATE_CATEGORIES.find((c) => c.id === category)
  if (!match) return category
  return language === 'de' ? match.labelDe : match.labelEn
}
