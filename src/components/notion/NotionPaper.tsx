import { ChevronDown, Command, Hash } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { DocumentChecklistItem, DocumentSection, DocumentVariantMode } from '../../types'
import type { DictationPhase } from '../../types/dictation'
import type { AiModelTier } from '../../types'
import type { AiToolKey } from '../../data/aiTools'
import {
  copyTextToClipboard,
  exportNotionDocument,
  getNotionDocumentCopyText,
  printNotionDocument,
  saveNotionDocumentSnapshot,
} from '../../utils/notionDocumentActions'
import { upsertCaseMeta } from '../../hooks/useCaseRegistry'
import { loadNotionPageHeading, saveNotionPageHeading } from '../../utils/notionPageHeading'
import { NotionPageDateTimeRow } from './NotionPageDateTimeRow'
import { NotionEditor } from './NotionEditor'
import { NotionPatientFields } from './NotionPatientFields'
import { NotionMultiSectionEditor } from './NotionMultiSectionEditor'
import { NotionDiarySidebar } from './NotionDiarySidebar'
import { NotionSidebarCollapseHandle } from './NotionSidebarCollapseHandle'
import { NotionDictationStrip } from './NotionDictationStrip'
import { NotionAiModeDropdown } from './NotionAiModeDropdown'
import { NotionDocumentActions } from './NotionDocumentActions'
import { NotionStructuredPanel } from './NotionStructuredPanel'
import { NotionEditorHints } from './NotionEditorHints'
import { NotionVariantLinks, type NotionVariantOption } from './NotionVariantLinks'
import { NotionEmptyState } from './NotionEmptyState'
import {
  isAiFeaturesShortcut,
  isCommandMenuShortcut,
  isEmptyPageDictateShortcut,
  isEmptyPageTypeShortcut,
  isNativeClipboardShortcut,
} from '../../utils/notionKeyboardShortcuts'
import { isDocumentEmpty } from '../../utils/isDocumentEmpty'
import { showNotionToast } from './NotionToast'
import type { InputMode } from '../../types'
import type { PageType } from '../../types/settings'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { usePatientMetadata } from '../../hooks/usePatientMetadata'
import type { SelectionActionId } from './FloatingSelectionToolbar'
import type { PasteActionId } from './PasteAssistant'
import type { SlashCommandId } from './SlashCommandMenu'

interface NotionPaperProps {
  caseId: string
  documentTypeId: string
  documentLabel: string
  sectionLabel?: string
  sections: DocumentSection[]
  sectionConfigs: DocumentSection[]
  sectionContents: Record<string, string>
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
  selectedAiTool: AiToolKey | null
  kiExtraInstruction: string
  aiCanGenerate: boolean
  showPanelGraphic: boolean
  pageType: PageType
  privacy: ReturnType<typeof usePrivacySettings>
  clinicalAge: {
    age: string
    setAge: (age: string) => void
    ready: boolean
  }
  onMigratedAge?: (age: string) => void
  onOpenPrivacySettings?: () => void
  onEditorChange: (value: string) => void
  onSectionContentChange: (sectionId: string, value: string) => void
  onEditorPaste: () => void
  onSaveSection: (sectionId?: string) => void
  onSelectAiModelTier: (tier: AiModelTier) => void
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
  onSaveWorkspaceVault?: () => void
  onStartDictation?: () => void
}

