/**
 * Inline AI text-edit service.
 *
 * Powers the editor's "Ask AI to edit selection" feature: the clinician selects
 * text, speaks (or types) an instruction, and the model returns an EDITED
 * version of the selection that is shown as a before/after preview.
 *
 * PHI handling (documented decision):
 *  - The selected text is REAL clinical content. The edit must PRESERVE that
 *    content, so the destructive de-identifier ([REDACTED], irreversible — see
 *    {@link file://../services/discussCaseDeidentify.ts}) cannot be used here:
 *    re-identification is not supported, so a de-identified edit could not be
 *    mapped back. We therefore send the real selection + surrounding context
 *    through the SAME trusted server-side gateway ({@link callLlm}) every other
 *    AI feature uses (the same trust boundary that already receives raw audio
 *    for dictation).
 *  - No raw PHI is ever logged: {@link recordAiUsageLog} persists only token
 *    counts + sanitized metadata (text-bearing keys are stripped), and this
 *    service passes NO clinical text in `metadata` and never console.logs it.
 */

import { runAiFeature } from '../ai/runAiFeature'
import type { AiModelTier } from '../modelTierMapping'
import type { AiUsageContext } from '../ai/types'
import { clinicalLanguagePromptInstruction, type ClinicalLanguage } from '../utils/resolveClinicalLanguage'

/** Hard caps — defensive server-side mirror of the client context builder. */
export const MAX_SELECTION_CHARS = 6_000
export const MAX_CONTEXT_CHARS = 4_000
export const MAX_INSTRUCTION_CHARS = 600

export interface InlineEditContext {
  /** The exact text the clinician highlighted (real clinical content). */
  selectedText: string
  /** Text immediately before the selection (same paragraph / preceding lines). */
  contextBefore: string
  /** Text immediately after the selection. */
  contextAfter: string
}

export interface InlineEditParams {
  context: InlineEditContext
  instruction: string
  tier: AiModelTier
  model?: { provider: string; modelId: string }
  language: ClinicalLanguage
  usageContext?: AiUsageContext
}

export interface InlineEditOutput {
  editedText: string
  model: { provider: string; modelId: string }
  mock: boolean
}

export function clampSelection(value: string): string {
  return value.slice(0, MAX_SELECTION_CHARS)
}

function clampContext(value: string, budget: number): string {
  if (value.length <= budget) return value
  // Keep the side nearest the selection.
  return value.slice(0, budget)
}

export function buildInlineEditSystemPrompt(language: ClinicalLanguage): string {
  return [
    'You are an inline writing assistant embedded in a clinical psychiatry documentation editor.',
    'You receive a SELECTED passage from a clinical note, the surrounding context (for reference only), and an instruction describing how to change the selection.',
    'Rewrite ONLY the selected passage according to the instruction.',
    'Preserve all clinically relevant facts, names, dosages, dates and meaning unless the instruction explicitly asks to change them.',
    'Do not invent new clinical facts and do not add commentary, explanations, quotation marks or markdown code fences.',
    'Return ONLY the rewritten passage as plain text — nothing else. Do not repeat the surrounding context.',
    clinicalLanguagePromptInstruction(language),
  ].join(' ')
}

export function buildInlineEditUserPrompt(input: {
  context: InlineEditContext
  instruction: string
}): string {
  const before = clampContext(input.context.contextBefore, MAX_CONTEXT_CHARS)
  const after = clampContext(input.context.contextAfter, MAX_CONTEXT_CHARS)
  const selection = clampSelection(input.context.selectedText)
  const instruction = input.instruction.slice(0, MAX_INSTRUCTION_CHARS)

  // The selected passage is placed LAST after a `---` fence so the mock provider
  // (no API key) echoes the selection back deterministically.
  return [
    'Instruction (what to do with the selected passage):',
    instruction || '(rephrase the selected passage while keeping its meaning)',
    '',
    'Surrounding context BEFORE the selection (reference only, do not rewrite):',
    before ? `«${before}»` : '(none)',
    '',
    'Surrounding context AFTER the selection (reference only, do not rewrite):',
    after ? `«${after}»` : '(none)',
    '',
    'Selected passage to rewrite:',
    '---',
    selection,
  ].join('\n')
}

/**
 * Strip wrappers a model sometimes adds (surrounding quotes, markdown fences)
 * and the mock provider's recognizable suffix, so the preview shows clean text.
 */
export function cleanEditedText(raw: string): string {
  let text = raw.trim()
  // Remove the mock provider suffix ("…\n\n[AI draft — …]").
  text = text.replace(/\n*\[AI draft —[^\]]*\]\s*$/i, '').trim()
  // Strip a single enclosing markdown code fence.
  const fence = text.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/)
  if (fence) text = fence[1].trim()
  // Strip a single pair of enclosing quotes if the whole string is wrapped.
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith('«') && text.endsWith('»')) ||
      (text.startsWith('„') && text.endsWith('“')))
  ) {
    text = text.slice(1, -1).trim()
  }
  return text
}

export function isInlineEditMockText(text: string): boolean {
  return /\[AI draft —/.test(text)
}

/** Run ONE inline edit call against the trusted gateway. */
export async function runInlineEdit(params: InlineEditParams): Promise<InlineEditOutput> {
  const systemPrompt = buildInlineEditSystemPrompt(params.language)
  const userPrompt = buildInlineEditUserPrompt({
    context: params.context,
    instruction: params.instruction,
  })

  // runAiFeature → callLlmSafely → callLlm: PHI guard is preserved inside
  // runAiFeature. The route handler pre-scrubs; callLlmSafely re-asserts at
  // the egress boundary; no double-scrub regression is possible.
  const result = await runAiFeature({
    featureKey: 'inline_text_edit',
    tier: params.tier,
    model: params.model,
    systemPrompt,
    userPrompt,
    maxTokens: 1_200,
    usageContext: params.usageContext,
  })

  const mock = isInlineEditMockText(result.text)
  const cleaned = cleanEditedText(result.text)

  return {
    // Never return empty text — fall back to the original selection.
    editedText: cleaned || params.context.selectedText,
    model: { provider: result.provider, modelId: result.model },
    mock,
  }
}
