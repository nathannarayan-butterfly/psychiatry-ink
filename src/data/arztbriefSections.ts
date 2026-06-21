import type {
  ArztbriefDocumentType,
  ArztbriefSectionDefinition,
} from '../types/arztbrief'

export const ARZTBRIEF_DEFAULT_GREETING =
  'Sehr geehrte Frau Kollegin, sehr geehrter Herr Kollege,'

export const ARZTBRIEF_KURZ_CLOSING =
  'Für Rückfragen stehen wir Ihnen gerne zur Verfügung.'

export const ARZTBRIEF_LANG_CLOSING =
  'Für Rückfragen und weiterführende Abstimmung stehen wir Ihnen gerne zur Verfügung.'

export const ARZTBRIEF_DEFAULT_SIGNATURE =
  'Mit freundlichen kollegialen Grüßen\n\n[Name, Funktion]\n[Institution]'

const KURZBIEF_SECTIONS: ArztbriefSectionDefinition[] = [
  {
    id: 'header',
    labelDe: 'Briefkopf',
    labelEn: 'Letterhead',
    fetchModule: 'identity',
    localIdentity: true,
  },
  {
    id: 'greeting',
    labelDe: 'Anrede',
    labelEn: 'Greeting',
    fetchModule: 'static',
  },
  {
    id: 'intro',
    labelDe: 'Einleitungssatz',
    labelEn: 'Introductory sentence',
    fetchModule: 'admission',
  },
  {
    id: 'diagnosen',
    labelDe: 'Diagnosen',
    labelEn: 'Diagnoses',
    fetchModule: 'diagnosis',
  },
  {
    id: 'aufnahmeanlass',
    labelDe: 'Aufnahmeanlass und -umstände',
    labelEn: 'Admission reason and circumstances',
    fetchModule: 'aufnahme',
    aiCapable: true,
  },
  {
    id: 'kurzanamnese',
    labelDe: 'Kurz-Anamnese / aktuelle Anamnese',
    labelEn: 'Brief / current history',
    fetchModule: 'anamnesis',
    aiCapable: true,
  },
  {
    id: 'aufnahmebefund',
    labelDe: 'Aufnahmebefund / Psychischer Befund bei Aufnahme',
    labelEn: 'Admission / initial MSE',
    fetchModule: 'psychopath',
  },
  {
    id: 'diagnostik',
    labelDe: 'Diagnostik / relevante Befunde',
    labelEn: 'Diagnostics / relevant findings',
    fetchModule: 'diagnostics',
    aiCapable: true,
  },
  {
    id: 'therapie-verlauf',
    labelDe: 'Therapie und Verlauf',
    labelEn: 'Treatment and course',
    fetchModule: 'verlauf',
    aiDefault: true,
    aiCapable: true,
  },
  {
    id: 'medikation-entlassung',
    labelDe: 'Medikation bei Entlassung',
    labelEn: 'Discharge medication',
    fetchModule: 'medication',
  },
  {
    id: 'besondere-hinweise',
    labelDe: 'Besondere Hinweise',
    labelEn: 'Special notes',
    fetchModule: 'risk',
    aiDefault: true,
    aiCapable: true,
  },
  {
    id: 'closing',
    labelDe: 'Schlusssatz',
    labelEn: 'Closing sentence',
    fetchModule: 'static',
  },
  {
    id: 'signature',
    labelDe: 'Signaturblock',
    labelEn: 'Signature block',
    fetchModule: 'identity',
    localIdentity: true,
  },
]

