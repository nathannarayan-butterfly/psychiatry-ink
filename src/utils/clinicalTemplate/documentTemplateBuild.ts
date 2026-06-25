/**
 * Turns the (untrusted) AI document-analysis response into builder-ready,
 * schema-validated blocks. This is the client-side safety net: even though the
 * server validates each block, we re-validate here through the canonical Zod
 * schema and fall back to a single text block carrying the raw content so a
 * malformed AI response can never corrupt the builder.
 */
import { CLINICAL_TEMPLATE_CATEGORIES } from './blockCatalog'
import { parseBlock } from './schema'
import type { ClinicalTemplateCategory, TemplateBlock } from '../../types/clinicalTemplate'

const VALID_CATEGORIES = new Set<string>(CLINICAL_TEMPLATE_CATEGORIES.map((c) => c.id))

/** Max characters kept in the raw-text fallback block. */
const FALLBACK_TEXT_LIMIT = 12000

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `blk-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

/** Normalise an AI-suggested category to a known one, defaulting to "custom". */
export function normalizeAnalyzedCategory(value: unknown): ClinicalTemplateCategory {
  return typeof value === 'string' && VALID_CATEGORIES.has(value)
    ? (value as ClinicalTemplateCategory)
    : 'custom'
}

/** Build a single text block holding the raw document text (graceful fallback). */
export function buildFallbackBlocks(rawText: string): TemplateBlock[] {
  const text = rawText.trim().slice(0, FALLBACK_TEXT_LIMIT)
  return [{ id: newId(), type: 'text', text }]
}

/**
 * Validate AI-produced blocks through the schema and assign fresh ids. Returns
 * the raw-text fallback when nothing validates.
 */
export function resolveAnalyzedBlocks(
  rawBlocks: unknown,
  rawText: string,
): TemplateBlock[] {
  const list = Array.isArray(rawBlocks) ? rawBlocks : []
  const valid: TemplateBlock[] = []
  for (const raw of list) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const parsed = parseBlock({ ...(raw as Record<string, unknown>), id: newId() })
      if (parsed) valid.push(parsed)
    }
  }
  if (valid.length === 0) return buildFallbackBlocks(rawText)
  return valid
}

export interface AnalyzedTemplate {
  category: ClinicalTemplateCategory
  blocks: TemplateBlock[]
  /** True when the AI output could not be used and we fell back to raw text. */
  usedFallback: boolean
}

/** Resolve the full analyzed template (category + validated blocks + fallback flag). */
export function resolveAnalyzedTemplate(input: {
  category?: unknown
  blocks?: unknown
  rawText: string
}): AnalyzedTemplate {
  const category = normalizeAnalyzedCategory(input.category)
  const list = Array.isArray(input.blocks) ? input.blocks : []
  const valid: TemplateBlock[] = []
  for (const raw of list) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const parsed = parseBlock({ ...(raw as Record<string, unknown>), id: newId() })
      if (parsed) valid.push(parsed)
    }
  }
  if (valid.length === 0) {
    return { category, blocks: buildFallbackBlocks(input.rawText), usedFallback: true }
  }
  return { category, blocks: valid, usedFallback: false }
}
