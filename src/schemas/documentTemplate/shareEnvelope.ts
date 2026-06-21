/**
 * Document Template share envelope — `.psychiatry-ink` Vorlage bundle schema.
 *
 * Exported files are signed binary blobs (base64url) wrapped in a magic header line.
 * Only Psychiatry.Ink validates the HMAC and parses the inner payload.
 */
import { z } from 'zod'

export const TEMPLATE_SHARE_FORMAT_VERSION = 1 as const
export const TEMPLATE_SHARE_MAGIC_LINE = 'PSYINK-VORLAGE-v1'
export const TEMPLATE_SHARE_FILE_EXTENSION = '.psychiatry-ink'

const TEMPLATE_CATEGORIES = [
  'gericht-legal',
  'zwangsmaßnahmen',
  'gutachten',
  'arztbrief',
  'atteste-bescheinigungen',
  'konsile',
  'klinikintern',
  'freie-vorlagen',
] as const

const TEMPLATE_FIELD_TYPES = [
  'static_text',
  'short_text',
  'long_text',
  'checkbox',
  'checkbox_group',
  'multi_select',
  'radio_group',
  'yes_no',
  'select',
  'date',
  'time',
  'number',
  'number_with_unit',
  'email',
  'phone',
  'patient_placeholder',
  'case_placeholder',
  'clinician_placeholder',
  'organization_placeholder',
  'dynamic',
  'signature',
  'ai_assisted_text',
  'heading',
  'divider',
  'spacer',
  'initials',
  'name_line',
] as const

export const TemplateShareCreatorSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
})

export const SharedTemplateFieldOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
})

export const SharedTemplateFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(TEMPLATE_FIELD_TYPES),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
  required: z.boolean().optional(),
  options: z.array(SharedTemplateFieldOptionSchema).optional(),
  binding: z.string().optional(),
  dynamicKey: z.string().optional(),
  helperText: z.string().optional(),
  unit: z.string().optional(),
  order: z.number().int().nonnegative(),
  layout: z
    .object({
      colSpan: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]).optional(),
      minHeightMm: z.number().optional(),
    })
    .optional(),
})

export const SharedTemplateBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(TEMPLATE_CATEGORIES),
  language: z.enum(['de', 'en']),
  version: z.number().int().positive(),
  status: z.enum(['draft', 'active', 'archived']),
  availability: z.object({
    emptyWorkspace: z.boolean(),
    patientWorkspace: z.boolean(),
    patientDocuments: z.boolean(),
  }),
  fields: z.array(SharedTemplateFieldSchema),
  pageSettings: z
    .object({
      format: z.literal('a4'),
      margins: z
        .object({
          top: z.number(),
          right: z.number(),
          bottom: z.number(),
          left: z.number(),
        })
        .optional(),
      header: z
        .object({
          content: z.string().optional(),
          heightMm: z.number().optional(),
        })
        .optional(),
      footer: z
        .object({
          content: z.string().optional(),
          heightMm: z.number().optional(),
        })
        .optional(),
      headerFooterFirstPageOnly: z.boolean().optional(),
    })
    .optional(),
})

export const TemplateSharePayloadSchema = z.object({
  kind: z.literal('document-template'),
  formatVersion: z.literal(TEMPLATE_SHARE_FORMAT_VERSION),
  exportedAt: z.string().min(1),
  creator: TemplateShareCreatorSchema.optional(),
  template: SharedTemplateBodySchema,
})

export type TemplateShareCreator = z.infer<typeof TemplateShareCreatorSchema>
export type SharedTemplateBody = z.infer<typeof SharedTemplateBodySchema>
export type TemplateSharePayload = z.infer<typeof TemplateSharePayloadSchema>
