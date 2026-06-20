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
  /** English clinical label (UI lang === 'en'). */
  labelEn?: string
}

export interface BefundFieldDef {
  id: string
  type: BefundFieldType
  label: string
  /** English clinical label (UI lang === 'en'). */
  labelEn?: string
  options?: BefundFieldOption[]
  placeholder?: string
  /** English placeholder hint (UI lang === 'en'). */
  placeholderEn?: string
  defaultValue?: string | string[] | boolean
}

export interface BefundSchemaSection {
  id: string
  label: string
  /** English clinical label (UI lang === 'en'). */
  labelEn?: string
  fields: BefundFieldDef[]
}

export interface BefundSchema {
  type: BefundType
  version: number
  title: string
  /** English clinical title (UI lang === 'en'). */
  titleEn?: string
  shortLabel: string
  /** English short label (UI lang === 'en'). */
  shortLabelEn?: string
  sections: BefundSchemaSection[]
}
