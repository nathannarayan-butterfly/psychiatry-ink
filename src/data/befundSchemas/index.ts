import type { BefundType } from '../../types/befund'
import { ecgSchema } from './ecg'
import { eegSchema } from './eeg'
import type { BefundSchema } from './types'

export type { BefundFieldDef, BefundSchema, BefundSchemaSection } from './types'

const SCHEMAS: Record<BefundType, BefundSchema> = {
  ecg: ecgSchema,
  eeg: eegSchema,
}

export const BEFUND_TYPES: BefundType[] = ['ecg', 'eeg']

export function getBefundSchema(type: BefundType): BefundSchema {
  return SCHEMAS[type]
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
