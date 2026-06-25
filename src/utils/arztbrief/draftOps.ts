import type {
  ArztbriefDraft,
  ArztbriefDocumentType,
  ArztbriefSectionState,
  ArztbriefSectionStatus,
} from '../../types/arztbrief'
import {
  ARZTBRIEF_DEFAULT_GREETING,
  ARZTBRIEF_DEFAULT_SIGNATURE,
  ARZTBRIEF_KURZ_CLOSING,
  ARZTBRIEF_LANG_CLOSING,
  getArztbriefSections,
} from '../../data/arztbriefSections'

export function createEmptySectionState(id: string): ArztbriefSectionState {
  return {
    id,
    status: 'empty',
    included: true,
    currentContent: '',
    versions: [],
  }
}

export function createArztbriefDraft(params: {
  documentType: ArztbriefDocumentType
  patientScoped: boolean
  caseId?: string
  aiMode?: ArztbriefDraft['aiMode']
}): ArztbriefDraft {
  const now = new Date().toISOString()
  const sections: Record<string, ArztbriefSectionState> = {}
  const defs = getArztbriefSections(params.documentType)

  for (const def of defs) {
    const section = createEmptySectionState(def.id)
    if (def.id === 'greeting') {
      section.currentContent = ARZTBRIEF_DEFAULT_GREETING
      section.status = 'auto_fetched'
    } else if (def.id === 'closing') {
      section.currentContent =
        params.documentType === 'kurzbrief' ? ARZTBRIEF_KURZ_CLOSING : ARZTBRIEF_LANG_CLOSING
      section.status = 'auto_fetched'
    } else if (def.id === 'signature') {
      section.currentContent = ARZTBRIEF_DEFAULT_SIGNATURE
      section.status = 'auto_fetched'
    }
    sections[def.id] = section
  }

  const title =
    params.documentType === 'kurzbrief'
      ? 'Kurzbrief / vorläufiger Entlassungsbericht'
      : 'Ausführlicher Arztbrief'

  return {
    id: crypto.randomUUID(),
    documentType: params.documentType,
    patientScoped: params.patientScoped,
    caseId: params.caseId,
    title,
    status: 'draft',
    aiMode: params.aiMode ?? 'standard',
    therapieVerlaufLength: 'standard',
    sections,
    sourceSnapshotIds: [],
    createdAt: now,
    updatedAt: now,
    aiUsageLog: [],
  }
}

export function applyFetchedSections(
  draft: ArztbriefDraft,
  fetched: Record<string, { content: string; sourcePreview?: string; missing?: string }>,
): ArztbriefDraft {
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
  draft: ArztbriefDraft,
  sectionId: string,
  content: string,
): ArztbriefDraft {
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

export function acceptSection(draft: ArztbriefDraft, sectionId: string): ArztbriefDraft {
  const next = structuredClone(draft)
  const section = next.sections[sectionId]
  if (!section) return draft
  section.status = 'accepted'
  next.updatedAt = new Date().toISOString()
  return next
}

export function revertSection(draft: ArztbriefDraft, sectionId: string): ArztbriefDraft {
  const next = structuredClone(draft)
  const section = next.sections[sectionId]
  if (!section || !section.previousContent) return draft
  section.currentContent = section.previousContent
  section.previousContent = undefined
  section.status = section.currentContent.trim() ? 'clinician_edited' : 'empty'
  next.updatedAt = new Date().toISOString()
  return next
}

export function toggleSectionIncluded(draft: ArztbriefDraft, sectionId: string): ArztbriefDraft {
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
  draft: ArztbriefDraft,
  sectionId: string,
  content: string,
  meta: {
    provider: string
    model: string
    mode: ArztbriefDraft['aiMode']
    inputTokens: number
    outputTokens: number
    creditsCharged: number
  },
): ArztbriefDraft {
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

export function isSectionIncludedInFinal(section: ArztbriefSectionState): boolean {
  if (!section.included || section.status === 'excluded') return false
  if (!section.currentContent.trim()) return false
  return section.status === 'accepted' || section.status === 'clinician_edited'
}

export const REVIEWABLE_STATUSES: ArztbriefSectionStatus[] = ['ai_generated']
