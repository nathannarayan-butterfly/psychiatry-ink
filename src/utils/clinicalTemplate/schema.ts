import { z } from 'zod'
import {
  CLINICAL_TEMPLATE_SCHEMA_VERSION,
  type ClinicalTemplate,
  type TemplateBlock,
} from '../../types/clinicalTemplate'

const optionSchema = z.object({ id: z.string(), label: z.string() })

/**
 * Layout fields shared by every block (schema v3). Spread into each member of
 * the discriminated union. All optional so v2 payloads (without layout) still
 * validate — defaults are applied at render time.
 */
const layoutShape = {
  height: z.number().positive().max(4000).optional(),
  width: z.enum(['full', 'half']).optional(),
  align: z.enum(['left', 'right']).optional(),
}

const bindingEnum = z.enum([
  'patient.demographics',
  'case.admissionReason',
  'diagnoses.current',
  'medication.current',
  'labs.latest',
  'verlauf.selectedRange',
  'psychopathology.latest',
  'risk.current',
  'therapy.current',
  'socialTherapy.current',
])

const headingSchema = z.object({
  id: z.string(),
  type: z.literal('heading'),
  text: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ...layoutShape,
})

const textSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  text: z.string(),
  html: z.string().optional(),
  ...layoutShape,
})

const inputSchema = z.object({
  id: z.string(),
  type: z.literal('input'),
  inputKind: z.enum(['short_text', 'long_text', 'checkbox', 'select', 'multi_select', 'yes_no', 'date', 'number']),
  label: z.string(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean(),
  options: z.array(optionSchema).optional(),
  defaultValue: z.string().optional(),
  ...layoutShape,
})

const tableSchema = z.object({
  id: z.string(),
  type: z.literal('table'),
  caption: z.string().optional(),
  columns: z.array(z.object({ id: z.string(), label: z.string() })),
  rows: z.array(z.object({ id: z.string(), cells: z.record(z.string(), z.string()) })),
  ...layoutShape,
})

const diagnosisSchema = z.object({
  id: z.string(),
  type: z.literal('diagnosis'),
  label: z.string().optional(),
  showCodes: z.boolean(),
  primaryOnly: z.boolean(),
  ...layoutShape,
})

const medicationSchema = z.object({
  id: z.string(),
  type: z.literal('medication'),
  label: z.string().optional(),
  includePrn: z.boolean(),
  format: z.enum(['list', 'table']),
  ...layoutShape,
})

const laboratorySchema = z.object({
  id: z.string(),
  type: z.literal('laboratory'),
  label: z.string().optional(),
  onlyAbnormal: z.boolean(),
  ...layoutShape,
})

const psychopathologySchema = z.object({
  id: z.string(),
  type: z.literal('psychopathology'),
  label: z.string().optional(),
  ...layoutShape,
})

const riskSchema = z.object({
  id: z.string(),
  type: z.literal('risk'),
  label: z.string().optional(),
  ...layoutShape,
})

const verlaufSchema = z.object({
  id: z.string(),
  type: z.literal('verlauf_summary'),
  label: z.string().optional(),
  windowPreset: z.enum(['7d', '14d', 'admission', 'all']),
  ...layoutShape,
})

const therapySchema = z.object({
  id: z.string(),
  type: z.literal('therapy'),
  label: z.string().optional(),
  ...layoutShape,
})

const socialTherapySchema = z.object({
  id: z.string(),
  type: z.literal('social_therapy'),
  label: z.string().optional(),
  ...layoutShape,
})

const patientDataSchema = z.object({
  id: z.string(),
  type: z.literal('patient_data'),
  field: z.enum([
    'name',
    'vorname',
    'nachname',
    'geburtsdatum',
    'age',
    'geschlecht',
    'address',
    'kostentraeger',
    'caseId',
    'admissionReason',
  ]),
  label: z.string().optional(),
  inline: z.boolean(),
  ...layoutShape,
})

const institutionSchema = z.object({
  id: z.string(),
  type: z.literal('institution'),
  field: z.enum([
    'clinician.name',
    'clinician.title',
    'organization.name',
    'organization.address',
    'system.date',
    'system.documentDate',
  ]),
  label: z.string().optional(),
  inline: z.boolean(),
  ...layoutShape,
})

const signatureSchema = z.object({
  id: z.string(),
  type: z.literal('signature'),
  roleLabel: z.string(),
  includeDate: z.boolean(),
  includeLocation: z.boolean(),
  ...layoutShape,
})

const aiSectionSchema = z.object({
  id: z.string(),
  type: z.literal('ai_section'),
  label: z.string(),
  prompt: z.string(),
  sourceBinding: z.union([bindingEnum, z.literal('all')]),
  ...layoutShape,
})

const conditionalSchema = z.object({
  id: z.string(),
  type: z.literal('conditional'),
  label: z.string().optional(),
  condition: z.object({
    source: z.union([bindingEnum, z.literal('manual')]),
    operator: z.enum(['exists', 'not_exists', 'equals', 'contains']),
    value: z.string().optional(),
  }),
  children: z.array(z.lazy(() => blockSchema)),
  ...layoutShape,
})

export const blockSchema: z.ZodType<TemplateBlock> = z.discriminatedUnion('type', [
  headingSchema,
  textSchema,
  inputSchema,
  tableSchema,
  diagnosisSchema,
  medicationSchema,
  laboratorySchema,
  psychopathologySchema,
  riskSchema,
  verlaufSchema,
  therapySchema,
  socialTherapySchema,
  patientDataSchema,
  institutionSchema,
  signatureSchema,
  aiSectionSchema,
  conditionalSchema,
]) as unknown as z.ZodType<TemplateBlock>

const documentBandSchema = z.object({
  html: z.string(),
  divider: z.boolean().optional(),
  imageUrl: z.string().optional(),
  imageHeight: z.number().positive().max(600).optional(),
  imageAlign: z.enum(['left', 'center', 'right']).optional(),
  height: z.number().positive().max(2000).optional(),
})

const pageSettingsSchema = z.object({
  display: z.enum(['all-pages', 'first-page-only']),
  differentFirstPage: z.boolean(),
})

const versionSnapshotSchema = z.object({
  version: z.number(),
  blocks: z.array(blockSchema),
  savedAt: z.string(),
})

export const clinicalTemplateSchema = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.enum([
    'arztbrief',
    'anamnese',
    'verlauf',
    'psychopathologischer-befund',
    'aufklaerung',
    'legal-forensic',
    'gutachten',
    'konsil',
    'custom',
  ]),
  language: z.enum(['de', 'en']),
  status: z.enum(['draft', 'active', 'archived']),
  scope: z.enum(['personal', 'organization']),
  version: z.number(),
  blocks: z.array(blockSchema),
  header: documentBandSchema.optional(),
  footer: documentBandSchema.optional(),
  headerFirst: documentBandSchema.optional(),
  footerFirst: documentBandSchema.optional(),
  pageSettings: pageSettingsSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  history: z.array(versionSnapshotSchema).optional(),
})

/** Parse + validate an unknown value into a ClinicalTemplate. Returns null when invalid. */
export function parseClinicalTemplate(value: unknown): ClinicalTemplate | null {
  const result = clinicalTemplateSchema.safeParse(migrateRaw(value))
  if (!result.success) return null
  return result.data as ClinicalTemplate
}

/** Validate a single block (used by tests + import). */
export function parseBlock(value: unknown): TemplateBlock | null {
  const result = blockSchema.safeParse(value)
  return result.success ? (result.data as TemplateBlock) : null
}

/**
 * Forward-migrate older raw payloads to the current schema version. Currently a
 * structural pass that fills the schemaVersion/scope/history defaults so legacy
 * exports keep loading. Extend here when the schema version increments.
 */
function migrateRaw(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const obj = { ...(value as Record<string, unknown>) }
  if (typeof obj.schemaVersion !== 'number') obj.schemaVersion = CLINICAL_TEMPLATE_SCHEMA_VERSION
  if (typeof obj.scope !== 'string') obj.scope = 'personal'
  if (!Array.isArray(obj.blocks)) obj.blocks = []
  return obj
}

export function serializeTemplate(template: ClinicalTemplate): string {
  return JSON.stringify(template, null, 2)
}
