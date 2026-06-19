import { getBefundSchema } from '../../data/befundSchemas'
import type { BefundFieldDef } from '../../data/befundSchemas/types'
import type { BefundRecord } from '../../types/befund'
import { loadDiagnostikBefunde } from '../befundArchive'
import { loadAnforderungen } from '../anforderungen/storage'
import { loadVerlaufFeed } from '../verlaufFeed'
import { loadDokumente } from '../dokumenteArchive'
import { formatDateDe } from './dateLabels'

export type DiagnosticExamStatus = 'normal' | 'abnormal' | 'unknown'

export interface DiagnosticExamSummary {
  conducted: boolean
  dateLabel: string | null
  status: DiagnosticExamStatus
  statusLabel: string
  briefFinding: string | null
}

const ECG_ABNORMAL_PRESETS = new Set([
  'sinus_tachycardia',
  'sinus_bradycardia',
  'prolonged_qtc',
  'af_known',
  'repolarization',
])

const EEG_ABNORMAL_PRESETS = new Set([
  'mild_slow',
  'moderate_slow',
  'severe_slow',
  'epileptiform_no_seizure',
  'ictal',
])

const CT_CATALOG_PREFIX = 'befund-ct-'
const CT_TEXT_PATTERN =
  /\b(?:ct|computertomograph(?:ie)?)\s*(?:schädel|schaedel|kopf|thorax|gesamt)?[^.]{0,120}/i

function latestBefund(caseId: string, type: BefundRecord['type']): BefundRecord | null {
  return (
    [...loadDiagnostikBefunde(caseId)]
      .filter((r) => r.type === type)
      .sort((a, b) => b.examDate.localeCompare(a.examDate))[0] ?? null
  )
}

function fieldLabel(field: BefundFieldDef, raw: string | string[] | boolean | undefined): string {
  if (raw === undefined || raw === '' || raw === false) return ''
  if (field.type === 'checkbox_group' && Array.isArray(raw)) {
    return raw
      .map((v) => field.options?.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean)
      .join(', ')
  }
  if ((field.type === 'select' || field.type === 'radio_group') && typeof raw === 'string') {
    return field.options?.find((o) => o.value === raw)?.label ?? raw
  }
  if (typeof raw === 'string') return raw.trim()
  return ''
}

function presetValues(record: BefundRecord, fieldId: string): string[] {
  const raw = record.fieldValues[fieldId]
  return Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? [raw] : []
}

function conclusionBrief(record: BefundRecord): string | null {
  const schema = getBefundSchema(record.type)
  const conclusionSection = schema.sections.find((s) => s.id === 'conclusion')
  if (!conclusionSection) return null

  const freeField = conclusionSection.fields.find((f) => f.id === 'conclusion_free')
  const presetField = conclusionSection.fields.find((f) => f.id === 'conclusion_preset')
  const freeText = freeField ? fieldLabel(freeField, record.fieldValues.conclusion_free) : ''
  if (freeText) return freeText.length > 160 ? `${freeText.slice(0, 157)}…` : freeText

  if (presetField) {
    const labels = presetValues(record, 'conclusion_preset')
      .map((v) => presetField.options?.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean)
    if (labels.length > 0) return labels.join(' · ')
  }

  return null
}

function buildFromBefund(
  record: BefundRecord | null,
  abnormalPresets: Set<string>,
  normalLabel: string,
  abnormalLabel: string,
  notConductedLabel: string,
): DiagnosticExamSummary {
  if (!record) {
    return {
      conducted: false,
      dateLabel: null,
      status: 'unknown',
      statusLabel: notConductedLabel,
      briefFinding: null,
    }
  }

  const presets = presetValues(record, 'conclusion_preset')
  const hasMorphologyAlert =
    record.type === 'ecg' &&
    (presetValues(record, 'st').some((v) => v !== 'normal') ||
      presetValues(record, 'blocks').some((v) => v !== 'none' && v !== ''))

  const abnormal =
    presets.some((p) => abnormalPresets.has(p)) || hasMorphologyAlert

  return {
    conducted: true,
    dateLabel: formatDateDe(record.examDate),
    status: abnormal ? 'abnormal' : presets.includes('unremarkable') || presets.includes('normal') ? 'normal' : 'unknown',
    statusLabel: abnormal ? abnormalLabel : normalLabel,
    briefFinding: abnormal ? conclusionBrief(record) : null,
  }
}

