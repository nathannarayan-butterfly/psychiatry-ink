import type { AiMode } from '../../types/aiUsage'
import type {
  MedicationEducationDetailStyle,
  MedicationEducationLanguage,
  MedicationEducationReference,
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

  const titleByScope: Record<MedicationEducationScope, { de: string; en: string }> = {
    single: {
      de: 'Patientenaufklärung Medikation',
      en: 'Patient medication education',
    },
    selected: {
      de: 'Patientenaufklärung — ausgewählte Medikamente',
      en: 'Patient education — selected medications',
    },
    full_combination: {
      de: 'Patientenaufklärung — gesamte Medikation',
      en: 'Patient education — full medication plan',
    },
  }
  const title = titleByScope[params.scope][params.language === 'en' ? 'en' : 'de']

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
    references: [],
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

export function mergeMedicationEducationReferences(
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
    references?: MedicationEducationReference[]
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
  if (meta.references?.length) {
    next.references = mergeMedicationEducationReferences(next.references ?? [], meta.references)
  }
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
  const changed = section.currentContent !== content
  section.currentContent = content
  if (changed && section.status !== 'accepted') {
    section.status = 'clinician_edited'
    section.clinicianEditedAt = new Date().toISOString()
    section.versions.push({
      content,
      createdAt: section.clinicianEditedAt,
      source: 'manual',
    })
  }
  next.updatedAt = new Date().toISOString()
  return next
}

function markKbClinicallyValidatedIfReviewed(
  doc: PatientMedicationEducationDocument,
): PatientMedicationEducationDocument {
  if (!doc.requiresKbValidation || !allSectionsReviewed(doc)) return doc
  doc.requiresKbValidation = false
  doc.review.reviewedAt = doc.review.reviewedAt ?? new Date().toISOString()
  return doc
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
  return markKbClinicallyValidatedIfReviewed(next)
}

export function acceptAllSections(doc: PatientMedicationEducationDocument): PatientMedicationEducationDocument {
  const next = structuredClone(doc)
  for (const section of Object.values(next.sections)) {
    if (!section.currentContent.trim()) continue
    if (section.status === 'ai_generated' || section.status === 'clinician_edited') {
      section.status = 'accepted'
    }
  }
  next.updatedAt = new Date().toISOString()
  return markKbClinicallyValidatedIfReviewed(next)
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

const FINALIZE_REASON_TEXT = {
  unreviewedSections: {
    de: 'Nicht alle Abschnitte wurden vom Behandlungsteam geprüft',
    en: 'Not all sections have been reviewed by the care team',
  },
  kbValidation: {
    de: 'KB-Inhalte erfordern klinische Validierung',
    en: 'KB content requires clinical validation',
  },
  empty: { de: 'Dokument ist leer', en: 'Document is empty' },
  noPlanLink: {
    de: 'Keine Verknüpfung zum Medikationsplan',
    en: 'No link to the medication plan',
  },
} as const

export function canFinalizeDocument(
  doc: PatientMedicationEducationDocument,
  language: MedicationEducationLanguage = 'de',
): {
  ok: boolean
  reasons: string[]
} {
  const lang: 'de' | 'en' = language === 'en' ? 'en' : 'de'
  const reasons: string[] = []
  const aiSections = Object.values(doc.sections).filter((s) => s.status === 'ai_generated')
  if (aiSections.length > 0) {
    reasons.push(FINALIZE_REASON_TEXT.unreviewedSections[lang])
  }
  if (doc.requiresKbValidation && !allSectionsReviewed(doc)) {
    reasons.push(FINALIZE_REASON_TEXT.kbValidation[lang])
  }
  const hasContent = Object.values(doc.sections).some(
    (s) => s.included && s.currentContent.trim().length > 0,
  )
  if (!hasContent) reasons.push(FINALIZE_REASON_TEXT.empty[lang])
  if (!doc.medicationPlanVersionId && doc.scope !== 'single') {
    reasons.push(FINALIZE_REASON_TEXT.noPlanLink[lang])
  }
  return { ok: reasons.length === 0, reasons }
}

export function allSectionsReviewed(doc: PatientMedicationEducationDocument): boolean {
  return Object.values(doc.sections)
    .filter((s) => s.included && s.currentContent.trim())
    .every((s) => s.status === 'accepted' || s.status === 'clinician_edited' || s.status === 'auto_fetched')
}
