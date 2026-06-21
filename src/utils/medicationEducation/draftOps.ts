import type { AiMode } from '../../types/aiUsage'
import type {
  MedicationEducationDetailStyle,
  MedicationEducationLanguage,
  MedicationEducationScope,
  MedicationEducationSectionState,
  MedicationEducationSourceSnapshot,
  PatientMedicationEducationDocument,
} from '../../types/medicationEducation'
import {
  getMedicationEducationSections,
  resolveDocumentVariant,
} from '../../data/medicationEducationSections'

export function createEmptyMedicationEducationSection(id: string): MedicationEducationSectionState {
  return {
    id,
    status: 'empty',
    included: true,
    currentContent: '',
    versions: [],
  }
}

export function createMedicationEducationDocument(params: {
  caseId?: string
  scope: MedicationEducationScope
  detailStyle: MedicationEducationDetailStyle
  language: MedicationEducationLanguage
  aiMode: AiMode
  medicationIds: string[]
  primaryMedicationId?: string
  medicationPlanVersionId?: string
  sourceSnapshot?: Partial<MedicationEducationSourceSnapshot>
  includeMedTable?: boolean
  includeMonitoringPlan?: boolean
  includeSignatureArea?: boolean
  isKbGeneric?: boolean
  includePregnancy?: boolean
}): PatientMedicationEducationDocument {
  const now = new Date().toISOString()
  const documentVariant = resolveDocumentVariant(params.scope, params.detailStyle, params.isKbGeneric)
  const sections: Record<string, MedicationEducationSectionState> = {}
  for (const def of getMedicationEducationSections(params.scope, {
    includePregnancy: params.includePregnancy,
  })) {
    sections[def.id] = createEmptyMedicationEducationSection(def.id)
  }

  const title =
    params.scope === 'single'
      ? 'Patientenaufklärung Medikation'
      : params.scope === 'selected'
        ? 'Patientenaufklärung — ausgewählte Medikamente'
        : 'Patientenaufklärung — gesamte Medikation'

  return {
    id: crypto.randomUUID(),
    caseId: params.caseId,
    scope: params.scope,
    documentVariant,
    medicationIds: params.medicationIds,
    primaryMedicationId: params.primaryMedicationId,
    medicationPlanVersionId: params.medicationPlanVersionId,
    language: params.language,
    detailStyle: params.detailStyle,
    aiMode: params.aiMode,
    status: 'draft_ai_generated',
    title,
    sections,
    sourceKbTemplateIds: [],
    sourceSnapshot: {
      medicationEntryIds: params.medicationIds,
      kbTemplateIds: [],
      missingKbMedicationIds: [],
      unapprovedKbTemplateIds: [],
      ...params.sourceSnapshot,
    },
    warnings: [],
    review: {},
    includeMedTable: params.includeMedTable ?? true,
    includeMonitoringPlan: params.includeMonitoringPlan ?? true,
    includeSignatureArea: params.includeSignatureArea ?? true,
    requiresKbValidation: false,
    createdAt: now,
    updatedAt: now,
    aiUsageLog: [],
  }
}

export function isSectionIncludedInFinal(section: MedicationEducationSectionState): boolean {
  if (!section.included) return false
  return section.status === 'accepted' || section.status === 'clinician_edited' || section.status === 'auto_fetched'
}

export function applyAiGeneratedSection(
  doc: PatientMedicationEducationDocument,
  sectionId: string,
  content: string,
  meta: {
    provider: string
    model: string
    mode: AiMode
    inputTokens: number
    outputTokens: number
    creditsCharged: number
  },
): PatientMedicationEducationDocument {
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
  next.status = 'needs_clinician_review'
  next.updatedAt = new Date().toISOString()
  return next
}

export function applyFetchedSection(
  doc: PatientMedicationEducationDocument,
  sectionId: string,
  content: string,
  sourcePreview?: string,
): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section || !content.trim()) return doc
  section.currentContent = content
  section.sourcePreview = sourcePreview
  section.status = 'auto_fetched'
  section.versions.push({
    content,
    createdAt: new Date().toISOString(),
    source: 'fetch',
  })
  next.updatedAt = new Date().toISOString()
  return next
}

export function updateSectionContent(
  doc: PatientMedicationEducationDocument,
  sectionId: string,
  content: string,
): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section) return doc
  section.currentContent = content
  if (section.status !== 'accepted') section.status = 'clinician_edited'
  next.updatedAt = new Date().toISOString()
  return next
}

export function acceptSection(
  doc: PatientMedicationEducationDocument,
  sectionId: string,
): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section) return doc
  section.status = 'accepted'
  next.updatedAt = new Date().toISOString()
  return next
}

export function acceptAllSections(doc: PatientMedicationEducationDocument): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  for (const section of Object.values(next.sections)) {
    if (section.currentContent.trim()) section.status = 'accepted'
  }
  next.updatedAt = new Date().toISOString()
  return next
}

export function revertSection(
  doc: PatientMedicationEducationDocument,
  sectionId: string,
): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section || section.previousContent === undefined) return doc
  section.currentContent = section.previousContent
  section.status = 'ai_generated'
  next.updatedAt = new Date().toISOString()
  return next
}

export function toggleSectionIncluded(
  doc: PatientMedicationEducationDocument,
  sectionId: string,
): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  const section = next.sections[sectionId]
  if (!section) return doc
  section.included = !section.included
  next.updatedAt = new Date().toISOString()
  return next
}

export function finalizeDocument(
  doc: PatientMedicationEducationDocument,
  finalText: string,
): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  next.finalText = finalText
  next.status = 'accepted'
  next.acceptedAt = new Date().toISOString()
  next.updatedAt = next.acceptedAt
  return next
}

export function canFinalizeDocument(doc: PatientMedicationEducationDocument): {
  ok: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  const aiSections = Object.values(doc.sections).filter((s) => s.status === 'ai_generated')
  if (aiSections.length > 0) {
    reasons.push('Nicht alle Abschnitte wurden vom Behandlungsteam geprüft')
  }
  if (doc.requiresKbValidation) {
    reasons.push('KB-Inhalte erfordern klinische Validierung')
  }
  const hasContent = Object.values(doc.sections).some(
    (s) => s.included && s.currentContent.trim().length > 0,
  )
  if (!hasContent) reasons.push('Dokument ist leer')
  if (!doc.medicationPlanVersionId && doc.scope !== 'single') {
    reasons.push('Keine Verknüpfung zum Medikationsplan')
  }
  return { ok: reasons.length === 0, reasons }
}

export function allSectionsReviewed(doc: PatientMedicationEducationDocument): boolean {
  return Object.values(doc.sections)
    .filter((s) => s.included && s.currentContent.trim())
    .every((s) => s.status === 'accepted' || s.status === 'clinician_edited' || s.status === 'auto_fetched')
}
