import { isStyleOnlyTool } from './aiPromptCore'
import type { AiToolKey } from './aiTools'
import type { AiCallSchemaDefinition, AiClinicalRole } from '../types/aiGeneration'
import type { AiGenerationScope, AiModelTier } from '../types'

const W: AiClinicalRole = 'writer'
const P: AiClinicalRole = 'psychiatrist'

function seg(
  componentId: string,
  sectionId: string,
  sectionFocus: string,
  options?: {
    variantId?: string
    preferredTool?: AiToolKey
    tierDefault?: AiModelTier
    aiRole?: AiClinicalRole
    constraints?: string[]
  },
): AiCallSchemaDefinition {
  return {
    id: `${componentId}:${options?.variantId ?? '_'}:${sectionId}:segment`,
    componentId,
    variantId: options?.variantId,
    sectionId,
    scope: 'segment',
    preferredTool: options?.preferredTool ?? 'structure',
    tierDefault: options?.tierDefault ?? 'standard',
    chunkStrategy: 'by-token',
    maxTokensPerChunk: 3000,
    sectionFocus,
    aiRole: options?.aiRole ?? W,
    constraints: options?.constraints,
  }
}

function doc(
  componentId: string,
  sectionFocus: string,
  options?: {
    variantId?: string
    preferredTool?: AiToolKey
    tierDefault?: AiModelTier
    aiRole?: AiClinicalRole
    constraints?: string[]
  },
): AiCallSchemaDefinition {
  return {
    id: `${componentId}:${options?.variantId ?? '_'}:_:document`,
    componentId,
    variantId: options?.variantId,
    scope: 'document',
    preferredTool: options?.preferredTool ?? 'summarize',
    tierDefault: options?.tierDefault ?? 'standard',
    chunkStrategy: 'by-section',
    maxTokensPerChunk: 3500,
    sectionFocus,
    aiRole: options?.aiRole ?? W,
    constraints: options?.constraints,
  }
}

/** Aufnahme — 18 segments + document (structure + summarize) */
const aufnahmeSegments: AiCallSchemaDefinition[] = [
  seg('aufnahme', 'aufnahmeanlass', 'admission indication, referral, acute risk'),
  seg('aufnahme', 'aktuelle-beschwerden', 'chief complaints, onset, burden'),
  seg('aufnahme', 'aktuelle-krankheitsanamnese', 'illness history, triggers, course'),
  seg('aufnahme', 'psychiatrische-vorgeschichte', 'psychiatric history, admissions, treatment'),
  seg('aufnahme', 'somatische-anamnese', 'somatic history, allergies, current issues'),
  seg('aufnahme', 'suchtanamnese', 'substances, pattern, withdrawal, treatment'),
  seg('aufnahme', 'medikamentenanamnese', 'meds, dose, compliance, side effects'),
  seg('aufnahme', 'familienanamnese', 'family psychiatric/somatic load'),
  seg('aufnahme', 'biografische-anamnese', 'development, education, life events'),
  seg('aufnahme', 'sozialanamnese', 'living, relationships, support, legal/financial'),
  seg('aufnahme', 'schul-und-berufsanamnese', 'education, occupation'),
  seg('aufnahme', 'forensische-anamnese', 'forensic history, violence, custody'),
  seg('aufnahme', 'traumaanamnese', 'trauma, PTSD symptoms, safety'),
  seg('aufnahme', 'suizid-und-selbstgefaehrdungsanamnese', 'suicide ideation, plan, intent, protective factors', {
    aiRole: P,
    tierDefault: 'thorough',
  }),
  seg('aufnahme', 'fremdgefaehrdungsanamnese', 'violence risk, threats, weapons', {
    aiRole: P,
    tierDefault: 'thorough',
  }),
  seg('aufnahme', 'psychopathologischer-befund', 'mental state exam notes — polish wording only, never interpret', {
    preferredTool: 'improve',
    constraints: ['Improve wording only', 'No interpretation', 'No new findings'],
  }),
  seg('aufnahme', 'somatischer-befund', 'vitals, somatic findings, consults'),
  seg('aufnahme', 'neurologischer-befund', 'neurological exam, focal deficits, extrapyramidal signs'),
  seg('aufnahme', 'diagnostische-einschaetzung', 'syndrome, diagnoses, differential, risk', {
    aiRole: P,
    tierDefault: 'thorough',
  }),
  seg('aufnahme', 'therapieplanung-behandlungsplan', 'goals, treatment, discharge criteria', {
    aiRole: P,
    tierDefault: 'thorough',
  }),
]

