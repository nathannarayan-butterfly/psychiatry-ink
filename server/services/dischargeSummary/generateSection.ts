import type { AiMode } from '../../../src/types/aiUsage'
import type {
  DischargeSummaryDocumentType,
  DischargeSummaryEvidenceBundle,
  DischargeSummaryRegion,
  HospitalCourseLength,
} from '../../../src/types/dischargeSummary'
import {
  buildDiagnosticFormulationSystemPrompt,
  buildDiagnosticFormulationUserPrompt,
  buildGenericSectionSystemPrompt,
  buildGenericSectionUserPrompt,
  buildHospitalCourseSystemPrompt,
  buildHospitalCourseUserPrompt,
  buildRecommendationsSystemPrompt,
  buildRecommendationsUserPrompt,
  buildRiskSummarySystemPrompt,
  buildRiskSummaryUserPrompt,
} from '../../../src/data/dischargeSummaryPrompts'
import { getDischargeSummarySectionDefinition, getDischargeSummarySectionLabel } from '../../../src/data/dischargeSummarySections'
import { runAiFeature } from '../../ai/runAiFeature'
import { parseMode } from '../../ai/aiRouter'
import type { AiUsageContext } from '../../ai/types'
import { deidentifyText } from '../discussCaseDeidentify'

export interface GenerateDischargeSummarySectionParams {
  sectionId: string
  documentType: DischargeSummaryDocumentType
  region: DischargeSummaryRegion
  mode: AiMode
  hospitalCourseLength: HospitalCourseLength
  evidence: DischargeSummaryEvidenceBundle
  usageContext?: AiUsageContext
  caseRef?: string | null
  patientHints?: { patientName?: string; patientDob?: string }
  debug?: boolean
}

export interface GenerateDischargeSummarySectionResult {
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

function scrubEvidence(bundle: DischargeSummaryEvidenceBundle, patientName?: string): string {
  let text = bundle.summaryText
  text = deidentifyText(text, patientName)
  return text.slice(0, 12000)
}

function isHospitalCourseSection(sectionId: string): boolean {
  return sectionId === 'hospital-course' || sectionId === 'treatment-hospital-course'
}

function isRecommendationsSection(sectionId: string): boolean {
  return sectionId === 'discharge-recommendations' || sectionId === 'recommendations-instructions'
}

function isRiskSection(sectionId: string): boolean {
  return sectionId === 'risk-assessment-discharge' || sectionId === 'risk-assessment'
}

function buildPrompts(params: GenerateDischargeSummarySectionParams, evidenceText: string): {
  systemPrompt: string
  userPrompt: string
  featureKey: string
  maxTokens: number
} {
  const def = getDischargeSummarySectionDefinition(params.documentType, params.sectionId)
  const label = def ? getDischargeSummarySectionLabel(def, params.region) : params.sectionId

  if (isHospitalCourseSection(params.sectionId)) {
    return {
      systemPrompt: buildHospitalCourseSystemPrompt(params.documentType, params.region),
      userPrompt: buildHospitalCourseUserPrompt(
        evidenceText,
        params.hospitalCourseLength,
        params.region,
      ),
      featureKey: 'discharge_summary_section',
      maxTokens: 2500,
    }
  }

  if (isRecommendationsSection(params.sectionId)) {
    return {
      systemPrompt: buildRecommendationsSystemPrompt(params.region),
      userPrompt: buildRecommendationsUserPrompt(evidenceText, params.region),
      featureKey: 'discharge_summary_section',
      maxTokens: 1200,
    }
  }

  if (isRiskSection(params.sectionId)) {
    return {
      systemPrompt: buildRiskSummarySystemPrompt(params.region),
      userPrompt: buildRiskSummaryUserPrompt(evidenceText, params.region),
      featureKey: 'discharge_summary_section',
      maxTokens: 1200,
    }
  }

  if (params.sectionId === 'diagnostic-formulation') {
    return {
      systemPrompt: buildDiagnosticFormulationSystemPrompt(params.region),
      userPrompt: buildDiagnosticFormulationUserPrompt(evidenceText, params.region),
      featureKey: 'discharge_summary_section',
      maxTokens: 1500,
    }
  }

  return {
    systemPrompt: buildGenericSectionSystemPrompt(label, params.region),
    userPrompt: buildGenericSectionUserPrompt(label, evidenceText, params.region),
    featureKey: 'discharge_summary_section',
    maxTokens: 1200,
  }
}

export async function generateDischargeSummarySection(
  params: GenerateDischargeSummarySectionParams,
): Promise<GenerateDischargeSummarySectionResult> {
  if (params.evidence.isDeidentified !== true) {
    throw new Error('Discharge summary AI requires de-identified evidence bundle')
  }

  const evidenceText = scrubEvidence(params.evidence, params.patientHints?.patientName)
  const { systemPrompt, userPrompt, featureKey, maxTokens } = buildPrompts(params, evidenceText)

  const result = await runAiFeature({
    featureKey,
    mode: parseMode(params.mode),
    systemPrompt,
    userPrompt,
    maxTokens,
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

  const response: GenerateDischargeSummarySectionResult = {
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
