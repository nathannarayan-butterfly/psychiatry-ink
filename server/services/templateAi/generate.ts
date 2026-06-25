import { randomUUID } from 'node:crypto'
import type { AiMode } from '../../../src/types/aiUsage'
import type { AiUsageContext } from '../../ai/types'
import { runAiFeature } from '../../ai/runAiFeature'
import { parseMode } from '../../ai/aiRouter'
import { blockSchema } from '../../../src/utils/clinicalTemplate/schema'
import type { TemplateBlock } from '../../../src/types/clinicalTemplate'

export interface GenerateTemplateDraftParams {
  description: string
  category: string
  language: 'de' | 'en'
  mode?: AiMode
  usageContext?: AiUsageContext
  caseRef?: string | null
}

export interface GenerateTemplateDraftResult {
  blocks: TemplateBlock[]
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

const ALLOWED_TYPES = [
  'heading',
  'text',
  'input',
  'diagnosis',
  'medication',
  'laboratory',
  'psychopathology',
  'risk',
  'verlauf_summary',
  'therapy',
  'social_therapy',
  'patient_data',
  'institution',
  'signature',
  'ai_section',
] as const

const GENERATE_SYSTEM_PROMPT = `You are an assistant that designs clinical document TEMPLATES for German psychiatry.
You output ONLY valid minified JSON: {"blocks":[ ... ]}. No prose, no markdown fences.
Each block is an object with a "type" field. Allowed types and their fields:
- heading: { "type":"heading", "text": string, "level": 1|2|3 }
- text: { "type":"text", "text": string }
- input: { "type":"input", "inputKind":"short_text"|"long_text"|"checkbox"|"select"|"date", "label": string, "required": boolean }
- diagnosis: { "type":"diagnosis", "label": string }
- medication: { "type":"medication", "label": string }
- laboratory: { "type":"laboratory", "label": string }
- psychopathology: { "type":"psychopathology", "label": string }
- risk: { "type":"risk", "label": string }
- verlauf_summary: { "type":"verlauf_summary", "label": string }
- therapy: { "type":"therapy", "label": string }
- social_therapy: { "type":"social_therapy", "label": string }
- patient_data: { "type":"patient_data", "field":"name"|"geburtsdatum"|"age", "label": string }
- institution: { "type":"institution", "field":"clinician.name"|"system.date", "label": string }
- signature: { "type":"signature", "roleLabel": string }
- ai_section: { "type":"ai_section", "label": string, "prompt": string }
Use clinical blocks (diagnosis, medication, laboratory, psychopathology, risk, verlauf_summary) where appropriate — they auto-fill from the patient record. Do NOT invent patient data. Produce 6-14 blocks. Write all human-readable text in the requested language.`

/** Fill required fields with safe defaults so AI output validates against the schema. */
function normalizeBlock(raw: unknown): TemplateBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const type = obj.type
  if (typeof type !== 'string' || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return null
  }
  const id = randomUUID()
  const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
  switch (type) {
    case 'heading':
      return { id, type, text: str(obj.text, 'Überschrift'), level: ([1, 2, 3].includes(obj.level as number) ? obj.level : 2) as 1 | 2 | 3 }
    case 'text':
      return { id, type, text: str(obj.text) }
    case 'input': {
      const inputKind = ['short_text', 'long_text', 'checkbox', 'select', 'date', 'number', 'yes_no', 'multi_select'].includes(obj.inputKind as string)
        ? (obj.inputKind as 'short_text')
        : 'short_text'
      return { id, type, inputKind, label: str(obj.label, 'Feld'), required: obj.required === true }
    }
    case 'diagnosis':
      return { id, type, label: str(obj.label, 'Diagnosen'), showCodes: true, primaryOnly: false }
    case 'medication':
      return { id, type, label: str(obj.label, 'Medikation'), includePrn: true, format: 'list' }
    case 'laboratory':
      return { id, type, label: str(obj.label, 'Labor'), onlyAbnormal: false }
    case 'psychopathology':
      return { id, type, label: str(obj.label, 'Psychopathologischer Befund') }
    case 'risk':
      return { id, type, label: str(obj.label, 'Risikoeinschätzung') }
    case 'verlauf_summary':
      return { id, type, label: str(obj.label, 'Verlauf'), windowPreset: '7d' }
    case 'therapy':
      return { id, type, label: str(obj.label, 'Therapie') }
    case 'social_therapy':
      return { id, type, label: str(obj.label, 'Sozialtherapie') }
    case 'patient_data': {
      const field = ['name', 'vorname', 'nachname', 'geburtsdatum', 'age', 'geschlecht', 'address', 'kostentraeger', 'caseId', 'admissionReason'].includes(obj.field as string)
        ? (obj.field as 'name')
        : 'name'
      return { id, type, field, label: str(obj.label, 'Patient'), inline: true }
    }
    case 'institution': {
      const field = ['clinician.name', 'clinician.title', 'organization.name', 'organization.address', 'system.date', 'system.documentDate'].includes(obj.field as string)
        ? (obj.field as 'clinician.name')
        : 'clinician.name'
      return { id, type, field, label: str(obj.label, 'Behandler'), inline: true }
    }
    case 'signature':
      return { id, type, roleLabel: str(obj.roleLabel, 'Unterschrift'), includeDate: true, includeLocation: true }
    case 'ai_section':
      return { id, type, label: str(obj.label, 'KI-Abschnitt'), prompt: str(obj.prompt, ''), sourceBinding: 'all' }
    default:
      return null
  }
}

