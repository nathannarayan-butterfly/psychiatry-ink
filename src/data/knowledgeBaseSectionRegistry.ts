import type { DrugSection, DrugSectionKey, KnowledgeBaseDrug } from '../types/knowledgeBase'
import type { KbGroupId } from '../components/medication/kb/kbStrings'

export const KB_PSYCHOPHARMA_CHAPTER_PREFIX = '12'
export const KB_CANONICAL_PLACEHOLDER = 'Noch keine geprüften Inhalte vorhanden.'

export type CanonicalKbSectionId =
  | Exclude<DrugSectionKey, 'custom' | 'steckbrief'>
  | 'klinischeHinweise'

export interface CanonicalKbSubsection {
  id: DrugSectionKey
  title: string
  order: number
}

export interface CanonicalKbSection {
  id: CanonicalKbSectionId
  title: string
  order: number
  group: KbGroupId
  sectionKey?: DrugSectionKey
  subsections?: CanonicalKbSubsection[]
  isVisible?: (drug: KnowledgeBaseDrug, section?: DrugSection) => boolean
}

export const CLINICAL_HINT_SECTION_KEYS: DrugSectionKey[] = [
  'besonderheiten',
  'merksaetze',
  'schwangerschaft',
  'niereLeber',
  'kontraindikationen',
  'ueberdosierung',
  'absetzen',
]

export const CANONICAL_KB_SECTIONS: CanonicalKbSection[] = [
  { id: 'kurzprofil', sectionKey: 'kurzprofil', title: 'Kurzprofil', order: 1, group: 'ueberblick' },
  { id: 'rezeptorprofil', sectionKey: 'rezeptorprofil', title: 'Rezeptorprofil', order: 2, group: 'pharmakologie' },
  { id: 'wirkmechanismus', sectionKey: 'wirkmechanismus', title: 'Wirkmechanismus', order: 3, group: 'pharmakologie' },
  { id: 'pharmakokinetik', sectionKey: 'pharmakokinetik', title: 'Pharmakokinetik', order: 4, group: 'pharmakologie' },
  { id: 'indikationen', sectionKey: 'indikationen', title: 'Indikationen', order: 5, group: 'einsatz' },
  { id: 'dosierung', sectionKey: 'dosierung', title: 'Dosierung und Titration', order: 6, group: 'einsatz' },
  { id: 'umstellung', sectionKey: 'umstellung', title: 'Umstellung, Depot und LAI', order: 7, group: 'einsatz' },
  { id: 'nebenwirkungen', sectionKey: 'nebenwirkungen', title: 'Nebenwirkungen', order: 8, group: 'sicherheit' },
  { id: 'wechselwirkungen', sectionKey: 'wechselwirkungen', title: 'Interaktionen', order: 9, group: 'sicherheit' },
  { id: 'qtc', sectionKey: 'qtc', title: 'QTc / EKG', order: 10, group: 'sicherheit' },
  { id: 'kontrollen', sectionKey: 'kontrollen', title: 'Monitoring', order: 11, group: 'sicherheit' },
  {
    id: 'klinischeHinweise',
    title: 'Klinische Hinweise',
    order: 12,
    group: 'referenz',
    subsections: [
      { id: 'besonderheiten', title: 'Besonderheiten', order: 1 },
      { id: 'merksaetze', title: 'Merksätze', order: 2 },
      { id: 'schwangerschaft', title: 'Schwangerschaft und Stillzeit', order: 3 },
      { id: 'niereLeber', title: 'Niere / Leber', order: 4 },
      { id: 'kontraindikationen', title: 'Kontraindikationen', order: 5 },
      { id: 'ueberdosierung', title: 'Überdosierung / Toxizität', order: 6 },
      { id: 'absetzen', title: 'Absetzen', order: 7 },
    ],
  },
  { id: 'quellen', sectionKey: 'quellen', title: 'Quellen / Evidenz', order: 13, group: 'referenz' },
]

/**
 * Localized canonical section / subsection titles, keyed by the German source
 * title in {@link CANONICAL_KB_SECTIONS}. German stays the source of truth; the
 * reading view resolves the UI-language variant so an English (or FR/ES) user
 * never sees a German section heading in the otherwise-localized monograph.
 */
