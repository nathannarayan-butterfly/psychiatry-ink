import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiMode } from '../types/aiUsage'
import type { MedicationEntry } from '../types/medicationPlan'
import type {
  MedicationEducationDetailStyle,
  MedicationEducationLanguage,
  MedicationEducationScope,
  PatientMedicationEducationDocument,
} from '../types/medicationEducation'
import { useTranslation } from '../context/TranslationContext'
import { generateMedicationEducationSectionApi } from '../services/medicationEducation/api'
import { loadPatientMetadata } from '../utils/cryptoVault'
import { loadMedicationPlanState } from '../utils/medication/storage'
import { activeMedications } from '../utils/medication/planOps'
import {
  acceptSection,
  acceptAllSections,
  applyAiGeneratedSection,
  applyFetchedSection,
  canFinalizeDocument,
  createMedicationEducationDocument,
  finalizeDocument,
  revertSection,
  toggleSectionIncluded,
  updateSectionContent,
} from '../utils/medicationEducation/draftOps'
import { buildMedicationEducationEvidenceBundle } from '../utils/medicationEducation/evidenceBundle'
import {
  aggregateKbCoveragePercent,
  assessKbTemplateCompleteness,
  buildPreGenerationPanel,
  enrichOutdatedFlags,
  fetchMedicationEducationIdentity,
} from '../utils/medicationEducation/fetchPatientData'
import {
  applyIdentityToDocument,
  assembleMedicationEducationText,
} from '../utils/medicationEducation/export'
import { syncAcceptedMedicationEducationToPatientFile } from '../utils/medicationEducation/patientFileSync'
import {
  getMedicationEducationKbTemplate,
} from '../utils/medicationEducation/kbTemplateStorage'
import { isKbTemplateApproved } from '../utils/medicationEducation/kbCompleteness'
import {
  loadMedicationEducationDocuments,
  resolveMedicationEducationScopeId,
  saveMedicationEducationDocument,
  MEDICATION_EDUCATION_DOCS_CHANGED_EVENT,
} from '../utils/medicationEducation/storage'
import { getMedicationEducationSections } from '../data/medicationEducationSections'
import { estimateTokensFromText } from '../utils/estimateCredits'
import { isClinicalIntelligenceDebugMode } from '../utils/featureFlags'

function estimateSectionCredits(scope: MedicationEducationScope, mode: AiMode, evidenceText: string): number {
  const tokens = estimateTokensFromText(evidenceText)
  const base = scope === 'single' ? (mode === 'gruendlich' ? 32 : 16) : mode === 'gruendlich' ? 48 : 28
  if (tokens > 5000) return Math.round(base * 1.4)
  return base
}

export type MedicationEducationGenerationProgress = {
  active: boolean
  sectionIds: string[]
  completedIds: string[]
  currentId: string | null
  errorSectionId: string | null
}

const EMPTY_GENERATION_PROGRESS: MedicationEducationGenerationProgress = {
  active: false,
  sectionIds: [],
  completedIds: [],
  currentId: null,
  errorSectionId: null,
}

function buildMedTable(medications: MedicationEntry[]): string {
  const header = 'Medikament | Dosis | Einnahme | Indikation'
  const rows = medications.map(
    (m) => `${m.substance} | ${m.strength} | ${m.doseLineGerman} | ${m.indication || '—'}`,
  )
  return [header, ...rows].join('\n')
}

