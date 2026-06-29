import { getBefundSchema } from '../data/befundSchemas'
import type { BefundFieldDef } from '../data/befundSchemas/types'
import type { BefundRecord } from '../types/befund'
import type { UiLanguage } from '../types/settings'
import { formatClinicalDate } from './clinicalDate'

export interface BefundDisplayField {
  label: string
  value: string
  isLongText?: boolean
}

export interface BefundDisplaySection {
  id: string
  label: string
  fields: BefundDisplayField[]
}

function formatFieldValue(field: BefundFieldDef, raw: string | string[] | boolean | undefined): string {
  if (raw === undefined || raw === '' || raw === false) return ''
  if (field.type === 'checkbox') {
    return raw === true ? field.label : ''
  }
  if (field.type === 'checkbox_group' && Array.isArray(raw)) {
    if (raw.length === 0) return ''
    const labels = raw
      .map((v) => field.options?.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean)
    return labels.join(', ')
  }
  if ((field.type === 'select' || field.type === 'radio_group') && typeof raw === 'string') {
    return field.options?.find((o) => o.value === raw)?.label ?? raw
  }
  if (typeof raw === 'string') return raw.trim()
  return ''
}

/**
 * Free-text narrative stored on a befund record by the free-text + KI input
 * mode (mirrors the guided flow, which also writes `narrative`). Used as a
 * fallback when a record carries no structured field values.
 */
function getNarrative(record: BefundRecord): string {
  const raw = record.fieldValues.narrative
  return typeof raw === 'string' ? raw.trim() : ''
}

/** Render a structured befund record as readable plain text in the given UI language. */
export function renderBefundContent(record: BefundRecord, language?: UiLanguage): string {
  const schema = getBefundSchema(record.type, language)
  const lines: string[] = []

  for (const section of schema.sections) {
    const sectionLines: string[] = []
    for (const field of section.fields) {
      const text = formatFieldValue(field, record.fieldValues[field.id])
      if (text) {
        if (field.type === 'long_text') {
          sectionLines.push(`${field.label}:\n${text}`)
        } else {
          sectionLines.push(`${field.label}: ${text}`)
        }
      }
    }
    if (sectionLines.length > 0) {
      lines.push(`${section.label}:\n${sectionLines.join('\n')}`)
    }
  }

  if (lines.length === 0) return getNarrative(record)

  return lines.join('\n\n')
}

/** Structured sections for card-style befund display. */
export function getBefundDisplaySections(
  record: BefundRecord,
  language?: UiLanguage,
): BefundDisplaySection[] {
  const schema = getBefundSchema(record.type, language)

  const sections = schema.sections
    .map((section) => {
      const fields = section.fields.flatMap((field) => {
        const value = formatFieldValue(field, record.fieldValues[field.id])
        if (!value) return []
        return [{
          label: field.label,
          value,
          isLongText: field.type === 'long_text',
        }]
      })
      return { id: section.id, label: section.label, fields }
    })
    .filter((section) => section.fields.length > 0)

  if (sections.length === 0) {
    const narrative = getNarrative(record)
    if (narrative) {
      const label = language === 'en' ? 'Findings' : 'Befund'
      return [{ id: 'narrative', label, fields: [{ label, value: narrative, isLongText: true }] }]
    }
  }

  return sections
}

export function buildBefundTitle(record: BefundRecord, language?: UiLanguage): string {
  const schema = getBefundSchema(record.type, language)
  const date = formatBefundDate(record.examDate)
  const draftSuffix = language === 'en' ? ' (draft)' : ' (Entwurf)'
  const statusSuffix = record.status === 'draft' ? draftSuffix : ''
  return `${schema.shortLabel} ${date}${statusSuffix}`
}

/** DD.MM.YYYY */
export function formatBefundDate(iso: string): string {
  return formatClinicalDate(iso) || iso.slice(0, 10)
}

export function getBefundTypeLabel(type: BefundRecord['type'], language?: UiLanguage): string {
  return getBefundSchema(type, language).shortLabel
}