export interface PendingPaste {
  text: string
  id: number
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
  documentTypeId,
  documentLabel,
  sectionLabel,
  sections,
  sectionConfigs,
  sectionContents,
  checklistSelections,
  componentVariants,
  activeVariantId,
  documentMode,
  activeChecklistItems = [],
  activeChecklistSelections = {},
  showNormalBefundButton = false,
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
  selectedAiTool,
  kiExtraInstruction,
  aiCanGenerate,
  showPanelGraphic,
  pageType,
  privacy,
  clinicalAge,
  onMigratedAge,
  onOpenPrivacySettings,
  onEditorChange,
  onSectionContentChange,
  onEditorPaste,
  onSaveSection,
  onSelectAiModelTier,
  onSelectAiTool,
  onKiExtraInstructionChange,
  onGenerate,
  onSelectionAction,
  onPasteAction,
  onSlashCommand,
  onSectionSelect,
  onSectionFocus,
  onSectionAiTool,
  onEditorAiTool,
  onVariantSelect,
  onToggleChecklistItem,
  onInsertNormalBefund,
  onPauseDictation,
  onResumeDictation,
  onStopRecording,
  onTogglePlayback,
  onDiscardRecording,
  onTranscribe,
  onClosePanelGraphic,
  onSaveWorkspaceVault,
  onStartDictation,
}: NotionPaperProps) {
  const { t } = useTranslation()
  const patient = usePatientMetadata({
    caseId,
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    onMigratedAge,
  })
  const editorLocked = isDictationActive || isGenerating
  const showVariantPicker = Boolean(
    componentVariants && componentVariants.length > 1 && activeVariantId && onVariantSelect,
  )
  const showSectionDropdown = showMultistageSections && sections.length > 1 && onSectionSelect
  const showStructuredButton = Boolean(
    documentMode === 'checklist' &&
      activeChecklistItems.length > 0 &&
      onToggleChecklistItem,
  )
  const [structuredPanelOpen, setStructuredPanelOpen] = useState(false)
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false)
  const [commandMenuRequest, setCommandMenuRequest] = useState(0)
  const [documentEditingStarted, setDocumentEditingStarted] = useState(false)
  const [editorFocusRequest, setEditorFocusRequest] = useState(0)
  const [pendingPaste, setPendingPaste] = useState<PendingPaste | null>(null)
  const hadDocumentContentRef = useRef(false)
  const [pageHeading, setPageHeading] = useState(() =>
    loadNotionPageHeading(documentTypeId, caseId),
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
    setPageHeading(loadNotionPageHeading(documentTypeId, caseId))
  }, [caseId, documentTypeId])

  useEffect(() => {
    setStructuredPanelOpen(false)
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

  const showDocumentBlankState =
    documentEmpty && !documentEditingStarted && !editorLocked

  const requestCommandMenu = useCallback(() => {
    if (editorLocked) return
    setStructuredPanelOpen(false)
    setAiDropdownOpen(false)
    setCommandMenuRequest((current) => current + 1)
  }, [editorLocked])

  const handleAiFeaturesShortcut = useCallback(() => {
    if (editorLocked) return
    setCommandMenuRequest(0)
    if (showStructuredButton) {
      setAiDropdownOpen(false)
      setStructuredPanelOpen((current) => !current)
      return
    }
    setStructuredPanelOpen(false)
    setAiDropdownOpen((current) => !current)
  }, [editorLocked, showStructuredButton])

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
        applyPastedText(text)
        return
      }
    } catch {
      // Clipboard API unavailable — fall through to focus editor for Ctrl+V
    }
    beginDocumentEditing()
  }, [applyPastedText, beginDocumentEditing])

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
    handleBlankDictate,
    handleBlankType,
    isEditableTarget,
    showDocumentBlankState,
  ])

  useEffect(() => {
    if (commandMenuRequest === 0) return
    if (showDocumentBlankState) {
      beginDocumentEditing()
    }
  }, [beginDocumentEditing, commandMenuRequest, showDocumentBlankState])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) && isNativeClipboardShortcut(event)) return
      if (editorLocked) return
      if (isCommandMenuShortcut(event)) {
        event.preventDefault()
        event.stopPropagation()
        requestCommandMenu()
        return
      }
      if (isAiFeaturesShortcut(event)) {
        event.preventDefault()
        event.stopPropagation()
        handleAiFeaturesShortcut()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [editorLocked, handleAiFeaturesShortcut, isEditableTarget, requestCommandMenu])

  const handlePageHeadingChange = useCallback(
    (value: string) => {
      setPageHeading(value)
      saveNotionPageHeading(documentTypeId, value, caseId)
      upsertCaseMeta(caseId, {
        pageHeading: value.trim() || undefined,
        lastDocumentType: documentTypeId,
      })
    },
    [caseId, documentTypeId],
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

  const handleSectionDropdownChange = useCallback(
    (sectionId: string) => {
      if (activeSectionId && activeSectionId !== sectionId) {
        autoSaveSection(activeSectionId)
      }
      lastSavedSectionRef.current = null
      onSectionSelect?.(sectionId)
    },
    [activeSectionId, autoSaveSection, onSectionSelect],
  )

  const handleSectionBlur = useCallback(
    (sectionId: string) => {
      autoSaveSection(sectionId)
    },
    [autoSaveSection],
  )

  const handleToggleChecklistItem = useCallback(
    (itemId: string, checked: boolean) => {
      onToggleChecklistItem?.(itemId, checked, activeSectionId ?? undefined)
    },
    [activeSectionId, onToggleChecklistItem],
  )

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

  const handleSaveDocument = useCallback(() => {
    const latestContents = getLatestContents()
    saveNotionDocumentSnapshot({
      documentTypeId,
      pageHeading,
      sectionContents: latestContents,
      savedAt: new Date().toISOString(),
    })
    onSaveWorkspaceVault?.()
    showNotionToast(t('notionDocumentSaved'))
  }, [documentTypeId, getLatestContents, onSaveWorkspaceVault, pageHeading, t])

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

  return (
    <article
      className={`notion-paper notion-paper--${pageType === 'wideRuled' ? 'wide-ruled' : pageType}${sidebarCollapsed ? ' notion-paper--sidebar-collapsed' : ''}`}
    >
      <div className="notion-paper__sidebar-anchor">
        <NotionDiarySidebar
          documentLabel={documentLabel}
          sectionLabel={sectionLabel}
          sections={sections}
          activeSectionId={activeSectionId}
          hasContent={hasAnyContent}
          showPanelGraphic={showPanelGraphic}
          onClosePanelGraphic={onClosePanelGraphic}
          collapsed={sidebarCollapsed}
        />
      </div>

      <NotionSidebarCollapseHandle
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebarCollapsed}
        ariaLabel={
          sidebarCollapsed ? t('notionShowDiarySidebar') : t('notionHideDiarySidebar')
        }
      />

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
            {showSectionDropdown ? (
              <div className="notion-paper__section-select">
                <div className="notion-paper__section-field">
                  <select
                    id="notion-section-select"
                    className="notion-paper__section-dropdown"
                    value={activeSectionId ?? ''}
                    onChange={(event) => handleSectionDropdownChange(event.target.value)}
                    disabled={editorLocked}
                    aria-label={t('notionMetaSection')}
                  >
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="notion-paper__section-chevron h-3 w-3" strokeWidth={2} aria-hidden />
                </div>
              </div>
            ) : (
              <div className="notion-paper__header-spacer" />
            )}
          </div>

          <div className="notion-paper__header-actions">
            <button
              type="button"
              className="notion-command-btn"
              disabled={editorLocked}
              onClick={requestCommandMenu}
              aria-label={t('notionCommandMenuButton')}
              title={t('notionCommandMenuButton')}
            >
              <Command className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
            {showStructuredButton ? (
              <button
                type="button"
                className={`notion-structured-btn ${structuredPanelOpen ? 'notion-structured-btn--active' : ''}`}
                disabled={editorLocked}
                onClick={() => setStructuredPanelOpen((current) => !current)}
                aria-label={t('notionStructuredInput')}
                aria-pressed={structuredPanelOpen}
                title={t('notionStructuredInput')}
              >
                <Hash className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            <NotionDocumentActions
              disabled={editorLocked}
              copyDisabled={!hasAnyContent}
              onSave={handleSaveDocument}
              onCopy={handleCopyDocument}
              onPrint={handlePrintDocument}
              onExport={handleExportDocument}
            />
            <NotionAiModeDropdown
              tier={aiModelTier}
              selectedTool={selectedAiTool}
              sourceText={editorContent}
              extraInstruction={kiExtraInstruction}
              disabled={editorLocked}
              canGenerate={aiCanGenerate}
              open={aiDropdownOpen}
              onOpenChange={setAiDropdownOpen}
              onSelectTier={onSelectAiModelTier}
              onSelectTool={onSelectAiTool}
              onExtraInstructionChange={onKiExtraInstructionChange}
              onGenerate={onGenerate}
            />
          </div>
        </div>

        <div
          className={`notion-paper__editor-area${showDocumentBlankState ? ' notion-paper__editor-area--document-empty' : ''}`}
        >
          <NotionPatientFields
            patient={patient}
            clinicalAge={clinicalAge}
            disabled={editorLocked}
            onOpenPrivacySettings={onOpenPrivacySettings}
          />

          <NotionPageDateTimeRow
            pageId={documentTypeId}
            caseId={caseId}
            disabled={editorLocked}
            onChange={() => onSaveWorkspaceVault?.()}
          />

          <input
            type="text"
            className="notion-page-heading"
            value={pageHeading}
            onChange={(event) => handlePageHeadingChange(event.target.value)}
            placeholder={t('notionPageHeadingPlaceholder')}
            readOnly={editorLocked}
            aria-label={t('notionPageHeadingPlaceholder')}
          />

          {showVariantPicker && componentVariants && activeVariantId ? (
            <NotionVariantLinks
              variants={componentVariants}
              activeVariantId={activeVariantId}
              disabled={editorLocked}
              onSelect={(variantId) => onVariantSelect?.(variantId)}
            />
          ) : null}

          {showDocumentBlankState ? null : (
            <NotionEditorHints showStructuredFeatures={showStructuredButton} />
          )}

          {showDocumentBlankState ? (
            <NotionEmptyState
              disabled={editorLocked}
              onType={handleBlankType}
              onPaste={handleBlankPaste}
              onDictate={handleBlankDictate}
            />
          ) : showMultistageSections ? (
            <NotionMultiSectionEditor
              sections={sections}
              sectionConfigs={sectionConfigs}
              sectionContents={sectionContents}
              checklistSelections={checklistSelections}
              documentMode={documentMode}
              activeSectionId={activeSectionId}
              inputMode={inputMode}
              readOnly={editorLocked}
              dictationPhase={dictationPhase}
              dictationDurationMs={dictationDurationMs}
              dictationPlaybackMs={dictationPlaybackMs}
              isPlayingBack={isPlayingBack}
              isGenerating={isGenerating}
              onSectionContentChange={onSectionContentChange}
              onSectionFocus={(sectionId) => onSectionFocus?.(sectionId)}
              onSectionBlur={handleSectionBlur}
              onToggleChecklistItem={handleSectionChecklistToggle}
              onSectionAiTool={onSectionAiTool}
              onPasteOrigin={onEditorPaste}
              onSelectionAction={onSelectionAction}
              onPasteAction={onPasteAction}
              onSlashCommand={onSlashCommand}
              commandMenuRequest={commandMenuRequest}
              focusRequest={editorFocusRequest}
              pendingPaste={pendingPaste}
            />
          ) : (
            <NotionEditor
              content={editorContent}
              inputMode={inputMode}
              readOnly={editorLocked}
              dictationPhase={dictationPhase}
              dictationDurationMs={dictationDurationMs}
              dictationPlaybackMs={dictationPlaybackMs}
              isPlayingBack={isPlayingBack}
              isGenerating={isGenerating}
              onChange={onEditorChange}
              onPasteOrigin={onEditorPaste}
              onEditorAiTool={onEditorAiTool}
              onSelectionAction={onSelectionAction}
              onPasteAction={onPasteAction}
              onSlashCommand={onSlashCommand}
              commandMenuRequest={commandMenuRequest}
              focusRequest={editorFocusRequest}
              pendingPaste={pendingPaste}
            />
          )}

          <NotionStructuredPanel
            open={structuredPanelOpen}
            sectionLabel={sectionLabel}
            items={activeChecklistItems}
            selections={activeChecklistSelections}
            disabled={editorLocked}
            showNormalBefund={showNormalBefundButton}
            onToggle={handleToggleChecklistItem}
            onInsertNormalBefund={onInsertNormalBefund}
            onClose={() => setStructuredPanelOpen(false)}
          />
        </div>
      </div>
    </article>
  )
}
