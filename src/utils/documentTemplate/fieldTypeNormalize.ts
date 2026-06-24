import type { TemplateField, TemplateFieldType } from '../../types/documentTemplate'

/** Layout / static blocks — not shown in the completion wizard. */
export const WIZARD_SKIP_FIELD_TYPES: ReadonlySet<TemplateFieldType> = new Set([
  'static_text',
  'heading',
  'divider',
  'spacer',
  'conditional_section',
])

/** Normalize canonical field types to their rendering equivalents. */
export function normalizeFieldType(type: TemplateFieldType): TemplateFieldType {
  if (type === 'text') return 'short_text'
  if (type === 'textarea') return 'long_text'
  return type
}

export function isWizardFillableField(field: TemplateField): boolean {
  return !WIZARD_SKIP_FIELD_TYPES.has(field.type)
}

export function isDeferredWizardFieldType(type: TemplateFieldType): boolean {
  return (
    type === 'medication_selector' ||
    type === 'diagnosis_selector' ||
    type === 'risk_selector' ||
    type === 'repeatable_list'
  )
}

export function isPlaceholderFieldType(type: TemplateFieldType): boolean {
  return (
    type === 'patient_placeholder' ||
    type === 'case_placeholder' ||
    type === 'clinician_placeholder' ||
    type === 'organization_placeholder'
  )
}
