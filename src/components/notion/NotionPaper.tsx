import { Command, Lock, Mic, Pencil, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { DocumentChecklistItem, DocumentSection, DocumentVariantMode } from '../../types'
import type { DictationPhase } from '../../types/dictation'
import type { AiModelTier } from '../../types'
import type { AiToolKey } from '../../data/aiTools'
import type { AiOutputLengthSpec } from '../../../shared/aiJobs'
import {
  copyTextToClipboard,
  exportNotionDocument,
  getNotionDocumentCopyText,
  printNotionDocument,
  saveNotionDocumentSnapshot,
  type NotionDocumentSnapshot,
  type NotionDocumentStatus,
} from '../../utils/notionDocumentActions'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import { useEditorFontScale } from '../../hooks/useEditorFontScale'
import { upsertCaseMeta } from '../../hooks/useCaseRegistry'
import { loadNotionPageHeading, saveNotionPageHeading } from '../../utils/notionPageHeading'
import { NotionPageDateTimeRow } from './NotionPageDateTimeRow'
import { NotionEditor } from './NotionEditor'
import { NotionPatientFields } from './NotionPatientFields'
import { NotionMultiSectionEditor } from './NotionMultiSectionEditor'
import { NotionDiarySidebar } from './NotionDiarySidebar'
import type { SavedDoc } from '../../utils/savedDocs'
import { NotionSidebarCollapseHandle } from './NotionSidebarCollapseHandle'
import { NotionDictationStrip } from './NotionDictationStrip'
import { NotionAiModeDropdown } from './NotionAiModeDropdown'
import { NotionDocumentActions } from './NotionDocumentActions'
import { compileChecklistText } from '../../utils/checklist'
import { NotionEditorHints } from './NotionEditorHints'
import { NotionVariantLinks, type NotionVariantOption } from './NotionVariantLinks'
import { MedicationWorkspace } from '../medication/MedicationWorkspace'
import { TherapieplanungWorkspace } from '../therapy/TherapieplanungWorkspace'
import type { TherapyPlanningSectionKey } from '../../data/therapyPageSections'
import { IsdmPsychopathWorkspace } from '../workspace/IsdmInputPanel'
import {
  isPsychopathSubMode,
  type PsychopathSubMode,
} from '../../utils/psychopathMode'
import { NotionDocumentBreadcrumb } from './NotionDocumentBreadcrumb'
import { NotionEmptyState } from './NotionEmptyState'
import {
  isAiFeaturesShortcut,
  isEmptyPageDictateShortcut,
  isEmptyPageTypeShortcut,
  isNativeClipboardShortcut,
} from '../../utils/notionKeyboardShortcuts'
import { isDocumentEmpty } from '../../utils/isDocumentEmpty'
import { showNotionToast } from './NotionToast'
import type { InputMode } from '../../types'
import type { AufnahmeSectionMetadata } from '../../types/anamneseBefund'
import type { PageType } from '../../types/settings'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { usePatientMetadata } from '../../hooks/usePatientMetadata'
import type { SelectionActionId } from './FloatingSelectionToolbar'
import type { PasteActionId } from './PasteAssistant'
import type { SlashCommandId } from './SlashCommandMenu'
import { detectContentType, type ContentCategory } from '../../utils/pasteContentDetector'
import { formatClinicalDate } from '../../utils/clinicalDate'

export interface SavedWorkspaceDocumentPayload extends NotionDocumentSnapshot {
  content: string
}

interface NotionPaperProps {
  caseId: string
  workspaceStorageId?: string
  documentTypeId: string
  documentLabel: string
  sectionLabel?: string
  sections: DocumentSection[]
  sectionConfigs: DocumentSection[]
  sectionContents: Record<string, string>
  sectionMetadata?: Record<string, AufnahmeSectionMetadata>
  /** Finalize ("vidieren") status — currently only surfaced for the Aufnahme document. */
  documentStatus?: NotionDocumentStatus
  onDocumentStatusChange?: (status: NotionDocumentStatus) => void
  /** Gates the Vidieren/Entsperren actions (documents.finalize permission). */
  canFinalizeDocument?: boolean
  checklistSelections: Record<string, Record<string, boolean>>
  componentVariants?: NotionVariantOption[]
  activeVariantId?: string
  documentMode?: DocumentVariantMode
  activeChecklistItems?: DocumentChecklistItem[]
  activeChecklistSelections?: Record<string, boolean>
  showNormalBefundButton?: boolean
  activeSectionId: string | null
  showMultistageSections: boolean
  editorContent: string
  dictationPhase: DictationPhase
  dictationDurationMs: number
  dictationPlaybackMs: number
  isPlayingBack: boolean
  isDictationActive: boolean
  inputMode?: InputMode
  dictationError?: string | null
  isGenerating: boolean
  aiModelTier: AiModelTier
  maximumEnabled: boolean
  selectedAiTool: AiToolKey | null
  kiExtraInstruction: string
  aiLengthSpec: AiOutputLengthSpec
  onAiLengthSpecChange: (spec: AiOutputLengthSpec) => void
  aiCanGenerate: boolean
  panelGraphicEnabled: boolean
  pageType: PageType
  privacy: ReturnType<typeof usePrivacySettings>
  clinicalAge: {
    age: string
    setAge: (age: string) => void
    ready: boolean
  }
  onMigratedAge?: (age: string) => void
  onEditorChange: (value: string) => void
  onSectionContentChange: (sectionId: string, value: string) => void
  onSectionMetadataChange?: (sectionId: string, metadata: AufnahmeSectionMetadata | undefined) => void
  onBefundSectionManualEdit?: (sectionId: string) => void
  onEditorPaste: () => void
  onDetectedPaste?: (text: string, category: ContentCategory) => void
  onSaveSection: (sectionId?: string) => void
  onSelectAiModelTier: (tier: AiModelTier) => void
  onToggleMaximum: (enabled: boolean) => void
  onSelectAiTool: (tool: AiToolKey) => void
  onKiExtraInstructionChange: (value: string) => void
  onGenerate: () => void
  onSelectionAction: (action: SelectionActionId, selectedText: string) => void
  onPasteAction: (action: PasteActionId, pastedText: string) => void
  onSlashCommand: (command: SlashCommandId) => void
  onSectionSelect?: (sectionId: string) => void
  onSectionFocus?: (sectionId: string) => void
  onSectionAiTool?: (sectionId: string, tool: AiToolKey) => void
  onEditorAiTool?: (tool: AiToolKey) => void
  onVariantSelect?: (variantId: string) => void
  onToggleChecklistItem?: (itemId: string, checked: boolean, sectionId?: string) => void
  onInsertNormalBefund?: () => void
  onPauseDictation: () => void
  onResumeDictation: () => void
  onStopRecording: () => void
  onTogglePlayback: () => void
  onDiscardRecording: () => void
  onTranscribe: () => void
  onClosePanelGraphic: () => void
  onSaveWorkspaceVault?: (payload?: SavedWorkspaceDocumentPayload) => void | Promise<void>
  onStartDictation?: () => void
  onSwitchToWrite?: () => void
  dictationDisabled?: boolean
  onNavigateToLabor?: () => void
  savedDocs?: SavedDoc[]
  onViewSavedDoc?: (doc: SavedDoc) => void
  onRemoveSavedDoc?: (id: string) => void
  /** Close the open document and return to the default workspace home. */
  onCloseDocument?: () => void
  /** Case-level edit lock from org_case_access (view-only grant). */
  accessReadOnly?: boolean
  onPsychopathModeSelect?: (mode: PsychopathSubMode) => void
  /** Open the workspace navigation menu (same as Strg+K / right-click). */
  onOpenWorkspaceMenu?: () => void
  /** Diary sidebar is rendered in the global case sidebar panel instead. */
  useExternalSidebar?: boolean
  /** Pre-selected therapy type when opening Therapieplanung from context menu. */
  therapieplanungInitialType?: TherapyPlanningSectionKey | null
  onTherapieplanungInitialTypeConsumed?: () => void
  /** Standalone workspace medication copy and panels. */
  medicationContext?: 'patient' | 'standalone'
}

export interface PendingPaste {
  text: string
  id: number
}

/** `DD.MM.YYYY, HH:MM` for the "Finalisiert am …" banner — date + time of signing. */
function formatFinalizedTimestamp(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const datePart = formatClinicalDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${datePart}, ${hours}:${minutes}`
}

const SIDEBAR_COLLAPSED_KEY = 'psychiatry-ink:sidebar-collapsed'

function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function NotionPaper({
  caseId,
  workspaceStorageId,
  documentTypeId,
  documentLabel,
  sectionLabel,
  sections,
  sectionConfigs,
  sectionContents,
  sectionMetadata = {},
  documentStatus = {},
  onDocumentStatusChange,
  canFinalizeDocument = false,
  checklistSelections,
  componentVariants,
  activeVariantId,
  documentMode,
  activeSectionId,
  showMultistageSections,
  editorContent,
  dictationPhase,
  dictationDurationMs,
  dictationPlaybackMs,
  isPlayingBack,
  isDictationActive,
  inputMode = 'write',
  dictationError,
  isGenerating,
  aiModelTier,
  maximumEnabled,
  selectedAiTool,
  kiExtraInstruction,
  aiLengthSpec,
  onAiLengthSpecChange,
  aiCanGenerate,
  panelGraphicEnabled,
  pageType: _pageType,
  privacy,
  clinicalAge,
  onMigratedAge,
  onEditorChange,
  onSectionContentChange,
  onSectionMetadataChange,
  onBefundSectionManualEdit,
  onEditorPaste,
  onDetectedPaste,
  onSaveSection,
  onSelectAiModelTier,
  onToggleMaximum,
  onSelectAiTool,
  onKiExtraInstructionChange,
  onGenerate,
  onSelectionAction,
  onPasteAction: _onPasteAction,
  onSlashCommand,
  onSectionSelect: _onSectionSelect,
  onSectionFocus,
  onSectionAiTool,
  onEditorAiTool,
  onVariantSelect,
  onToggleChecklistItem,
  onPauseDictation,
  onResumeDictation,
  onStopRecording,
  onTogglePlayback,
  onDiscardRecording,
  onTranscribe,
  onClosePanelGraphic,
  onSaveWorkspaceVault,
  onStartDictation,
  onSwitchToWrite,
  dictationDisabled = false,
  onNavigateToLabor,
  savedDocs,
  onViewSavedDoc,
  onRemoveSavedDoc,
  onCloseDocument,
  onPsychopathModeSelect,
  accessReadOnly = false,
  onOpenWorkspaceMenu,
  useExternalSidebar = false,
  therapieplanungInitialType = null,
  onTherapieplanungInitialTypeConsumed,
  medicationContext = 'patient',
}: NotionPaperProps) {
  const { t } = useTranslation()
  const displayName = useAccountDisplayName()
  // Text-size control for the rich text editor — lifted here (rather than
  // living inside NotionMultiSectionEditor) so it's one shared control for
  // both editor modes: `--notion-editor-font-size` cascades via CSS
  // inheritance from `.notion-paper__editor-area` into whichever editor
  // (single free-text or multi-section) is actually rendered below.
  const fontScale = useEditorFontScale()
  const storageCaseId = workspaceStorageId ?? caseId
  const storesCaseMeta = storageCaseId === caseId
  const patient = usePatientMetadata({
    caseId: storageCaseId,
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    onMigratedAge,
  })
  const editorLocked = isDictationActive || isGenerating || accessReadOnly
  const isPsychopathDocument = documentTypeId === 'psychopath'
  const isMedicationDocument = documentTypeId === 'medikation'
  const isTherapieplanungDocument = documentTypeId === 'therapieplanung'
  // The Aufnahme entry page always runs inside a known case, so the patient
  // identity fields (name / Geburtsdatum / age), the encryption notice they
  // carry, and the free-form page title are redundant noise there — the patient
  // is already linked. Hide them on this page (Item 3).
  const isAufnahmeDocument = documentTypeId === 'aufnahme'
  // Vidieren (finalize/sign) is currently scoped to Aufnahme only: once signed,
  // the document is locked for editing everywhere the shared `editorLocked` flag
  // already gates inputs, on top of (not instead of) the existing lock reasons.
  const isFinalized = isAufnahmeDocument && documentStatus.status === 'finalized'
  const contentLocked = editorLocked || isFinalized
  const psychopathActiveMode: PsychopathSubMode =
    isPsychopathDocument && activeVariantId && isPsychopathSubMode(activeVariantId)
      ? activeVariantId
      : 'free'
  const showVariantPicker = Boolean(
    componentVariants &&
      componentVariants.length > 1 &&
      activeVariantId &&
      (onVariantSelect || (isPsychopathDocument && onPsychopathModeSelect)),
  )
  const showIsdmPanel = isPsychopathDocument && psychopathActiveMode === 'isdm'
  const showMedicationPanel = isMedicationDocument
  const showTherapieplanungPanel = isTherapieplanungDocument
  const showStructuredToolPanel = showMedicationPanel || showIsdmPanel || showTherapieplanungPanel
  const showKompilierenButton = Boolean(
    documentMode === 'checklist' && showMultistageSections,
  )
  const [amdpKompiliert, setAmdpKompiliert] = useState(false)
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false)
  const [documentEditingStarted, setDocumentEditingStarted] = useState(false)
  const [editorFocusRequest, setEditorFocusRequest] = useState(0)
  const [pendingPaste, setPendingPaste] = useState<PendingPaste | null>(null)
  const hadDocumentContentRef = useRef(false)
  const [pageHeading, setPageHeading] = useState(() =>
    loadNotionPageHeading(documentTypeId, storageCaseId),
  )
  const lastSavedSectionRef = useRef<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadSidebarCollapsed)

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? 'true' : 'false')
      } catch {
        // localStorage unavailable
      }
      return next
    })
  }, [])

  useEffect(() => {
    setPageHeading(loadNotionPageHeading(documentTypeId, storageCaseId))
  }, [documentTypeId, storageCaseId])

  useEffect(() => {
    setAmdpKompiliert(false)
    setAiDropdownOpen(false)
    setDocumentEditingStarted(false)
    setPendingPaste(null)
  }, [documentTypeId, activeVariantId])

  const documentEmpty = isDocumentEmpty(
    showMultistageSections,
    editorContent,
    sectionContents,
    sections,
  )

  useEffect(() => {
    const hasContent = !documentEmpty
    if (hadDocumentContentRef.current && !hasContent) {
      setDocumentEditingStarted(false)
      setPendingPaste(null)
    }
    hadDocumentContentRef.current = hasContent
  }, [documentEmpty])

  // For multistage (AMDP) documents the sections themselves are the starting view —
  // never show the "Type / Paste / Dictate" blank state for them, even when all
  // section textareas are empty (checkboxes don't populate sectionContents until
  // toggled, so documentEmpty stays true even on a fresh checklist).
  const showDocumentBlankState =
    !showMultistageSections &&
    !showIsdmPanel &&
    !showMedicationPanel &&
    !showTherapieplanungPanel &&
    documentEmpty &&
    !documentEditingStarted &&
    !editorLocked

  const requestWorkspaceMenu = useCallback(() => {
    onOpenWorkspaceMenu?.()
  }, [onOpenWorkspaceMenu])

  const handleAiFeaturesShortcut = useCallback(() => {
    if (editorLocked) return
    setAiDropdownOpen((current) => !current)
  }, [editorLocked])

  const isEditableTarget = useCallback((target: EventTarget | null) => {
    return (
      target instanceof HTMLElement &&
      target.closest(
        '.notion-editor__textarea, input, select, textarea, [contenteditable="true"]',
      )
    )
  }, [])

  const beginDocumentEditing = useCallback(() => {
    setDocumentEditingStarted(true)
    setEditorFocusRequest((current) => current + 1)
  }, [])

  const applyPastedText = useCallback(
    (text: string) => {
      if (!text.trim()) return
      onEditorPaste()
      setDocumentEditingStarted(true)
      if (showMultistageSections && activeSectionId) {
        onSectionContentChange(activeSectionId, text)
      } else {
        onEditorChange(text)
      }
      setPendingPaste({ text, id: Date.now() })
      setEditorFocusRequest((current) => current + 1)
    },
    [
      activeSectionId,
      onEditorChange,
      onEditorPaste,
      onSectionContentChange,
      showMultistageSections,
    ],
  )

  const handleBlankType = useCallback(() => {
    beginDocumentEditing()
  }, [beginDocumentEditing])

  const handleBlankPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) {
        // When there is no document type yet (home/blank page), auto-detect and
        // let the parent navigate to the correct page before inserting content.
        if (!documentTypeId && onDetectedPaste) {
          const result = detectContentType(text, documentTypeId)
          onDetectedPaste(text, result.category)
          setDocumentEditingStarted(true)
          return
        }
        applyPastedText(text)
        return
      }
    } catch {
      // Clipboard API unavailable — fall through to focus editor for Ctrl+V
    }
    beginDocumentEditing()
  }, [applyPastedText, beginDocumentEditing, documentTypeId, onDetectedPaste])

  const handleBlankDictate = useCallback(() => {
    setDocumentEditingStarted(true)
    onStartDictation?.()
  }, [onStartDictation])

  useEffect(() => {
    if (!showDocumentBlankState) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      if (isEmptyPageTypeShortcut(event)) {
        event.preventDefault()
        event.stopPropagation()
        handleBlankType()
        return
      }
      if (isEmptyPageDictateShortcut(event)) {
        event.preventDefault()
        event.stopPropagation()
        handleBlankDictate()
        return
      }
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return

      const pasted = event.clipboardData?.getData('text/plain') ?? ''
      if (!pasted.trim()) return

      event.preventDefault()

      // Auto-detect on blank page and let parent navigate
      if (!documentTypeId && onDetectedPaste) {
        const result = detectContentType(pasted, documentTypeId)
        onDetectedPaste(pasted, result.category)
        setDocumentEditingStarted(true)
        return
      }

      applyPastedText(pasted)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('paste', handlePaste)
    }
  }, [
    applyPastedText,
    documentTypeId,
    handleBlankDictate,
    handleBlankType,
    isEditableTarget,
    onDetectedPaste,
    showDocumentBlankState,
  ])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) && isNativeClipboardShortcut(event)) return
      if (editorLocked) return
      if (isAiFeaturesShortcut(event)) {
        event.preventDefault()
        event.stopPropagation()
        handleAiFeaturesShortcut()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [editorLocked, handleAiFeaturesShortcut, isEditableTarget])

  const handlePageHeadingChange = useCallback(
    (value: string) => {
      setPageHeading(value)
      saveNotionPageHeading(documentTypeId, value, storageCaseId)
      if (storesCaseMeta) {
        upsertCaseMeta(caseId, {
          pageHeading: value.trim() || undefined,
          lastDocumentType: documentTypeId,
        })
      }
    },
    [caseId, documentTypeId, storageCaseId, storesCaseMeta],
  )

  const autoSaveSection = useCallback(
    (sectionId: string) => {
      if (lastSavedSectionRef.current === sectionId) return
      const section = sections.find((item) => item.id === sectionId)
      const content = sectionContents[sectionId]?.trim()
      if (!content) return
      if (section?.status === 'saved') return

      onSaveSection(sectionId)
      lastSavedSectionRef.current = sectionId
      showNotionToast(t('notionSectionSaved'))
    },
    [onSaveSection, sectionContents, sections, t],
  )

  const handleSectionBlur = useCallback(
    (sectionId: string) => {
      autoSaveSection(sectionId)
    },
    [autoSaveSection],
  )

  const handleKompilieren = useCallback(() => {
    const parts: string[] = []
    for (const section of sections) {
      const config = sectionConfigs.find((c) => c.id === section.id)
      const sectionSelections = checklistSelections[section.id] ?? {}
      const checklistPart =
        config?.checklistItems && config.checklistItems.length > 0
          ? compileChecklistText(config.checklistItems, sectionSelections, section.label)
          : ''
      const freePart = sectionContents[section.id]?.trim() ?? ''
      if (checklistPart || freePart) {
        const combined = [checklistPart, freePart].filter(Boolean).join('\n')
        parts.push(combined)
      }
    }
    const compiled = parts.join('\n\n')
    onEditorChange(compiled)
    setAmdpKompiliert(true)
    setDocumentEditingStarted(true)
    setEditorFocusRequest((current) => current + 1)
  }, [checklistSelections, onEditorChange, sectionConfigs, sectionContents, sections])

  const handleSectionChecklistToggle = useCallback(
    (sectionId: string, itemId: string, checked: boolean) => {
      onToggleChecklistItem?.(itemId, checked, sectionId)
    },
    [onToggleChecklistItem],
  )

  const getLatestContents = useCallback(() => {
    if (!activeSectionId) return sectionContents
    return { ...sectionContents, [activeSectionId]: editorContent }
  }, [activeSectionId, editorContent, sectionContents])

  const handleSaveDocument = useCallback(async () => {
    const latestContents = getLatestContents()
    const savedAt = new Date().toISOString()
    const snapshot = {
      documentTypeId,
      pageHeading,
      sectionContents: latestContents,
      sectionMetadata: Object.keys(sectionMetadata).length > 0 ? sectionMetadata : undefined,
      status: documentStatus.status,
      finalizedAt: documentStatus.finalizedAt,
      finalizedBy: documentStatus.finalizedBy,
      savedAt,
    }
    const content = getNotionDocumentCopyText(sections, latestContents, {
      sectionConfigs,
      fallbackContent: editorContent,
    })

    saveNotionDocumentSnapshot(snapshot, storageCaseId)
    await onSaveWorkspaceVault?.({ ...snapshot, content })
    showNotionToast(t('notionDocumentSaved'))
  }, [
    documentTypeId,
    documentStatus,
    editorContent,
    getLatestContents,
    onSaveWorkspaceVault,
    pageHeading,
    sectionConfigs,
    sectionMetadata,
    sections,
    storageCaseId,
    t,
  ])

  const persistDocumentStatus = useCallback(
    async (nextStatus: NotionDocumentStatus) => {
      onDocumentStatusChange?.(nextStatus)
      const latestContents = getLatestContents()
      const savedAt = new Date().toISOString()
      const snapshot = {
        documentTypeId,
        pageHeading,
        sectionContents: latestContents,
        sectionMetadata: Object.keys(sectionMetadata).length > 0 ? sectionMetadata : undefined,
        status: nextStatus.status,
        finalizedAt: nextStatus.finalizedAt,
        finalizedBy: nextStatus.finalizedBy,
        savedAt,
      }
      const content = getNotionDocumentCopyText(sections, latestContents, {
        sectionConfigs,
        fallbackContent: editorContent,
      })

      saveNotionDocumentSnapshot(snapshot, storageCaseId)
      await onSaveWorkspaceVault?.({ ...snapshot, content })
    },
    [
      documentTypeId,
      editorContent,
      getLatestContents,
      onDocumentStatusChange,
      onSaveWorkspaceVault,
      pageHeading,
      sectionConfigs,
      sectionMetadata,
      sections,
      storageCaseId,
    ],
  )

  const handleFinalizeDocument = useCallback(async () => {
    await persistDocumentStatus({
      status: 'finalized',
      finalizedAt: new Date().toISOString(),
      finalizedBy: displayName,
    })
    showNotionToast(t('notionDocumentFinalized'))
  }, [displayName, persistDocumentStatus, t])

  const handleUnlockDocument = useCallback(async () => {
    await persistDocumentStatus({ status: 'draft' })
    showNotionToast(t('notionDocumentUnlocked'))
  }, [persistDocumentStatus, t])

  const handleFinalizeDocumentClick = useCallback(() => {
    if (!window.confirm(t('notionFinalizeDocumentConfirm'))) return
    void handleFinalizeDocument()
  }, [handleFinalizeDocument, t])

  const handleUnlockDocumentClick = useCallback(() => {
    if (!window.confirm(t('notionUnlockDocumentConfirm'))) return
    void handleUnlockDocument()
  }, [handleUnlockDocument, t])

  const handlePrintDocument = useCallback(() => {
    printNotionDocument(documentLabel, sections, getLatestContents(), pageHeading)
  }, [documentLabel, getLatestContents, pageHeading, sections])

  const handleExportDocument = useCallback(() => {
    exportNotionDocument(documentLabel, sections, getLatestContents(), pageHeading)
  }, [documentLabel, getLatestContents, pageHeading, sections])

  const handleCopyDocument = useCallback(async () => {
    const text = getNotionDocumentCopyText(sections, getLatestContents(), {
      sectionConfigs,
      fallbackContent: editorContent,
    })
    const copied = await copyTextToClipboard(text)
    if (copied) showNotionToast(t('notionCopied'))
  }, [editorContent, getLatestContents, sectionConfigs, sections, t])

  const hasAnyContent =
    Boolean(pageHeading.trim()) ||
    sections.some((section) => Boolean(sectionContents[section.id]?.trim())) ||
    Boolean(editorContent.trim())

  const sectionProgress =
    showMultistageSections && sections.length > 0
      ? (() => {
          const filled = sections.filter((section) => {
            const content =
              section.id === activeSectionId ? editorContent : sectionContents[section.id]
            return content?.trim()
          }).length
          const pct = filled / sections.length
          const fillColor = pct < 0.33 ? '#e05050' : pct < 0.66 ? '#f08030' : '#2d8a50'
          return { filled, pct, fillColor, total: sections.length }
        })()
      : null

  return (
    <article
      className={[
        'notion-paper notion-paper--blank',
        sidebarCollapsed && !useExternalSidebar ? ' notion-paper--sidebar-collapsed' : '',
        useExternalSidebar ? ' notion-paper--external-sidebar' : '',
      ]
        .join('')
        .trim()}
    >
      {!useExternalSidebar ? (
        <>
          <div className="notion-paper__sidebar-anchor">
            <NotionDiarySidebar
              panelGraphicEnabled={panelGraphicEnabled}
              onClosePanelGraphic={onClosePanelGraphic}
              collapsed={sidebarCollapsed}
              caseId={storageCaseId}
              onNavigateToLabor={onNavigateToLabor}
              savedDocs={savedDocs}
              onViewSavedDoc={onViewSavedDoc}
              onRemoveSavedDoc={onRemoveSavedDoc}
              openDocumentLabel={documentTypeId ? documentLabel : undefined}
              onCloseDocument={onCloseDocument}
            />
          </div>

          <NotionSidebarCollapseHandle
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebarCollapsed}
            ariaLabel={
              sidebarCollapsed ? t('notionShowDiarySidebar') : t('notionHideDiarySidebar')
            }
          />
        </>
      ) : null}

      <div className="notion-paper__body">
        {isDictationActive ? (
          <NotionDictationStrip
            dictationPhase={dictationPhase}
            durationMs={dictationDurationMs}
            isPlayingBack={isPlayingBack}
            dictationError={dictationError}
            onPauseDictation={onPauseDictation}
            onResumeDictation={onResumeDictation}
            onStopRecording={onStopRecording}
            onTogglePlayback={onTogglePlayback}
            onDiscardRecording={onDiscardRecording}
            onTranscribe={onTranscribe}
          />
        ) : null}

        <div className="notion-paper__header">
          <div className="notion-paper__header-left">
            {documentTypeId && onCloseDocument ? (
              <div className="notion-paper__header-doc">
                <NotionDocumentBreadcrumb documentLabel={documentLabel} sectionLabel={sectionLabel} />
                <button
                  type="button"
                  className="notion-paper__close-doc"
                  onClick={onCloseDocument}
                  aria-label={t('workspaceCloseDocument')}
                  title={t('workspaceCloseDocument')}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            ) : (
              <div className="notion-paper__header-spacer" />
            )}
          </div>

          <div className="notion-paper__header-actions">
            {(onSwitchToWrite || onStartDictation) && !isDictationActive ? (
              <div className="notion-paper__input-modes">
                <button
                  type="button"
                  className={`notion-paper__input-mode ${
                    inputMode === 'write' ? 'notion-paper__input-mode--active' : ''
                  }`}
                  onClick={onSwitchToWrite}
                  disabled={isGenerating}
                  title={t('write')}
                  aria-label={t('write')}
                  aria-pressed={inputMode === 'write'}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  type="button"
                  className={`notion-paper__input-mode ${
                    inputMode === 'dictate' ? 'notion-paper__input-mode--active' : ''
                  }`}
                  onClick={dictationDisabled ? undefined : onStartDictation}
                  disabled={isGenerating || dictationDisabled}
                  title={dictationDisabled ? t('creditsExhaustedHint') : t('dictate')}
                  aria-label={t('dictate')}
                  aria-pressed={inputMode === 'dictate'}
                >
                  <Mic className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ) : null}
            <div className="notion-paper__doc-tools">
              <button
                type="button"
                className="notion-command-btn"
                onClick={requestWorkspaceMenu}
                aria-label={t('notionCommandMenuButton')}
                title={t('notionCommandMenuButton')}
              >
                <Command className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
              <span className="notion-paper__tool-divider" aria-hidden />
              <NotionDocumentActions
                disabled={editorLocked}
                copyDisabled={!hasAnyContent}
                onSave={handleSaveDocument}
                onCopy={handleCopyDocument}
                onPrint={handlePrintDocument}
                onExport={handleExportDocument}
                isFinalized={isFinalized}
                canFinalize={canFinalizeDocument}
                onFinalize={isAufnahmeDocument ? handleFinalizeDocumentClick : undefined}
                onUnlock={isAufnahmeDocument ? handleUnlockDocumentClick : undefined}
              />
              <span className="notion-paper__tool-divider" aria-hidden />
              <div
                className="notion-editor__font-control"
                role="group"
                aria-label={t('editorFontSizeLabel')}
              >
                <button
                  type="button"
                  className="notion-editor__font-btn"
                  onClick={fontScale.decrease}
                  disabled={!fontScale.canDecrease}
                  title={t('editorFontSizeDecrease')}
                  aria-label={t('editorFontSizeDecrease')}
                >
                  A<span className="notion-editor__font-btn-minus">−</span>
                </button>
                <button
                  type="button"
                  className="notion-editor__font-btn notion-editor__font-btn--reset"
                  onClick={fontScale.reset}
                  disabled={fontScale.isDefault}
                  title={t('editorFontSizeReset')}
                  aria-label={t('editorFontSizeReset')}
                >
                  A
                </button>
                <button
                  type="button"
                  className="notion-editor__font-btn"
                  onClick={fontScale.increase}
                  disabled={!fontScale.canIncrease}
                  title={t('editorFontSizeIncrease')}
                  aria-label={t('editorFontSizeIncrease')}
                >
                  A<span className="notion-editor__font-btn-plus">+</span>
                </button>
              </div>
            </div>
            <NotionAiModeDropdown
              tier={aiModelTier}
              maximumEnabled={maximumEnabled}
              selectedTool={selectedAiTool}
              sourceText={editorContent}
              extraInstruction={kiExtraInstruction}
              lengthSpec={aiLengthSpec}
              onLengthSpecChange={onAiLengthSpecChange}
              disabled={contentLocked}
              canGenerate={aiCanGenerate}
              open={aiDropdownOpen}
              onOpenChange={setAiDropdownOpen}
              onSelectTier={onSelectAiModelTier}
              onToggleMaximum={onToggleMaximum}
              onSelectTool={onSelectAiTool}
              onExtraInstructionChange={onKiExtraInstructionChange}
              onGenerate={onGenerate}
            />
          </div>
          {sectionProgress ? (
            <div
              className="notion-document-progress"
              role="progressbar"
              aria-valuenow={sectionProgress.filled}
              aria-valuemin={0}
              aria-valuemax={sectionProgress.total}
            >
              <div
                className="notion-document-progress__fill"
                style={{
                  width: `${sectionProgress.pct * 100}%`,
                  backgroundColor: sectionProgress.fillColor,
                }}
              />
            </div>
          ) : null}
        </div>

        {isFinalized ? (
          <div className="notion-paper__finalized-banner" role="status">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            <span>
              {t('notionDocumentFinalizedBanner')
                .replace('{date}', formatFinalizedTimestamp(documentStatus.finalizedAt))
                .replace('{name}', documentStatus.finalizedBy ?? '')}
            </span>
          </div>
        ) : null}

        <div
          className={`notion-paper__editor-area${showDocumentBlankState ? ' notion-paper__editor-area--document-empty' : ''}${showStructuredToolPanel ? ' notion-paper__editor-area--structured-tool' : ''}`}
          style={{ '--notion-editor-font-size': fontScale.cssValue } as CSSProperties}
        >
          {!isAufnahmeDocument ? (
            <NotionPatientFields
              patient={patient}
              clinicalAge={clinicalAge}
              disabled={editorLocked}
            />
          ) : null}

          {!isAufnahmeDocument ? (
            <input
              type="text"
              className="notion-page-heading"
              value={pageHeading}
              onChange={(event) => handlePageHeadingChange(event.target.value)}
              placeholder={t('notionPageHeadingPlaceholder')}
              readOnly={editorLocked}
              aria-label={t('notionPageHeadingPlaceholder')}
            />
          ) : null}

          <NotionPageDateTimeRow
            pageId={documentTypeId}
            caseId={storageCaseId}
            disabled={contentLocked}
            onChange={() => onSaveWorkspaceVault?.()}
          />

          {showVariantPicker && componentVariants && activeVariantId ? (
            <NotionVariantLinks
              variants={componentVariants}
              activeVariantId={activeVariantId}
              disabled={editorLocked}
              onSelect={(variantId) => {
                if (
                  isPsychopathDocument &&
                  onPsychopathModeSelect &&
                  isPsychopathSubMode(variantId)
                ) {
                  onPsychopathModeSelect(variantId)
                  return
                }
                onVariantSelect?.(variantId)
              }}
            />
          ) : null}

          {showDocumentBlankState && !showMedicationPanel && !showTherapieplanungPanel ? (
            <NotionEditorHints showStructuredFeatures={false} />
          ) : null}

          {showDocumentBlankState && !showIsdmPanel && !showMedicationPanel && !showTherapieplanungPanel ? (
            <NotionEmptyState
              disabled={editorLocked}
              onType={handleBlankType}
              onPaste={handleBlankPaste}
              onDictate={handleBlankDictate}
            />
          ) : showMedicationPanel ? (
            <MedicationWorkspace
              caseId={storageCaseId ?? caseId}
              disabled={editorLocked}
              context={medicationContext}
            />
          ) : showTherapieplanungPanel ? (
            <TherapieplanungWorkspace
              caseId={storageCaseId ?? caseId}
              disabled={editorLocked}
              initialType={therapieplanungInitialType}
              onInitialTypeConsumed={onTherapieplanungInitialTypeConsumed}
            />
          ) : showIsdmPanel ? (
            <IsdmPsychopathWorkspace caseId={storageCaseId} disabled={editorLocked} />
          ) : showMultistageSections && !amdpKompiliert ? (
            <>
              <NotionMultiSectionEditor
                sections={sections}
                sectionConfigs={sectionConfigs}
                sectionContents={sectionContents}
                sectionMetadata={sectionMetadata}
                documentTypeId={documentTypeId}
                checklistSelections={checklistSelections}
                documentMode={documentMode}
                accordion={documentMode === 'sections'}
                activeSectionId={activeSectionId}
                inputMode={inputMode}
                readOnly={contentLocked}
                dictationPhase={dictationPhase}
                dictationDurationMs={dictationDurationMs}
                dictationPlaybackMs={dictationPlaybackMs}
                isPlayingBack={isPlayingBack}
                isGenerating={isGenerating}
                onSectionContentChange={onSectionContentChange}
                onSectionMetadataChange={onSectionMetadataChange}
                onBefundSectionManualEdit={onBefundSectionManualEdit}
                onSectionFocus={(sectionId) => onSectionFocus?.(sectionId)}
                onSectionBlur={handleSectionBlur}
                onToggleChecklistItem={handleSectionChecklistToggle}
                onSectionAiTool={onSectionAiTool}
                onPasteOrigin={onEditorPaste}
                onSelectionAction={onSelectionAction}
                onSlashCommand={onSlashCommand}
                focusRequest={editorFocusRequest}
                pendingPaste={pendingPaste}
                caseId={storageCaseId ?? caseId}
                fontSize={fontScale.cssValue}
              />
              {showKompilierenButton ? (
                <div className="notion-paper__kompilieren-row">
                  <button
                    type="button"
                    className="notion-paper__kompilieren-btn"
                    disabled={contentLocked}
                    onClick={handleKompilieren}
                    title={t('amdpKompilierenHint')}
                  >
                    {t('amdpKompilieren')}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <NotionEditor
              content={editorContent}
              inputMode={inputMode}
              readOnly={contentLocked}
              dictationPhase={dictationPhase}
              dictationDurationMs={dictationDurationMs}
              dictationPlaybackMs={dictationPlaybackMs}
              isPlayingBack={isPlayingBack}
              isGenerating={isGenerating}
              placeholder={documentTypeId === 'aufnahme' ? t('aufnahmeFreitextPlaceholder') : undefined}
              onChange={onEditorChange}
              onPasteOrigin={onEditorPaste}
              onEditorAiTool={onEditorAiTool}
              onSelectionAction={onSelectionAction}
              onSlashCommand={onSlashCommand}
              focusRequest={editorFocusRequest}
              pendingPaste={pendingPaste}
              caseId={storageCaseId ?? caseId}
            />
          )}
        </div>
      </div>
    </article>
  )
}
