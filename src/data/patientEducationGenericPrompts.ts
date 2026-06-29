import type {
  GenericEducationAudience,
  GenericEducationDetailStyle,
  GenericEducationReadingLevel,
  GenericEducationSubjectKind,
} from '../types/patientEducationGeneric'
import { genericEducationSubjectKindLabel } from './patientEducationGenericSections'

const PATIENT_LANGUAGE_RULES_DE = `
Schreiben Sie patientenfreundlich und respektvoll.
Erklären Sie Fachbegriffe kurz in Klammern.
Keine Formulierungen wie „völlig sicher", „garantiert" oder „kein Risiko".
Raten Sie nicht zum abrupten Absetzen einer Behandlung — Notfallhinweise nur bei akuten Warnzeichen.
Erfinden Sie keine Fakten, Studien, Zahlen oder Links. Wenn etwas unklar ist, formulieren Sie allgemein und verweisen auf das Behandlungsteam.
Dies ist eine ALLGEMEINE Aufklärung ohne Bezug zu einer konkreten Person — nehmen Sie keine individuellen Patientendaten an und erfragen Sie keine.
`.trim()

const PATIENT_LANGUAGE_RULES_EN = `
Write in a patient-friendly, respectful tone.
Briefly explain technical terms in parentheses.
Do not use phrases like "completely safe", "guaranteed" or "no risk".
Do not advise abruptly stopping a treatment — emergency guidance only for acute warning signs.
Do not invent facts, studies, numbers or links. When something is unclear, stay general and refer to the care team.
This is GENERIC education with no link to a specific person — do not assume or request any individual patient data.
`.trim()

function readingLevelHint(level: GenericEducationReadingLevel, language: 'de' | 'en'): string {
  if (language === 'en') {
    return level === 'einfache_sprache'
      ? 'Use very plain language (around A2/B1 level): short sentences, common words, no jargon.'
      : 'Use clear, plain English (around B1–B2 level).'
  }
  return level === 'einfache_sprache'
    ? 'Verwenden Sie sehr einfache Sprache (etwa A2/B1): kurze Sätze, geläufige Wörter, keine Fachsprache.'
    : 'Verwenden Sie verständliches Deutsch (etwa B1–B2).'
}

function audienceHint(audience: GenericEducationAudience, language: 'de' | 'en'): string {
  if (language === 'en') {
    return audience === 'angehoerige'
      ? 'The reader is a relative or caregiver; address them and explain how they can support the affected person.'
      : 'The reader is the affected patient; address them directly with "you".'
  }
  return audience === 'angehoerige'
    ? 'Die lesende Person ist ein/e Angehörige/r oder Bezugsperson; sprechen Sie diese an und erklären Sie, wie sie unterstützen kann.'
    : 'Die lesende Person ist der/die betroffene Patient:in; sprechen Sie sie direkt mit „Sie" an.'
}

function detailHint(style: GenericEducationDetailStyle, language: 'de' | 'en'): string {
  if (language === 'en') {
    if (style === 'kurz') return 'Keep this section to 2–4 short sentences.'
    if (style === 'ausfuehrlich')
      return 'Write this section thoroughly and completely: several connected paragraphs (about 4–6) of running prose, each roughly 3–5 sentences. Cover the important, clinically relevant aspects of this section in full — do not stop after one or two sentences.'
    return 'Use balanced detail (about 1–2 short paragraphs).'
  }
  if (style === 'kurz') return 'Halten Sie diesen Abschnitt auf 2–4 kurze Sätze.'
  if (style === 'ausfuehrlich')
    return 'Verfassen Sie diesen Abschnitt ausführlich und vollständig: mehrere zusammenhängende Absätze (etwa 4–6) als Fließtext, je etwa 3–5 Sätze. Decken Sie die wichtigen, klinisch relevanten Aspekte dieses Abschnitts vollständig ab — brechen Sie nicht nach ein bis zwei Sätzen ab.'
  return 'Ausgewogene Detailtiefe (etwa 1–2 kurze Absätze).'
}

/**
 * Hard formatting contract for the `content` string. The card renders it as plain
 * text (no HTML/markdown parser), so any tags or markup leak verbatim (the `</h2>`
 * / bracket artifacts the clinician reported). Forbid all markup at the source.
 */