const aufnahmeDocumentStructure = doc(
  'aufnahme',
  'full admission anamnesis — all standard sections',
  {
    preferredTool: 'structure',
    constraints: ['Keep all facts', 'Use section headings'],
  },
)

const aufnahmeDocumentSummarize = doc(
  'aufnahme',
  'full admission record',
  {
    preferredTool: 'summarize',
    constraints: ['Keep headings', 'Preserve risk and plan'],
  },
)

/** Verlauf */
const verlaufShort: AiCallSchemaDefinition = {
  id: 'verlauf:short:_:segment',
  componentId: 'verlauf',
  variantId: 'short',
  scope: 'segment',
  preferredTool: 'structure',
  tierDefault: 'fast',
  chunkStrategy: 'by-token',
  maxTokensPerChunk: 2000,
  sectionFocus: 'visit note: reason, MSE, course, plan',
  aiRole: W,
  constraints: ['Brief'],
}

const verlaufBroadSegments: AiCallSchemaDefinition[] = [
  seg('verlauf', 'psychopathologie', 'progress MSE', { variantId: 'broad' }),
  seg('verlauf', 'stationsverhalten', 'ward behaviour, cooperation', { variantId: 'broad' }),
  seg('verlauf', 'risiko', 'suicide, aggression, third-party risk', {
    variantId: 'broad',
    aiRole: P,
    tierDefault: 'thorough',
  }),
  seg('verlauf', 'compliance-krankheitseinsicht', 'compliance, insight', { variantId: 'broad' }),
  seg('verlauf', 'medikation-vertraeglichkeit', 'medication, tolerability', { variantId: 'broad' }),
  seg('verlauf', 'besondere-ereignisse', 'incidents, dated', { variantId: 'broad' }),
  seg('verlauf', 'somatik', 'somatic course', { variantId: 'broad' }),
  seg('verlauf', 'beurteilung-plan', 'assessment, plan', { variantId: 'broad' }),
]

const verlaufBroadDocumentStructure = doc(
  'verlauf',
  'full ward progress note',
  {
    variantId: 'broad',
    preferredTool: 'structure',
    constraints: ['Keep chronology'],
  },
)

const verlaufBroadDocumentSummarize = doc(
  'verlauf',
  'full ward progress note',
  { variantId: 'broad', preferredTool: 'summarize' },
)

/** Psychopathologie */
const psychopathFree: AiCallSchemaDefinition = {
  id: 'psychopath:free:_:segment',
  componentId: 'psychopath',
  variantId: 'free',
  scope: 'segment',
  preferredTool: 'improve',
  tierDefault: 'standard',
  chunkStrategy: 'by-token',
  maxTokensPerChunk: 3000,
  sectionFocus: 'mental state exam notes — polish wording only, never interpret',
  aiRole: W,
  constraints: ['Improve wording only', 'No interpretation', 'No new findings'],
}

const psychopathChecklistSegments: AiCallSchemaDefinition[] = [
  'bewusstsein',
  'aufmerksamkeit-gedaechtnis',
  'formales-denken',
  'inhaltliches-denken',
  'wahrnehmung',
  'ich-stoerungen',
  'affektivitaet',
  'antrieb-psychomotorik',
  'suizidalitaet',
  'vegetative-funktionen',
  'sozialverhalten',
].map((sectionId) =>
  seg('psychopath', sectionId, 'checklist selections → prose', {
    variantId: 'checklist',
    preferredTool: 'proofread',
    tierDefault: 'fast',
    aiRole: sectionId === 'suizidalitaet' ? P : W,
    constraints: ['Selected items only', 'No new symptoms'],
  }),
)

