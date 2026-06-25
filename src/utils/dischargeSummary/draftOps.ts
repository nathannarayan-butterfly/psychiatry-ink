import type {
  DischargeSummaryDraft,
  DischargeSummaryDocumentType,
  DischargeSummaryRegion,
  DischargeSummarySectionState,
  DischargeSummarySectionStatus,
} from '../../types/dischargeSummary'
import {
  DISCHARGE_DEFAULT_SIGNATURE,
  defaultDischargeSummaryTitle,
  getDischargeSummarySections,
} from '../../data/dischargeSummarySections'

export function createEmptySectionState(id: string): DischargeSummarySectionState {
  return {
    id,
    status: 'empty',
    included: true,
    currentContent: '',
    versions: [],
  }
}

export function createDischargeSummaryDraft(params: {
  documentType: DischargeSummaryDocumentType
  region: DischargeSummaryRegion
  patientScoped: boolean
  caseId?: string
  aiMode?: DischargeSummaryDraft['aiMode']
}): DischargeSummaryDraft {
  const now = new Date().toISOString()
  const aiMode = params.aiMode ?? 'standard'
  const hospitalCourseLength: DischargeSummaryDraft['hospitalCourseLength'] =
    aiMode === 'economic' ? 'compact' : aiMode === 'gruendlich' ? 'detailed' : 'standard'
  const sections: Record<string, DischargeSummarySectionState> = {}
  const defs = getDischargeSummarySections(params.documentType)

  for (const def of defs) {
    const section = createEmptySectionState(def.id)
    if (def.id === 'sign-off') {
      section.currentContent = DISCHARGE_DEFAULT_SIGNATURE
      section.status = 'auto_fetched'
    }
    sections[def.id] = section
  }

  return {
    id: crypto.randomUUID(),
    documentFamily: 'discharge_summary_en',
    documentType: params.documentType,
    language: 'en',
    region: params.region,
    patientScoped: params.patientScoped,
    caseId: params.caseId,
    title: defaultDischargeSummaryTitle(params.documentType, params.region),
    status: 'draft',
    aiMode,
    hospitalCourseLength,
    sections,
    sourceSnapshotIds: [],
    createdAt: now,
    updatedAt: now,
    aiUsageLog: [],
  }
}

export function applyFetchedSections(
  draft: DischargeSummaryDraft,
  fetched: Record<string, { content: string; sourcePreview?: string; missing?: string }>,
): DischargeSummaryDraft {
  const next = structuredClone(draft)
  for (const [id, data] of Object.entries(fetched)) {
    const section = next.sections[id]
    if (!section) continue
    if (!data.content.trim()) {
      if (data.missing) {
        section.status = 'missing_source'
        section.missingDataWarning = data.missing
      }
      continue
    }
    section.currentContent = data.content
    section.sourcePreview = data.sourcePreview
    section.status = 'auto_fetched'
    section.versions.push({
      content: data.content,
      createdAt: new Date().toISOString(),
      source: 'fetch',
    })
    if (data.missing) section.missingDataWarning = data.missing
  }
  next.updatedAt = new Date().toISOString()
  return next
}

export function updateSectionContent(
  draft: DischargeSummaryDraft,
  sectionId: string,
  content: string,
): DischargeSummaryDraft {
  const next = structuredClone(draft)
  const section = next.sections[sectionId]
  if (!section) return draft
  section.previousContent = section.currentContent
  section.currentContent = content
  if (section.status === 'ai_generated') {
    section.status = 'clinician_edited'
  } else if (section.status !== 'accepted') {
    section.status = content.trim() ? 'clinician_edited' : 'empty'
  }
  section.versions.push({
    content,
    createdAt: new Date().toISOString(),
    source: 'manual',
  })
  next.updatedAt = new Date().toISOString()
  return next
}

export function acceptSection(draft: DischargeSummaryDraft, sectionId: string): DischargeSummaryDraft {
  const next = structuredClone(draft)
  const section = next.sections[sectionId]
  if (!section) return draft
  section.status = 'accepted'
  next.updatedAt = new Date().toISOString()
  return next
}

export function revertSection(draft: DischargeSummaryDraft, sectionId: string): DischargeSummaryDraft {
  const next = structuredClone(draft)
  const section = next.sections[sectionId]
  if (!section || !section.previousContent) return draft
  section.currentContent = section.previousContent
  section.previousContent = undefined
  section.status = section.currentContent.trim() ? 'clinician_edited' : 'empty'
  next.updatedAt = new Date().toISOString()
  return next
}

export function toggleSectionIncluded(
  draft: DischargeSummaryDraft,
  sectionId: string,
): DischargeSummaryDraft {
  const next = structuredClone(draft)
  const section = next.sections[sectionId]
  if (!section) return draft
  section.included = !section.included
  section.status = section.included
    ? section.currentContent.trim()
      ? section.status === 'excluded'
        ? 'clinician_edited'
        : section.status
      : 'empty'
    : 'excluded'
  next.updatedAt = new Date().toISOString()
  return next
}

export function applyAiGeneratedSection(
  draft: DischargeSummaryDraft,
  sectionId: string,
  content: string,
  meta: {
    provider: string
    model: string
    mode: DischargeSummaryDraft['aiMode']
    inputTokens: number
    outputTokens: number
    creditsCharged: number
  },
): DischargeSummaryDraft {
  const next = structuredClone(draft)
  const section = next.sections[sectionId]
  if (!section) return draft
  section.previousContent = section.currentContent
  section.currentContent = content
  section.status = 'ai_generated'
  const now = new Date().toISOString()
  section.versions.push({
    content,
    createdAt: now,
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
    generatedAt: now,
  })
  next.updatedAt = now
  return next
}

export function isSectionIncludedInFinal(section: DischargeSummarySectionState): boolean {
  if (!section.included || section.status === 'excluded') return false
  if (!section.currentContent.trim()) return false
  return section.status === 'accepted' || section.status === 'clinician_edited'
}

export const REVIEWABLE_STATUSES: DischargeSummarySectionStatus[] = ['ai_generated']
