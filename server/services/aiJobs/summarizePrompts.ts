import type { AiJobParams } from '../../../shared/aiJobs'
import type { ResolvedLengthBudget } from './lengthControl'
import { lengthInstruction } from './lengthControl'

/**
 * Server-side prompt builders for the persisted summarize pipeline.
 *
 * Prompts stay token-minimal and in English (matching `src/data/aiPromptCore.ts`);
 * the output language is pinned to the clinician's UI language. Clinical
 * content rules follow the product stance: dense summary, no invented facts,
 * advisory only.
 */

const OUTPUT_LANGUAGE: Record<string, string> = {
  de: 'German',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
}

export function summarySystemPrompt(language: string | undefined): string {
  return [
    'Experienced psychiatric documentation writer. Assist the treating psychiatrist.',
    `Output language: ${OUTPUT_LANGUAGE[language ?? 'de'] ?? 'German'} only.`,
    'Input may be any language or mixed.',
    'No invented facts. Text only.',
  ].join(' ')
}

/**
 * Structured clinical course summary ("Therapie und Verlauf zusammenfassen").
 * Fixed clinically useful skeleton instead of an unstructured narrative.
 * Headings are emitted in the output language; empty sections are omitted
 * except the two the clinician always needs at hand-over.
 */
const STRUCTURED_SECTIONS_DE = [
  'Aufnahmeanlass / Ausgangsbefund',
  'Relevanter Verlauf',
  'Diagnostik / Konsile',
  'Medikation / Verträglichkeit',
  'Risiken / besondere Ereignisse',
  'Aktueller Zustand',
  'Empfehlungen / offene Punkte',
]

export function structuredSummaryTask(budget: ResolvedLengthBudget | null): string {
  const parts = [
    'Summarize the clinical course as a dense, structured clinical summary.',
    `Use exactly these section headings, in this order, translated to the output language: ${STRUCTURED_SECTIONS_DE.join(' | ')}.`,
    'Omit a section entirely when the source contains nothing for it — except "Aktueller Zustand" and "Empfehlungen / offene Punkte", which must always be attempted from the latest available information.',
    'Chronology inside sections; state each fact once — never repeat a fact across sections.',
    'Prefer dense clinical shorthand (medication with dose, dated events) over narrative prose.',
    'Advisory draft only: no new diagnoses, no invented facts, no interpretation beyond the source.',
  ]
  if (budget) parts.push(lengthInstruction(budget))
  return parts.join(' ')
}

/** Generic long-document summarize task (workspace "Zusammenfassen"). */
export function genericSummaryTask(budget: ResolvedLengthBudget | null): string {
  const parts = [
    'Summarize; keep clinical facts, medications with doses, dates, risks and recommendations.',
    'Keep source headings when present. No repetition, no filler, no invented facts.',
  ]
  if (budget) parts.push(lengthInstruction(budget))
  return parts.join(' ')
}

/** Map stage: compact per-chunk extraction that later merges losslessly. */
export function chunkMapTask(): string {
  return (
    'Condense this part of a longer clinical document into compact factual notes: ' +
    'diagnoses, medication changes with doses and dates, relevant findings, risks, ' +
    'consults, and course events. Keep dates. Telegram style is fine. ' +
    'No interpretation, no invented facts. Output only the notes.'
  )
}

export function appendDirections(task: string, params: AiJobParams): string {
  const directions = params.directions?.trim()
  if (!directions) return task
  return `${task}\nAdditional instructions from clinician: ${directions}`
}

export function buildJobUserPrompt(task: string, sourceText: string): string {
  return `${task}\n---\n${sourceText.trim() || '(empty)'}`
}
