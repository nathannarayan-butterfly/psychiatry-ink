import type { AiMode } from '../../../src/types/aiUsage'
import type {
  GenericEducationAudience,
  GenericEducationDetailStyle,
  GenericEducationLanguage,
  GenericEducationReadingLevel,
  GenericEducationSubjectKind,
} from '../../../src/types/patientEducationGeneric'
import type { MedicationEducationReference } from '../../../src/types/medicationEducation'
import {
  buildGenericEducationSystemPrompt,
  buildGenericEducationUserPrompt,
} from '../../../src/data/patientEducationGenericPrompts'
import { runAiFeature } from '../../ai/runAiFeature'
import { parseMode } from '../../ai/aiRouter'
import type { AiUsageContext } from '../../ai/types'
import { parseStructuredJson } from '../../utils/parseStructuredJson'
import { sanitizeEducationAiContent } from '../../../src/utils/patientEducationGeneric/sanitizeAiContent'

export interface GeneratePatientEducationGenericSectionParams {
  subject: string
  subjectKind: GenericEducationSubjectKind
  sectionId: string
  sectionLabel: string
  promptHint: string
  audience: GenericEducationAudience
  readingLevel: GenericEducationReadingLevel
  detailStyle: GenericEducationDetailStyle
  additionalContext?: string
  language: GenericEducationLanguage
  mode: AiMode
  usageContext?: AiUsageContext
}

export interface GeneratePatientEducationGenericSectionResult {
  content: string
  references: MedicationEducationReference[]
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

function parseAiSectionResponse(
  raw: string,
  sectionId: string,
): { content: string; references: MedicationEducationReference[] } {
  const parsed = parseStructuredJson(raw) as {
    content?: string
    references?: Array<{ title?: string; url?: string | null; source?: string | null }>
  } | null

  if (!parsed || typeof parsed.content !== 'string') {
    return { content: sanitizeEducationAiContent(raw), references: [] }
  }

  const references: MedicationEducationReference[] = []
  const seen = new Set<string>()
  if (Array.isArray(parsed.references)) {
    for (const item of parsed.references) {
      const title = typeof item?.title === 'string' ? item.title.trim() : ''
      if (!title) continue
      const key = title.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const url = typeof item.url === 'string' && item.url.trim() ? item.url.trim() : undefined
      const source = typeof item.source === 'string' && item.source.trim() ? item.source.trim() : undefined
      references.push({ title, url, source, sectionId })
    }
  }

  return { content: sanitizeEducationAiContent(parsed.content), references }
}

export async function generatePatientEducationGenericSection(
  params: GeneratePatientEducationGenericSectionParams,
): Promise<GeneratePatientEducationGenericSectionResult> {
  const systemPrompt = buildGenericEducationSystemPrompt({
    subject: params.subject,
    subjectKind: params.subjectKind,
    sectionLabel: params.sectionLabel,
    promptHint: params.promptHint,
    audience: params.audience,
    readingLevel: params.readingLevel,
    detailStyle: params.detailStyle,
    language: params.language,
  })
  const userPrompt = buildGenericEducationUserPrompt({
    subject: params.subject,
    subjectKind: params.subjectKind,
    sectionLabel: params.sectionLabel,
    additionalContext: params.additionalContext,
    language: params.language,
  })

  const result = await runAiFeature({
    featureKey: 'patient_education_generic',
    mode: parseMode(params.mode),
    systemPrompt,
    userPrompt,
    // Thorough ("Gründlich") asks for several full paragraphs PLUS a references
    // array in one JSON payload; 2200 truncated mid-JSON, which both cut the body
    // to a couple of sentences and dropped the references (and left JSON/markup
    // artifacts when the truncated output was salvaged). Give it real headroom.
    maxTokens: params.detailStyle === 'ausfuehrlich' ? 4000 : 1600,
    jsonResponse: true,
    usageContext: params.usageContext,
    caseRef: null,
  })

  const { content, references } = parseAiSectionResponse(result.text, params.sectionId)

  return {
    content,
    references,
    provider: result.provider,
    model: result.model,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    },
  }
}