const LANGBRIEF_SECTIONS: ArztbriefSectionDefinition[] = [
  { id: 'header', labelDe: 'Briefkopf', labelEn: 'Letterhead', fetchModule: 'identity', localIdentity: true },
  { id: 'recipient', labelDe: 'Empfänger', labelEn: 'Recipient', fetchModule: 'identity', localIdentity: true },
  { id: 'greeting', labelDe: 'Anrede', labelEn: 'Greeting', fetchModule: 'static' },
  { id: 'intro', labelDe: 'Einleitungssatz', labelEn: 'Introductory sentence', fetchModule: 'admission' },
  { id: 'diagnosen', labelDe: 'Diagnosen', labelEn: 'Diagnoses', fetchModule: 'diagnosis' },
  { id: 'aufnahmeanlass', labelDe: 'Aufnahmeanlass', labelEn: 'Admission reason', fetchModule: 'aufnahme', aiCapable: true },
  { id: 'zwischenanamnese', labelDe: 'Aktuelle / Zwischenanamnese', labelEn: 'Current / interim history', fetchModule: 'anamnesis' },
  { id: 'fremdbefunde', labelDe: 'Fremdbefunde / Fremdanamnese', labelEn: 'External findings / history', fetchModule: 'anamnesis' },
  { id: 'psychiatrische-anamnese', labelDe: 'Psychiatrische Anamnese', labelEn: 'Psychiatric history', fetchModule: 'anamnesis' },
  { id: 'suchtanamnese', labelDe: 'Suchtmittelanamnese', labelEn: 'Substance use history', fetchModule: 'anamnesis' },
  { id: 'somatische-anamnese', labelDe: 'Somatische Anamnese / Vorerkrankungen / Medikamentenanamnese', labelEn: 'Somatic history / comorbidity / meds', fetchModule: 'anamnesis' },
  { id: 'koerperlich-vegetativ', labelDe: 'Körperlich-vegetative Anamnese', labelEn: 'Physical / vegetative history', fetchModule: 'anamnesis' },
  { id: 'familienanamnese', labelDe: 'Familienanamnese', labelEn: 'Family history', fetchModule: 'anamnesis' },
  { id: 'sozialanamnese', labelDe: 'Sozialanamnese', labelEn: 'Social history', fetchModule: 'anamnesis' },
  { id: 'forensische-anamnese', labelDe: 'Forensische Anamnese', labelEn: 'Forensic history', fetchModule: 'anamnesis' },
  { id: 'psychischer-befund', labelDe: 'Psychischer Befund', labelEn: 'Mental status exam', fetchModule: 'psychopath' },
  { id: 'neurologischer-befund', labelDe: 'Neurologischer Befund', labelEn: 'Neurological exam', fetchModule: 'anamnesis' },
  { id: 'allgemeinmedizinischer-befund', labelDe: 'Allgemeinmedizinischer Befund', labelEn: 'General medical exam', fetchModule: 'anamnesis' },
  { id: 'diagnostik', labelDe: 'Diagnostik', labelEn: 'Diagnostics', fetchModule: 'diagnostics', aiCapable: true },
  { id: 'therapie-verlauf', labelDe: 'Therapie und Verlauf', labelEn: 'Treatment and course', fetchModule: 'verlauf', aiDefault: true, aiCapable: true },
  { id: 'medikation-entlassung', labelDe: 'Medikation bei Entlassung', labelEn: 'Discharge medication', fetchModule: 'medication' },
  { id: 'besondere-hinweise', labelDe: 'Besondere Hinweise', labelEn: 'Special notes', fetchModule: 'risk', aiDefault: true, aiCapable: true },
  { id: 'closing', labelDe: 'Schlusssatz', labelEn: 'Closing sentence', fetchModule: 'static' },
  { id: 'signature', labelDe: 'Signaturblock', labelEn: 'Signature block', fetchModule: 'identity', localIdentity: true },
]

export function getArztbriefSections(documentType: ArztbriefDocumentType): ArztbriefSectionDefinition[] {
  return documentType === 'kurzbrief' ? KURZBIEF_SECTIONS : LANGBRIEF_SECTIONS
}

export function getArztbriefSectionIds(documentType: ArztbriefDocumentType): string[] {
  return getArztbriefSections(documentType).map((s) => s.id)
}

export function getArztbriefSectionDefinition(
  documentType: ArztbriefDocumentType,
  sectionId: string,
): ArztbriefSectionDefinition | undefined {
  return getArztbriefSections(documentType).find((s) => s.id === sectionId)
}

export function isArztbriefAiSection(sectionId: string): boolean {
  return (
    sectionId === 'therapie-verlauf' ||
    sectionId === 'besondere-hinweise' ||
    sectionId === 'aufnahmeanlass' ||
    sectionId === 'diagnostik' ||
    sectionId === 'kurzanamnese'
  )
}
