import type { ClinicalWorkspacePayload } from '../workspaceVault'
import type { NotionDocumentSnapshot } from '../notionDocumentActions'
import type {
  DiscussPackageContent,
  DiscussPackageSection,
  DiscussPackageSectionKey,
} from '../../types/discussCase'
import { DISCUSS_PACKAGE_SECTION_LABELS } from '../../types/discussCase'
import { defaultTherapieVerlaufSections } from '../../data/therapieVerlaufSections'
import { defaultVerlaufBroadSections } from '../../data/verlaufSections'
import { getInitialEditorContent } from '../workspaceComponents'
import { loadVerlaufFeed, type VerlaufFeedEntry } from '../verlaufFeed'
import { deidentifyPackageContent } from './deidentify'

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function sectionTemplatesForDocument(documentTypeId: string) {
  if (documentTypeId === 'therapie-verlauf') return defaultTherapieVerlaufSections
  if (documentTypeId === 'verlauf') return defaultVerlaufBroadSections
  return []
}

function extractDocumentSections(
  doc: NotionDocumentSnapshot,
  category: DiscussPackageSectionKey,
): DiscussPackageSection[] {
  const sections: DiscussPackageSection[] = []
  const contents = doc.sectionContents ?? {}
  const heading = doc.pageHeading?.trim() || doc.documentTypeId
  const templates = sectionTemplatesForDocument(doc.documentTypeId)
  const matchedTemplateIds = new Set(templates.map((template) => template.id))

  if (templates.length > 0 && Object.keys(contents).some((id) => matchedTemplateIds.has(id))) {
    for (const template of templates) {
      const text = stripHtml(
        getInitialEditorContent(contents[template.id], template.prefilledText),
      )
      if (!text) continue
      sections.push({
        key: category,
        id: `${doc.documentTypeId}:${template.id}`,
        label: `${heading} — ${template.label}`,
        content: text,
        documentTypeId: doc.documentTypeId,
      })
    }
    return sections
  }

  const values = Object.entries(contents)
    .map(([, value]) => stripHtml(String(value ?? '')))
    .filter(Boolean)
  if (values.length > 0) {
    sections.push({
      key: category,
      id: doc.documentTypeId,
      label: heading,
      content: values.join('\n\n'),
      documentTypeId: doc.documentTypeId,
    })
  }

  return sections
}

function formatTherapieVerlauf(
  payload: ClinicalWorkspacePayload,
  caseId: string,
): DiscussPackageSection[] {
  const sections: DiscussPackageSection[] = []

  for (const documentTypeId of ['therapie-verlauf', 'verlauf'] as const) {
    const doc = payload.documents?.[documentTypeId]
    if (doc) {
      sections.push(...extractDocumentSections(doc, 'therapie-verlauf'))
    }
  }

  const feedEntries = loadVerlaufFeed(caseId).filter((entry: VerlaufFeedEntry) =>
    ['verlauf', 'therapie-verlauf'].includes(entry.pageType),
  )
  for (const entry of feedEntries) {
    const text = entry.content.trim()
    if (!text) continue
    const dateLabel = new Date(entry.date).toLocaleDateString('de-DE')
    sections.push({
      key: 'therapie-verlauf',
      id: `feed:${entry.id}`,
      label: entry.sectionLabel
        ? `${dateLabel} — ${entry.sectionLabel}`
        : `${dateLabel} — ${DISCUSS_PACKAGE_SECTION_LABELS['therapie-verlauf']}`,
      content: text,
      documentTypeId: entry.pageType,
    })
  }

  return sections
}

function formatDiagnoses(payload: ClinicalWorkspacePayload): string {
  const diagnoses = payload.diagnoses ?? []
  if (diagnoses.length === 0) return ''
  return diagnoses
    .map((entry, index) => {
      const codes = [
        entry.icd10?.code ? `ICD-10: ${entry.icd10.code}` : null,
        entry.icd11?.code ? `ICD-11: ${entry.icd11.code}` : null,
        entry.dsm?.code ? `DSM: ${entry.dsm.code}` : null,
      ].filter(Boolean)
      return `${index + 1}. ${codes.join(' · ') || 'Diagnose'}`
    })
    .join('\n')
}

function formatMedication(payload: ClinicalWorkspacePayload): string {
  const state = payload.medicationPlanState
  const currentPlan = state?.plans?.find((p) => p.id === state.currentPlanId) ?? state?.plans?.[0]
  if (!currentPlan?.medications?.length) return ''
  return currentPlan.medications
    .filter((entry) => !entry.deletedAt)
    .map((entry) => {
      const name = entry.substance || 'Medikament'
      const dose = entry.doseLineGerman || ''
      return `• ${name}${dose ? ` — ${dose}` : ''}`
    })
    .join('\n')
}

function formatSideEffects(payload: ClinicalWorkspacePayload): string {
  const state = payload.medicationPlanState
  const reports = state?.sideEffectReports ?? []
  if (reports.length === 0) {
    const currentPlan = state?.plans?.find((p) => p.id === state.currentPlanId) ?? state?.plans?.[0]
    const lines: string[] = []
    for (const entry of currentPlan?.medications ?? []) {
      for (const effect of entry.sideEffects ?? []) {
        lines.push(`• ${entry.substance}: ${effect}`)
      }
    }
    return lines.join('\n')
  }
  return reports.map((r) => `• ${r.symptom} — ${r.severity}`).join('\n')
}

