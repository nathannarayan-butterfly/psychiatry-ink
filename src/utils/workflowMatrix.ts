/**
 * Workflow combination audit — each entry defines expected default tool
 * when KI Auto is on and clinician has not manually picked a tool.
 * Run: npx tsx scripts/audit-workflows.ts (after adding script) or import in dev.
 */
import { aufnahmeComponentAi, psychopathChecklistVariantAi, verlaufShortVariantAi } from '../data/aiManagerPresets'
import { resolveAiAutoSelection, type ContentInputOrigin } from './aiAutoDefaults'
import type { AiGenerationScope } from '../types'

export interface WorkflowCase {
  id: string
  componentId: string
  variantId?: string
  scope: AiGenerationScope
  contentInputOrigin: ContentInputOrigin
  inputMode: 'write' | 'dictate' | 'extract'
  mergedAi: typeof aufnahmeComponentAi
  expectTool: string
}

export const WORKFLOW_CASES: WorkflowCase[] = [
  {
    id: 'aufnahme-segment-typed',
    componentId: 'aufnahme',
    scope: 'segment',
    contentInputOrigin: 'typed',
    inputMode: 'write',
    mergedAi: aufnahmeComponentAi,
    expectTool: 'structure',
  },
  {
    id: 'aufnahme-segment-dictated',
    componentId: 'aufnahme',
    scope: 'segment',
    contentInputOrigin: 'dictated',
    inputMode: 'write',
    mergedAi: aufnahmeComponentAi,
    expectTool: 'structure',
  },
  {
    id: 'aufnahme-segment-pasted',
    componentId: 'aufnahme',
    scope: 'segment',
    contentInputOrigin: 'pasted',
    inputMode: 'extract',
    mergedAi: aufnahmeComponentAi,
    expectTool: 'summarize',
  },
  {
    id: 'aufnahme-document-typed',
    componentId: 'aufnahme',
    scope: 'document',
    contentInputOrigin: 'typed',
    inputMode: 'write',
    mergedAi: aufnahmeComponentAi,
    expectTool: 'structure',
  },
  {
    id: 'aufnahme-document-pasted',
    componentId: 'aufnahme',
    scope: 'document',
    contentInputOrigin: 'pasted',
    inputMode: 'extract',
    mergedAi: aufnahmeComponentAi,
    expectTool: 'summarize',
  },
  {
    id: 'verlauf-short-dictated',
    componentId: 'verlauf',
    variantId: 'short',
    scope: 'segment',
    contentInputOrigin: 'dictated',
    inputMode: 'write',
    mergedAi: verlaufShortVariantAi,
    expectTool: 'structure',
  },
  {
    id: 'checklist-typed-proofread',
    componentId: 'psychopath',
    variantId: 'checklist',
    scope: 'segment',
    contentInputOrigin: 'typed',
    inputMode: 'write',
    mergedAi: psychopathChecklistVariantAi,
    expectTool: 'proofread',
  },
  {
    id: 'checklist-dictated-proofread',
    componentId: 'psychopath',
    variantId: 'checklist',
    scope: 'segment',
    contentInputOrigin: 'dictated',
    inputMode: 'write',
    mergedAi: psychopathChecklistVariantAi,
    expectTool: 'proofread',
  },
  {
    id: 'checklist-pasted-shorten',
    componentId: 'psychopath',
    variantId: 'checklist',
    scope: 'segment',
    contentInputOrigin: 'pasted',
    inputMode: 'extract',
    mergedAi: psychopathChecklistVariantAi,
    expectTool: 'shorten',
  },
]

export function auditWorkflowCases(): { passed: number; failed: WorkflowCase[] } {
  const failed: WorkflowCase[] = []

  for (const testCase of WORKFLOW_CASES) {
    const result = resolveAiAutoSelection({
      componentId: testCase.componentId,
      variantId: testCase.variantId,
      generationScope: testCase.scope,
      inputMode: testCase.inputMode,
      contentInputOrigin: testCase.contentInputOrigin,
      mergedAi: testCase.mergedAi,
    })
    if (result.tool !== testCase.expectTool) {
      failed.push(testCase)
    }
  }

  return { passed: WORKFLOW_CASES.length - failed.length, failed }
}
