import { z } from 'zod'

const MappingHintDraftSchema = z.object({
  kind: z.enum(['isdm_domain', 'checklist', 'medication', 'lab', 'course', 'diagnosis']),
  ref: z.string().min(1),
  deepLinkPageId: z.string().optional(),
})

const CriterionSourceDraftSchema = z.object({
  classification: z.enum(['icd10', 'icd11']),
  code: z.string().min(1),
  ref: z.string().optional(),
})

export const CriterionDraftSchema = z.object({
  id: z.string().min(1),
  text_de: z.string().min(20),
  mappingHints: z.array(MappingHintDraftSchema).min(1),
  allowClinicianAttest: z.boolean(),
  sourceRef: z.string().optional(),
  citation: z.array(CriterionSourceDraftSchema).optional(),
})

export const CriterionGroupDraftSchema = z.object({
  id: z.string().min(1),
  label_de: z.string().min(3),
  logic: z.enum(['all_of', 'any_of', 'at_least_n_of', 'none_of']),
  threshold: z.number().int().positive().optional(),
  timeWindow: z
    .object({
      minDurationDays: z.number().positive().optional(),
      withinDays: z.number().positive().optional(),
    })
    .optional(),
  groupType: z.enum(['inclusion', 'exclusion', 'severity']),
  criteria: z.array(CriterionDraftSchema).min(1),
})

export const Icd11CriteriaSetDraftSchema = z.object({
  groups: z.array(CriterionGroupDraftSchema).min(1),
  sourceRef: z.string().optional(),
})

export const DisorderDraftSchema = z.object({
  id: z.string().min(1),
  classification: z.enum(['icd10', 'icd11']),
  code: z.string().min(1),
  name_de: z.string().min(3),
  crosswalkKey: z.string().min(1),
  sourceRef: z.string().min(10),
  version: z.literal(1),
  status: z.literal('draft'),
  codingSystems: z.object({
    icd10: z.object({ code: z.string().min(1), label_de: z.string().min(1) }).optional(),
    icd11: z.object({ code: z.string().min(1), label_de: z.string().min(1) }).optional(),
    dsm5tr: z.object({ code: z.string().min(1), label_de: z.string().min(1) }).optional(),
  }),
  differentials_de: z.array(z.string().min(5)).min(2),
  groups: z.array(CriterionGroupDraftSchema).min(1),
  icd11: Icd11CriteriaSetDraftSchema.optional(),
})

export type DisorderDraft = z.infer<typeof DisorderDraftSchema>
export type CriterionGroupDraft = z.infer<typeof CriterionGroupDraftSchema>
export type CriterionDraft = z.infer<typeof CriterionDraftSchema>
