import type {
  GuidedEntryField,
  GuidedEntryFieldValues,
  GuidedEntrySchema,
  GuidedEntryStep,
} from '../../types/guidedEntry'
import { evaluateCondition } from '../documentTemplate/evaluateCondition'

export interface ResolvedGuidedStep extends GuidedEntryStep {
  fields: GuidedEntryField[]
  hasRequired: boolean
}

function fieldById(schema: GuidedEntrySchema): Map<string, GuidedEntryField> {
  return new Map(schema.fields.map((f) => [f.id, f]))
}

export function getVisibleGuidedFields(
  schema: GuidedEntrySchema,
  values: GuidedEntryFieldValues,
): GuidedEntryField[] {
  return schema.fields.filter((field) => {
    if (field.showWhen && !evaluateCondition(field.showWhen, values)) return false
    return true
  })
}

export function buildGuidedSteps(
  schema: GuidedEntrySchema,
  values: GuidedEntryFieldValues,
): ResolvedGuidedStep[] {
  const byId = fieldById(schema)
  const steps: ResolvedGuidedStep[] = []

  for (const step of schema.steps) {
    if (step.showWhen && !evaluateCondition(step.showWhen, values)) continue

    const fields = step.fieldIds
      .map((id) => byId.get(id))
      .filter((f): f is GuidedEntryField => {
        if (!f) return false
        if (f.showWhen && !evaluateCondition(f.showWhen, values)) return false
        return true
      })

    if (fields.length === 0) continue

    steps.push({
      ...step,
      fields,
      hasRequired: fields.some((f) => f.required === true),
    })
  }

  return steps
}

export function validateGuidedStep(
  step: ResolvedGuidedStep,
  values: GuidedEntryFieldValues,
): string[] {
  const errors: string[] = []
  for (const field of step.fields) {
    if (!field.required) continue
    const value = values[field.id]
    if (field.type === 'yes_no') {
      if (typeof value !== 'boolean') errors.push(field.id)
    } else if (field.type === 'checkbox_group') {
      if (!Array.isArray(value) || value.length === 0) errors.push(field.id)
    } else if (typeof value !== 'string' || !value.trim()) {
      errors.push(field.id)
    }
  }
  return errors
}

export function answersToFieldValues(
  answers: Array<{ fieldId: string; value: string | boolean | string[] }>,
): GuidedEntryFieldValues {
  const values: GuidedEntryFieldValues = {}
  for (const a of answers) values[a.fieldId] = a.value
  return values
}

export function fieldValuesToAnswers(
  schema: GuidedEntrySchema,
  values: GuidedEntryFieldValues,
  sources: Record<string, 'prefill' | 'manual' | 'default'> = {},
): Array<{ fieldId: string; value: string | boolean | string[]; answeredAt: string; source: 'prefill' | 'manual' | 'default' }> {
  const now = new Date().toISOString()
  return getVisibleGuidedFields(schema, values)
    .map((field) => ({
      fieldId: field.id,
      value: values[field.id] ?? (field.type === 'checkbox_group' ? [] : ''),
      answeredAt: now,
      source: sources[field.id] ?? 'manual',
    }))
    .filter((a) => {
      const v = a.value
      if (typeof v === 'boolean') return true
      if (Array.isArray(v)) return v.length > 0
      return String(v).trim().length > 0
    })
}

export function isStepOptional(step: ResolvedGuidedStep): boolean {
  return !step.hasRequired
}
