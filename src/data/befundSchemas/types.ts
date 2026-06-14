import type { BefundType } from '../../types/befund'

export type BefundFieldType =
  | 'checkbox'
  | 'checkbox_group'
  | 'radio_group'
  | 'short_text'
  | 'long_text'
  | 'select'

export interface BefundFieldOption {
  value: string
  label: string
}

export interface BefundFieldDef {
  id: string
  type: BefundFieldType
  label: string
  options?: BefundFieldOption[]
  placeholder?: string
  defaultValue?: string | string[] | boolean
}

export interface BefundSchemaSection {
  id: string
  label: string
  fields: BefundFieldDef[]
}

export interface BefundSchema {
  type: BefundType
  version: number
  title: string
  shortLabel: string
  sections: BefundSchemaSection[]
}