function formatTherapy(payload: ClinicalWorkspacePayload): string {
  const parts: string[] = []
  const psycho = payload.psychotherapyPlan
  if (psycho) {
    const status = psycho.overview?.status ?? ''
    const methods = psycho.methods?.filter((m) => m.selected).map((m) => m.methodId).join(', ')
    parts.push(`Psychotherapie: ${status}${methods ? ` (${methods})` : ''}`)
  }
  if (payload.complementaryTherapies?.length) {
    parts.push(
      'Komplementärtherapien:\n' +
        payload.complementaryTherapies.map((t) => `• ${t.name} — ${t.status}`).join('\n'),
    )
  }
  if (payload.weitereTherapie?.length) {
    parts.push(
      'Weitere Therapie:\n' +
        payload.weitereTherapie.map((t) => `• ${t.type} — ${t.status}`).join('\n'),
    )
  }
  return parts.join('\n\n')
}

function formatInvestigations(payload: ClinicalWorkspacePayload): string {
  const graphs = payload.labGraphs ?? []
  if (graphs.length === 0) return ''
  return graphs.map((g) => `• ${g.title || g.id}`).join('\n')
}

function formatRisk(payload: ClinicalWorkspacePayload): string {
  const riskSections: DiscussPackageSection[] = []
  for (const documentTypeId of ['verlauf', 'therapie-verlauf'] as const) {
    const doc = payload.documents?.[documentTypeId]
    if (!doc) continue
    riskSections.push(...extractDocumentSections(doc, 'risk'))
  }
  return riskSections
    .filter(
      (section) =>
        section.id.includes('risiko') || section.label.toLowerCase().includes('risiko'),
    )
    .map((section) => section.content)
    .join('\n\n')
}

function formatDocuments(
  payload: ClinicalWorkspacePayload,
  selectedDocIds: string[],
): string {
  if (selectedDocIds.length === 0) return ''
  const docs = Object.entries(payload.documents ?? {}).filter(([id]) =>
    selectedDocIds.includes(id),
  )
  return docs
    .map(([, doc]) => `### ${doc.pageHeading}\n${Object.values(doc.sectionContents).map(stripHtml).join('\n')}`)
    .join('\n\n')
}

export function buildDiscussionPackage(input: {
  caseId: string
  payload: ClinicalWorkspacePayload
  selectedSections: DiscussPackageSectionKey[]
  selectedDocumentIds?: string[]
  patientName?: string
  patientLabel?: string
}): { identified: DiscussPackageContent; deidentified: DiscussPackageContent } {
  const sections: DiscussPackageSection[] = []
  const selected = new Set(input.selectedSections)

  if (selected.has('diagnosis')) {
    const content = formatDiagnoses(input.payload)
    if (content) {
      sections.push({
        key: 'diagnosis',
        id: 'diagnosis',
        label: DISCUSS_PACKAGE_SECTION_LABELS.diagnosis,
        content,
      })
    }
  }

  if (selected.has('anamnesis')) {
    const doc = input.payload.documents?.aufnahme
    if (doc) {
      sections.push(...extractDocumentSections(doc, 'anamnesis'))
    }
  }

  if (selected.has('therapie-verlauf')) {
    sections.push(...formatTherapieVerlauf(input.payload, input.caseId))
  }

  if (selected.has('investigations')) {
    const content = formatInvestigations(input.payload)
    if (content) {
      sections.push({
        key: 'investigations',
        id: 'investigations',
        label: DISCUSS_PACKAGE_SECTION_LABELS.investigations,
        content,
      })
    }
  }

  if (selected.has('current-therapy')) {
    const content = formatTherapy(input.payload)
    if (content) {
      sections.push({
        key: 'current-therapy',
        id: 'current-therapy',
        label: DISCUSS_PACKAGE_SECTION_LABELS['current-therapy'],
        content,
      })
    }
  }

  if (selected.has('medication')) {
    const content = formatMedication(input.payload)
    if (content) {
      sections.push({
        key: 'medication',
        id: 'medication',
        label: DISCUSS_PACKAGE_SECTION_LABELS.medication,
        content,
      })
    }
  }

  if (selected.has('side-effects')) {
    const content = formatSideEffects(input.payload)
    if (content) {
      sections.push({
        key: 'side-effects',
        id: 'side-effects',
        label: DISCUSS_PACKAGE_SECTION_LABELS['side-effects'],
        content,
      })
    }
  }

  if (selected.has('risk')) {
    const content = formatRisk(input.payload)
    if (content) {
      sections.push({
        key: 'risk',
        id: 'risk',
        label: DISCUSS_PACKAGE_SECTION_LABELS.risk,
        content,
      })
    }
  }

  if (selected.has('documents')) {
    const content = formatDocuments(input.payload, input.selectedDocumentIds ?? [])
    if (content) {
      sections.push({
        key: 'documents',
        id: 'documents',
        label: DISCUSS_PACKAGE_SECTION_LABELS.documents,
        content,
      })
    }
  }

  const identified: DiscussPackageContent = {
    version: 1,
    builtAt: new Date().toISOString(),
    caseId: input.caseId,
    patientLabel: input.patientName?.trim() || input.patientLabel || 'Patient',
    sections,
    isDeidentified: false,
  }

  const deidentified = deidentifyPackageContent(
    identified,
    input.patientName,
    input.patientLabel || 'Patient',
  )

  return { identified, deidentified }
}

export const ALL_PACKAGE_SECTION_KEYS: DiscussPackageSectionKey[] = [
  'diagnosis',
  'anamnesis',
  'therapie-verlauf',
  'investigations',
  'current-therapy',
  'medication',
  'side-effects',
  'risk',
  'documents',
]
