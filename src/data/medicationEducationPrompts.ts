import type { MedicationEducationDetailStyle, MedicationEducationScope } from '../types/medicationEducation'

const PATIENT_LANGUAGE_RULES_DE = `
Schreiben Sie in verständlichem Deutsch (Niveau B1–B2).
Erklären Sie Fachbegriffe kurz in Klammern.
Keine Formulierungen wie "völlig sicher" oder "kein Risiko".
Kein abruptes Absetzen empfehlen — nur bei akuten Warnzeichen Notfallhinweise.
Nutzen Sie ausschließlich die bereitgestellten KB- und Patientendaten; erfinden Sie keine Fakten.
`.trim()

const PATIENT_LANGUAGE_RULES_EN = `
Write in plain English (B1–B2 level).
Briefly explain medical terms in parentheses.
Do not use phrases like "completely safe" or "no risk".
Do not advise abrupt stopping — emergency guidance only for acute warning signs.
Use only the provided KB and patient data; do not invent facts.
`.trim()

const COMBINATION_SYNTHESIS_RULES_DE = `
WICHTIG: Dies ist eine KOMBINATIONS-Aufklärung. Synthetisieren Sie Risiken und Nebenwirkungen
über alle Medikamente hinweg — kopieren Sie NICHT einzelne Beipackzettel aneinander.
Beschreiben Sie additive Effekte, Wechselwirkungen und kombinierte Warnzeichen in patientenfreundlicher Sprache.
`.trim()

const COMBINATION_SYNTHESIS_RULES_EN = `
IMPORTANT: This is a COMBINATION education document. Synthesize risks and side effects
across all medications — do NOT concatenate individual leaflets.
Describe additive effects, interactions, and combined warning signs in patient-friendly language.
`.trim()

function detailHint(style: MedicationEducationDetailStyle, language: 'de' | 'en'): string {
  if (language === 'en') {
    if (style === 'einfach') return 'Keep each section to 2–4 short sentences.'
    if (style === 'ausfuehrlich') return 'Provide thorough but readable explanations (1–2 short paragraphs per section).'
    return 'Use balanced detail (1 short paragraph per section).'
  }
  if (style === 'einfach') return 'Halten Sie jeden Abschnitt auf 2–4 kurze Sätze.'
  if (style === 'ausfuehrlich') return 'Ausführliche, aber gut lesbare Erklärungen (1–2 kurze Absätze pro Abschnitt).'
  return 'Ausgewogene Detailtiefe (1 kurzer Absatz pro Abschnitt).'
}

export function buildMedicationEducationSystemPrompt(params: {
  sectionLabel: string
  scope: MedicationEducationScope
  detailStyle: MedicationEducationDetailStyle
  language: 'de' | 'en'
}): string {
  const isCombination = params.scope === 'full_combination' || params.scope === 'selected'
  const rules = params.language === 'en' ? PATIENT_LANGUAGE_RULES_EN : PATIENT_LANGUAGE_RULES_DE
  const combo = isCombination
    ? params.language === 'en'
      ? COMBINATION_SYNTHESIS_RULES_EN
      : COMBINATION_SYNTHESIS_RULES_DE
    : ''
  const detail = detailHint(params.detailStyle, params.language)

  return [
    params.language === 'en'
      ? `You are a clinical assistant drafting a patient medication education section: "${params.sectionLabel}".`
      : `Sie sind ein klinischer Assistent und verfassen einen Abschnitt einer Patientenaufklärung Medikation: „${params.sectionLabel}".`,
    rules,
    combo,
    detail,
    params.language === 'en'
      ? 'Output only the section body text — no heading, no markdown.'
      : 'Geben Sie nur den Abschnittstext aus — keine Überschrift, kein Markdown.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildMedicationEducationUserPrompt(params: {
  sectionLabel: string
  evidenceText: string
  language: 'de' | 'en'
  missingNotes: string[]
}): string {
  const missing =
    params.missingNotes.length > 0
      ? params.language === 'en'
        ? `\n\nMissing or uncertain data (mark cautiously in text): ${params.missingNotes.join('; ')}`
        : `\n\nFehlende oder unsichere Daten (vorsichtig im Text kennzeichnen): ${params.missingNotes.join('; ')}`
      : ''

  return params.language === 'en'
    ? `Section: ${params.sectionLabel}\n\nClinical evidence (de-identified):\n${params.evidenceText}${missing}`
    : `Abschnitt: ${params.sectionLabel}\n\nKlinische Evidenz (de-identifiziert):\n${params.evidenceText}${missing}`
}

export function buildCombinationSideEffectsSystemPrompt(language: 'de' | 'en'): string {
  return language === 'en'
    ? `${COMBINATION_SYNTHESIS_RULES_EN}\n\n${PATIENT_LANGUAGE_RULES_EN}\n\nSynthesize common side effects of the medication combination. Do not list each drug separately.`
    : `${COMBINATION_SYNTHESIS_RULES_DE}\n\n${PATIENT_LANGUAGE_RULES_DE}\n\nSynthetisieren Sie häufige Nebenwirkungen der Medikamentenkombination. Listen Sie nicht jedes Medikament einzeln auf.`
}

export function buildCombinationSideEffectsUserPrompt(evidenceText: string, language: 'de' | 'en'): string {
  return language === 'en'
    ? `Combination side effects section.\n\nEvidence:\n${evidenceText}`
    : `Abschnitt Nebenwirkungen der Kombination.\n\nEvidenz:\n${evidenceText}`
}
