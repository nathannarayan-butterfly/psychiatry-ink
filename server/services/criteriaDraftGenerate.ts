import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { callLlm } from './llmProvider.ts'
import {
  buildCriteriaDraftSystemPrompt,
  buildCriteriaDraftUserPrompt,
} from './criteriaDraftPrompts.ts'
import {
  parseDisorderDraftJson,
  validateDisorderDraft,
  validateIcd11TreeDraft,
  normalizeDisorderDraftInput,
  enrichCatalogueDisorderDraft,
} from '../../src/data/diagnosisCriteria/validateDisorderDraft.ts'
import type { DisorderDraft } from '../../src/schemas/diagnosisCriteria/disorderDraft.ts'
import type { CriteriaDraftTarget } from '../../scripts/lib/criteriaDraftGaps.ts'

export interface CriteriaDraftGenerationResult {
  ok: boolean
  target: CriteriaDraftTarget
  draft?: DisorderDraft | { icd11: DisorderDraft['icd11']; id: string; status: 'draft' }
  rawText?: string
  issues: Array<{ path: string; message: string }>
  latencyMs?: number
  model?: string
  provider?: string
  outputPath?: string
}

export const CRITERIA_DRAFT_OUTPUT_DIR = join(process.cwd(), 'scripts/output/criteria-drafts')

function mergeIcd11Patch(
  target: CriteriaDraftTarget,
  parsed: Record<string, unknown>,
): DisorderDraft | undefined {
  if (!target.existingDisorder || !parsed.icd11) return undefined
  const base = {
    id: target.existingDisorder.id,
    classification: target.existingDisorder.classification,
    code: target.existingDisorder.code,
    name_de: target.existingDisorder.name_de,
    crosswalkKey: target.existingDisorder.crosswalkKey,
    sourceRef: target.existingDisorder.sourceRef,
    version: 1 as const,
    status: 'draft' as const,
    codingSystems: target.existingDisorder.codingSystems,
    differentials_de: target.existingDisorder.differentials_de,
    groups: target.existingDisorder.groups.map((g) => ({
      id: g.id,
      label_de: g.label_de,
      logic: g.logic,
      threshold: g.threshold,
      timeWindow: g.timeWindow,
      groupType: g.groupType,
      criteria: g.criteria.map((c) => ({
        id: c.id,
        text_de: c.text_de,
        mappingHints: c.mappingHints,
        allowClinicianAttest: c.allowClinicianAttest,
        citation: c.citation,
        sourceRef: c.sourceRef,
      })),
    })),
    icd11: parsed.icd11 as DisorderDraft['icd11'],
  }
  return validateDisorderDraft(base).draft
}

export async function generateCriteriaDraftForTarget(
  target: CriteriaDraftTarget,
  options: { dryRun?: boolean; writeOutput?: boolean } = {},
): Promise<CriteriaDraftGenerationResult> {
  const systemPrompt = buildCriteriaDraftSystemPrompt()
  const userPrompt = buildCriteriaDraftUserPrompt(target)

  if (options.dryRun) {
    return {
      ok: true,
      target,
      issues: [],
      rawText: '[dry-run] skipped LLM call',
    }
  }

  const llm = await callLlm({
    tier: 'fast',
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 12_000,
    usageContext: {
      featureKey: 'criteria_draft_generate',
      requestKind: 'batch',
      metadata: {
        targetKey: target.key,
        mode: target.mode,
        disorderId: target.disorderId,
        icd11Code: target.icd11Code,
      },
    },
  })

  let parsed: unknown
  try {
    parsed = parseDisorderDraftJson(llm.text)
  } catch (error) {
    return {
      ok: false,
      target,
      rawText: llm.text,
      issues: [
        {
          path: 'json',
          message: error instanceof Error ? error.message : 'Invalid JSON from LLM',
        },
      ],
      latencyMs: llm.latencyMs,
      model: llm.model,
      provider: llm.provider,
    }
  }

  if (target.mode === 'icd11_tree') {
    const normalized = normalizeDisorderDraftInput(parsed) as Record<string, unknown>
    const treeOnly = normalized && typeof normalized === 'object' && 'icd11' in normalized
    const validation = treeOnly
      ? validateIcd11TreeDraft(normalized.icd11)
      : validateIcd11TreeDraft(normalized)

    if (!validation.ok) {
      return {
        ok: false,
        target,
        rawText: llm.text,
        issues: validation.issues,
        latencyMs: llm.latencyMs,
        model: llm.model,
        provider: llm.provider,
      }
    }

    const merged = mergeIcd11Patch(target, normalized)
    const mergedValidation = merged
      ? validateDisorderDraft(merged)
      : {
          ok: false,
          issues: [{ path: 'icd11', message: 'LLM response missing icd11 tree payload' }],
        }
    const result: CriteriaDraftGenerationResult = {
      ok: mergedValidation.ok,
      target,
      draft: merged ?? {
        id: target.disorderId ?? target.key,
        status: 'draft',
        icd11: normalized.icd11 as DisorderDraft['icd11'],
      },
      rawText: llm.text,
      issues: mergedValidation.ok ? [] : mergedValidation.issues,
      latencyMs: llm.latencyMs,
      model: llm.model,
      provider: llm.provider,
    }

    if (options.writeOutput !== false && result.ok && result.draft) {
      result.outputPath = writeDraftOutput(target, result.draft)
    }
    return result
  }

  const enriched = enrichCatalogueDisorderDraft(parsed, {
    icd11Code: target.icd11Code,
    title: target.title,
  })
  const validation = validateDisorderDraft(enriched)
  const result: CriteriaDraftGenerationResult = {
    ok: validation.ok,
    target,
    draft: validation.draft,
    rawText: llm.text,
    issues: validation.issues,
    latencyMs: llm.latencyMs,
    model: llm.model,
    provider: llm.provider,
  }

  if (options.writeOutput !== false && result.ok && result.draft) {
    result.outputPath = writeDraftOutput(target, result.draft)
  }
  return result
}

export function writeDraftOutput(
  target: CriteriaDraftTarget,
  draft: DisorderDraft | Record<string, unknown>,
): string {
  mkdirSync(CRITERIA_DRAFT_OUTPUT_DIR, { recursive: true })
  const slug = (target.disorderId ?? target.icd11Code ?? target.key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const filename = `${slug}-${target.mode}-${Date.now()}.json`
  const path = join(CRITERIA_DRAFT_OUTPUT_DIR, filename)
  writeFileSync(path, `${JSON.stringify({ target, draft, generatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
  return path
}

export function writeDraftManifest(
  results: CriteriaDraftGenerationResult[],
  meta: Record<string, unknown>,
): string {
  mkdirSync(CRITERIA_DRAFT_OUTPUT_DIR, { recursive: true })
  const path = join(CRITERIA_DRAFT_OUTPUT_DIR, 'manifest.json')
  const payload = {
    generatedAt: new Date().toISOString(),
    ...meta,
    results: results.map((r) => ({
      ok: r.ok,
      key: r.target.key,
      mode: r.target.mode,
      disorderId: r.target.disorderId,
      icd11Code: r.target.icd11Code,
      title: r.target.title,
      reason: r.target.reason,
      outputPath: r.outputPath,
      issueCount: r.issues.length,
      issues: r.issues,
      model: r.model,
      latencyMs: r.latencyMs,
    })),
  }
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return path
}
