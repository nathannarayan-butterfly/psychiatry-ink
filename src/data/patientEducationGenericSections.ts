import type {
  GenericEducationSectionDefinition,
  GenericEducationSubjectKind,
} from '../types/patientEducationGeneric'

export const GENERIC_EDUCATION_DISCLAIMER_DE =
  'Diese Informationen dienen der allgemeinen Aufklärung und ersetzen nicht das persönliche Gespräch mit Ihrem Behandlungsteam. Sie sind nicht auf Ihre individuelle Situation zugeschnitten. Bei akuten Beschwerden, Unsicherheiten oder Warnzeichen wenden Sie sich bitte umgehend an Ihre behandelnde Praxis, Klinik oder den ärztlichen Notdienst (Notruf 112).'

export const GENERIC_EDUCATION_DISCLAIMER_EN =
  'This information is for general education and does not replace a personal conversation with your care team. It is not tailored to your individual situation. If you have acute symptoms, uncertainty or warning signs, contact your treating practice, clinic, or emergency services immediately.'

/**
 * Topic-agnostic patient-education sections. The same set is used for drugs,
 * conditions, therapies/procedures and general topics; the AI is told to keep a
 * section brief or note when it is not applicable to the chosen subject, rather
 * than inventing content.
 */
const GENERIC_SECTIONS: GenericEducationSectionDefinition[] = [
  {
    id: 'titel',
    labelDe: 'Titel',
    labelEn: 'Title',
    localIdentity: true,
    promptHintDe: 'Titel des Aufklärungsbogens.',
    promptHintEn: 'Title of the education sheet.',
  },
  {
    id: 'ueberblick',
    labelDe: 'Worum geht es?',
    labelEn: 'What is this about?',
    aiCapable: true,
    promptHintDe:
      'Erklären Sie in einfachen Worten, worum es bei diesem Thema geht und was der/die Patient:in grundlegend wissen sollte. 2–4 Sätze.',
    promptHintEn:
      'Explain in plain words what this topic is and the essentials the patient should know. 2–4 sentences.',
  },
  {
    id: 'warum-wichtig',
    labelDe: 'Warum ist das für mich wichtig?',
    labelEn: 'Why does this matter for me?',
    aiCapable: true,
    promptHintDe:
      'Beschreiben Sie, warum dieses Thema für Betroffene relevant ist und welches Ziel die Behandlung oder das Wissen verfolgt.',
    promptHintEn:
      'Describe why this topic is relevant for those affected and what the treatment or knowledge aims to achieve.',
  },
  {
    id: 'wie-funktioniert',
    labelDe: 'Wie funktioniert es?',
    labelEn: 'How does it work?',
    aiCapable: true,
    promptHintDe:
      'Erklären Sie den Hintergrund verständlich: bei Medikamenten den Wirkmechanismus, bei Erkrankungen Entstehung/Verlauf, bei Therapien das Vorgehen. Fachbegriffe kurz erklären.',
    promptHintEn:
      'Explain the background plainly: for medications the mechanism of action, for conditions how it develops/progresses, for therapies how it is done. Briefly explain technical terms.',
  },
  {
    id: 'was-erwarten',
    labelDe: 'Was kann ich erwarten?',
    labelEn: 'What can I expect?',
    aiCapable: true,
    promptHintDe:
      'Beschreiben Sie den zeitlichen Ablauf und was realistisch zu erwarten ist (z. B. Wann tritt eine Wirkung ein, wie läuft eine Behandlung ab). Keine Heilversprechen.',
    promptHintEn:
      'Describe the timeline and what is realistic to expect (e.g. when effects begin, how a treatment proceeds). No promises of cure.',
  },
  {
    id: 'nutzen',
    labelDe: 'Möglicher Nutzen',
    labelEn: 'Possible benefits',
    aiCapable: true,
    promptHintDe:
      'Nennen Sie den möglichen Nutzen sachlich und ausgewogen. Vermeiden Sie absolute Aussagen wie „garantiert" oder „völlig sicher".',
    promptHintEn:
      'State the possible benefits factually and in a balanced way. Avoid absolute claims like "guaranteed" or "completely safe".',
  },
  {
    id: 'risiken-nebenwirkungen',
    labelDe: 'Mögliche Risiken und Nebenwirkungen',
    labelEn: 'Possible risks and side effects',
    aiCapable: true,
    promptHintDe:
      'Beschreiben Sie häufige und wichtige Risiken bzw. Nebenwirkungen in patientenfreundlicher Sprache. Unterscheiden Sie häufig/selten, ohne zu verharmlosen oder zu dramatisieren.',
    promptHintEn:
      'Describe common and important risks or side effects in patient-friendly language. Distinguish common/rare without trivialising or dramatising.',
  },
  {
    id: 'warnzeichen',
    labelDe: 'Warnzeichen — wann Hilfe holen?',
    labelEn: 'Warning signs — when to seek help',
    aiCapable: true,
    promptHintDe:
      'Listen Sie konkrete Warnzeichen auf, bei denen sofort ärztliche Hilfe gesucht werden sollte, und wohin man sich wendet (Behandlungsteam, Notruf 112). Raten Sie nicht zum abrupten Absetzen einer Behandlung.',
    promptHintEn:
      'List concrete warning signs that require immediate medical help and where to turn (care team, emergency number). Do not advise abruptly stopping a treatment.',
  },
  {
    id: 'alltag-tipps',
    labelDe: 'Tipps für den Alltag',
    labelEn: 'Everyday tips and self-care',
    aiCapable: true,
    promptHintDe:
      'Geben Sie praktische, alltagsnahe Hinweise (z. B. Routine, Selbstfürsorge, Umgang mit Schwierigkeiten). Falls für das Thema nicht passend, halten Sie den Abschnitt sehr kurz.',
    promptHintEn:
      'Give practical, everyday tips (e.g. routine, self-care, coping with difficulties). If not applicable to the topic, keep this section very short.',
  },
  {
    id: 'haeufige-fragen',
    labelDe: 'Häufige Fragen',
    labelEn: 'Frequently asked questions',
    aiCapable: true,
    promptHintDe:
      'Formulieren Sie 3–5 häufige Patientenfragen zum Thema mit kurzen, verständlichen Antworten im Frage-Antwort-Format.',
    promptHintEn:
      'Write 3–5 common patient questions about the topic with short, plain-language answers in a Q&A format.',
  },
  {
    id: 'fragen-ans-team',
    labelDe: 'Fragen an Ihr Behandlungsteam',
    labelEn: 'Questions for your care team',
    aiCapable: true,
    promptHintDe:
      'Schlagen Sie eine kurze Liste hilfreicher Fragen vor, die der/die Patient:in dem Behandlungsteam stellen kann.',
    promptHintEn:
      'Suggest a short list of helpful questions the patient can ask their care team.',
  },
  {
    id: 'weitere-hilfe',
    labelDe: 'Wo finde ich weitere Hilfe?',
    labelEn: 'Where to find more help',
    aiCapable: true,
    promptHintDe:
      'Nennen Sie allgemeine, seriöse Anlaufstellen und Ressourcen (z. B. Hausärzt:in, Fachgesellschaften, Selbsthilfe, in Notfällen 112). Keine kommerziellen Empfehlungen, keine erfundenen Links.',
    promptHintEn:
      'Name general, reputable points of contact and resources (e.g. primary care, professional societies, peer support, emergency services). No commercial recommendations, no invented links.',
  },
]

export function getGenericEducationSections(): GenericEducationSectionDefinition[] {
  return GENERIC_SECTIONS
}

export function getGenericEducationSectionIds(): string[] {
  return GENERIC_SECTIONS.map((s) => s.id)
}

export function getGenericEducationSectionDefinition(
  sectionId: string,
): GenericEducationSectionDefinition | undefined {
  return GENERIC_SECTIONS.find((s) => s.id === sectionId)
}

export function genericEducationSubjectKindLabel(
  kind: GenericEducationSubjectKind,
  language: 'de' | 'en',
): string {
  const map: Record<GenericEducationSubjectKind, { de: string; en: string }> = {
    medikament: { de: 'Medikament', en: 'Medication' },
    erkrankung: { de: 'Erkrankung', en: 'Condition' },
    therapie: { de: 'Therapie / Verfahren', en: 'Therapy / procedure' },
    thema: { de: 'Allgemeines Thema', en: 'General topic' },
  }
  return map[kind][language]
}
