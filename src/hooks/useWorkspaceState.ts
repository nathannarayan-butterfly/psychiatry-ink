import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  copyTextToClipboard,
  getNotionDocumentCopyText,
  loadNotionDocumentSnapshot,
  type NotionDocumentSnapshot,
} from '../utils/notionDocumentActions'
import type {
  AiGenerationScope,
  AiModelTier,
  DocumentSection,
  DocumentType,
  InputMode,
} from '../types'
import type { EnglishVariant, UiLanguage } from '../types/settings'
import {
  buildPsychopathNormalBefundText,
  buildPsychopathNormalChecklistSelections,
  buildPsychopathNormalSectionTexts,
} from '../data/psychopathNormalBefund'
import { compileChecklistText } from '../utils/checklist'
import {
  getInitialEditorContent,
  mergeSectionStatuses,
  resolveDocumentTypeWithVariant,
} from '../utils/workspaceComponents'
import type { AiToolKey } from '../data/aiTools'
import type { WorkspaceAiConfig } from '../types/aiManager'
import { mergeAiConfig, resolveAiContext } from '../utils/aiManager'
import {
  resolveAiAutoSelection,
  type ContentInputOrigin,
} from '../utils/aiAutoDefaults'
import { getLocalizedTherapieVerlaufSections } from '../services/hintTranslationAgent'
import { executeAiGeneration, isPseudonymizationEnabled } from '../services/aiGeneration'
import { scheduleAiGenerationImprint } from '../utils/clinicalImprint'
import { showNotionToast } from '../components/notion/NotionToast'
import { loadPatientMetadata } from '../utils/cryptoVault'
import { translateUi } from '../data/uiTranslations'
import { resolveGenerationCall } from '../utils/resolveGenerationCall'
import { extractTherapieVerlaufSections } from '../utils/extractTherapieVerlauf'
import { estimateGenerationCredits } from '../utils/estimateCredits'
import { resolveKiExtraInstruction } from '../utils/resolveKiExtraInstruction'
import { hasAiAndDictationCredits } from '../utils/planGating'
import { useCredits } from './useCredits'
import { useDictation } from './useDictation'
import { useKiInstructions } from './useKiInstructions'

const AI_MODEL_TIER_KEY = 'psychiatry-ink:ai-model-tier'
const AI_AUTO_MODE_KEY = 'psychiatry-ink:ai-auto-mode'

function readAiModelTier(): AiModelTier {
  const raw = localStorage.getItem(AI_MODEL_TIER_KEY)
  if (raw === 'fast' || raw === 'standard' || raw === 'thorough') return raw
  return 'standard'
}

function readAiAutoMode(): boolean {
  return localStorage.getItem(AI_AUTO_MODE_KEY) === 'on'
}

function cloneSections(sections: DocumentSection[]): DocumentSection[] {
  return sections.map((section) => ({ ...section }))
}

function normalizeSections(
  sections: DocumentSection[],
  activeSectionId: string | null,
): DocumentSection[] {
  return sections.map((section) => {
    if (section.id === activeSectionId) {
      return { ...section, status: section.status === 'saved' ? 'saved' : 'active' }
    }
    if (section.status === 'active') {
      return { ...section, status: 'draft' }
    }
    return section
  })
}

function buildInitialVariantIds(documentTypes: DocumentType[]): Record<string, string> {
  const ids: Record<string, string> = {}

  for (const type of documentTypes) {
    if (type.variants?.length && type.defaultVariantId) {
      ids[type.id] = type.defaultVariantId
    }
  }

  return ids
}

function buildInitialWorkspaceForType(nextType: DocumentType): {
  sections: DocumentSection[]
  activeSectionId: string | null
  sectionContents: Record<string, string>
  editorContent: string
  generatedContent: string
} {
  if (nextType.multistage && nextType.sections) {
    const nextSections = cloneSections(nextType.sections)
    const firstSection = nextSections[0]
    const firstSectionId = firstSection?.id ?? null
    const initialContent = getInitialEditorContent(undefined, firstSection?.prefilledText)

    return {
      sections: nextSections.map((section, index) => ({
        ...section,
        status: index === 0 ? (initialContent.trim() ? 'draft' : 'active') : 'empty',
      })),
      activeSectionId: firstSectionId,
      sectionContents:
        firstSectionId && initialContent ? { [firstSectionId]: initialContent } : {},
      editorContent: initialContent,
      generatedContent: initialContent,
    }
  }

  const initialContent = getInitialEditorContent(undefined, nextType.prefilledText)

  return {
    sections: [],
    activeSectionId: null,
    sectionContents: {},
    editorContent: initialContent,
    generatedContent: initialContent,
  }
}

