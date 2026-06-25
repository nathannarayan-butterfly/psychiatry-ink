import type { AiMode } from '../../types/aiUsage'
import type {
  MedicationEducationReference,
  MedicationEducationSectionState,
} from '../../types/medicationEducation'
import type {
  GenericEducationAudience,
  GenericEducationDetailStyle,
  GenericEducationLanguage,
  GenericEducationReadingLevel,
  GenericEducationSubjectKind,
  GenericPatientEducationDocument,
} from '../../types/patientEducationGeneric'
import { getGenericEducationSections } from '../../data/patientEducationGenericSections'

function createEmptySection(id: string): MedicationEducationSectionState {
  return { id, status: 'empty', included: true, currentContent: '', versions: [] }
}

export function buildGenericEducationTitle(
  subject: string,
  language: GenericEducationLanguage,
): string {
  const trimmed = subject.trim()
  return language === 'en'
    ? `Patient education — ${trimmed}`
    : `Patientenaufklärung — ${trimmed}`
}

export function createGenericEducationDocument(params: {
  subject: string
  subjectKind: GenericEducationSubjectKind
  audience: GenericEducationAudience
  readingLevel: GenericEducationReadingLevel
  detailStyle: GenericEducationDetailStyle
  additionalContext?: string
  language: GenericEducationLanguage
  aiMode: AiMode
}): GenericPatientEducationDocument {
  const now = new Date().toISOString()
  const sections: Record<string, MedicationEducationSectionState> = {}
  for (const def of getGenericEducationSections()) {
    sections[def.id] = createEmptySection(def.id)
  }

  const title = buildGenericEducationTitle(params.subject, params.language)
  const titleSection = sections.titel
  if (titleSection) {
    titleSection.currentContent = title
    titleSection.status = 'auto_fetched'
  }

  return {
    id: crypto.randomUUID(),
    subject: params.subject.trim(),
    subjectKind: params.subjectKind,
    audience: params.audience,
    readingLevel: params.readingLevel,
    detailStyle: params.detailStyle,
    additionalContext: params.additionalContext?.trim() || undefined,
    language: params.language,
    aiMode: params.aiMode,
    title,
    status: 'draft_ai_generated',
    sections,
    references: [],
    aiUsageLog: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function isSectionIncludedInFinal(section: MedicationEducationSectionState): boolean {
  if (!section.included) return false
  return (
    section.status === 'accepted' ||
    section.status === 'clinician_edited' ||
    section.status === 'auto_fetched'
  )
}

export function mergeGenericEducationReferences(
  existing: MedicationEducationReference[],
  incoming: MedicationEducationReference[],
): MedicationEducationReference[] {
  const merged = [...existing]
  const seen = new Set(existing.map((r) => r.title.trim().toLowerCase()))
  for (const ref of incoming) {
    const title = ref.title.trim()
    if (!title) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ ...ref, title })
  }
  return merged
}

export function applyAiGeneratedSection(
  doc: GenericPatientEducationDocument,
  sectionId: string,
  content: string,
  meta: {
    provider: string
    model: string
    mode: AiMode
    inputTokens: number
    outputTokens: number
    creditsCharged: number
    references?: MedicationEducationReference[]
  },
): GenericPatientEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section) return doc
  section.previousContent = section.currentContent
  section.currentContent = content
  section.status = 'ai_generated'
  section.versions.push({
    content,
    createdAt: new Date().toISOString(),
    source: 'ai',
    aiProvider: meta.provider,
    aiModel: meta.model,
    aiMode: meta.mode,
    tokenUsage: { inputTokens: meta.inputTokens, outputTokens: meta.outputTokens },
  })
  next.aiUsageLog.push({
    provider: meta.provider,
    model: meta.model,
    mode: meta.mode,
    inputTokens: meta.inputTokens,
    outputTokens: meta.outputTokens,
    creditsCharged: meta.creditsCharged,
    sectionId,
    generatedAt: new Date().toISOString(),
  })
  if (meta.references?.length) {
    next.references = mergeGenericEducationReferences(next.references ?? [], meta.references)
  }
  next.status = 'needs_clinician_review'
  next.updatedAt = new Date().toISOString()
  return next
}

export function updateSectionContent(
  doc: GenericPatientEducationDocument,
  sectionId: string,
  content: string,
): GenericPatientEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section) return doc
  const changed = section.currentContent !== content
  section.currentContent = content
  if (changed && section.status !== 'accepted') {
    section.status = 'clinician_edited'
    section.clinicianEditedAt = new Date().toISOString()
    section.versions.push({ content, createdAt: section.clinicianEditedAt, source: 'manual' })
  }
  next.updatedAt = new Date().toISOString()
  return next
}

export function acceptSection(
  doc: GenericPatientEducationDocument,
  sectionId: string,
): GenericPatientEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section) return doc
  section.status = 'accepted'
  next.updatedAt = new Date().toISOString()
  return next
}

export function acceptAllSections(
  doc: GenericPatientEducationDocument,
): GenericPatientEducationDocument {
  const next = structuredClone(doc)
  for (const section of Object.values(next.sections)) {
    if (!section.currentContent.trim()) continue
    if (section.status === 'ai_generated' || section.status === 'clinician_edited') {
      section.status = 'accepted'
    }
  }
  next.updatedAt = new Date().toISOString()
  return next
}

export function revertSection(
  doc: GenericPatientEducationDocument,
  sectionId: string,
): GenericPatientEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section || section.previousContent === undefined) return doc
  section.currentContent = section.previousContent
  section.status = 'ai_generated'
  next.updatedAt = new Date().toISOString()
  return next
}

export function toggleSectionIncluded(
  doc: GenericPatientEducationDocument,
  sectionId: string,
): GenericPatientEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section) return doc
  section.included = !section.included
  next.updatedAt = new Date().toISOString()
  return next
}
