/**
 * Bridge for Template Completion Wizard to reuse GuidedEntryWizard + step engine.
 *
 * Template Completion (formal Vorlagen) uses DocumentTemplate + wizardSteps.ts;
 * Guided Workspace Entry uses GuidedEntrySchema. Both share:
 * - GuidedEntryWizard UI shell (via adaptDocumentTemplateForGuidedWizard)
 * - evaluateCondition for conditional steps
 * - Encrypted draft vault pattern (templateInstancesVault vs guidedEntryVault)
 *
 * When Template Completion UI is wired, call:
 *   const { schema, initialValues } = adaptDocumentTemplateForGuidedWizard(template, caseId, lang)
 *   <GuidedEntryWizard schema={schema} ... onGenerate={...} />
 * and persist via saveTemplateInstance + renderTemplate on completion.
 */
import type { DocumentTemplate } from '../../types/documentTemplate'
import type { UiLanguage } from '../../types/settings'
import type { GuidedEntrySchema, GuidedEntryFieldValues } from '../../types/guidedEntry'
import { buildWizardSteps, getVisibleWizardFields } from '../documentTemplate/wizardSteps'
import { translateUi } from '../../data/uiTranslations'

export function adaptDocumentTemplateForGuidedWizard(
  template: DocumentTemplate,
  initialValues: GuidedEntryFieldValues = {},
): { schema: GuidedEntrySchema; stepsBuilt: boolean } {
  const steps = buildWizardSteps(template, initialValues)
  const visibleFields = getVisibleWizardFields(template, initialValues)

  const schema: GuidedEntrySchema = {
    itemType: 'verlauf-short', // placeholder — Template Completion passes its own completion handler
    titleKey: 'templateCompletionWizardTitle',
    descriptionKey: 'templateCompletionWizardDesc',
    fields: visibleFields.map((f) => ({
      id: f.id,
      type: mapTemplateFieldType(f.type),
      labelKey: `__template_field_${f.id}`, // caller should localize via template field labels
      required: f.required,
      showWhen: f.showWhen,
      options: f.options?.map((o) => ({ id: o.id, labelKey: `__template_opt_${f.id}_${o.id}` })),
    })),
    steps: steps.map((s) => ({
      id: s.id,
      titleKey: `__template_step_${s.id}`,
      fieldIds: s.fieldIds,
    })),
    generation: [],
    output: { kind: 'workspace-document', documentTypeId: 'template' },
  }

  return { schema, stepsBuilt: steps.length > 0 }
}

function mapTemplateFieldType(
  type: DocumentTemplate['fields'][number]['type'],
): GuidedEntrySchema['fields'][number]['type'] {
  switch (type) {
    case 'long_text':
    case 'textarea':
    case 'text':
      return 'textarea'
    case 'yes_no':
      return 'yes_no'
    case 'select':
      return 'select'
    case 'radio_group':
      return 'radio_group'
    case 'multi_select':
    case 'checkbox_group':
      return 'checkbox_group'
    case 'date':
      return 'date'
    case 'number':
    case 'number_with_unit':
      return 'number'
    default:
      return 'short_text'
  }
}

/** Localize adapted schema field labels from the source template (for Template Completion). */
export function localizeAdaptedTemplateSchema(
  schema: GuidedEntrySchema,
  template: DocumentTemplate,
  _language: UiLanguage,
): GuidedEntrySchema {
  const fieldLabelOverrides = new Map<string, string>()
  for (const f of template.fields) {
    if (f.label) fieldLabelOverrides.set(f.id, f.label)
  }

  return {
    ...schema,
    titleKey: template.title,
    fields: schema.fields.map((f) => ({
      ...f,
      labelKey: fieldLabelOverrides.get(f.id) ?? f.labelKey,
    })),
    steps: schema.steps.map((s) => {
      const section = template.sections?.find((sec) => sec.id === s.id)
      const field = template.fields.find((fld) => fld.id === s.id)
      return {
        ...s,
        titleKey: section?.title ?? field?.label ?? s.titleKey,
        descriptionKey: section?.description,
      }
    }),
  }
}

export function templateCompletionGenerateHint(language: UiLanguage): string {
  return translateUi(language, 'templateCompletionGenerateHint')
}