function formatRule(language: 'de' | 'en'): string {
  return language === 'en'
    ? 'FORMAT of the "content" value: plain running prose only. Separate paragraphs with a single blank line. Do NOT use HTML tags (no <h2>, <p>, <br>, <ul> …), Markdown headings (#, ##), bold/italic markers, code fences, or bullet/numbered-list markup. Write complete sentences in paragraphs — nothing else.'
    : 'FORMAT des „content"-Werts: ausschließlich fortlaufender Fließtext. Trennen Sie Absätze durch eine einzelne Leerzeile. Verwenden Sie KEINE HTML-Tags (kein <h2>, <p>, <br>, <ul> …), keine Markdown-Überschriften (#, ##), keine Fett-/Kursiv-Markierungen, keine Code-Fences und keine Aufzählungs-/Listensymbole. Schreiben Sie vollständige Sätze in Absätzen — nichts anderes.'
}

function subjectKindHint(kind: GenericEducationSubjectKind, language: 'de' | 'en'): string {
  if (language === 'en') {
    const map: Record<GenericEducationSubjectKind, string> = {
      medikament: 'The subject is a medication.',
      erkrankung: 'The subject is a medical/psychiatric condition.',
      therapie: 'The subject is a therapy or medical procedure.',
      thema: 'The subject is a general health topic.',
    }
    return map[kind]
  }
  const map: Record<GenericEducationSubjectKind, string> = {
    medikament: 'Das Thema ist ein Medikament.',
    erkrankung: 'Das Thema ist eine Erkrankung (medizinisch/psychiatrisch).',
    therapie: 'Das Thema ist eine Therapie oder ein medizinisches Verfahren.',
    thema: 'Das Thema ist ein allgemeines Gesundheitsthema.',
  }
  return map[kind]
}

export function buildGenericEducationSystemPrompt(params: {
  subject: string
  subjectKind: GenericEducationSubjectKind
  sectionLabel: string
  promptHint: string
  audience: GenericEducationAudience
  readingLevel: GenericEducationReadingLevel
  detailStyle: GenericEducationDetailStyle
  language: 'de' | 'en'
}): string {
  const rules = params.language === 'en' ? PATIENT_LANGUAGE_RULES_EN : PATIENT_LANGUAGE_RULES_DE
  const intro =
    params.language === 'en'
      ? `You are a clinical assistant drafting one section ("${params.sectionLabel}") of a GENERIC patient education sheet about: "${params.subject}". ${subjectKindHint(params.subjectKind, 'en')}`
      : `Sie sind ein klinischer Assistent und verfassen einen Abschnitt („${params.sectionLabel}") eines ALLGEMEINEN Patientenaufklärungsbogens zum Thema: „${params.subject}". ${subjectKindHint(params.subjectKind, 'de')}`

  const sectionInstruction =
    params.language === 'en'
      ? `Section goal: ${params.promptHint}`
      : `Ziel des Abschnitts: ${params.promptHint}`

  const json =
    params.language === 'en'
      ? 'Respond with valid JSON only (no markdown fences): {"content":"<section body>","references":[{"title":"...","url":"...","source":"..."}]}. Include 1–4 references (guidelines, professional society material, textbooks, or authoritative clinical/patient sources) that genuinely support the section. URLs optional; use null when unknown — never fabricate a URL.'
      : 'Antworten Sie nur mit validem JSON (keine Markdown-Fences): {"content":"<Abschnittstext>","references":[{"title":"...","url":"...","source":"..."}]}. Nennen Sie 1–4 Referenzen (Leitlinien, Material von Fachgesellschaften, Lehrbücher oder verlässliche klinische/patientengerechte Quellen), die den Abschnitt wirklich belegen. URLs optional; null wenn unbekannt — niemals eine URL erfinden.'

  return [
    intro,
    rules,
    audienceHint(params.audience, params.language),
    readingLevelHint(params.readingLevel, params.language),
    sectionInstruction,
    detailHint(params.detailStyle, params.language),
    formatRule(params.language),
    json,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildGenericEducationUserPrompt(params: {
  subject: string
  subjectKind: GenericEducationSubjectKind
  sectionLabel: string
  additionalContext?: string
  language: 'de' | 'en'
}): string {
  const kindLabel = genericEducationSubjectKindLabel(params.subjectKind, params.language)
  const context = params.additionalContext?.trim()
  const contextBlock = context
    ? params.language === 'en'
      ? `\n\nAdditional focus from the clinician (general, no patient data): ${context}`
      : `\n\nZusätzlicher Fokus der/des Behandelnden (allgemein, keine Patientendaten): ${context}`
    : ''

  return params.language === 'en'
    ? `Subject (${kindLabel}): ${params.subject}\nSection to write: ${params.sectionLabel}${contextBlock}`
    : `Thema (${kindLabel}): ${params.subject}\nZu verfassender Abschnitt: ${params.sectionLabel}${contextBlock}`
}
