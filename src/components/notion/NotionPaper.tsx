import { Command, Mic, Pencil } from 'lucide-react'
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
import { compileChecklistText } from '../../utils/checklist'
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
  panelGraphicEnabled: boolean
  breakLottieActive: boolean
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
  onBreakStart?: () => void
  onSaveWorkspaceVault?: () => void
  onStartDictation?: () => void
  onSwitchToWrite?: () => void
  dictationDisabled?: boolean
  onNavigateToLabor?: () => void
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
  sections,
  sectionConfigs,
  sectionContents,
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
  selectedAiTool,
  kiExtraInstruction,
  aiCanGenerate,
  panelGraphicEnabled,
  breakLottieActive,
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
  onBreakStart,
  onSaveWorkspaceVault,
  onStartDictation,
  onSwitchToWrite,
  dictationDisabled = false,
  onNavigateToLabor,
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
  const showKompilierenButton = Boolean(
    documentMode === 'checklist' && showMultistageSections,
  )
  const [amdpKompiliert, setAmdpKompiliert] = useState(false)
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
    !showMultistageSections && documentEmpty && !documentEditingStarted && !editorLocked

  const requestCommandMenu = useCallback(() => {
    if (editorLocked) return
    setAiDropdownOpen(false)
    setCommandMenuRequest((current) => current + 1)
  }, [editorLocked])

  const handleAiFeaturesShortcut = useCallback(() => {
    if (editorLocked) return
    setCommandMenuRequest(0)
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
      className={`notion-paper notion-paper--${pageType === 'wideRuled' ? 'wide-ruled' : pageType}${sidebarCollapsed ? ' notion-paper--sidebar-collapsed' : ''}`}
    >
      <div className="notion-paper__sidebar-anchor">
        <NotionDiarySidebar
          panelGraphicEnabled={panelGraphicEnabled}
          breakLottieActive={breakLottieActive}
          onClosePanelGraphic={onClosePanelGraphic}
          collapsed={sidebarCollapsed}
          onBreakStart={onBreakStart}
          caseId={caseId}
          onNavigateToLabor={onNavigateToLabor}
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
            <div className="notion-paper__header-spacer" />
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

        <div
          className={`notion-paper__editor-area${showDocumentBlankState ? ' notion-paper__editor-area--document-empty' : ''}`}
        >
          <NotionPatientFields
            patient={patient}
            clinicalAge={clinicalAge}
            disabled={editorLocked}
            onOpenPrivacySettings={onOpenPrivacySettings}
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

          <NotionPageDateTimeRow
            pageId={documentTypeId}
            caseId={caseId}
            disabled={editorLocked}
            onChange={() => onSaveWorkspaceVault?.()}
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
            <NotionEditorHints showStructuredFeatures={false} />
          )}

          {showDocumentBlankState ? (
            <NotionEmptyState
              disabled={editorLocked}
              onType={handleBlankType}
              onPaste={handleBlankPaste}
              onDictate={handleBlankDictate}
            />
          ) : showMultistageSections && !amdpKompiliert ? (
            <>
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
              {showKompilierenButton ? (
                <div className="notion-paper__kompilieren-row">
                  <button
                    type="button"
                    className="notion-paper__kompilieren-btn"
                    disabled={editorLocked}
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
        </div>
      </div>
    </article>
  )
}
