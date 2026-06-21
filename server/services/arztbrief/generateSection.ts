import type { AiMode } from '../../../src/types/aiUsage'
import type {
  ArztbriefDocumentType,
  ArztbriefEvidenceBundle,
  TherapieVerlaufLength,
} from '../../../src/types/arztbrief'
import {
  buildBesondereHinweiseSystemPrompt,
  buildBesondereHinweiseUserPrompt,
  buildGenericSectionSystemPrompt,
  buildGenericSectionUserPrompt,
  buildTherapieVerlaufSystemPrompt,
  buildTherapieVerlaufUserPrompt,
} from '../../../src/data/arztbriefPrompts'
import { getArztbriefSectionDefinition } from '../../../src/data/arztbriefSections'
import { runAiFeature } from '../../ai/runAiFeature'
import { parseMode } from '../../ai/aiRouter'
import type { AiUsageContext } from '../../ai/types'
import { deidentifyText } from '../discussCaseDeidentify'

export interface GenerateArztbriefSectionParams {
  sectionId: string
  documentType: ArztbriefDocumentType
  mode: AiMode
  therapieVerlaufLength: TherapieVerlaufLength
  evidence: ArztbriefEvidenceBundle
  language: 'de' | 'en'
  usageContext?: AiUsageContext
  caseRef?: string | null
  patientHints?: { patientName?: string; patientDob?: string }
  debug?: boolean
}

export interface GenerateArztbriefSectionResult {
  content: string
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  debug?: {
    systemPrompt: string
    userPrompt: string
    rawResponse: string
    evidenceCharCount: number
  }
}

function scrubEvidence(bundle: ArztbriefEvidenceBundle, patientName?: string): string {
  let text = bundle.summaryText
  text = deidentifyText(text, patientName)
  return text.slice(0, 12000)
}

function buildPrompts(params: GenerateArztbriefSectionParams, evidenceText: string): {
  systemPrompt: string
  userPrompt: string
  featureKey: string
} {
  const def = getArztbriefSectionDefinition(params.documentType, params.sectionId)
  const label = def?.labelDe ?? params.sectionId

  if (params.sectionId === 'therapie-verlauf') {
    return {
      systemPrompt: buildTherapieVerlaufSystemPrompt(params.documentType),
      userPrompt: buildTherapieVerlaufUserPrompt(evidenceText, params.therapieVerlaufLength),
      featureKey: 'arztbrief_section',
    }
  }

  if (params.sectionId === 'besondere-hinweise') {
    return {
      systemPrompt: buildBesondereHinweiseSystemPrompt(),
      userPrompt: buildBesondereHinweiseUserPrompt(evidenceText),
      featureKey: 'arztbrief_section',
    }
  }

  return {
    systemPrompt: buildGenericSectionSystemPrompt(label),
    userPrompt: buildGenericSectionUserPrompt(label, evidenceText),
    featureKey: 'arztbrief_section',
  }
}

export async function generateArztbriefSection(
  params: GenerateArztbriefSectionParams,
): Promise<GenerateArztbriefSectionResult> {
  if (params.evidence.isDeidentified !== true) {
    throw new Error('Arztbrief AI requires de-identified evidence bundle')
  }

  const evidenceText = scrubEvidence(params.evidence, params.patientHints?.patientName)
  const { systemPrompt, userPrompt, featureKey } = buildPrompts(params, evidenceText)

  const result = await runAiFeature({
    featureKey,
    mode: parseMode(params.mode),
    systemPrompt,
    userPrompt,
    maxTokens: params.sectionId === 'therapie-verlauf' ? 2500 : 1200,
    usageContext: params.usageContext,
    caseRef: params.caseRef,
    sanitizeOpts: params.patientHints
      ? {
          patientHints: {
            patientName: params.patientHints.patientName,
            patientDob: params.patientHints.patientDob,
          },
        }
      : undefined,
  })

  const content = result.text.trim()

  const response: GenerateArztbriefSectionResult = {
    content,
    provider: result.provider,
    model: result.model,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    },
  }

  if (params.debug) {
    response.debug = {
      systemPrompt,
      userPrompt,
      rawResponse: result.text,
      evidenceCharCount: evidenceText.length,
    }
  }

  return response
}