const CANONICAL_KB_SECTION_TITLE_I18N: Record<string, { en: string; fr: string; es: string }> = {
  Kurzprofil: { en: 'Brief profile', fr: 'Profil résumé', es: 'Perfil resumido' },
  Rezeptorprofil: { en: 'Receptor profile', fr: 'Profil récepteur', es: 'Perfil de receptores' },
  Wirkmechanismus: { en: 'Mechanism of action', fr: "Mécanisme d'action", es: 'Mecanismo de acción' },
  Pharmakokinetik: { en: 'Pharmacokinetics', fr: 'Pharmacocinétique', es: 'Farmacocinética' },
  Indikationen: { en: 'Indications', fr: 'Indications', es: 'Indicaciones' },
  'Dosierung und Titration': {
    en: 'Dosing and titration',
    fr: 'Posologie et titration',
    es: 'Dosificación y titulación',
  },
  'Umstellung, Depot und LAI': {
    en: 'Switching, depot and LAI',
    fr: 'Relais, retard et LAI',
    es: 'Cambio, depot y LAI',
  },
  Nebenwirkungen: { en: 'Adverse effects', fr: 'Effets indésirables', es: 'Efectos adversos' },
  Interaktionen: { en: 'Interactions', fr: 'Interactions', es: 'Interacciones' },
  'QTc / EKG': { en: 'QTc / ECG', fr: 'QTc / ECG', es: 'QTc / ECG' },
  Monitoring: { en: 'Monitoring', fr: 'Surveillance', es: 'Monitorización' },
  'Klinische Hinweise': { en: 'Clinical notes', fr: 'Notes cliniques', es: 'Notas clínicas' },
  'Quellen / Evidenz': { en: 'Sources / evidence', fr: 'Sources / preuves', es: 'Fuentes / evidencia' },
  // Subsections of "Klinische Hinweise"
  Besonderheiten: { en: 'Special considerations', fr: 'Particularités', es: 'Particularidades' },
  Merksätze: { en: 'Key takeaways', fr: 'À retenir', es: 'Puntos clave' },
  'Schwangerschaft und Stillzeit': {
    en: 'Pregnancy and lactation',
    fr: 'Grossesse et allaitement',
    es: 'Embarazo y lactancia',
  },
  'Niere / Leber': { en: 'Renal / hepatic', fr: 'Rein / foie', es: 'Renal / hepático' },
  Kontraindikationen: { en: 'Contraindications', fr: 'Contre-indications', es: 'Contraindicaciones' },
  'Überdosierung / Toxizität': {
    en: 'Overdose / toxicity',
    fr: 'Surdosage / toxicité',
    es: 'Sobredosis / toxicidad',
  },
  Absetzen: { en: 'Discontinuation', fr: 'Arrêt', es: 'Retirada' },
}

/**
 * Resolve a canonical section/subsection title for the active UI language. The
 * German `title` from the registry is the fallback (and the source key), so any
 * unmapped title degrades gracefully to German rather than breaking.
 */
export function localizedCanonicalKbTitle(germanTitle: string, language: string | undefined | null): string {
  if (language === 'en' || language === 'fr' || language === 'es') {
    return CANONICAL_KB_SECTION_TITLE_I18N[germanTitle]?.[language] ?? germanTitle
  }
  return germanTitle
}

export function canonicalSectionNumber(
  section: Pick<CanonicalKbSection, 'order'>,
  chapterPrefix = KB_PSYCHOPHARMA_CHAPTER_PREFIX,
): string {
  return `${chapterPrefix}.${section.order}`
}

export function canonicalSubsectionNumber(
  section: Pick<CanonicalKbSection, 'order'>,
  subsection: Pick<CanonicalKbSubsection, 'order'>,
  chapterPrefix = KB_PSYCHOPHARMA_CHAPTER_PREFIX,
): string {
  return `${chapterPrefix}.${section.order}.${subsection.order}`
}

export function sectionByKey(drug: KnowledgeBaseDrug, key: DrugSectionKey): DrugSection | undefined {
  return drug.sections.find((section) => section.key === key)
}

export function visibleCanonicalSections(drug: KnowledgeBaseDrug): CanonicalKbSection[] {
  return CANONICAL_KB_SECTIONS.filter((section) => {
    const storedSection = section.sectionKey ? sectionByKey(drug, section.sectionKey) : undefined
    return section.isVisible ? section.isVisible(drug, storedSection) : true
  })
}