function extractBlocks(text: string): TemplateBlock[] {
  let jsonText = text.trim()
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) jsonText = fence[1]!.trim()
  const start = jsonText.indexOf('{')
  const end = jsonText.lastIndexOf('}')
  if (start >= 0 && end > start) jsonText = jsonText.slice(start, end + 1)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return []
  }
  const rawBlocks = (parsed as { blocks?: unknown })?.blocks
  if (!Array.isArray(rawBlocks)) return []
  return rawBlocks
    .map((raw) => normalizeBlock(raw))
    .filter((b): b is TemplateBlock => b !== null)
    .filter((b) => blockSchema.safeParse(b).success)
}

export async function generateTemplateDraft(
  params: GenerateTemplateDraftParams,
): Promise<GenerateTemplateDraftResult> {
  const userPrompt = `Language: ${params.language}\nCategory: ${params.category}\nDescription of the template the clinician wants:\n${params.description.slice(0, 4000)}`

  const result = await runAiFeature({
    featureKey: 'template_ai_generate',
    mode: parseMode(params.mode ?? 'standard'),
    systemPrompt: GENERATE_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 2000,
    jsonResponse: true,
    usageContext: params.usageContext,
    caseRef: params.caseRef ?? null,
  })

  return {
    blocks: extractBlocks(result.text),
    provider: result.provider,
    model: result.model,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    },
  }
}

const TEMPLATE_CATEGORIES = [
  'arztbrief',
  'anamnese',
  'verlauf',
  'psychopathologischer-befund',
  'aufklaerung',
  'legal-forensic',
  'gutachten',
  'konsil',
  'custom',
] as const

type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

/** Max characters of document text sent to the model (token-budget guard). */
const MAX_DOC_CHARS = 16000

const ANALYZE_SYSTEM_PROMPT = `You are an assistant that converts an existing clinical document (German psychiatry) into a reusable clinical document TEMPLATE.
Analyse the document's STRUCTURE — its headings, sections, tables, fixed boilerplate and fill-in fields — and output a template that reproduces that structure with our block types. Do NOT copy patient-specific data (names, dates, findings) into the template; instead map those to the appropriate dynamic block or a fill-in field.

You output ONLY valid minified JSON: {"category": <category>, "blocks":[ ... ]}. No prose, no markdown fences.
"category" is one of: "arztbrief","anamnese","verlauf","psychopathologischer-befund","aufklaerung","legal-forensic","gutachten","konsil","custom". Pick the closest; use "custom" if unsure.
Each block is an object with a "type" field. Allowed types and their fields:
- heading: { "type":"heading", "text": string, "level": 1|2|3 }
- text: { "type":"text", "text": string }  // fixed boilerplate / instructions only
- input: { "type":"input", "inputKind":"short_text"|"long_text"|"checkbox"|"select"|"date", "label": string, "required": boolean }  // blanks to be filled per patient
- diagnosis: { "type":"diagnosis", "label": string }
- medication: { "type":"medication", "label": string }
- laboratory: { "type":"laboratory", "label": string }
- psychopathology: { "type":"psychopathology", "label": string }
- risk: { "type":"risk", "label": string }
- verlauf_summary: { "type":"verlauf_summary", "label": string }
- therapy: { "type":"therapy", "label": string }
- social_therapy: { "type":"social_therapy", "label": string }
- patient_data: { "type":"patient_data", "field":"name"|"geburtsdatum"|"age"|"address"|"caseId"|"admissionReason", "label": string }
- institution: { "type":"institution", "field":"clinician.name"|"clinician.title"|"organization.name"|"organization.address"|"system.date", "label": string }
- signature: { "type":"signature", "roleLabel": string }
- ai_section: { "type":"ai_section", "label": string, "prompt": string }  // narrative section to be AI-generated from the patient record
Mapping rules:
- A diagnosis/ICD list → diagnosis block. A medication/Medikation list → medication block. Lab/Labor values → laboratory. Psychopathological exam → psychopathology. Risk/Suizidalität → risk. Course/Verlauf → verlauf_summary or ai_section. Therapy → therapy / social_therapy.
- Patient identifiers (name, DOB, case no.) and sender/clinic letterhead → patient_data / institution placeholders.
- A blank line / underscore / "________" to be filled → input. Long narrative the clinician writes → input long_text or ai_section.
Produce 6-20 blocks that mirror the document. Write all human-readable text in the requested language.`

