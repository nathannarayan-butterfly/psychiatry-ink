import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiMode } from '../types/aiUsage'
import type { ArztbriefDraft, ArztbriefDocumentType } from '../types/arztbrief'
import { useTranslation } from '../context/TranslationContext'
import { generateArztbriefSectionApi } from '../services/arztbrief/api'
import { loadPatientMetadata } from '../utils/cryptoVault'
import {
  applyAiGeneratedSection,
  applyFetchedSections,
  acceptSection,
  createArztbriefDraft,
  revertSection,
  toggleSectionIncluded,
  updateSectionContent,
} from '../utils/arztbrief/draftOps'
import { buildArztbriefEvidenceBundle } from '../utils/arztbrief/evidenceBundle'
import { getArztbriefSections } from '../data/arztbriefSections'
import {
  fetchArztbriefBlankData,
  fetchArztbriefPatientData,
} from '../utils/arztbrief/fetchPatientData'
import {
  applyIdentityToDraftSections,
  assembleArztbriefText,
} from '../utils/arztbrief/export'
import {
  duplicateArztbriefDraft,
  getArztbriefDraft,
  loadArztbriefDrafts,
  resolveArztbriefScopeId,
  saveArztbriefDraft,
  ARZTBRIEF_DOCS_CHANGED_EVENT,
} from '../utils/arztbrief/storage'
import { estimateTokensFromText } from '../utils/estimateCredits'
import { DEFAULT_CASE_ID } from '../utils/caseContext'

function estimateSectionCredits(mode: AiMode, evidenceText: string): number {
  const tokens = estimateTokensFromText(evidenceText)
  const base = mode === 'economic' ? 12 : mode === 'gruendlich' ? 48 : 24
  if (tokens > 4000) return Math.round(base * 1.5)
  return base
}

export function useArztbriefDocument(caseId: string, patientScoped: boolean) {
  const { language } = useTranslation()
  const scopeId = resolveArztbriefScopeId(
    patientScoped ? caseId : undefined,
    patientScoped,
  )

  const [draft, setDraft] = useState<ArztbriefDraft | null>(null)
  const [drafts, setDrafts] = useState<ArztbriefDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastDebug, setLastDebug] = useState<Record<string, unknown> | null>(null)

  const refreshDrafts = useCallback(async () => {
    const list = await loadArztbriefDrafts(scopeId)
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
    window.addEventListener(ARZTBRIEF_DOCS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(ARZTBRIEF_DOCS_CHANGED_EVENT, handler)
  }, [scopeId, refreshDrafts])

  const createNew = useCallback(
    async (documentType: ArztbriefDocumentType, aiMode: AiMode) => {
      setLoading(true)
      setError(null)
      try {
        let next = createArztbriefDraft({
          documentType,
          patientScoped,
          caseId: patientScoped ? caseId : undefined,
          aiMode,
        })

        if (patientScoped && caseId !== DEFAULT_CASE_ID) {
          const fetched = await fetchArztbriefPatientData(caseId, documentType)
          next = applyFetchedSections(next, fetched.sections)
          next = applyIdentityToDraftSections(next, fetched.identity, fetched)
        } else {
          const blank = await fetchArztbriefBlankData()
          next.sourceSnapshotIds = blank.sourceSnapshotIds
        }

        await saveArztbriefDraft(scopeId, next)
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

  const openDraft = useCallback(async (id: string) => {
    const doc = await getArztbriefDraft(scopeId, id)
    setDraft(doc)
    return doc
  }, [scopeId])

  const persist = useCallback(
    async (next: ArztbriefDraft) => {
      const saved = await saveArztbriefDraft(scopeId, next)
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
          .map((s) => s.currentContent)
          .join('\n')
        const evidence = buildArztbriefEvidenceBundle({
          caseId: patientScoped && caseId !== DEFAULT_CASE_ID ? caseId : undefined,
          documentType: draft.documentType,
          therapieVerlaufLength: draft.therapieVerlaufLength,
          manualContext: !patientScoped ? manualSections : undefined,
          patientName: patient?.metadata.name,
        })

        const result = await generateArztbriefSectionApi({
          caseId: patientScoped ? caseId : undefined,
          documentType: draft.documentType,
          sectionId,
          mode: draft.aiMode,
          therapieVerlaufLength: draft.therapieVerlaufLength,
          evidence,
          language: language === 'en' ? 'en' : 'de',
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
    [caseId, draft, language, patientScoped, persist],
  )

  const duplicatePrevious = useCallback(
    async (id: string) => {
      const copy = await duplicateArztbriefDraft(scopeId, id)
      if (copy) {
        setDraft(copy)
        await refreshDrafts()
      }
      return copy
    },
    [refreshDrafts, scopeId],
  )

  const finalText = useMemo(() => {
    if (!draft) return ''
    const labels: Record<string, string> = {}
    for (const def of getArztbriefSections(draft.documentType)) {
      labels[def.id] = language === 'en' ? def.labelEn : def.labelDe
    }
    return assembleArztbriefText(draft, labels)
  }, [draft, language])

  const saveFinal = useCallback(async () => {
    if (!draft) return
    const text = finalText
    const next: ArztbriefDraft = {
      ...draft,
      finalText: text,
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
      const evidence = buildArztbriefEvidenceBundle({
        caseId: patientScoped && caseId !== DEFAULT_CASE_ID ? caseId : undefined,
        documentType: draft.documentType,
        therapieVerlaufLength: draft.therapieVerlaufLength,
      })
      return estimateSectionCredits(draft.aiMode, evidence.summaryText)
    },
  }
}