export function useWorkspaceState(
  documentTypes: DocumentType[],
  language: UiLanguage = 'de',
  caseId?: string,
  englishVariant: EnglishVariant = 'uk',
) {
  const { balance: creditBalance, setBalanceFromServer, hasEnoughCredits } = useCredits()
  const kiInstructions = useKiInstructions()

  // Patient hints for pseudonymization — loaded async from encrypted vault
  const patientHintsRef = useRef<{ patientName?: string; patientDob?: string }>({})
  useEffect(() => {
    if (!caseId) {
      patientHintsRef.current = {}
      return
    }
    loadPatientMetadata(caseId)
      .then((loaded) => {
        if (loaded) {
          patientHintsRef.current = {
            patientName: loaded.metadata.name || undefined,
            patientDob: loaded.metadata.geburtsdatum || undefined,
          }
        } else {
          patientHintsRef.current = {}
        }
      })
      .catch(() => {
        patientHintsRef.current = {}
      })
  }, [caseId])

  const getDocumentType = useCallback(
    (id: string) => documentTypes.find((type) => type.id === id),
    [documentTypes],
  )

  const [activeVariantIds, setActiveVariantIds] = useState<Record<string, string>>(() =>
    buildInitialVariantIds(documentTypes),
  )

  const resolveType = useCallback(
    (typeId: string, variantId?: string) => {
      const baseType = getDocumentType(typeId)
      if (!baseType) return undefined
      return resolveDocumentTypeWithVariant(
        baseType,
        variantId ?? activeVariantIds[typeId],
      )
    },
    [activeVariantIds, getDocumentType],
  )

  // Default to no document type selected — workspace opens as a blank page.
  // User picks a page type via right-click context menu.
  const initialType = undefined
  const initialWorkspace = initialType
    ? buildInitialWorkspaceForType(initialType)
    : {
        sections: [] as DocumentSection[],
        activeSectionId: null as string | null,
        sectionContents: {} as Record<string, string>,
        editorContent: '',
        generatedContent: '',
      }

  const [selectedDocumentType, setSelectedDocumentType] = useState(
    () => '',
  )
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [sections, setSections] = useState<DocumentSection[]>(initialWorkspace.sections)
  const [sectionContents, setSectionContents] = useState<Record<string, string>>(
    initialWorkspace.sectionContents,
  )
  const [editorContent, setEditorContent] = useState(initialWorkspace.editorContent)
  const [generatedContent, setGeneratedContent] = useState(initialWorkspace.generatedContent)
  const [aiToolsExpanded, setAiToolsExpanded] = useState(false)
  const [aiAutoMode, setAiAutoMode] = useState(readAiAutoMode)
  const [aiModelTier, setAiModelTierState] = useState<AiModelTier>(readAiModelTier)
  const [selectedAiTool, setSelectedAiTool] = useState<AiToolKey | null>(null)
  const [kiExtraInstruction, setKiExtraInstruction] = useState(() =>
    resolveKiExtraInstruction(kiInstructions.settings, ''),
  )
  const [userToolOverride, setUserToolOverride] = useState(false)
  const [contentInputOrigin, setContentInputOrigin] =
    useState<ContentInputOrigin>('typed')
  const [inputMode, setInputMode] = useState<InputMode>('write')
  const [therapieVerlaufSourceText, setTherapieVerlaufSourceText] = useState('')
  const [lastVersion, setLastVersion] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPendingReview, setGenerationPendingReview] = useState(false)
  const [generationWasAccepted, setGenerationWasAccepted] = useState(false)
  const [generationScope, setGenerationScope] = useState<AiGenerationScope>('segment')
  const [incompleteGenerationWarning, setIncompleteGenerationWarning] = useState<
    DocumentSection[] | null
  >(null)
  const [checklistSelections, setChecklistSelections] = useState<
    Record<string, Record<string, boolean>>
  >({})

  const applyTranscription = useCallback(
    (text: string) => {
      const next = editorContent.trim() ? `${editorContent.trim()}\n\n${text}` : text

      setEditorContent(next)
      setGeneratedContent(next)
      setInputMode('write')
      setContentInputOrigin('dictated')
      setUserToolOverride(false)

      if (activeSectionId) {
        setSectionContents((current) => ({
          ...current,
          [activeSectionId]: next,
        }))
        setSections((current) =>
          current.map((section) =>
            section.id === activeSectionId ? { ...section, status: 'draft' } : section,
          ),
        )
      }
    },
    [activeSectionId, editorContent],
  )

  const endDictationSession = useCallback(() => {
    setInputMode('write')
  }, [])

  const {
    phase: dictationPhase,
    durationMs: dictationDurationMs,
    playbackMs: dictationPlaybackMs,
    isPlayingBack,
    dictationError,
    isDictationActive,
    startDictation: beginDictation,
    pauseDictation,
    resumeDictation,
    stopRecording,
    togglePlayback,
    discardRecording,
    transcribe: transcribeRecording,
    resetDictation,
  } = useDictation({
    onTranscriptionComplete: applyTranscription,
    onSessionEnd: endDictationSession,
  })

  const currentDocumentType = useMemo(
    () => resolveType(selectedDocumentType),
    [resolveType, selectedDocumentType],
  )

  const activeVariantId = activeVariantIds[selectedDocumentType]

  useEffect(() => {
    const currentType = resolveType(selectedDocumentType)

    if (!currentType) {
      // Empty string = intentional blank page, don't fall back to Aufnahme.
      setSections([])
      setActiveSectionId(null)
      return
    }

    if (!currentType.multistage || !currentType.sections) {
      setSections([])
      setActiveSectionId(null)
      return
    }

    const templates = currentType.sections.map(
      ({ id, label, description, exampleHint, prefilledText, checklistItems, ai }) => ({
        id,
        label,
        description,
        exampleHint,
        prefilledText,
        checklistItems,
        ai,
      }),
    )

    setActiveSectionId((currentActive) => {
      const nextActive =
        currentActive && templates.some((section) => section.id === currentActive)
          ? currentActive
          : (templates[0]?.id ?? null)

      setSections((currentSections) =>
        mergeSectionStatuses(templates, currentSections, nextActive),
      )

      return nextActive
    })
  }, [documentTypes, resolveType, selectedDocumentType])

  const resetWorkspaceSession = useCallback(() => {
    setAiToolsExpanded(false)
    setLastVersion(null)
    setIsGenerating(false)
    setGenerationPendingReview(false)
    setGenerationWasAccepted(false)
    setGenerationScope('segment')
    setIncompleteGenerationWarning(null)
    setInputMode('write')
    setTherapieVerlaufSourceText('')
    resetDictation()
  }, [resetDictation])

  const resetToBlankPage = useCallback(() => {
    setSelectedDocumentType('')
    setEditorContent('')
    setGeneratedContent('')
    setSectionContents({})
    setChecklistSelections({})
    resetWorkspaceSession()
  }, [resetWorkspaceSession])

  const applyWorkspaceForType = useCallback((nextType: DocumentType) => {
    const initial = buildInitialWorkspaceForType(nextType)
    setSections(initial.sections)
    setActiveSectionId(initial.activeSectionId)
    setSectionContents(initial.sectionContents)
    setEditorContent(initial.editorContent)
    setGeneratedContent(initial.generatedContent)
    setChecklistSelections({})
  }, [])

  const syncAiSettings = useCallback(
    (
      componentAi?: WorkspaceAiConfig,
      variantAi?: WorkspaceAiConfig,
      sectionAi?: WorkspaceAiConfig,
      sourceText?: string,
    ) => {
      const merged = mergeAiConfig(componentAi, variantAi, sectionAi)

      if (aiAutoMode) {
        const selection = resolveAiAutoSelection({
          componentId: selectedDocumentType,
          variantId: activeVariantIds[selectedDocumentType],
          sectionId: activeSectionId ?? undefined,
          generationScope,
          inputMode,
          contentInputOrigin,
          mergedAi: merged,
          sourceText,
        })
        setAiModelTierState(selection.tier)
        localStorage.setItem(AI_MODEL_TIER_KEY, selection.tier)
        if (!userToolOverride) {
          setSelectedAiTool(selection.tool)
        }
        return
      }

      setAiModelTierState(merged.defaultTier)
      localStorage.setItem(AI_MODEL_TIER_KEY, merged.defaultTier)
    },
    [
      activeSectionId,
      activeVariantIds,
      aiAutoMode,
      contentInputOrigin,
      generationScope,
      inputMode,
      selectedDocumentType,
      userToolOverride,
    ],
  )

  const selectDocumentType = useCallback(
    (typeId: string) => {
      const nextType = resolveType(typeId)
      if (!nextType) return

      const baseType = getDocumentType(typeId)
      const variantId = activeVariantIds[typeId] ?? baseType?.defaultVariantId
      const variant = baseType?.variants?.find((item) => item.id === variantId)

      setSelectedDocumentType(typeId)
      resetWorkspaceSession()
      applyWorkspaceForType(nextType)
      setContentInputOrigin('typed')
      setUserToolOverride(false)
      setKiExtraInstruction(resolveKiExtraInstruction(kiInstructions.settings, typeId))
      syncAiSettings(baseType?.ai, variant?.ai)
    },
    [
      activeVariantIds,
      applyWorkspaceForType,
      getDocumentType,
      kiInstructions.settings,
      resetWorkspaceSession,
      resolveType,
      syncAiSettings,
    ],
  )

  const selectComponentVariant = useCallback(
    (variantId: string) => {
      const baseType = getDocumentType(selectedDocumentType)
      if (!baseType?.variants?.length) return
      if (activeVariantIds[selectedDocumentType] === variantId) return

      const variant = baseType.variants.find((item) => item.id === variantId)
      const nextType = resolveDocumentTypeWithVariant(baseType, variantId)
      setActiveVariantIds((current) => ({ ...current, [selectedDocumentType]: variantId }))
      resetWorkspaceSession()
      applyWorkspaceForType(nextType)
      setContentInputOrigin('typed')
      setUserToolOverride(false)
      syncAiSettings(baseType.ai, variant?.ai)
    },
    [
      activeVariantIds,
      applyWorkspaceForType,
      getDocumentType,
      resetWorkspaceSession,
      selectedDocumentType,
      syncAiSettings,
    ],
  )

  const selectSection = useCallback(
    (sectionId: string) => {
      if (activeSectionId) {
        setSectionContents((current) => ({
          ...current,
          [activeSectionId]: editorContent,
        }))
      }

      const sectionConfig = currentDocumentType?.sections?.find(
        (section) => section.id === sectionId,
      )
      const nextContent = getInitialEditorContent(
        sectionContents[sectionId],
        sectionConfig?.prefilledText,
      )

      setActiveSectionId(sectionId)
      setSections((current) => normalizeSections(current, sectionId))
      setEditorContent(nextContent)
      setGeneratedContent(nextContent)
      setGenerationPendingReview(false)
      setGenerationScope('segment')
      setIncompleteGenerationWarning(null)
      setLastVersion(null)

      const variant = currentDocumentType?.variants?.find(
        (item) => item.id === activeVariantId,
      )
      setUserToolOverride(false)
      syncAiSettings(
        currentDocumentType?.ai,
        variant?.ai,
        sectionConfig?.ai,
        nextContent,
      )
    },
    [
      activeSectionId,
      activeVariantId,
      currentDocumentType,
      editorContent,
      sectionContents,
      syncAiSettings,
    ],
  )

  const selectDocumentTypeAndSection = useCallback(
    (typeId: string, targetSectionId: string) => {
      if (typeId === selectedDocumentType) {
        selectSection(targetSectionId)
        return
      }

      const nextType = resolveType(typeId)
      if (!nextType) return

      const baseType = getDocumentType(typeId)
      const variantId = activeVariantIds[typeId] ?? baseType?.defaultVariantId
      const variant = baseType?.variants?.find((item) => item.id === variantId)

      const nextSections =
        nextType.multistage && nextType.sections ? cloneSections(nextType.sections) : []

      const targetExists = nextSections.some((s) => s.id === targetSectionId)
      const effectiveId = targetExists ? targetSectionId : (nextSections[0]?.id ?? null)

      const targetSectionTemplate = nextType.sections?.find((s) => s.id === effectiveId)
      const targetContent = getInitialEditorContent(undefined, targetSectionTemplate?.prefilledText)

      setSelectedDocumentType(typeId)
      resetWorkspaceSession()
      setSections(
        nextSections.map((section) => ({
          ...section,
          status:
            section.id === effectiveId
              ? targetContent.trim()
                ? 'draft'
                : 'active'
              : 'empty',
        })),
      )
      setActiveSectionId(effectiveId)
      setSectionContents(effectiveId && targetContent ? { [effectiveId]: targetContent } : {})
      setEditorContent(targetContent)
      setGeneratedContent(targetContent)
      setChecklistSelections({})
      setContentInputOrigin('typed')
      setUserToolOverride(false)
      setKiExtraInstruction(resolveKiExtraInstruction(kiInstructions.settings, typeId))
      syncAiSettings(baseType?.ai, variant?.ai)
    },
    [
      selectedDocumentType,
      selectSection,
      resolveType,
      getDocumentType,
      activeVariantIds,
      resetWorkspaceSession,
      kiInstructions.settings,
      syncAiSettings,
    ],
  )

  const saveSection = useCallback(
    (sectionId?: string) => {
      const targetId = sectionId ?? activeSectionId
      if (!targetId) return

      if (targetId === activeSectionId) {
        setSectionContents((current) => ({
          ...current,
          [activeSectionId]: editorContent,
        }))
      }

      setSections((current) =>
        current.map((section) =>
          section.id === targetId ? { ...section, status: 'saved' } : section,
        ),
      )
    },
    [activeSectionId, editorContent],
  )

  const goToNextSection = useCallback(() => {
    if (!activeSectionId || sections.length === 0) return

    const currentIndex = sections.findIndex((section) => section.id === activeSectionId)
    if (currentIndex < 0 || currentIndex >= sections.length - 1) return

    const nextSectionId = sections[currentIndex + 1].id
    const updatedContents = {
      ...sectionContents,
      [activeSectionId]: editorContent,
    }
    const sectionConfig = currentDocumentType?.sections?.find(
      (section) => section.id === nextSectionId,
    )
    const nextContent = getInitialEditorContent(
      updatedContents[nextSectionId],
      sectionConfig?.prefilledText,
    )

    setSectionContents(updatedContents)
    setSections((current) =>
      normalizeSections(
        current.map((section) => {
          if (section.id !== activeSectionId) return section
          if (section.status === 'saved') return section
          return { ...section, status: editorContent.trim() ? 'draft' : section.status }
        }),
        nextSectionId,
      ),
    )
    setActiveSectionId(nextSectionId)
    setEditorContent(nextContent)
    setGeneratedContent(nextContent)
  }, [activeSectionId, currentDocumentType, editorContent, sectionContents, sections])

  const handleEditorPaste = useCallback(() => {
    setContentInputOrigin('pasted')
    setUserToolOverride(false)
  }, [])

  const handleEditorChange = useCallback(
    (value: string) => {
      setEditorContent(value)
      setGenerationWasAccepted(false)
      if (activeSectionId) {
        setSectionContents((current) => ({
          ...current,
          [activeSectionId]: value,
        }))
        setSections((current) =>
          current.map((section) => {
            if (section.id !== activeSectionId) return section
            if (section.status === 'saved') return section
            return { ...section, status: value.trim() ? 'draft' : 'active' }
          }),
        )
      }
    },
    [activeSectionId],
  )

  const setSectionContent = useCallback(
    (sectionId: string, value: string) => {
      setSectionContents((current) => ({
        ...current,
        [sectionId]: value,
      }))
      if (sectionId === activeSectionId) {
        setEditorContent(value)
      }
      setSections((current) =>
        current.map((section) => {
          if (section.id !== sectionId) return section
          if (section.status === 'saved') return section
          return { ...section, status: value.trim() ? 'draft' : 'active' }
        }),
      )
    },
    [activeSectionId],
  )

  const focusSection = useCallback(
    (sectionId: string) => {
      if (sectionId === activeSectionId) return

      const sectionConfig = currentDocumentType?.sections?.find(
        (section) => section.id === sectionId,
      )
      const nextContent = getInitialEditorContent(
        sectionContents[sectionId],
        sectionConfig?.prefilledText,
      )

      setActiveSectionId(sectionId)
      setSections((current) => normalizeSections(current, sectionId))
      setEditorContent(nextContent)
      setGeneratedContent(nextContent)
      setUserToolOverride(false)

      const variant = currentDocumentType?.variants?.find(
        (item) => item.id === activeVariantId,
      )
      syncAiSettings(
        currentDocumentType?.ai,
        variant?.ai,
        sectionConfig?.ai,
        nextContent,
      )
    },
    [
      activeSectionId,
      activeVariantId,
      currentDocumentType,
      sectionContents,
      syncAiSettings,
    ],
  )

  const getLatestSectionContents = useCallback(() => {
    if (!activeSectionId) return sectionContents
    return { ...sectionContents, [activeSectionId]: editorContent }
  }, [activeSectionId, editorContent, sectionContents])

  const getIncompleteSections = useCallback(() => {
    return sections.filter((section) => section.status !== 'saved')
  }, [sections])

  /** AI source text: section contents only — name, DOB, structured age, and page heading excluded. */
  const buildDocumentGenerationInput = useCallback(
    (contents: Record<string, string>) => {
      const docType = currentDocumentType
      if (!docType?.sections) return editorContent

      const blocks = sections
        .map((section) => {
          const sectionConfig = docType.sections?.find((item) => item.id === section.id)
          const content = getInitialEditorContent(
            contents[section.id],
            sectionConfig?.prefilledText,
          ).trim()
          if (!content) return null
          return `${section.label}\n${content}`
        })
        .filter((block): block is string => block !== null)

      return blocks.length > 0 ? blocks.join('\n\n') : editorContent
    },
    [currentDocumentType, editorContent, sections],
  )

  const getGenerationSourceContent = useCallback(
    (scope: AiGenerationScope, sectionId?: string | null) => {
      const latestContents = getLatestSectionContents()
      if (scope === 'document') {
        return buildDocumentGenerationInput(latestContents)
      }

      const targetSectionId = sectionId ?? activeSectionId
      if (targetSectionId) {
        const sectionConfig = currentDocumentType?.sections?.find(
          (section) => section.id === targetSectionId,
        )
        const sectionText = getInitialEditorContent(
          latestContents[targetSectionId],
          sectionConfig?.prefilledText,
        )
        if (sectionText.trim()) return sectionText
      }

      return editorContent || generatedContent || ''
    },
    [
      activeSectionId,
      buildDocumentGenerationInput,
      currentDocumentType?.sections,
      editorContent,
      generatedContent,
      getLatestSectionContents,
    ],
  )

  const documentEditorContent = useMemo(
    () => getGenerationSourceContent('document'),
    [getGenerationSourceContent],
  )

  const documentScopeFilledSectionCount = useMemo(() => {
    const contents = getLatestSectionContents()
    return sections.filter((section) => {
      const sectionConfig = currentDocumentType?.sections?.find(
        (item) => item.id === section.id,
      )
      return getInitialEditorContent(
        contents[section.id],
        sectionConfig?.prefilledText,
      ).trim()
    }).length
  }, [currentDocumentType, editorContent, getLatestSectionContents, sectionContents, sections])

  const estimatedGenerationCredits = useMemo(
    () =>
      estimateGenerationCredits(
        aiModelTier,
        getGenerationSourceContent(generationScope),
      ),
    [aiModelTier, generationScope, getGenerationSourceContent],
  )

  const insufficientCredits = !hasEnoughCredits(estimatedGenerationCredits)
  const dictationCreditsAvailable = hasAiAndDictationCredits(creditBalance)

  const activeVariantConfig = useMemo(
    () => currentDocumentType?.variants?.find((variant) => variant.id === activeVariantId),
    [activeVariantId, currentDocumentType],
  )

  const activeSectionConfig = useMemo(
    () => currentDocumentType?.sections?.find((section) => section.id === activeSectionId),
    [activeSectionId, currentDocumentType],
  )

  const editorContentLocked = isDictationActive || isGenerating
  const aiControlsLocked =
    isGenerating ||
    dictationPhase === 'recording' ||
    dictationPhase === 'transcribing'

  const aiContext = useMemo(
    () =>
      resolveAiContext({
        componentAi: currentDocumentType?.ai,
        variantAi: activeVariantConfig?.ai,
        sectionAi: activeSectionConfig?.ai,
        generationScope,
        hasSourceContent: Boolean(
          getGenerationSourceContent(generationScope).trim(),
        ),
        editorContentLocked,
        aiControlsLocked,
      }),
    [
      activeSectionConfig?.ai,
      activeVariantConfig?.ai,
      aiControlsLocked,
      currentDocumentType?.ai,
      dictationPhase,
      editorContentLocked,
      generationScope,
      getGenerationSourceContent,
    ],
  )

  const aiCanGenerate = aiContext.canGenerate && !insufficientCredits

  useEffect(() => {
    if (!aiAutoMode) return

    syncAiSettings(
      currentDocumentType?.ai,
      activeVariantConfig?.ai,
      activeSectionConfig?.ai,
      getGenerationSourceContent(generationScope),
    )
  }, [
    aiAutoMode,
    activeSectionConfig?.ai,
    activeVariantConfig?.ai,
    contentInputOrigin,
    currentDocumentType?.ai,
    generationScope,
    getGenerationSourceContent,
    inputMode,
    syncAiSettings,
  ])

  const buildDocumentSectionsForRequest = useCallback(() => {
    const latestContents = getLatestSectionContents()
    const docType = currentDocumentType
    if (!docType?.sections) return []

    return sections
      .map((section) => {
        const sectionConfig = docType.sections?.find((item) => item.id === section.id)
        const content = getInitialEditorContent(
          latestContents[section.id],
          sectionConfig?.prefilledText,
        ).trim()
        if (!content) return null

        return {
          sectionId: section.id,
          label: section.label,
          content,
          description: sectionConfig?.description,
          exampleHint: sectionConfig?.exampleHint,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [currentDocumentType, getLatestSectionContents, sections])

  const runGeneration = useCallback(
    async (
      scope: AiGenerationScope,
      overrides?: {
        tool?: AiToolKey
        sectionId?: string
        forceSegment?: boolean
      },
    ) => {
      const effectiveScope = overrides?.forceSegment ? 'segment' : scope
      const targetSectionId = overrides?.sectionId ?? activeSectionId ?? undefined
      const targetSectionConfig = targetSectionId
        ? currentDocumentType?.sections?.find((section) => section.id === targetSectionId)
        : activeSectionConfig

      const sourceContent = getGenerationSourceContent(effectiveScope, targetSectionId)
      const toolOverride = overrides?.tool
      const resolved = resolveGenerationCall({
        componentId: selectedDocumentType,
        variantId: activeVariantId,
        sectionId: targetSectionId,
        scope: effectiveScope,
        inputMode,
        contentInputOrigin,
        componentAi: currentDocumentType?.ai,
        variantAi: activeVariantConfig?.ai,
        sectionAi: targetSectionConfig?.ai,
        sourceText: sourceContent,
        language,
        aiAutoMode,
        userToolOverride: toolOverride ? true : userToolOverride,
        selectedAiTool: toolOverride ?? selectedAiTool,
        aiModelTier,
        highlightedToolKeys: aiContext.highlightedToolKeys,
        sectionLabel: targetSectionConfig?.label,
        sectionDescription: targetSectionConfig?.description,
        sectionExampleHint: targetSectionConfig?.exampleHint,
        documentSections:
          effectiveScope === 'document' ? buildDocumentSectionsForRequest() : undefined,
        extraInstruction: kiExtraInstruction,
      })

      const { request, tier: resolvedTier } = resolved
      const creditsToCharge = estimateGenerationCredits(resolvedTier, sourceContent)

      setIsGenerating(true)
      setLastVersion(sourceContent || null)
      setIncompleteGenerationWarning(null)

      // Attach patient hints for pseudonymization (already loaded in ref, non-blocking)
      const hints = isPseudonymizationEnabled() ? patientHintsRef.current : {}
      const requestWithHints = {
        ...request,
        patientHints:
          hints.patientName || hints.patientDob
            ? { patientName: hints.patientName, patientDob: hints.patientDob }
            : undefined,
      }

      try {
        const generation = await executeAiGeneration(requestWithHints, {
          estimatedCredits: creditsToCharge,
          onCreditsDeducted: setBalanceFromServer,
          pseudonymizationActiveLabel: translateUi(language, 'pseudonymizationActive'),
        })
        const result = generation.text
        const activeResult =
          targetSectionId && generation.sectionResults?.[targetSectionId]
            ? generation.sectionResults[targetSectionId]
            : result

        setGeneratedContent(activeResult)
        setEditorContent(activeResult)
        setGenerationPendingReview(true)
        setContentInputOrigin('typed')
        setUserToolOverride(false)

        if (effectiveScope === 'document' && generation.sectionResults) {
          setSectionContents((current) => ({ ...current, ...generation.sectionResults }))
          setSections((current) =>
            current.map((section) =>
              generation.sectionResults?.[section.id]
                ? { ...section, status: 'draft' }
                : section,
            ),
          )
          if (caseId) {
            for (const [sectionId, sectionText] of Object.entries(generation.sectionResults)) {
              if (!sectionText?.trim()) continue
              const section = currentDocumentType?.sections?.find((item) => item.id === sectionId)
              scheduleAiGenerationImprint(caseId, {
                documentTypeId: selectedDocumentType,
                sectionId,
                sectionLabel: section?.label,
                text: sectionText,
              })
            }
          }
        } else if (targetSectionId) {
          setSectionContents((current) => ({
            ...current,
            [targetSectionId]: activeResult,
          }))
          setSections((current) =>
            current.map((section) =>
              section.id === targetSectionId ? { ...section, status: 'draft' } : section,
            ),
          )
          if (caseId && activeResult.trim()) {
            scheduleAiGenerationImprint(caseId, {
              documentTypeId: selectedDocumentType,
              sectionId: targetSectionId,
              sectionLabel: targetSectionConfig?.label,
              text: activeResult,
            })
          }
        } else if (caseId && activeResult.trim()) {
          scheduleAiGenerationImprint(caseId, {
            documentTypeId: selectedDocumentType,
            text: activeResult,
          })
        }
      } catch (error) {
        // Surface the failure instead of leaving an unhandled rejection.
        console.error('[generation] failed', error)
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'KI-Generierung fehlgeschlagen. Bitte erneut versuchen.'
        showNotionToast(message)
      } finally {
        setIsGenerating(false)
      }
    },
    [
      activeSectionConfig,
      activeSectionId,
      activeVariantConfig?.ai,
      activeVariantId,
      aiAutoMode,
      aiContext.highlightedToolKeys,
      aiModelTier,
      buildDocumentSectionsForRequest,
      contentInputOrigin,
      currentDocumentType?.ai,
      currentDocumentType?.sections,
      setBalanceFromServer,
      getGenerationSourceContent,
      inputMode,
      kiExtraInstruction,
      language,
      selectedAiTool,
      selectedDocumentType,
      userToolOverride,
      caseId,
    ],
  )

  const handleGenerate = useCallback(() => {
    if (!aiCanGenerate) return

    if (generationScope === 'document') {
      const incomplete = getIncompleteSections()
      if (incomplete.length > 0) {
        setIncompleteGenerationWarning(incomplete)
        return
      }
    }

    runGeneration(generationScope)
  }, [aiCanGenerate, generationScope, getIncompleteSections, runGeneration])

  const handleGenerateWithTool = useCallback(
    (
      tool: AiToolKey,
      options?: { scope?: AiGenerationScope; sectionId?: string; forceSegment?: boolean },
    ) => {
      if (!aiCanGenerate) return

      const scope = options?.scope ?? generationScope
      if (scope === 'document' && !options?.forceSegment) {
        const incomplete = getIncompleteSections()
        if (incomplete.length > 0) {
          setIncompleteGenerationWarning(incomplete)
          return
        }
      }

      runGeneration(scope, {
        tool,
        sectionId: options?.sectionId,
        forceSegment: options?.forceSegment ?? Boolean(options?.sectionId),
      })
    },
    [aiCanGenerate, generationScope, getIncompleteSections, runGeneration],
  )

  const confirmIncompleteGeneration = useCallback(() => {
    if (!aiCanGenerate) return

    setIncompleteGenerationWarning(null)
    runGeneration('document')
  }, [aiCanGenerate, runGeneration])

  const dismissIncompleteGenerationWarning = useCallback(() => {
    setIncompleteGenerationWarning(null)
  }, [])

  const handleGenerationScopeChange = useCallback(
    (scope: AiGenerationScope) => {
      if (activeSectionId) {
        setSectionContents((current) => ({
          ...current,
          [activeSectionId]: editorContent,
        }))
      }
      setGenerationScope(scope)
      setUserToolOverride(false)
    },
    [activeSectionId, editorContent],
  )

  const handleRestoreLastVersion = useCallback(() => {
    if (lastVersion === null) return
    setEditorContent(lastVersion)
    setGeneratedContent(lastVersion)
    if (activeSectionId) {
      setSectionContents((current) => ({
        ...current,
        [activeSectionId]: lastVersion,
      }))
    }
  }, [activeSectionId, lastVersion])

  const acceptGeneration = useCallback(() => {
    setGenerationPendingReview(false)
    setGenerationWasAccepted(true)
    setLastVersion(null)
  }, [])

  const rejectGeneration = useCallback(() => {
    if (lastVersion !== null) {
      setEditorContent(lastVersion)
      setGeneratedContent(lastVersion)
      if (activeSectionId) {
        setSectionContents((current) => ({
          ...current,
          [activeSectionId]: lastVersion,
        }))
      }
    }
    setGenerationPendingReview(false)
    setGenerationWasAccepted(false)
    setLastVersion(null)
  }, [activeSectionId, lastVersion])

  const handleRewrite = useCallback(() => {
    console.info('[mock] rewrite')
  }, [])

  const handleCopy = useCallback(async () => {
    const text = editorContent.trim()
    if (!text) return
    await copyTextToClipboard(text)
  }, [editorContent])

  const handleCopyAllSections = useCallback(async () => {
    const docType = currentDocumentType
    const latestContents = getLatestSectionContents()
    const text = getNotionDocumentCopyText(sections, latestContents, {
      sectionConfigs: docType?.sections,
      fallbackContent: editorContent,
    })
    if (!text.trim()) return
    await copyTextToClipboard(text)
  }, [
    currentDocumentType,
    editorContent,
    getLatestSectionContents,
    sections,
  ])

  const startDictation = useCallback(() => {
    if (!dictationCreditsAvailable) return
    setInputMode('dictate')
    beginDictation()
  }, [beginDictation, dictationCreditsAvailable])

  const expandAiTools = useCallback(() => {
    setAiToolsExpanded(true)
  }, [])

  const collapseAiTools = useCallback(() => {
    setAiToolsExpanded(false)
  }, [])

  const toggleAiAutoMode = useCallback(() => {
    setAiAutoMode((current) => {
      const next = !current
      localStorage.setItem(AI_AUTO_MODE_KEY, next ? 'on' : 'off')
      if (next) setUserToolOverride(false)
      return next
    })
  }, [])

  const setAiModelTier = useCallback((tier: AiModelTier) => {
    setAiAutoMode(false)
    localStorage.setItem(AI_AUTO_MODE_KEY, 'off')
    setAiModelTierState(tier)
    localStorage.setItem(AI_MODEL_TIER_KEY, tier)
  }, [])

  const selectAiTool = useCallback((key: AiToolKey) => {
    setSelectedAiTool(key)
    setUserToolOverride(true)
  }, [])

  const mockAction = useCallback((action: string) => {
    console.info(`[mock] ${action}`)
  }, [])

  const isTherapieVerlaufDocument = selectedDocumentType === 'therapie-verlauf'

  const handleInputModeChange = useCallback(
    (mode: InputMode) => {
      if (mode === 'extract' && !isTherapieVerlaufDocument) {
        setInputMode('write')
        return
      }

      if (
        isTherapieVerlaufDocument &&
        (mode === 'write' || mode === 'dictate')
      ) {
        setGenerationScope('segment')
      }

      setUserToolOverride(false)

      if (mode === 'extract') {
        setContentInputOrigin('pasted')
      } else if (mode === 'dictate') {
        setContentInputOrigin('dictated')
      } else {
        setContentInputOrigin('typed')
      }

      setInputMode(mode)
    },
    [isTherapieVerlaufDocument],
  )

  const extractTherapieVerlaufFromPaste = useCallback(() => {
    if (!therapieVerlaufSourceText.trim()) return

    const sectionTemplates = getLocalizedTherapieVerlaufSections(language)
    const extracted = extractTherapieVerlaufSections(therapieVerlaufSourceText)

    const blocks = sectionTemplates
      .map((section) => {
        const content = extracted[section.id]?.trim()
        return content ? `${section.label}\n${content}` : null
      })
      .filter((block): block is string => block !== null)

    const combined = blocks.join('\n\n')
    setEditorContent(combined)
    setGeneratedContent(combined)
    setGenerationScope('segment')
    setContentInputOrigin('pasted')
    setInputMode('write')
  }, [language, therapieVerlaufSourceText])

  const applySectionExampleHint = useCallback(() => {
    if (!activeSectionId || !activeSectionConfig?.exampleHint) return

    const example = activeSectionConfig.exampleHint
    setEditorContent(example)
    setGeneratedContent(example)
    setSectionContents((current) => ({
      ...current,
      [activeSectionId]: example,
    }))
    setSections((current) =>
      current.map((section) =>
        section.id === activeSectionId ? { ...section, status: 'draft' } : section,
      ),
    )
  }, [activeSectionConfig?.exampleHint, activeSectionId])

  const activeChecklistItems = activeSectionConfig?.checklistItems ?? []
  const activeChecklistSelections = activeSectionId
    ? (checklistSelections[activeSectionId] ?? {})
    : {}
  const documentMode = currentDocumentType?.mode
  const showNormalBefundButton = selectedDocumentType === 'psychopath'

  const toggleChecklistItem = useCallback(
    (itemId: string, checked: boolean, sectionId?: string) => {
      const targetSectionId = sectionId ?? activeSectionId
      if (!targetSectionId) return

      const sectionConfig = currentDocumentType?.sections?.find(
        (section) => section.id === targetSectionId,
      )
      if (!sectionConfig?.checklistItems?.length) return

      const sectionSelections = {
        ...(checklistSelections[targetSectionId] ?? {}),
        [itemId]: checked,
      }
      const text = compileChecklistText(
        sectionConfig.checklistItems,
        sectionSelections,
        sectionConfig.label,
      )

      setChecklistSelections((current) => ({
        ...current,
        [targetSectionId]: sectionSelections,
      }))
      setSectionContents((current) => ({
        ...current,
        [targetSectionId]: text,
      }))

      if (targetSectionId === activeSectionId) {
        setEditorContent(text)
        setGeneratedContent(text)
      }

      setSections((current) =>
        current.map((section) => {
          if (section.id !== targetSectionId) return section
          if (section.status === 'saved') return section
          return { ...section, status: text.trim() ? 'draft' : 'active' }
        }),
      )
    },
    [activeSectionId, checklistSelections, currentDocumentType?.sections],
  )

  const restoreFromSnapshot = useCallback(
    (snapshot: NotionDocumentSnapshot) => {
      const snapshotType = resolveType(snapshot.documentTypeId)
      const snapshotSections =
        snapshotType?.multistage && snapshotType.sections
          ? cloneSections(snapshotType.sections)
          : []

      setSelectedDocumentType(snapshot.documentTypeId)
      resetWorkspaceSession()
      setChecklistSelections({})
      setSectionContents(snapshot.sectionContents)
      const firstSection = snapshotSections[0]
      const firstId = firstSection?.id ?? null
      if (firstId) {
        const content = snapshot.sectionContents[firstId] ?? ''
        setActiveSectionId(firstId)
        setEditorContent(content)
        setGeneratedContent(content)
        setSections(
          snapshotSections.map((section, index) => ({
            ...section,
            status: snapshot.sectionContents[section.id]?.trim()
              ? 'draft'
              : index === 0
                ? 'active'
                : 'empty',
          })),
        )
      } else {
        const content = Object.values(snapshot.sectionContents)[0] ?? ''
        setSections([])
        setActiveSectionId(null)
        setEditorContent(content)
        setGeneratedContent(content)
      }
    },
    [resetWorkspaceSession, resolveType],
  )

  const hydrateDocumentFromStorage = useCallback(
    (documentTypeId: string) => {
      const snapshot = loadNotionDocumentSnapshot(documentTypeId, caseId)
      if (snapshot) restoreFromSnapshot(snapshot)
    },
    [caseId, restoreFromSnapshot],
  )

  useEffect(() => {
    hydrateDocumentFromStorage(selectedDocumentType)
    // Only on mount — subsequent restores go through vault hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const insertNormalBefund = useCallback(() => {
    const docType = currentDocumentType
    if (!docType) return

    const sectionInputs =
      docType.sections && docType.sections.length > 0 ? docType.sections : undefined

    if (docType.mode === 'free' || !docType.multistage) {
      const text = buildPsychopathNormalBefundText(sectionInputs, language, englishVariant)
      setEditorContent(text)
      setGeneratedContent(text)
      setSectionContents({})
      setChecklistSelections({})
      return
    }

    const texts = buildPsychopathNormalSectionTexts(sectionInputs)

    setChecklistSelections(
      docType.mode === 'checklist'
        ? buildPsychopathNormalChecklistSelections(sectionInputs)
        : {},
    )
    setSectionContents(texts)
    setSections((current) =>
      current.map((section) => ({
        ...section,
        status: texts[section.id]?.trim() ? 'draft' : section.status,
      })),
    )

    if (activeSectionId && texts[activeSectionId]) {
      setEditorContent(texts[activeSectionId])
      setGeneratedContent(texts[activeSectionId])
    }
  }, [activeSectionId, currentDocumentType, language, englishVariant])

  return {
    selectedDocumentType,
    activeSectionId,
    sections,
    sectionContents,
    editorContent,
    generatedContent,
    aiToolsExpanded,
    aiAutoMode,
    aiModelTier,
    selectedAiTool,
    kiExtraInstruction,
    inputMode,
    isTherapieVerlaufDocument,
    therapieVerlaufSourceText,
    lastVersion,
    isGenerating,
    generationPendingReview,
    generationWasAccepted,
    generationScope,
    documentEditorContent,
    documentScopeFilledSectionCount,
    incompleteGenerationWarning,
    creditBalance,
    estimatedGenerationCredits,
    insufficientCredits,
    dictationCreditsAvailable,
    aiContext,
    aiCanGenerate,
    dictationPhase,
    dictationDurationMs,
    dictationPlaybackMs,
    isPlayingBack,
    dictationError,
    isDictationActive,
    currentDocumentType,
    activeVariantId,
    documentMode,
    activeChecklistItems,
    activeChecklistSelections,
    checklistSelections,
    showNormalBefundButton,
    activeVariantIds,
    resetToBlankPage,
    selectDocumentType,
    selectDocumentTypeAndSection,
    selectComponentVariant,
    selectSection,
    focusSection,
    saveSection,
    goToNextSection,
    setEditorContent: handleEditorChange,
    setSectionContent,
    onEditorPaste: handleEditorPaste,
    setInputMode: handleInputModeChange,
    setTherapieVerlaufSourceText,
    extractTherapieVerlaufFromPaste,
    applySectionExampleHint,
    handleGenerate,
    handleGenerateWithTool,
    setGenerationScope: handleGenerationScopeChange,
    confirmIncompleteGeneration,
    dismissIncompleteGenerationWarning,
    handleRestoreLastVersion,
    acceptGeneration,
    rejectGeneration,
    handleRewrite,
    handleCopy,
    handleCopyAllSections,
    toggleChecklistItem,
    insertNormalBefund,
    startDictation,
    pauseDictation,
    resumeDictation,
    stopRecording,
    togglePlayback,
    discardRecording,
    transcribeRecording,
    expandAiTools,
    collapseAiTools,
    toggleAiAutoMode,
    setAiModelTier,
    selectAiTool,
    setKiExtraInstruction,
    kiInstructions,
    mockAction,
    getLatestSectionContents,
    restoreFromSnapshot,
    hydrateDocumentFromStorage,
  }
}
