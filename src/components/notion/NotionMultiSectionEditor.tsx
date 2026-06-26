import { Copy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { AiToolKey } from '../../data/aiTools'
import type { DocumentSection, DocumentVariantMode, InputMode } from '../../types'
import type { AufnahmeSectionMetadata } from '../../types/anamneseBefund'
import { isAufnahmeBefundSection } from '../../types/anamneseBefund'
import type { DictationPhase } from '../../types/dictation'
import {
  copyTextToClipboard,
  getNotionSectionCopyText,
} from '../../utils/notionDocumentActions'
import { getInitialEditorContent } from '../../utils/workspaceComponents'
import { isInlineAiEditEnabled } from '../../utils/featureFlags'
import { isInlineAiEditShortcut } from '../../utils/notionKeyboardShortcuts'
import { applyEdit } from '../../utils/inlineAiEdit/buildEditContext'
import { ChecklistPanel } from '../ChecklistPanel'
import { WorkspaceEditorOverlay } from '../WorkspaceEditorOverlay'
import { FloatingSelectionToolbar, type SelectionActionId } from './FloatingSelectionToolbar'
import { useInlineAiEdit } from './inlineAiEdit/useInlineAiEdit'
import { IMPROVE_ONLY_SECTION_AI_TOOLS, NotionSectionAiLinks } from './NotionSectionAiLinks'
import { AufnahmeBefundSectionHost } from './anamnese/AufnahmeBefundSectionHost'
import { showNotionToast } from './NotionToast'
import { SlashCommandMenu, type SlashCommandId } from './SlashCommandMenu'
import type { PendingPaste } from './NotionPaper'

interface NotionMultiSectionEditorProps {
  sections: DocumentSection[]
  sectionConfigs: DocumentSection[]
  sectionContents: Record<string, string>
  sectionMetadata?: Record<string, AufnahmeSectionMetadata>
  documentTypeId?: string
  checklistSelections: Record<string, Record<string, boolean>>
  documentMode?: DocumentVariantMode
  activeSectionId: string | null
  inputMode?: InputMode
  readOnly?: boolean
  dictationPhase: DictationPhase
  dictationDurationMs: number
  dictationPlaybackMs: number
  isPlayingBack: boolean
  isGenerating: boolean
  onSectionContentChange: (sectionId: string, value: string) => void
  onSectionMetadataChange?: (sectionId: string, metadata: AufnahmeSectionMetadata | undefined) => void
  onBefundSectionManualEdit?: (sectionId: string) => void
  onSectionFocus: (sectionId: string) => void
  onSectionBlur: (sectionId: string) => void
  onToggleChecklistItem?: (sectionId: string, itemId: string, checked: boolean) => void
  onSectionAiTool?: (sectionId: string, tool: AiToolKey) => void
  onPasteOrigin: () => void
  onSelectionAction: (action: SelectionActionId, selectedText: string) => void
  onSlashCommand: (command: SlashCommandId) => void
  focusRequest?: number
  pendingPaste?: PendingPaste | null
  caseId?: string
}

function getSelectionPosition(textarea: HTMLTextAreaElement): { top: number; left: number } {
  const rect = textarea.getBoundingClientRect()
  return {
    top: rect.top + 48,
    left: rect.left + 24,
  }
}

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

export function NotionMultiSectionEditor({
  sections,
  sectionConfigs,
  sectionContents,
  sectionMetadata = {},
  documentTypeId,
  checklistSelections,
  documentMode,
  activeSectionId,
  inputMode: _inputMode = 'write',
  readOnly = false,
  dictationPhase,
  dictationDurationMs,
  dictationPlaybackMs,
  isPlayingBack,
  isGenerating,
  onSectionContentChange,
  onSectionMetadataChange,
  onBefundSectionManualEdit,
  onSectionFocus,
  onSectionBlur,
  onToggleChecklistItem,
  onSectionAiTool,
  onPasteOrigin,
  onSelectionAction,
  onSlashCommand,
  focusRequest = 0,
  pendingPaste = null,
  caseId,
}: NotionMultiSectionEditorProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const [activeTextareaId, setActiveTextareaId] = useState<string | null>(activeSectionId)
  const [selectionToolbar, setSelectionToolbar] = useState<{
    text: string
    start: number
    end: number
    sectionId: string
    position: { top: number; left: number }
  } | null>(null)
  const aiEditEnabled = isInlineAiEditEnabled()
  const inlineEdit = useInlineAiEdit({ caseId })
  const [slashMenu, setSlashMenu] = useState<{
    filter: string
    position: { top: number; left: number }
    slashIndex: number
    sectionId: string
  } | null>(null)

  const getSectionContent = useCallback(
    (section: DocumentSection) =>
      getInitialEditorContent(sectionContents[section.id], section.prefilledText),
    [sectionContents],
  )

  const syncTextareaHeights = useCallback(() => {
    for (const section of sections) {
      const textarea = textareaRefs.current[section.id]
      if (textarea) resizeTextarea(textarea)
    }
  }, [sections])

  useEffect(() => {
    syncTextareaHeights()
  }, [sectionContents, sections, syncTextareaHeights])

  const focusSectionTextarea = useCallback((sectionId: string, cursorAt: number) => {
    requestAnimationFrame(() => {
      const textarea = textareaRefs.current[sectionId]
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(cursorAt, cursorAt)
    })
  }, [])

  useEffect(() => {
    if (focusRequest === 0 || !activeSectionId) return
    const section = sections.find((item) => item.id === activeSectionId)
    if (!section) return
    const content = getSectionContent(section)
    focusSectionTextarea(activeSectionId, content.length)
  }, [activeSectionId, focusRequest, focusSectionTextarea, getSectionContent, sections])

  useEffect(() => {
    if (!pendingPaste || !activeSectionId) return
    requestAnimationFrame(() => {
      const textarea = textareaRefs.current[activeSectionId]
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(pendingPaste.text.length, pendingPaste.text.length)
      resizeTextarea(textarea)
      setSelectionToolbar(null)
      setSlashMenu(null)
    })
  }, [activeSectionId, pendingPaste])

  useEffect(() => {
    if (!activeSectionId) return
    const sectionEl = document.getElementById(`notion-section-${activeSectionId}`)
    sectionEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSectionId])

  const closeMenus = useCallback(() => {
    setSelectionToolbar(null)
    setSlashMenu(null)
  }, [])

  const handleCopySection = useCallback(
    async (section: DocumentSection) => {
      const text = getNotionSectionCopyText(section, sectionContents, sectionConfigs)
      const copied = await copyTextToClipboard(text)
      if (copied) showNotionToast(t('notionCopied'))
    },
    [sectionConfigs, sectionContents, t],
  )

  const handleSelection = useCallback(
    (sectionId: string) => {
      const textarea = textareaRefs.current[sectionId]
      if (!textarea || readOnly) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start === end) {
        setSelectionToolbar(null)
        return
      }

      const section = sections.find((s) => s.id === sectionId)
      if (!section) return
      const content = getSectionContent(section)
      const selectedText = content.slice(start, end).trim()
      if (!selectedText) {
        setSelectionToolbar(null)
        return
      }

      setSelectionToolbar({
        text: selectedText,
        start,
        end,
        sectionId,
        position: getSelectionPosition(textarea),
      })
      setSlashMenu(null)
    },
    [getSectionContent, readOnly, sections],
  )

  const openAiEdit = useCallback(
    (sectionId: string, range: { start: number; end: number }) => {
      const textarea = textareaRefs.current[sectionId]
      const section = sections.find((item) => item.id === sectionId)
      if (!textarea || !section) return
      const content = getSectionContent(section)
      const selectedText = content.slice(range.start, range.end)
      if (!selectedText.trim()) return
      inlineEdit.open({
        selectedText,
        fullText: content,
        selectionStart: range.start,
        selectionEnd: range.end,
        position: getSelectionPosition(textarea),
        applyReplacement: (editedText) => {
          const next = applyEdit(content, range.start, range.end, editedText)
          onSectionContentChange(sectionId, next)
          requestAnimationFrame(() => {
            const node = textareaRefs.current[sectionId]
            if (!node) return
            const caret = range.start + editedText.length
            node.focus()
            node.setSelectionRange(caret, caret)
            resizeTextarea(node)
          })
        },
      })
      setSelectionToolbar(null)
      setSlashMenu(null)
    },
    [getSectionContent, inlineEdit, onSectionContentChange, sections],
  )

  const handlePaste = useCallback(
    (_event: React.ClipboardEvent<HTMLTextAreaElement>, _sectionId: string) => {
      onPasteOrigin()
      setSelectionToolbar(null)
      setSlashMenu(null)
    },
    [onPasteOrigin],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>, sectionId: string) => {
      if (readOnly) return

      if (aiEditEnabled && isInlineAiEditShortcut(event.nativeEvent)) {
        const textarea = textareaRefs.current[sectionId]
        if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
          event.preventDefault()
          openAiEdit(sectionId, { start: textarea.selectionStart, end: textarea.selectionEnd })
        }
        return
      }

      if (slashMenu && slashMenu.sectionId === sectionId) {
        if (event.key === 'Escape') {
          event.preventDefault()
          closeMenus()
          return
        }

        if (event.key === 'Backspace' && slashMenu.filter.length === 0) {
          closeMenus()
          return
        }

        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault()
          setSlashMenu((current) =>
            current ? { ...current, filter: current.filter + event.key } : null,
          )
        }
      }
    },
    [aiEditEnabled, closeMenus, openAiEdit, readOnly, slashMenu],
  )

  const handleSlashSelect = useCallback(
    (command: SlashCommandId) => {
      if (slashMenu) {
        const section = sections.find((item) => item.id === slashMenu.sectionId)
        if (section) {
          const content = getSectionContent(section)
          const before = content.slice(0, slashMenu.slashIndex)
          const textarea = textareaRefs.current[slashMenu.sectionId]
          const after = content.slice(textarea?.selectionStart ?? slashMenu.slashIndex)
          onSectionContentChange(slashMenu.sectionId, `${before}${after}`)
        }
      }
      closeMenus()
      onSlashCommand(command)
    },
    [closeMenus, getSectionContent, onSectionContentChange, onSlashCommand, sections, slashMenu],
  )

  const getSectionConfig = useCallback(
    (sectionId: string) => sectionConfigs.find((item) => item.id === sectionId),
    [sectionConfigs],
  )

  return (
    <div className="notion-editor notion-editor--multistage" ref={containerRef}>
      {sections.map((section) => {
        const content = getSectionContent(section)
        const isActive = section.id === activeSectionId
        const hasContent = Boolean(content.trim())
        const showQuickAi = hasContent && !isActive && !readOnly && !isGenerating && onSectionAiTool
        const sectionConfig = getSectionConfig(section.id)
        const showSectionChecklist =
          documentMode === 'checklist' &&
          Boolean(sectionConfig?.checklistItems?.length) &&
          onToggleChecklistItem
        const sectionChecklistSelections = checklistSelections[section.id] ?? {}

        return (
          <section
            key={section.id}
            id={`notion-section-${section.id}`}
            className={`notion-editor__section ${isActive ? 'notion-editor__section--active' : ''}`}
          >
            <div className="notion-editor__section-header">
              <h3 className="notion-editor__section-heading">{section.label}</h3>
              <button
                type="button"
                className="notion-editor__section-copy"
                onClick={() => handleCopySection(section)}
                title={t('notionCopySection')}
                aria-label={t('notionCopySection')}
              >
                <Copy className="h-3 w-3" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            {showSectionChecklist && sectionConfig?.checklistItems ? (
              <div className="notion-editor__section-checklist">
                <ChecklistPanel
                  items={sectionConfig.checklistItems}
                  selections={sectionChecklistSelections}
                  disabled={readOnly}
                  onToggle={(itemId, checked) =>
                    onToggleChecklistItem(section.id, itemId, checked)
                  }
                />
              </div>
            ) : null}
            {documentTypeId === 'aufnahme' && isAufnahmeBefundSection(section.id) ? (
              <AufnahmeBefundSectionHost
                sectionId={section.id}
                isActive={isActive}
                readOnly={readOnly}
                caseId={caseId}
                content={content}
                metadata={sectionMetadata[section.id]}
                onContentChange={onSectionContentChange}
                onMetadataChange={(id, meta) => onSectionMetadataChange?.(id, meta)}
                onFocusEditor={(id) => {
                  onSectionFocus(id)
                  focusSectionTextarea(id, content.length)
                }}
                onAiGenerate={onSectionAiTool ? (id) => onSectionAiTool(id, 'structure') : undefined}
              />
            ) : null}
            <textarea
              ref={(node) => {
                textareaRefs.current[section.id] = node
                if (node) resizeTextarea(node)
              }}
              className="notion-editor__textarea notion-editor__textarea--section"
              value={content}
              onChange={(event) => {
                onSectionContentChange(section.id, event.target.value)
                if (documentTypeId === 'aufnahme' && isAufnahmeBefundSection(section.id)) {
                  onBefundSectionManualEdit?.(section.id)
                }
                resizeTextarea(event.target)
              }}
              onFocus={() => {
                setActiveTextareaId(section.id)
                onSectionFocus(section.id)
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  if (
                    !document.activeElement?.closest(
                      '.notion-selection-toolbar, .notion-slash-menu, .notion-editor__section-ai',
                    )
                  ) {
                    closeMenus()
                  }
                }, 120)
                onSectionBlur(section.id)
              }}
              onSelect={() => handleSelection(section.id)}
              onMouseUp={() => handleSelection(section.id)}
              onKeyUp={() => handleSelection(section.id)}
              onKeyDown={(event) => handleKeyDown(event, section.id)}
              onPaste={(event) => handlePaste(event, section.id)}
              placeholder={t('notionEditorPlaceholder')}
              spellCheck
              readOnly={readOnly}
              aria-label={section.label}
              rows={3}
            />
            {showQuickAi ? (
              <NotionSectionAiLinks
                onAiTool={(tool) => onSectionAiTool(section.id, tool)}
                tools={
                  section.id === 'psychopathologischer-befund'
                    ? IMPROVE_ONLY_SECTION_AI_TOOLS
                    : undefined
                }
              />
            ) : null}
          </section>
        )
      })}

      {activeTextareaId === activeSectionId ? (
        <WorkspaceEditorOverlay
          dictationPhase={dictationPhase}
          durationMs={dictationDurationMs}
          playbackMs={dictationPlaybackMs}
          isPlayingBack={isPlayingBack}
          isGenerating={isGenerating}
        />
      ) : null}

      {selectionToolbar ? (
        <FloatingSelectionToolbar
          position={selectionToolbar.position}
          onAction={(action) => {
            onSelectionAction(action, selectionToolbar.text)
            closeMenus()
          }}
          onClose={closeMenus}
          onAiEdit={
            aiEditEnabled
              ? () =>
                  openAiEdit(selectionToolbar.sectionId, {
                    start: selectionToolbar.start,
                    end: selectionToolbar.end,
                  })
              : undefined
          }
        />
      ) : null}

      {inlineEdit.popup}

      {slashMenu ? (
        <SlashCommandMenu
          filter={slashMenu.filter}
          position={slashMenu.position}
          onSelect={handleSlashSelect}
          onClose={closeMenus}
        />
      ) : null}
    </div>
  )
}
