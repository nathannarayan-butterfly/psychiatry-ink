import type { AiMode } from '../../../src/types/aiUsage'
import type {
  MedicationEducationDetailStyle,
  MedicationEducationEvidenceBundle,
  MedicationEducationScope,
} from '../../../src/types/medicationEducation'
import {
  buildCombinationSideEffectsSystemPrompt,
  buildCombinationSideEffectsUserPrompt,
  buildMedicationEducationSystemPrompt,
  buildMedicationEducationUserPrompt,
} from '../../../src/data/medicationEducationPrompts'
import { getMedicationEducationSectionDefinition } from '../../../src/data/medicationEducationSections'
import { runAiFeature } from '../../ai/runAiFeature'
import { parseMode } from '../../ai/aiRouter'
import type { AiUsageContext } from '../../ai/types'
import { deidentifyText } from '../discussCaseDeidentify'

export interface GenerateMedicationEducationSectionParams {
  sectionId: string
  scope: MedicationEducationScope
  documentVariant: MedicationEducationEvidenceBundle['documentVariant']
  mode: AiMode
  detailStyle: MedicationEducationDetailStyle
  evidence: MedicationEducationEvidenceBundle
  language: 'de' | 'en'
  usageContext?: AiUsageContext
  caseRef?: string | null
  patientHints?: { patientName?: string; patientDob?: string }
  debug?: boolean
}

export interface GenerateMedicationEducationSectionResult {
  content: string
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  debug?: {
    systemPrompt: string
    userPrompt: string
    rawResponse: string
    evidenceCharCount: number
    kbCoveragePercent?: number
    combinationSource?: string
  }
}

function scrubEvidence(bundle: MedicationEducationEvidenceBundle, patientName?: string): string {
  let text = bundle.summaryText
  text = deidentifyText(text, patientName)
  const kbBlock = bundle.kbSummaries
    .map(
      (k) =>
        `[${k.substanceName}] Mechanismus: ${k.mechanismSimple}\nNebenwirkungen: ${k.commonSideEffects}\nWarnungen: ${k.seriousWarnings}\nMonitoring: ${k.monitoringRequirements}`,
    )
    .join('\n\n')
  const comboBlock = bundle.combinationRisks
    .map((r) => `${r.substances} (${r.severity}): ${r.mainRisk}`)
    .join('\n')
  return [text, kbBlock, comboBlock ? `Kombinationsrisiken:\n${comboBlock}` : ''].filter(Boolean).join('\n\n').slice(0, 14000)
}

function featureKeyForScope(scope: MedicationEducationScope): string {
  return scope === 'single' ? 'medication_education_single_section' : 'medication_education_combination_section'
}

export async function generateMedicationEducationSection(
  params: GenerateMedicationEducationSectionParams,
): Promise<GenerateMedicationEducationSectionResult> {
  if (params.evidence.isDeidentified !== true) {
    throw new Error('Medication education AI requires de-identified evidence bundle')
  }

  const def = getMedicationEducationSectionDefinition(params.scope, params.sectionId)
  const label = def ? (params.language === 'en' ? def.labelEn : def.labelDe) : params.sectionId
  const evidenceText = scrubEvidence(params.evidence, params.patientHints?.patientName)
  const featureKey = featureKeyForScope(params.scope)

  let systemPrompt: string
  let userPrompt: string

  if (params.sectionId === 'haeufige-nebenwirkungen-kombination') {
    systemPrompt = buildCombinationSideEffectsSystemPrompt(params.language)
    userPrompt = buildCombinationSideEffectsUserPrompt(evidenceText, params.language)
  } else {
    systemPrompt = buildMedicationEducationSystemPrompt({
      sectionLabel: label,
      scope: params.scope,
      detailStyle: params.detailStyle,
      language: params.language,
    })
    userPrompt = buildMedicationEducationUserPrompt({
      sectionLabel: label,
      evidenceText,
      language: params.language,
      missingNotes: params.evidence.missingOrUncertain,
    })
  }

  const result = await runAiFeature({
    featureKey,
    mode: parseMode(params.mode),
    systemPrompt,
    userPrompt,
    maxTokens: params.detailStyle === 'ausfuehrlich' ? 2000 : 1200,
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

  const response: GenerateMedicationEducationSectionResult = {
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
    const kbFilled = params.evidence.kbSummaries.filter((k) => k.mechanismSimple.trim()).length
    const kbTotal = params.evidence.kbSummaries.length || 1
    response.debug = {
      systemPrompt,
      userPrompt,
      rawResponse: result.text,
      evidenceCharCount: evidenceText.length,
      kbCoveragePercent: Math.round((kbFilled / kbTotal) * 100),
      combinationSource:
        params.evidence.combinationRisks.length > 0
          ? params.evidence.combinationRisks.map((r) => r.source).join(', ')
          : 'none',
    }
  }

  return response
}