export function useMedicationEducationDocument(caseId: string) {
  const { language } = useTranslation()
  const scopeId = resolveMedicationEducationScopeId(caseId)
  const uiLanguage: MedicationEducationLanguage = language === 'en' ? 'en' : 'de'

  const [doc, setDoc] = useState<PatientMedicationEducationDocument | null>(null)
  const [docs, setDocs] = useState<PatientMedicationEducationDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<MedicationEducationGenerationProgress>(
    EMPTY_GENERATION_PROGRESS,
  )
  const [error, setError] = useState<string | null>(null)
  const [lastDebug, setLastDebug] = useState<Record<string, unknown> | null>(null)

  const refreshDocs = useCallback(async () => {
    const list = await loadMedicationEducationDocuments(scopeId)
    const enriched = await enrichOutdatedFlags(caseId, list)
    setDocs(enriched)
  }, [caseId, scopeId])

  useEffect(() => {
    void refreshDocs()
  }, [refreshDocs])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ scopeId: string }>).detail
      if (detail?.scopeId === scopeId) void refreshDocs()
    }
    window.addEventListener(MEDICATION_EDUCATION_DOCS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(MEDICATION_EDUCATION_DOCS_CHANGED_EVENT, handler)
  }, [refreshDocs, scopeId])

  const sectionLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    if (!doc) return labels
    for (const s of getMedicationEducationSections(doc.scope, { includePregnancy: true })) {
      labels[s.id] = uiLanguage === 'en' ? s.labelEn : s.labelDe
    }
    return labels
  }, [doc, uiLanguage])

  const persist = useCallback(
    async (next: PatientMedicationEducationDocument) => {
      const saved = await saveMedicationEducationDocument(scopeId, next)
      setDoc(saved)
      await refreshDocs()
      return saved
    },
    [refreshDocs, scopeId],
  )

  const createNew = useCallback(
    async (params: {
      scope: MedicationEducationScope
      detailStyle: MedicationEducationDetailStyle
      aiMode: AiMode
      language?: MedicationEducationLanguage
      medicationIds: string[]
      primaryMedicationId?: string
      includeMedTable?: boolean
      includeMonitoringPlan?: boolean
      includeSignatureArea?: boolean
      includePregnancy?: boolean
    }) => {
      setLoading(true)
      setError(null)
      const docLanguage: MedicationEducationLanguage = params.language ?? uiLanguage
      try {
        const planState = loadMedicationPlanState(caseId)
        const currentPlan = planState?.plans.find((p) => p.id === planState.currentPlanId)
        const allMeds = currentPlan?.medications ?? []
        const selected = activeMedications(allMeds).filter((m) =>
          params.scope === 'full_combination' ? true : params.medicationIds.includes(m.id),
        )

        const kbTemplateIds: string[] = []
        const unapproved: string[] = []
        const missingKb: string[] = []
        for (const m of selected) {
          const medId = m.kbDrugId ?? m.substanceId ?? m.id
          const template = await getMedicationEducationKbTemplate(medId, docLanguage)
          if (template) {
            kbTemplateIds.push(template.id)
            if (!isKbTemplateApproved(template.approvalStatus)) unapproved.push(template.id)
            const assessment = assessKbTemplateCompleteness(template)
            if (!assessment.isSufficientForAi) missingKb.push(medId)
          } else {
            missingKb.push(medId)
          }
        }

        let next = createMedicationEducationDocument({
          caseId,
          scope: params.scope,
          detailStyle: params.detailStyle,
          language: docLanguage,
          aiMode: params.aiMode,
          medicationIds: selected.map((m) => m.id),
          primaryMedicationId: params.primaryMedicationId,
          medicationPlanVersionId: currentPlan?.id,
          includeMedTable: params.includeMedTable,
          includeMonitoringPlan: params.includeMonitoringPlan,
          includeSignatureArea: params.includeSignatureArea,
          includePregnancy: params.includePregnancy,
          sourceSnapshot: {
            medicationPlanVersionId: currentPlan?.id,
            medicationPlanUpdatedAt: planState?.updatedAt,
            medicationEntryIds: selected.map((m) => m.id),
            kbTemplateIds,
            missingKbMedicationIds: missingKb,
            unapprovedKbTemplateIds: unapproved,
            kbCoveragePercent: aggregateKbCoveragePercent(
              await Promise.all(
                selected.map(async (m) => {
                  const medId = m.kbDrugId ?? m.substanceId ?? m.id
                  const t = await getMedicationEducationKbTemplate(medId, docLanguage)
                  return {
                    medicationId: medId,
                    substanceName: m.substance,
                    coveragePercent: assessKbTemplateCompleteness(t).coveragePercent,
                    missingFields: assessKbTemplateCompleteness(t).missingFields,
                  }
                }),
              ),
            ),
          },
        })

        next.requiresKbValidation = missingKb.length > 0 || unapproved.length > 0
        if (next.requiresKbValidation) {
          next.warnings.push({
            code: 'kb_incomplete',
            messageDe: 'KB unvollständig oder nicht freigegeben — AI-Entwurf erfordert klinische Validierung',
            messageEn: 'KB incomplete or not approved — AI draft requires clinical validation',
            severity: 'warning',
          })
        }

        if (params.includeMedTable && next.sections['aktuelle-medikation-tabelle']) {
          next = applyFetchedSection(next, 'aktuelle-medikation-tabelle', buildMedTable(selected))
        }

        const identity = await fetchMedicationEducationIdentity(caseId, docLanguage)
        next = applyIdentityToDocument(next, identity)

        await persist(next)
        return next
      } catch (e) {
        setError((e as Error).message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [caseId, persist, uiLanguage],
  )

  const openDoc = useCallback(
    async (id: string) => {
      const found = docs.find((d) => d.id === id) ?? null
      setDoc(found)
      return found
    },
    [docs],
  )

  // Generates one AI section against an explicit base document and returns the
  // persisted result. Threading the document explicitly (rather than reading
  // the `doc` state closure) is what lets "Generate all" and the post-create
  // auto-generate run multiple sections without overwriting earlier output.
  const generateSectionFor = useCallback(
    async (
      baseDoc: PatientMedicationEducationDocument,
      sectionId: string,
      options?: { batch?: boolean },
    ): Promise<PatientMedicationEducationDocument | null> => {
      const def = getMedicationEducationSections(baseDoc.scope, { includePregnancy: true }).find(
        (s) => s.id === sectionId,
      )
      if (!def?.aiCapable) return baseDoc

      if (!options?.batch) {
        setGenerationProgress({
          active: true,
          sectionIds: [sectionId],
          completedIds: [],
          currentId: sectionId,
          errorSectionId: null,
        })
      }

      setGeneratingSectionId(sectionId)
      setError(null)
      try {
        const planState = loadMedicationPlanState(caseId)
        const currentPlan = planState?.plans.find((p) => p.id === planState.currentPlanId)
        const allMeds = currentPlan?.medications ?? []
        const selected = activeMedications(allMeds).filter((m) => baseDoc.medicationIds.includes(m.id))

        const patient = await loadPatientMetadata(caseId)
        const evidence = await buildMedicationEducationEvidenceBundle({
          caseId,
          scope: baseDoc.scope,
          documentVariant: baseDoc.documentVariant,
          detailStyle: baseDoc.detailStyle,
          language: baseDoc.language,
          medications: selected,
          planState: planState ?? undefined,
          patientName: patient?.metadata.name,
          patientDob: patient?.metadata.geburtsdatum,
        })

        const result = await generateMedicationEducationSectionApi({
          caseId,
          scope: baseDoc.scope,
          documentVariant: baseDoc.documentVariant,
          sectionId,
          mode: baseDoc.aiMode,
          detailStyle: baseDoc.detailStyle,
          evidence,
          language: baseDoc.language,
          patientHints: patient
            ? {
                patientName: patient.metadata.name,
                patientDob: patient.metadata.geburtsdatum,
              }
            : undefined,
        })

        if (result.debug && isClinicalIntelligenceDebugMode()) {
          setLastDebug(result.debug as Record<string, unknown>)
        }

        const credits = estimateSectionCredits(baseDoc.scope, baseDoc.aiMode, evidence.summaryText)
        const next = applyAiGeneratedSection(baseDoc, sectionId, result.content, {
          provider: result.provider,
          model: result.model,
          mode: baseDoc.aiMode,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          creditsCharged: credits,
          references: result.references,
        })
        const saved = await persist(next)

        if (!options?.batch) {
          setGenerationProgress({
            active: false,
            sectionIds: [sectionId],
            completedIds: [sectionId],
            currentId: null,
            errorSectionId: null,
          })
        }

        return saved
      } catch (e) {
        setError((e as Error).message)
        if (!options?.batch) {
          setGenerationProgress((prev) => ({
            ...prev,
            active: false,
            errorSectionId: sectionId,
          }))
        }
        return null
      } finally {
        setGeneratingSectionId(null)
      }
    },
    [caseId, persist],
  )

  const generateSection = useCallback(
    async (sectionId: string) => {
      if (!doc) return
      await generateSectionFor(doc, sectionId)
    },
    [doc, generateSectionFor],
  )

  const generateAllAiSections = useCallback(
    async (baseDoc?: PatientMedicationEducationDocument) => {
      let current = baseDoc ?? doc
      if (!current) return
      const aiSections = getMedicationEducationSections(current.scope, {
        includePregnancy: true,
      }).filter((s) => s.aiCapable)
      const sectionIds = aiSections.map((s) => s.id)

      setGenerationProgress({
        active: true,
        sectionIds,
        completedIds: [],
        currentId: sectionIds[0] ?? null,
        errorSectionId: null,
      })

      for (const s of aiSections) {
        setGenerationProgress((prev) => ({
          ...prev,
          currentId: s.id,
        }))
        const updated = await generateSectionFor(current, s.id, { batch: true })
        if (updated) {
          current = updated
          setGenerationProgress((prev) => ({
            ...prev,
            completedIds: [...prev.completedIds, s.id],
          }))
        } else {
          setGenerationProgress((prev) => ({
            ...prev,
            active: false,
            errorSectionId: s.id,
          }))
          return
        }
      }

      setGenerationProgress((prev) => ({
        ...prev,
        active: false,
        currentId: null,
      }))
    },
    [doc, generateSectionFor],
  )

  const finalize = useCallback(async () => {
    if (!doc) return null
    const check = canFinalizeDocument(doc, uiLanguage)
    if (!check.ok) {
      setError(check.reasons.join('; '))
      return null
    }
    setError(null)
    try {
      const identity = await fetchMedicationEducationIdentity(caseId, doc.language)
      const withIdentity = applyIdentityToDocument(doc, identity)
      const text = assembleMedicationEducationText(withIdentity, sectionLabels)
      let next = finalizeDocument(withIdentity, text)
      next.review.reviewedAt = new Date().toISOString()
      await persist(next)
      syncAcceptedMedicationEducationToPatientFile(next)
      return next
    } catch (e) {
      setError((e as Error).message)
      return null
    }
  }, [caseId, doc, persist, sectionLabels, uiLanguage])

  return {
    doc,
    setDoc,
    docs,
    loading,
    error,
    generatingSectionId,
    generationProgress,
    lastDebug,
    sectionLabels,
    refreshDocs,
    createNew,
    openDoc,
    persist,
    updateSection: (sectionId: string, content: string) =>
      doc ? persist(updateSectionContent(doc, sectionId, content)) : undefined,
    accept: async (sectionId: string) => {
      if (!doc) return undefined
      setError(null)
      return persist(acceptSection(doc, sectionId))
    },
    acceptAll: async () => {
      if (!doc) return undefined
      setError(null)
      return persist(acceptAllSections(doc))
    },
    revert: (sectionId: string) => (doc ? persist(revertSection(doc, sectionId)) : undefined),
    toggleIncluded: (sectionId: string) =>
      doc ? persist(toggleSectionIncluded(doc, sectionId)) : undefined,
    generateSection,
    generateAllAiSections,
    finalize,
    buildPreGenerationPanel: (params: {
      scope: MedicationEducationScope
      medicationIds: string[]
    }) =>
      buildPreGenerationPanel({
        caseId,
        scope: params.scope,
        medicationIds: params.medicationIds,
        language: uiLanguage,
        sectionCount: getMedicationEducationSections(params.scope).filter((s) => s.aiCapable).length,
      }),
  }
}
