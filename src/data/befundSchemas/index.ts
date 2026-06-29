import type { BefundType } from '../../types/befund'
import type { UiLanguage } from '../../types/settings'
import { ecgSchema } from './ecg'
import { eegSchema } from './eeg'
import { roentgenSchema } from './roentgen'
import type {
  BefundFieldDef,
  BefundFieldOption,
  BefundSchema,
  BefundSchemaSection,
} from './types'

export type { BefundFieldDef, BefundSchema, BefundSchemaSection } from './types'

const SCHEMAS: Record<BefundType, BefundSchema> = {
  ecg: ecgSchema,
  eeg: eegSchema,
  roentgen: roentgenSchema,
}

export const BEFUND_TYPES: BefundType[] = ['ecg', 'eeg', 'roentgen']

function localizeOption(option: BefundFieldOption): BefundFieldOption {
  return option.labelEn ? { ...option, label: option.labelEn } : option
}

function localizeField(field: BefundFieldDef): BefundFieldDef {
  return {
    ...field,
    label: field.labelEn || field.label,
    placeholder: field.placeholderEn ?? field.placeholder,
    options: field.options ? field.options.map(localizeOption) : field.options,
  }
}

function localizeSection(section: BefundSchemaSection): BefundSchemaSection {
  return {
    ...section,
    label: section.labelEn || section.label,
    fields: section.fields.map(localizeField),
  }
}

/**
 * Return a copy of the schema with English labels promoted into the `label`
 * fields when {@link UiLanguage} is `'en'`. For other languages the schema is
 * returned untouched (German baseline) so existing call sites stay correct.
 */
export function localizeBefundSchema(
  schema: BefundSchema,
  language: UiLanguage | undefined,
): BefundSchema {
  if (language !== 'en') return schema
  return {
    ...schema,
    title: schema.titleEn || schema.title,
    shortLabel: schema.shortLabelEn || schema.shortLabel,
    sections: schema.sections.map(localizeSection),
  }
}

/**
 * Resolve a Befund schema, optionally localized into the UI language. The
 * second argument is optional so existing German-only call sites continue to
 * compile unchanged.
 */
export function getBefundSchema(
  type: BefundType,
  language?: UiLanguage,
): BefundSchema {
  return localizeBefundSchema(SCHEMAS[type], language)
}

export function getDefaultFieldValues(schema: BefundSchema): Record<string, string | string[] | boolean> {
  const values: Record<string, string | string[] | boolean> = {}
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.defaultValue !== undefined) {
        values[field.id] = field.defaultValue
      } else if (field.type === 'checkbox_group') {
        values[field.id] = []
      } else if (field.type === 'checkbox') {
        values[field.id] = false
      } else {
        values[field.id] = ''
      }
    }
  }
  return values
}
