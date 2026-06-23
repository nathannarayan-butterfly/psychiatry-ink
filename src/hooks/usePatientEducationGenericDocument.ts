import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiMode } from '../types/aiUsage'
import type {
  GenericEducationAudience,
  GenericEducationDetailStyle,
  GenericEducationLanguage,
  GenericEducationReadingLevel,
  GenericEducationSubjectKind,
  GenericPatientEducationDocument,
} from '../types/patientEducationGeneric'
import { useTranslation } from '../context/TranslationContext'
import { generatePatientEducationGenericSectionApi } from '../services/patientEducationGeneric/api'
import {
  acceptAllSections,
  acceptSection,
  applyAiGeneratedSection,
  createGenericEducationDocument,
  revertSection,
  toggleSectionIncluded,
  updateSectionContent,
} from '../utils/patientEducationGeneric/draftOps'
import {
  loadGenericEducationDocuments,
  saveGenericEducationDocument,
  deleteGenericEducationDocument,
  PATIENT_EDUCATION_GENERIC_CHANGED_EVENT,
} from '../utils/patientEducationGeneric/storage'
import { getGenericEducationSections } from '../data/patientEducationGenericSections'
import { estimateTokensFromText } from '../utils/estimateCredits'

/** Reuses the medication-education progress shape so the generation dialog is shared. */
export type GenericEducationGenerationProgress = {
  active: boolean
  sectionIds: string[]
  completedIds: string[]
  currentId: string | null
  errorSectionId: string | null
}

const EMPTY_GENERATION_PROGRESS: GenericEducationGenerationProgress = {
  active: false,
  sectionIds: [],
  completedIds: [],
  currentId: null,
  errorSectionId: null,
}

function estimateSectionCredits(mode: AiMode, contextText: string): number {
  const tokens = estimateTokensFromText(contextText)
  const base = mode === 'gruendlich' ? 28 : 16
  return tokens > 4000 ? Math.round(base * 1.3) : base
}