/** Therapie und Verlauf */
const therapieVerlauf: AiCallSchemaDefinition = {
  id: 'therapie-verlauf:_:_:segment',
  componentId: 'therapie-verlauf',
  scope: 'segment',
  preferredTool: 'structure',
  tierDefault: 'standard',
  chunkStrategy: 'by-token',
  maxTokensPerChunk: 4000,
  sectionFocus:
    'therapy course: admission, baseline, ward course, diagnosis, meds, therapy, events, stabilization, discharge, recommendations',
  aiRole: W,
  constraints: ['Chronological', 'Med changes with rationale'],
}

export const AI_CALL_SCHEMAS: AiCallSchemaDefinition[] = [
  ...aufnahmeSegments,
  aufnahmeDocumentStructure,
  aufnahmeDocumentSummarize,
  verlaufShort,
  ...verlaufBroadSegments,
  verlaufBroadDocumentStructure,
  verlaufBroadDocumentSummarize,
  psychopathFree,
  ...psychopathChecklistSegments,
  therapieVerlauf,
]

function lookupKey(
  componentId: string,
  variantId: string | undefined,
  sectionId: string | undefined,
  scope: AiGenerationScope,
): string {
  return `${componentId}:${variantId ?? '_'}:${sectionId ?? '_'}:${scope}`
}

const schemaByContext = new Map(
  AI_CALL_SCHEMAS.map((schema) => [
    lookupKey(schema.componentId, schema.variantId, schema.sectionId, schema.scope),
    schema,
  ]),
)

const FALLBACK_FOCUS = 'clinical documentation'

export function resolveAiCallSchema(options: {
  componentId: string
  variantId?: string
  sectionId?: string
  scope: AiGenerationScope
  tool: AiToolKey
}): AiCallSchemaDefinition {
  const exact = schemaByContext.get(
    lookupKey(options.componentId, options.variantId, options.sectionId, options.scope),
  )
  if (exact) return { ...exact, preferredTool: options.tool }

  const sectionFallback = AI_CALL_SCHEMAS.find(
    (s) =>
      s.componentId === options.componentId &&
      s.variantId === options.variantId &&
      s.sectionId === options.sectionId &&
      s.scope === options.scope,
  )
  if (sectionFallback) return { ...sectionFallback, preferredTool: options.tool }

  const variantDocFallback = AI_CALL_SCHEMAS.find(
    (s) =>
      s.componentId === options.componentId &&
      s.variantId === options.variantId &&
      s.scope === options.scope &&
      !s.sectionId,
  )
  if (variantDocFallback) return { ...variantDocFallback, preferredTool: options.tool }

  const componentDocFallback = AI_CALL_SCHEMAS.find(
    (s) =>
      s.componentId === options.componentId &&
      s.scope === options.scope &&
      !s.variantId &&
      !s.sectionId,
  )
  if (componentDocFallback) return { ...componentDocFallback, preferredTool: options.tool }

  // Style-only tools must not inherit another section's structural schema.
  if (!isStyleOnlyTool(options.tool)) {
    const segmentFallback = AI_CALL_SCHEMAS.find(
      (s) =>
        s.componentId === options.componentId &&
        s.scope === 'segment' &&
        (s.variantId === options.variantId || (!s.variantId && !options.variantId)),
    )
    if (segmentFallback) return { ...segmentFallback, preferredTool: options.tool }
  }

  return {
    id: `fallback:${options.componentId}:${options.scope}`,
    componentId: options.componentId,
    variantId: options.variantId,
    sectionId: options.sectionId,
    scope: options.scope,
    preferredTool: options.tool,
    tierDefault: 'standard',
    chunkStrategy: options.scope === 'document' ? 'by-section' : 'by-token',
    maxTokensPerChunk: 3000,
    sectionFocus: FALLBACK_FOCUS,
    aiRole: W,
  }
}
