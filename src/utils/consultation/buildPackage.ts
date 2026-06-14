import type { ClinicalWorkspacePayload } from '../workspaceVault'
import type {
  ConsultationSectionKey,
  PatientIdentifierMode,
} from '../../types/consultation'
import { CONSULTATION_SECTION_LABELS } from '../../types/consultation'
import {
  ALL_PACKAGE_SECTION_KEYS,
  buildDiscussionPackage,
} from '../discussCase/buildPackage'
import { deidentifyPackageContent } from '../discussCase/deidentify'
import { loadBefunde } from '../laborArchive'
import { loadDokumente } from '../dokumenteArchive'

export interface ConsultationSharedItemInput {
  itemType: 'section' | 'attachment' | 'befunde' | 'custom_text'
  itemKey: string
  label: string
  content: string
  metadata?: Record<string, unknown>
  sortOrder?: number
}

function applyIdentifierMode(
  content: string,
  mode: PatientIdentifierMode,
  patientName?: string,
  patientLabel = 'Patient',
): string {
  if (mode === 'full') return content
  if (mode === 'pseudonymized') {
    if (patientName?.trim()) {
      return content.replace(new RegExp(patientName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), patientLabel)
    }
    return content
  }
  const deidentified = deidentifyPackageContent(
    {
      version: 1,
      builtAt: new Date().toISOString(),
      caseId: '',
      patientLabel,
      sections: [{ key: 'diagnosis', id: 'x', label: 'x', content }],
      isDeidentified: true,
    },
    patientName,
    patientLabel,
  )
  return deidentified.sections[0]?.content ?? content
}

function formatLaborResults(caseId: string, payload: ClinicalWorkspacePayload): string {
  const parts: string[] = []
  const befunde = loadBefunde(caseId)
  for (const befund of befunde) {
    const header = `### ${befund.label || 'Laborbefund'} (${befund.date})`
    const categories = befund.categories
      .map((cat) => {
        const values = cat.values
          .map((v) => {
            const ref = v.refText || (v.refMin != null && v.refMax != null ? `${v.refMin}–${v.refMax}` : '')
            return `• ${v.name}: ${v.value}${v.unit ? ` ${v.unit}` : ''}${ref ? ` (${ref})` : ''}`
          })
          .join('\n')
        return `${cat.label}:\n${values}`
      })
      .join('\n\n')
    parts.push(`${header}\n${categories}`)
  }

  const graphs = payload.labGraphs ?? []
  if (graphs.length > 0) {
    const graphLines = graphs.map((g) => {
      const latest = g.entries[g.entries.length - 1]
      return latest
        ? `• ${g.title || g.selectedParameter || g.id}: ${latest.value} ${latest.unit} (${latest.date})`
        : `• ${g.title || g.id}`
    })
    parts.push(`### Labor-Verlauf (Auszug)\n${graphLines.join('\n')}`)
  }

  return parts.join('\n\n')
}

function formatImagingResults(caseId: string): string {
  const docs = loadDokumente(caseId).filter(
    (entry) =>
      entry.category === 'untersuchungsbefunde' ||
      entry.category === 'externe-befunde' ||
      /bildgeb|mrt|ct|röntgen|sonograph|eeg|eeg|neurophys|lp\b/i.test(entry.title),
  )
  if (docs.length === 0) return ''
  return docs
    .map((entry) => `### ${entry.title} (${entry.date.slice(0, 10)})\n${entry.content.trim()}`)
    .join('\n\n')
}

function formatDocumentAttachments(caseId: string, payload: ClinicalWorkspacePayload): string {
  const archiveDocs = loadDokumente(caseId).filter(
    (entry) =>
      entry.category !== 'laborbefunde' &&
      entry.category !== 'untersuchungsbefunde' &&
      entry.category !== 'externe-befunde',
  )
  const archiveText =
    archiveDocs.length > 0
      ? archiveDocs
          .map((entry) => `### ${entry.title} (${entry.date.slice(0, 10)})\n${entry.content.trim()}`)
          .join('\n\n')
      : ''

  const workspaceDocs = Object.values(payload.documents ?? {})
    .map((doc) => {
      const sections = Object.values(doc.sectionContents ?? {})
        .map((html) =>
          html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim(),
        )
        .filter(Boolean)
        .join('\n')
      if (!sections) return ''
      return `### ${doc.pageHeading || doc.documentTypeId}\n${sections}`
    })
    .filter(Boolean)
    .join('\n\n')

  return [archiveText, workspaceDocs].filter(Boolean).join('\n\n')
}

