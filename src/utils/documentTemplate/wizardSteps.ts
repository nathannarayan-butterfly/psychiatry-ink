import type { DocumentTemplate, TemplateField } from '../../types/documentTemplate'
import { evaluateCondition } from './evaluateCondition'
import { isWizardFillableField } from './fieldTypeNormalize'

export interface WizardStep {
  id: string
  title: string
  description?: string
  fieldIds: string[]
  /** True when any field in this step is required. */
  hasRequired: boolean
}

function sortedFields(template: DocumentTemplate): TemplateField[] {
  return [...template.fields].sort((a, b) => a.order - b.order)
}

/** Fields visible in the wizard given current answers (respects showWhen). */
export function getVisibleWizardFields(
  template: DocumentTemplate,
  fieldValues: Record<string, string | boolean | string[]>,
): TemplateField[] {
  const childIds = new Set<string>()
  for (const field of template.fields) {
    if (field.type === 'conditional_section' && field.childFieldIds) {
      for (const id of field.childFieldIds) childIds.add(id)
    }
  }

  return sortedFields(template).filter((field) => {
    if (!isWizardFillableField(field)) return false
    if (childIds.has(field.id)) {
      const parent = template.fields.find(
        (f) => f.type === 'conditional_section' && f.childFieldIds?.includes(field.id),
      )
      if (parent?.showWhen && !evaluateCondition(parent.showWhen, fieldValues)) return false
    }
    if (field.showWhen && !evaluateCondition(field.showWhen, fieldValues)) return false
    return true
  })
}

export function buildWizardSteps(
  template: DocumentTemplate,
  fieldValues: Record<string, string | boolean | string[]>,
): WizardStep[] {
  const visible = getVisibleWizardFields(template, fieldValues)
  if (visible.length === 0) return []

  const sections = [...(template.sections ?? [])].sort((a, b) => a.order - b.order)
  if (sections.length > 0) {
    const steps: WizardStep[] = []
    const assigned = new Set<string>()

    for (const section of sections) {
      const fieldIds = section.fieldIds.filter((id) => visible.some((f) => f.id === id))
      if (fieldIds.length === 0) continue
      fieldIds.forEach((id) => assigned.add(id))
      steps.push({
        id: section.id,
        title: section.title,
        description: section.description,
        fieldIds,
        hasRequired: fieldIds.some((id) => {
          const f = template.fields.find((x) => x.id === id)
          return f?.required === true
        }),
      })
    }

    const unassigned = visible.filter((f) => !assigned.has(f.id))
    for (const field of unassigned) {
      steps.push({
        id: field.id,
        title: field.label ?? field.id,
        fieldIds: [field.id],
        hasRequired: field.required === true,
      })
    }

    return steps
  }

  return visible.map((field) => ({
    id: field.id,
    title: field.label ?? field.id,
    description: field.helperText,
    fieldIds: [field.id],
    hasRequired: field.required === true,
  }))
}

export function validateWizardStep(
  template: DocumentTemplate,
  step: WizardStep,
  fieldValues: Record<string, string | boolean | string[]>,
): string[] {
  const errors: string[] = []
  for (const fieldId of step.fieldIds) {
    const field = template.fields.find((f) => f.id === fieldId)
    if (!field?.required) continue
    const value = fieldValues[fieldId]
    if (field.type === 'checkbox' || field.type === 'legal_checkbox') {
      if (value !== true) errors.push(fieldId)
    } else if (field.type === 'multi_select' || field.type === 'checkbox_group') {
      if (!Array.isArray(value) || value.length === 0) errors.push(fieldId)
    } else if (typeof value !== 'string' || !value.trim()) {
      errors.push(fieldId)
    }
  }
  return errors
}

export function answersToFieldValues(
  answers: Array<{ fieldId: string; value: string | boolean | string[] }>,
): Record<string, string | boolean | string[]> {
  const values: Record<string, string | boolean | string[]> = {}
  for (const a of answers) values[a.fieldId] = a.value
  return values
}

export function fieldValuesToAnswers(
  template: DocumentTemplate,
  fieldValues: Record<string, string | boolean | string[]>,
  source: 'prefill' | 'manual' | 'default' = 'manual',
) {
  const now = new Date().toISOString()
  return getVisibleWizardFields(template, fieldValues)
    .map((field) => ({
      fieldId: field.id,
      value: fieldValues[field.id] ?? '',
      answeredAt: now,
      source,
    }))
    .filter((a) => {
      const v = a.value
      if (typeof v === 'boolean') return true
      if (Array.isArray(v)) return v.length > 0
      return String(v).trim().length > 0
    })
}