/** Parse the analysis response into a validated category + blocks. */
function extractDocTemplate(text: string): { category: TemplateCategory; blocks: TemplateBlock[] } {
  let jsonText = text.trim()
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) jsonText = fence[1]!.trim()
  const start = jsonText.indexOf('{')
  const end = jsonText.lastIndexOf('}')
  if (start >= 0 && end > start) jsonText = jsonText.slice(start, end + 1)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { category: 'custom', blocks: [] }
  }
  const obj = (parsed ?? {}) as { category?: unknown; blocks?: unknown }
  const category = TEMPLATE_CATEGORIES.includes(obj.category as TemplateCategory)
    ? (obj.category as TemplateCategory)
    : 'custom'
  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : []
  const blocks = rawBlocks
    .map((raw) => normalizeBlock(raw))
    .filter((b): b is TemplateBlock => b !== null)
    .filter((b) => blockSchema.safeParse(b).success)
  return { category, blocks }
}

export interface AnalyzeDocumentParams {
  text: string
  filename?: string
  language: 'de' | 'en'
  mode?: AiMode
  usageContext?: AiUsageContext
}

export interface AnalyzeDocumentResult {
  category: TemplateCategory
  blocks: TemplateBlock[]
  /** True when the document text was longer than the model budget and trimmed. */
  truncated: boolean
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

export async function analyzeDocumentToTemplate(
  params: AnalyzeDocumentParams,
): Promise<AnalyzeDocumentResult> {
  const fullText = params.text.trim()
  const truncated = fullText.length > MAX_DOC_CHARS
  const docText = truncated ? fullText.slice(0, MAX_DOC_CHARS) : fullText

  const userPrompt = [
    `Language: ${params.language}`,
    params.filename ? `Source filename: ${params.filename}` : null,
    truncated ? 'NOTE: the document was truncated; design the template from the structure visible here.' : null,
    '--- DOCUMENT START ---',
    docText,
    '--- DOCUMENT END ---',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await runAiFeature({
    featureKey: 'template_from_document',
    mode: parseMode(params.mode ?? 'standard'),
    systemPrompt: ANALYZE_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 3000,
    jsonResponse: true,
    usageContext: params.usageContext,
    caseRef: null,
  })

  const { category, blocks } = extractDocTemplate(result.text)
  return {
    category,
    blocks,
    truncated,
    provider: result.provider,
    model: result.model,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    },
  }
}

export interface FillTemplateSectionParams {
  prompt: string
  contextText: string
  language: 'de' | 'en'
  mode?: AiMode
  usageContext?: AiUsageContext
  caseRef?: string | null
  patientHints?: { patientName?: string; patientDob?: string }
}

export interface FillTemplateSectionResult {
  content: string
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

export async function fillTemplateSection(
  params: FillTemplateSectionParams,
): Promise<FillTemplateSectionResult> {
  const systemPrompt =
    params.language === 'de'
      ? 'Du bist ein klinischer Assistent in der Psychiatrie. Formuliere einen prägnanten, sachlichen Abschnitt für ein klinisches Dokument auf Deutsch. Nutze ausschließlich die bereitgestellten Informationen, erfinde keine Befunde. Antworte nur mit dem Abschnittstext, ohne Überschrift.'
      : 'You are a clinical psychiatry assistant. Write a concise, factual section for a clinical document. Use only the provided information; do not invent findings. Reply with the section text only, no heading.'

  const userPrompt = `${params.prompt.slice(0, 1500)}\n\n---\n${params.contextText.slice(0, 8000)}`

  const result = await runAiFeature({
    featureKey: 'template_block_fill',
    mode: parseMode(params.mode ?? 'standard'),
    systemPrompt,
    userPrompt,
    maxTokens: 1400,
    usageContext: params.usageContext,
    caseRef: params.caseRef ?? null,
    sanitizeOpts: params.patientHints
      ? {
          patientHints: {
            patientName: params.patientHints.patientName,
            patientDob: params.patientHints.patientDob,
          },
        }
      : undefined,
  })

  return {
    content: result.text.trim(),
    provider: result.provider,
    model: result.model,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    },
  }
}