export function usePatientEducationGenericDocument() {
  const { language } = useTranslation()
  const uiLanguage: GenericEducationLanguage = language === 'en' ? 'en' : 'de'

  const [doc, setDoc] = useState<GenericPatientEducationDocument | null>(null)
  const [docs, setDocs] = useState<GenericPatientEducationDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<GenericEducationGenerationProgress>(
    EMPTY_GENERATION_PROGRESS,
  )
  const [error, setError] = useState<string | null>(null)

  const refreshDocs = useCallback(() => {
    setDocs(loadGenericEducationDocuments())
  }, [])

  useEffect(() => {
    refreshDocs()
  }, [refreshDocs])

  useEffect(() => {
    const handler = () => refreshDocs()
    window.addEventListener(PATIENT_EDUCATION_GENERIC_CHANGED_EVENT, handler)
    return () => window.removeEventListener(PATIENT_EDUCATION_GENERIC_CHANGED_EVENT, handler)
  }, [refreshDocs])

  const sectionLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const s of getGenericEducationSections()) {
      labels[s.id] = uiLanguage === 'en' ? s.labelEn : s.labelDe
    }
    return labels
  }, [uiLanguage])

  const persist = useCallback((next: GenericPatientEducationDocument) => {
    const saved = saveGenericEducationDocument(next)
    setDoc(saved)
    setDocs(loadGenericEducationDocuments())
    return saved
  }, [])

  const createNew = useCallback(
    (params: {
      subject: string
      subjectKind: GenericEducationSubjectKind
      audience: GenericEducationAudience
      readingLevel: GenericEducationReadingLevel
      detailStyle: GenericEducationDetailStyle
      additionalContext?: string
      language?: GenericEducationLanguage
      aiMode: AiMode
    }) => {
      setError(null)
      const created = createGenericEducationDocument({
        subject: params.subject,
        subjectKind: params.subjectKind,
        audience: params.audience,
        readingLevel: params.readingLevel,
        detailStyle: params.detailStyle,
        additionalContext: params.additionalContext,
        language: params.language ?? uiLanguage,
        aiMode: params.aiMode,
      })
      return persist(created)
    },
    [persist, uiLanguage],
  )

  const openDoc = useCallback(
    (id: string) => {
      const found = loadGenericEducationDocuments().find((d) => d.id === id) ?? null
      setDoc(found)
      return found
    },
    [],
  )

  const removeDoc = useCallback(
    (id: string) => {
      deleteGenericEducationDocument(id)
      setDoc((prev) => (prev?.id === id ? null : prev))
      setDocs(loadGenericEducationDocuments())
    },
    [],
  )

  const generateSectionFor = useCallback(
    async (
      baseDoc: GenericPatientEducationDocument,
      sectionId: string,
      options?: { batch?: boolean },
    ): Promise<GenericPatientEducationDocument | null> => {
      const def = getGenericEducationSections().find((s) => s.id === sectionId)
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
        const result = await generatePatientEducationGenericSectionApi({
          subject: baseDoc.subject,
          subjectKind: baseDoc.subjectKind,
          sectionId,
          sectionLabel: baseDoc.language === 'en' ? def.labelEn : def.labelDe,
          promptHint: baseDoc.language === 'en' ? def.promptHintEn : def.promptHintDe,
          audience: baseDoc.audience,
          readingLevel: baseDoc.readingLevel,
          detailStyle: baseDoc.detailStyle,
          additionalContext: baseDoc.additionalContext,
          language: baseDoc.language,
          mode: baseDoc.aiMode,
        })

        const credits = estimateSectionCredits(baseDoc.aiMode, baseDoc.additionalContext ?? '')
        const next = applyAiGeneratedSection(baseDoc, sectionId, result.content, {
          provider: result.provider,
          model: result.model,
          mode: baseDoc.aiMode,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          creditsCharged: credits,
          references: result.references,
        })
        const saved = persist(next)

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
          setGenerationProgress((prev) => ({ ...prev, active: false, errorSectionId: sectionId }))
        }
        return null
      } finally {
        setGeneratingSectionId(null)
      }
    },
    [persist],
  )

  const generateSection = useCallback(
    async (sectionId: string) => {
      if (!doc) return
      await generateSectionFor(doc, sectionId)
    },
    [doc, generateSectionFor],
  )

  const generateAllAiSections = useCallback(
    async (baseDoc?: GenericPatientEducationDocument) => {
      let current = baseDoc ?? doc
      if (!current) return
      const aiSections = getGenericEducationSections().filter((s) => s.aiCapable)
      const sectionIds = aiSections.map((s) => s.id)

      setGenerationProgress({
        active: true,
        sectionIds,
        completedIds: [],
        currentId: sectionIds[0] ?? null,
        errorSectionId: null,
      })

      for (const s of aiSections) {
        setGenerationProgress((prev) => ({ ...prev, currentId: s.id }))
        const updated = await generateSectionFor(current, s.id, { batch: true })
        if (updated) {
          current = updated
          setGenerationProgress((prev) => ({
            ...prev,
            completedIds: [...prev.completedIds, s.id],
          }))
        } else {
          setGenerationProgress((prev) => ({ ...prev, active: false, errorSectionId: s.id }))
          return
        }
      }

      setGenerationProgress((prev) => ({ ...prev, active: false, currentId: null }))
    },
    [doc, generateSectionFor],
  )

  return {
    doc,
    setDoc,
    docs,
    loading,
    setLoading,
    error,
    generatingSectionId,
    generationProgress,
    sectionLabels,
    refreshDocs,
    createNew,
    openDoc,
    removeDoc,
    persist,
    updateSection: (sectionId: string, content: string) =>
      doc ? persist(updateSectionContent(doc, sectionId, content)) : undefined,
    accept: (sectionId: string) => {
      if (!doc) return undefined
      setError(null)
      return persist(acceptSection(doc, sectionId))
    },
    acceptAll: () => {
      if (!doc) return undefined
      setError(null)
      return persist(acceptAllSections(doc))
    },
    revert: (sectionId: string) => (doc ? persist(revertSection(doc, sectionId)) : undefined),
    toggleIncluded: (sectionId: string) =>
      doc ? persist(toggleSectionIncluded(doc, sectionId)) : undefined,
    generateSection,
    generateAllAiSections,
  }
}