export function buildEkgSummary(caseId: string): DiagnosticExamSummary {
  return buildFromBefund(
    latestBefund(caseId, 'ecg'),
    ECG_ABNORMAL_PRESETS,
    'Normal',
    'Auffällig',
    'Kein EKG dokumentiert',
  )
}

export function buildEegSummary(caseId: string): DiagnosticExamSummary {
  return buildFromBefund(
    latestBefund(caseId, 'eeg'),
    EEG_ABNORMAL_PRESETS,
    'Normal',
    'Auffällig',
    'Kein EEG dokumentiert',
  )
}

function extractCtSnippet(text: string): string | null {
  const match = text.match(CT_TEXT_PATTERN)
  if (!match) return null
  const sentence =
    text
      .split(/(?<=[.!?])\s+/)
      .find((s) => CT_TEXT_PATTERN.test(s)) ?? match[0]
  const trimmed = sentence.replace(/\s+/g, ' ').trim()
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed
}

/** Latest CT Kurzbefund from orders, Verlauf, or Dokumente — no dedicated CT module yet. */
export function buildCtSummary(caseId: string): DiagnosticExamSummary {
  const acceptedCtOrders = loadAnforderungen(caseId).filter(
    (o) =>
      (o.status === 'accepted' || o.status === 'pending') &&
      o.catalogId.startsWith(CT_CATALOG_PREFIX),
  )

  if (acceptedCtOrders.length > 0) {
    const latest = [...acceptedCtOrders].sort((a, b) =>
      (b.reviewedAt ?? b.updatedAt).localeCompare(a.reviewedAt ?? a.updatedAt),
    )[0]!
    const brief = latest.note?.trim() || latest.label
    return {
      conducted: latest.status === 'accepted',
      dateLabel: formatDateDe(latest.reviewedAt ?? latest.requestedDate ?? latest.createdAt),
      status: 'unknown',
      statusLabel: latest.status === 'accepted' ? 'Dokumentiert' : 'Ausstehend',
      briefFinding: brief,
    }
  }

  for (const entry of loadVerlaufFeed(caseId)) {
    const snippet = extractCtSnippet(entry.content)
    if (snippet) {
      return {
        conducted: true,
        dateLabel: formatDateDe(entry.date),
        status: /unauff|ohne patholog|kein anhalt|normal/i.test(snippet) ? 'normal' : 'abnormal',
        statusLabel: /unauff|ohne patholog|kein anhalt|normal/i.test(snippet) ? 'Normal' : 'Befund',
        briefFinding: snippet,
      }
    }
  }

  for (const doc of loadDokumente(caseId)) {
    const haystack = `${doc.title} ${doc.content ?? ''}`
    const snippet = extractCtSnippet(haystack)
    if (snippet) {
      return {
        conducted: true,
        dateLabel: formatDateDe(doc.date),
        status: /unauff|ohne patholog|kein anhalt|normal/i.test(snippet) ? 'normal' : 'abnormal',
        statusLabel: /unauff|ohne patholog|kein anhalt|normal/i.test(snippet) ? 'Normal' : 'Befund',
        briefFinding: snippet,
      }
    }
  }

  return {
    conducted: false,
    dateLabel: null,
    status: 'unknown',
    statusLabel: 'Kein CT dokumentiert',
    briefFinding: null,
  }
}

export function hasConductedEeg(caseId: string): boolean {
  return loadDiagnostikBefunde(caseId).some((r) => r.type === 'eeg')
}
