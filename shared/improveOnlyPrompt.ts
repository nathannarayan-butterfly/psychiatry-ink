/**
 * Canonical "improve, don't interpret" rules.
 *
 * Shared by the two clinical surfaces that must polish the clinician's own
 * wording WITHOUT ever adding clinical interpretation:
 *  - the Psychopathologischer Befund section KI (Item 8, via `/api/generate`)
 *  - the Verlauf "KI verbessern" action (Item 9, via `/api/inline-edit`)
 *
 * The model may ONLY refine text the clinician actually wrote: it turns
 * fragmentary notes into clean German sentences/paragraphs and fixes
 * grammar/flow. It must NEVER add interpretations, diagnoses, ratings, AMDP
 * terminology, or any content the clinician did not write.
 *
 * Lives in `shared/` so the exact same wording is used on both the Vite client
 * (prompt builder) and the Express server (inline-edit instruction).
 */

export const IMPROVE_ONLY_RULES: readonly string[] = [
  "Rewrite the clinician's notes into clear, well-formed German clinical prose",
  'Turn fragments, keywords, and shorthand into complete sentences and coherent paragraphs',
  'Fix grammar, spelling, punctuation, sentence flow, and word choice only',
  'Keep every fact, finding, symptom, name, number, dose, date, and negation exactly as written',
  'Do NOT add interpretations, conclusions, diagnoses, ICD codes, severity ratings, or AMDP/scale terminology the clinician did not write',
  'Do NOT infer, complete, or invent clinical content, symptoms, or findings that are not explicitly present in the source',
  'Do NOT impose a document template or new headings, and do not reorder beyond grouping clearly related sentences',
  'If the source is empty or only a fragment, improve solely what is there — never fabricate',
  'Preserve the clinical meaning and ordering; keep output length close to the input (roughly 90–120%)',
  'Output only the improved text — no commentary, labels, or markdown',
]

/** Joined rule string, suitable for embedding in a system/user prompt. */
export const IMPROVE_ONLY_RULES_TEXT = IMPROVE_ONLY_RULES.join('. ')

/** Short label-style summary of the mode (English, prompt-internal). */
export const IMPROVE_ONLY_TASK = 'Improve writing only; never interpret or add content'

/**
 * One-paragraph instruction for the inline-edit endpoint (Verlauf, Item 9).
 * The inline-edit service already preserves facts; this instruction pins the
 * behaviour to the exact same improve-only contract used by Item 8.
 */
export function buildImproveOnlyInstruction(): string {
  return `${IMPROVE_ONLY_TASK}. ${IMPROVE_ONLY_RULES_TEXT}.`
}
