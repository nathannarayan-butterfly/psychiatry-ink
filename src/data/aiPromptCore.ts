import type { AiToolKey } from './aiTools'
import type { UiLanguage } from '../types/settings'
import type { AiClinicalRole } from '../types/aiGeneration'
import type { AiGenerationScope } from '../types'

/** Tools that polish existing text only — never impose document/section structure. */
export const STYLE_ONLY_TOOLS: ReadonlySet<AiToolKey> = new Set(['formalize', 'proofread'])

export function isStyleOnlyTool(tool: AiToolKey): boolean {
  return STYLE_ONLY_TOOLS.has(tool)
}

export const OUTPUT_LANGUAGE: Record<UiLanguage, string> = {
  de: 'German',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
}

/** Token-minimal system roles. */
export const CLINICAL_ROLE_PROMPT: Record<AiClinicalRole, string> = {
  writer:
    'Experienced psychiatric documentation writer. Assist the treating psychiatrist.',
  psychiatrist: 'Board-level psychiatrist authoring clinical documentation.',
}

/** One-line tool verbs — composed with section focus at call time. */
export const TOOL_VERB: Record<AiToolKey, string> = {
  structure: 'Structure into clear clinical prose',
  summarize: 'Summarize; keep clinical facts',
  shorten: 'Shorten; keep all facts',
  formalize: 'Polish wording to formal clinical German (Arztbrief style); preserve structure',
  bulletPoints: 'Convert to concise bullet points',
  proofread: 'Proofread grammar/style only; no new content',
  expand: 'Expand only from given facts; no additions',
}

/** Formalisieren: style-only pass — never restructure or add clinical content. */
export const FORMALIZE_RULES = [
  'Correct grammar, spelling, punctuation, and awkward phrasing only',
  'Convert informal or mixed-language wording into professional German clinical documentation (formal Arztbrief style)',
  'Preserve the source layout exactly: same paragraphs, order, chronology, and headings — do not add, remove, or rename headings',
  'Never impose admission (Aufnahme), progress-note (Verlauf), AMDP, or other document templates',
  'Continuous prose in → continuous prose out; do not create bullet points or lists',
  'Do not summarize, shorten substantially, or omit clinically relevant details',
  'Do not add ICD codes, diagnoses, interpretations, treatment rationales, or recommendations unless already in source',
  'Do not invent new clinical facts',
  'Output length should stay roughly 90–110% of input length',
  'Output only the revised text — no explanation or commentary',
].join('. ')

/** Korrekturlesen: grammar/style only — same structural guardrails as formalize. */
export const PROOFREAD_RULES = [
  'Fix grammar, spelling, and punctuation only',
  'Preserve all structure, headings, paragraphs, and clinical content exactly',
  'Do not restructure, summarize, or add clinical information',
  'Output only the corrected text — no commentary',
].join('. ')

const DOCUMENT_STRUCTURE_HINT: Record<string, string> = {
  aufnahme: 'Assign text to admission section headings',
  verlauf: 'Assign text to progress note headings',
  psychopath: 'Order as AMDP-style mental state exam',
  'therapie-verlauf': 'Assign to therapy/course headings',
  medikation: 'Assign to medication documentation headings',
  therapieplanung: 'Assign to therapy planning headings',
}

export function buildToolTask(
  tool: AiToolKey,
  scope: AiGenerationScope,
  sectionFocus: string,
  componentId: string,
  sectionLabel?: string,
): string {
  if (tool === 'formalize') {
    const labelHint = sectionLabel ? `Active section label (wording context only): ${sectionLabel}.` : ''
    return `${FORMALIZE_RULES}. ${labelHint}`.trim()
  }

  if (tool === 'proofread') {
    const labelHint = sectionLabel ? `Section: ${sectionLabel}.` : ''
    return `${PROOFREAD_RULES}. ${labelHint}`.trim()
  }

  const verb = TOOL_VERB[tool]

  if (scope === 'document' && tool === 'structure') {
    const splitHint = DOCUMENT_STRUCTURE_HINT[componentId] ?? 'Assign to section headings'
    return `${verb}. ${splitHint}. Focus: ${sectionFocus}`
  }

  if (scope === 'document' && tool === 'summarize') {
    return `${verb}. Keep headings. Focus: ${sectionFocus}`
  }

  return `${verb}. Focus: ${sectionFocus}`
}

export function buildSystemPrompt(
  role: AiClinicalRole,
  language: UiLanguage,
  tool?: AiToolKey,
): string {
  const parts = [
    CLINICAL_ROLE_PROMPT[role],
    `Output language: ${OUTPUT_LANGUAGE[language]} only.`,
    'Input may be any language or mixed.',
    'No invented facts. Text only.',
  ]
  if (tool === 'formalize') {
    parts.push('Preserve source structure and all clinical content; improve wording only.')
  }
  if (tool === 'proofread') {
    parts.push('Proofread only; preserve structure and all clinical content.')
  }
  return parts.join(' ')
}

export function buildUserPrompt(
  toolTask: string,
  sourceText: string,
  options?: { sectionLabel?: string; styleHint?: string; extraInstruction?: string },
): string {
  const parts = [toolTask]
  if (options?.sectionLabel) parts.push(`Section: ${options.sectionLabel}`)
  if (options?.styleHint) parts.push(`Style ref: ${options.styleHint}`)
  if (options?.extraInstruction?.trim()) {
    parts.push(`Additional instructions from clinician: ${options.extraInstruction.trim()}`)
  }
  parts.push('---', sourceText.trim() || '(empty)')
  return parts.join('\n')
}
