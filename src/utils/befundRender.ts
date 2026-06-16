import { getBefundSchema } from '../data/befundSchemas'
import type { BefundFieldDef } from '../data/befundSchemas/types'
import type { BefundRecord } from '../types/befund'

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

/** Render a structured befund record as readable German plain text. */
export function renderBefundContent(record: BefundRecord): string {
  const schema = getBefundSchema(record.type)
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

  return lines.join('\n\n')
}

/** Structured sections for card-style befund display. */
export function getBefundDisplaySections(record: BefundRecord): BefundDisplaySection[] {
  const schema = getBefundSchema(record.type)

  return schema.sections
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
}

export function buildBefundTitle(record: BefundRecord): string {
  const schema = getBefundSchema(record.type)
  const date = formatBefundDate(record.examDate)
  const statusSuffix = record.status === 'draft' ? ' (Entwurf)' : ''
  return `${schema.shortLabel} ${date}${statusSuffix}`
}

/** DD.MM.YYYY */
export function formatBefundDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}.${d.getFullYear()}`
  } catch {
    return iso.slice(0, 10)
  }
}

export function getBefundTypeLabel(type: BefundRecord['type']): string {
  return getBefundSchema(type).shortLabel
}