export function buildConsultationSharedItems(input: {
  caseId: string
  payload: ClinicalWorkspacePayload
  selectedSections: ConsultationSectionKey[]
  selectedDocumentIds?: string[]
  customText?: string
  patientName?: string
  patientLabel?: string
  identifierMode: PatientIdentifierMode
}): ConsultationSharedItemInput[] {
  const sectionKeys = input.selectedSections.filter((k) => k !== 'custom_text') as Array<
    Exclude<ConsultationSectionKey, 'custom_text'>
  >

  const packageSectionKeys = sectionKeys.filter((k) =>
    (ALL_PACKAGE_SECTION_KEYS as string[]).includes(k),
  ) as typeof ALL_PACKAGE_SECTION_KEYS[number][]

  const { identified } = buildDiscussionPackage({
    caseId: input.caseId,
    payload: input.payload,
    selectedSections: packageSectionKeys,
    selectedDocumentIds: input.selectedDocumentIds,
    patientName: input.patientName,
    patientLabel: input.patientLabel || 'Patient',
  })

  const items: ConsultationSharedItemInput[] = identified.sections.map((section, index) => ({
    itemType: section.key === 'investigations' ? 'befunde' : 'section',
    itemKey: section.key,
    label: CONSULTATION_SECTION_LABELS[section.key as ConsultationSectionKey] ?? section.label,
    content: applyIdentifierMode(
      section.content,
      input.identifierMode,
      input.patientName,
      input.patientLabel || 'Patient',
    ),
    sortOrder: index,
  }))

  if (input.selectedSections.includes('labs')) {
    const content = formatLaborResults(input.caseId, input.payload)
    if (content.trim()) {
      items.push({
        itemType: 'befunde',
        itemKey: 'labs',
        label: CONSULTATION_SECTION_LABELS.labs,
        content: applyIdentifierMode(
          content,
          input.identifierMode,
          input.patientName,
          input.patientLabel || 'Patient',
        ),
        sortOrder: items.length,
      })
    }
  }

  if (input.selectedSections.includes('imaging')) {
    const content = formatImagingResults(input.caseId)
    if (content.trim()) {
      items.push({
        itemType: 'attachment',
        itemKey: 'imaging',
        label: CONSULTATION_SECTION_LABELS.imaging,
        content: applyIdentifierMode(
          content,
          input.identifierMode,
          input.patientName,
          input.patientLabel || 'Patient',
        ),
        sortOrder: items.length,
      })
    }
  }

  if (input.selectedSections.includes('documents') && !packageSectionKeys.includes('documents')) {
    const content = formatDocumentAttachments(input.caseId, input.payload)
    if (content.trim()) {
      items.push({
        itemType: 'attachment',
        itemKey: 'documents',
        label: CONSULTATION_SECTION_LABELS.documents,
        content: applyIdentifierMode(
          content,
          input.identifierMode,
          input.patientName,
          input.patientLabel || 'Patient',
        ),
        sortOrder: items.length,
      })
    }
  }

  if (input.selectedSections.includes('custom_text') && input.customText?.trim()) {
    items.push({
      itemType: 'custom_text',
      itemKey: 'custom_text',
      label: CONSULTATION_SECTION_LABELS.custom_text,
      content: applyIdentifierMode(
        input.customText.trim(),
        input.identifierMode,
        input.patientName,
        input.patientLabel || 'Patient',
      ),
      sortOrder: items.length,
    })
  }

  return items
}

export { ALL_CONSULTATION_SECTION_KEYS } from '../../types/consultation'
