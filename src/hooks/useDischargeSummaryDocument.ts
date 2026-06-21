import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiMode } from '../types/aiUsage'
import type {
  DischargeSummaryDocumentType,
  DischargeSummaryDraft,
  DischargeSummaryRegion,
} from '../types/dischargeSummary'
import { generateDischargeSummarySectionApi } from '../services/dischargeSummary/api'
import { loadPatientMetadata } from '../utils/cryptoVault'
import {
  applyAiGeneratedSection,
  applyFetchedSections,
  acceptSection,
  createDischargeSummaryDraft,
  revertSection,
  toggleSectionIncluded,
  updateSectionContent,
} from '../utils/dischargeSummary/draftOps'
import { buildDischargeSummaryEvidenceBundle } from '../utils/dischargeSummary/evidenceBundle'
import {
  fetchDischargeSummaryBlankData,
  fetchDischargeSummaryPatientData,
} from '../utils/dischargeSummary/fetchPatientData'
import {
  applyIdentityToDraftSections,
  assembleDischargeSummaryText,
  buildSectionLabelsForDraft,
} from '../utils/dischargeSummary/export'
import {
  duplicateDischargeSummaryDraft,
  getDischargeSummaryDraft,
  loadDischargeSummaryDrafts,
  resolveDischargeSummaryScopeId,
  saveDischargeSummaryDraft,
  DISCHARGE_SUMMARY_DOCS_CHANGED_EVENT,
} from '../utils/dischargeSummary/storage'
import { estimateTokensFromText } from '../utils/estimateCredits'
import { DEFAULT_CASE_ID } from '../utils/caseContext'

function estimateSectionCredits(mode: AiMode, evidenceText: string): number {
  const tokens = estimateTokensFromText(evidenceText)
  const base = mode === 'economic' ? 12 : mode === 'gruendlich' ? 48 : 24
  if (tokens > 4000) return Math.round(base * 1.5)
  return base
}

