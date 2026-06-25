import type {
  MedicationEducationDocumentVariant,
  MedicationEducationScope,
  MedicationEducationSectionDefinition,
} from '../types/medicationEducation'

export const MEDICATION_EDUCATION_DISCLAIMER_DE =
  'Diese Informationen ersetzen nicht das persönliche Gespräch mit Ihrem Behandlungsteam. Bei akuten Beschwerden oder Unsicherheiten wenden Sie sich bitte umgehend an Ihre behandelnde Klinik oder den Notarzt.'

export const MEDICATION_EDUCATION_DISCLAIMER_EN =
  'This information does not replace a personal conversation with your care team. Contact your clinic or emergency services if you have acute concerns or uncertainty.'

const SINGLE_SECTIONS: MedicationEducationSectionDefinition[] = [
  { id: 'titel', labelDe: 'Titel', labelEn: 'Title', localIdentity: true },
  { id: 'kurze-zusammenfassung', labelDe: 'Kurze Zusammenfassung', labelEn: 'Brief summary', aiCapable: true },
  { id: 'warum-bekomme-ich', labelDe: 'Warum bekomme ich dieses Medikament?', labelEn: 'Why am I taking this medication?', aiCapable: true },
  { id: 'wie-wirkt', labelDe: 'Wie wirkt das Medikament?', labelEn: 'How does the medication work?', aiCapable: true },
  { id: 'wann-wirkung', labelDe: 'Wann tritt eine Wirkung ein?', labelEn: 'When will it start working?', aiCapable: true },
  { id: 'wie-einnehmen', labelDe: 'Wie nehme ich das Medikament ein?', labelEn: 'How do I take this medication?', aiCapable: true, fetchModule: 'dosing' },
  { id: 'haeufige-nebenwirkungen', labelDe: 'Häufige Nebenwirkungen', labelEn: 'Common side effects', aiCapable: true },
  { id: 'wichtige-warnzeichen', labelDe: 'Wichtige Warnzeichen', labelEn: 'Important warning signs', aiCapable: true },
  { id: 'kontrollen', labelDe: 'Kontrollen und Untersuchungen', labelEn: 'Monitoring and tests', aiCapable: true, fetchModule: 'monitoring' },
  { id: 'wechselwirkungen', labelDe: 'Wechselwirkungen', labelEn: 'Interactions', aiCapable: true },
  { id: 'alltag', labelDe: 'Alltag, Fahrtüchtigkeit und Arbeit', labelEn: 'Daily life, driving and work', aiCapable: true },
  {
    id: 'schwangerschaft-stillzeit',
    labelDe: 'Schwangerschaft und Stillzeit',
    labelEn: 'Pregnancy and breastfeeding',
    aiCapable: true,
    conditionalPregnancy: true,
  },
  { id: 'bei-nebenwirkungen', labelDe: 'Bei Nebenwirkungen', labelEn: 'If side effects occur', aiCapable: true },
  { id: 'fragen-ans-team', labelDe: 'Fragen ans Behandlungsteam', labelEn: 'Questions for your care team', aiCapable: true },
  { id: 'arzt-bestaetigung', labelDe: 'Bestätigung durch Behandlungsteam', labelEn: 'Clinician confirmation', localIdentity: true },
]

const COMBINATION_SECTIONS: MedicationEducationSectionDefinition[] = [
  { id: 'titel', labelDe: 'Titel', labelEn: 'Title', localIdentity: true },
  { id: 'kurze-uebersicht', labelDe: 'Kurze Übersicht', labelEn: 'Brief overview', aiCapable: true },
  { id: 'aktuelle-medikation-tabelle', labelDe: 'Aktuelle Medikation', labelEn: 'Current medications', fetchModule: 'med_table', combinationOnly: true },
  { id: 'warum-kombination', labelDe: 'Warum diese Kombination?', labelEn: 'Why this combination?', aiCapable: true, combinationOnly: true },
  { id: 'was-soll-sich-verbessern', labelDe: 'Was soll sich verbessern?', labelEn: 'What should improve?', aiCapable: true, combinationOnly: true },
  { id: 'wann-wirkung', labelDe: 'Wann tritt eine Wirkung ein?', labelEn: 'When will effects start?', aiCapable: true },
  {
    id: 'haeufige-nebenwirkungen-kombination',
    labelDe: 'Häufige Nebenwirkungen der Kombination',
    labelEn: 'Common side effects of the combination',
    aiCapable: true,
    combinationOnly: true,
  },
  { id: 'warnzeichen', labelDe: 'Warnzeichen', labelEn: 'Warning signs', aiCapable: true },
  { id: 'kontrollen', labelDe: 'Kontrollen und Untersuchungen', labelEn: 'Monitoring and tests', aiCapable: true, fetchModule: 'monitoring' },
  { id: 'was-vermeiden', labelDe: 'Was soll ich vermeiden?', labelEn: 'What should I avoid?', aiCapable: true, combinationOnly: true },
  { id: 'vergessene-einnahme', labelDe: 'Vergessene Einnahme', labelEn: 'Missed doses', aiCapable: true, combinationOnly: true },
  { id: 'bei-nebenwirkungen', labelDe: 'Bei Nebenwirkungen', labelEn: 'If side effects occur', aiCapable: true },
  { id: 'zusammenfassung', labelDe: 'Zusammenfassung', labelEn: 'Summary', aiCapable: true, combinationOnly: true },
  { id: 'dokumentation-gespraech', labelDe: 'Dokumentation des Aufklärungsgesprächs', labelEn: 'Documentation of discussion', localIdentity: true, combinationOnly: true },
]

export function isCombinationScope(scope: MedicationEducationScope): boolean {
  return scope === 'full_combination' || scope === 'selected'
}

export function resolveDocumentVariant(
  scope: MedicationEducationScope,
  detailStyle: 'einfach' | 'standard' | 'ausfuehrlich',
  isKbGeneric = false,
): MedicationEducationDocumentVariant {
  if (isKbGeneric) return 'generic_kb_single'
  if (detailStyle === 'einfach') return 'short_patient_info'
  if (detailStyle === 'ausfuehrlich') return 'detailed_patient_education'
  return isCombinationScope(scope) ? 'patient_combination' : 'patient_single'
}

export function getMedicationEducationSections(
  scope: MedicationEducationScope,
  options?: { includePregnancy?: boolean },
): MedicationEducationSectionDefinition[] {
  const combination = isCombinationScope(scope)
  const base = combination ? COMBINATION_SECTIONS : SINGLE_SECTIONS
  if (!options?.includePregnancy) {
    return base.filter((s) => !s.conditionalPregnancy)
  }
  return base
}

export function getMedicationEducationSectionIds(
  scope: MedicationEducationScope,
  options?: { includePregnancy?: boolean },
): string[] {
  return getMedicationEducationSections(scope, options).map((s) => s.id)
}

export function getMedicationEducationSectionDefinition(
  scope: MedicationEducationScope,
  sectionId: string,
): MedicationEducationSectionDefinition | undefined {
  return getMedicationEducationSections(scope, { includePregnancy: true }).find((s) => s.id === sectionId)
}

export function sectionCountForScope(scope: MedicationEducationScope, includePregnancy = false): number {
  return getMedicationEducationSectionIds(scope, { includePregnancy }).length
}