export function useDischargeSummaryDocument(caseId: string, patientScoped: boolean) {
  const scopeId = resolveDischargeSummaryScopeId(
    patientScoped ? caseId : undefined,
    patientScoped,
  )

  const [draft, setDraft] = useState<DischargeSummaryDraft | null>(null)
  const [drafts, setDrafts] = useState<DischargeSummaryDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastDebug, setLastDebug] = useState<Record<string, unknown> | null>(null)

  const refreshDrafts = useCallback(async () => {
    const list = await loadDischargeSummaryDrafts(scopeId)
    setDrafts(list)
  }, [scopeId])

  useEffect(() => {
    void refreshDrafts()
  }, [refreshDrafts])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ scopeId: string }>).detail
      if (detail?.scopeId === scopeId) void refreshDrafts()
    }
    window.addEventListener(DISCHARGE_SUMMARY_DOCS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DISCHARGE_SUMMARY_DOCS_CHANGED_EVENT, handler)
  }, [scopeId, refreshDrafts])

  const createNew = useCallback(
    async (
      documentType: DischargeSummaryDocumentType,
      region: DischargeSummaryRegion,
      aiMode: AiMode,
    ) => {
      setLoading(true)
      setError(null)
      try {
        let next = createDischargeSummaryDraft({
          documentType,
          region,
          patientScoped,
          caseId: patientScoped ? caseId : undefined,
          aiMode,
        })

        if (patientScoped && caseId !== DEFAULT_CASE_ID) {
          const fetched = await fetchDischargeSummaryPatientData(caseId, documentType, region)
          next = applyFetchedSections(next, fetched.sections)
          next = applyIdentityToDraftSections(next, fetched.identity, fetched)
        } else {
          const blank = await fetchDischargeSummaryBlankData()
          next.sourceSnapshotIds = blank.sourceSnapshotIds
        }

        await saveDischargeSummaryDraft(scopeId, next)
        setDraft(next)
        await refreshDrafts()
        return next
      } catch (e) {
        setError((e as Error).message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [caseId, patientScoped, refreshDrafts, scopeId],
  )

  const openDraft = useCallback(
    async (id: string) => {
      const doc = await getDischargeSummaryDraft(scopeId, id)
      setDraft(doc)
      return doc
    },
    [scopeId],
  )

  const persist = useCallback(
    async (next: DischargeSummaryDraft) => {
      const saved = await saveDischargeSummaryDraft(scopeId, next)
      setDraft(saved)
      await refreshDrafts()
      return saved
    },
    [refreshDrafts, scopeId],
  )

  const updateSection = useCallback(
    async (sectionId: string, content: string) => {
      if (!draft) return
      const next = updateSectionContent(draft, sectionId, content)
      await persist(next)
    },
    [draft, persist],
  )

  const accept = useCallback(
    async (sectionId: string) => {
      if (!draft) return
      await persist(acceptSection(draft, sectionId))
    },
    [draft, persist],
  )

  const revert = useCallback(
    async (sectionId: string) => {
      if (!draft) return
      await persist(revertSection(draft, sectionId))
    },
    [draft, persist],
  )

  const toggleIncluded = useCallback(
    async (sectionId: string) => {
      if (!draft) return
      await persist(toggleSectionIncluded(draft, sectionId))
    },
    [draft, persist],
  )

  const generateSection = useCallback(
    async (sectionId: string) => {
      if (!draft) return
      setGeneratingSectionId(sectionId)
      setError(null)
      try {
        const patient = patientScoped ? await loadPatientMetadata(caseId) : null
        const manualSections = Object.values(draft.sections)
          .filter((s) => s.id !== 'patient-details' && s.id !== 'header')
          .map((s) => s.currentContent)
          .join('\n')
        const evidence = buildDischargeSummaryEvidenceBundle({
          caseId: patientScoped && caseId !== DEFAULT_CASE_ID ? caseId : undefined,
          documentType: draft.documentType,
          region: draft.region,
          hospitalCourseLength: draft.hospitalCourseLength,
          manualContext: !patientScoped ? manualSections : undefined,
          patientName: patient?.metadata.name,
        })

        const result = await generateDischargeSummarySectionApi({
          caseId: patientScoped ? caseId : undefined,
          documentType: draft.documentType,
          region: draft.region,
          sectionId,
          mode: draft.aiMode,
          hospitalCourseLength: draft.hospitalCourseLength,
          evidence,
          patientHints: patient
            ? {
                patientName: patient.metadata.name,
                patientDob: patient.metadata.geburtsdatum,
              }
            : undefined,
        })

        if (result.debug) {
          setLastDebug(result.debug as Record<string, unknown>)
        }

        const credits = estimateSectionCredits(draft.aiMode, evidence.summaryText)
        const next = applyAiGeneratedSection(draft, sectionId, result.content, {
          provider: result.provider,
          model: result.model,
          mode: draft.aiMode,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          creditsCharged: credits,
        })
        await persist(next)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setGeneratingSectionId(null)
      }
    },
    [caseId, draft, patientScoped, persist],
  )

  const duplicatePrevious = useCallback(
    async (id: string) => {
      const copy = await duplicateDischargeSummaryDraft(scopeId, id)
      if (copy) {
        setDraft(copy)
        await refreshDrafts()
      }
      return copy
    },
    [refreshDrafts, scopeId],
  )

  const sectionLabels = useMemo(() => {
    if (!draft) return {}
    return buildSectionLabelsForDraft(draft)
  }, [draft])

  const finalText = useMemo(() => {
    if (!draft) return ''
    return assembleDischargeSummaryText(draft, sectionLabels)
  }, [draft, sectionLabels])

  const saveFinal = useCallback(async () => {
    if (!draft) return
    const next: DischargeSummaryDraft = {
      ...draft,
      finalText,
      updatedAt: new Date().toISOString(),
    }
    await persist(next)
  }, [draft, finalText, persist])

  return {
    draft,
    drafts,
    loading,
    generatingSectionId,
    error,
    lastDebug,
    sectionLabels,
    setDraft,
    createNew,
    openDraft,
    updateSection,
    accept,
    revert,
    toggleIncluded,
    generateSection,
    duplicatePrevious,
    saveFinal,
    finalText,
    estimateSectionCredits: () => {
      if (!draft) return 0
      const evidence = buildDischargeSummaryEvidenceBundle({
        caseId: patientScoped && caseId !== DEFAULT_CASE_ID ? caseId : undefined,
        documentType: draft.documentType,
        region: draft.region,
        hospitalCourseLength: draft.hospitalCourseLength,
      })
      return estimateSectionCredits(draft.aiMode, evidence.summaryText)
    },
  }
}
