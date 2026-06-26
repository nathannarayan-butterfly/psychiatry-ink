import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { AiToolKey } from '../../data/aiTools'
import type { InputMode } from '../../types'
import type { DictationPhase } from '../../types/dictation'
import { isInlineAiEditEnabled } from '../../utils/featureFlags'
import { isInlineAiEditShortcut } from '../../utils/notionKeyboardShortcuts'
import { applyEdit } from '../../utils/inlineAiEdit/buildEditContext'
import { WorkspaceEditorOverlay } from '../WorkspaceEditorOverlay'
import { FloatingSelectionToolbar, type SelectionActionId } from './FloatingSelectionToolbar'
import { useInlineAiEdit } from './inlineAiEdit/useInlineAiEdit'
import { NotionSectionAiLinks } from './NotionSectionAiLinks'
import { SlashCommandMenu, type SlashCommandId } from './SlashCommandMenu'
import type { PendingPaste } from './NotionPaper'

interface NotionEditorProps {
  content: string
  placeholder?: string
  readOnly?: boolean
  inputMode?: InputMode
  dictationPhase: DictationPhase
  dictationDurationMs: number
  dictationPlaybackMs: number
  isPlayingBack: boolean
  isGenerating: boolean
  onChange: (value: string) => void
  onPasteOrigin: () => void
  onBlur?: () => void
  onEditorAiTool?: (tool: AiToolKey) => void
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

export function NotionEditor({
  content,
  placeholder,
  readOnly = false,
  inputMode: _inputMode = 'write',
  dictationPhase,
  dictationDurationMs,
  dictationPlaybackMs,
  isPlayingBack,
  isGenerating,
  onChange,
  onPasteOrigin,
  onBlur,
  onEditorAiTool,
  onSelectionAction,
  onSlashCommand,
  focusRequest = 0,
  pendingPaste = null,
  caseId,
}: NotionEditorProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Value the textarea was last auto-resized for, so we don't force a redundant
  // layout reflow on every render (the inline-ref + effect + onChange paths
  // previously each triggered their own reflow on a single keystroke).
  const lastResizedRef = useRef<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [selectionToolbar, setSelectionToolbar] = useState<{
    text: string
    start: number
    end: number
    position: { top: number; left: number }
  } | null>(null)
  const aiEditEnabled = isInlineAiEditEnabled()
  const inlineEdit = useInlineAiEdit({ caseId })
  const [slashMenu, setSlashMenu] = useState<{
    filter: string
    position: { top: number; left: number }
    slashIndex: number
  } | null>(null)

  const focusTextarea = useCallback((cursorAt = content.length) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(cursorAt, cursorAt)
    })
  }, [content.length])

  useEffect(() => {
    if (focusRequest === 0) return
    focusTextarea(content.length)
  }, [content.length, focusRequest, focusTextarea])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && lastResizedRef.current !== content) {
      resizeTextarea(textarea)
      lastResizedRef.current = content
    }
  }, [content])

  useEffect(() => {
    if (!pendingPaste) return
    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(pendingPaste.text.length, pendingPaste.text.length)
      setSelectionToolbar(null)
      setSlashMenu(null)
    })
  }, [pendingPaste])

  const handleSelection = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || readOnly) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) {
      setSelectionToolbar(null)
      return
    }

    const selectedText = content.slice(start, end).trim()
    if (!selectedText) {
      setSelectionToolbar(null)
      return
    }

    setSelectionToolbar({
      text: selectedText,
      start,
      end,
      position: getSelectionPosition(textarea),
    })
    setSlashMenu(null)
  }, [content, readOnly])

  const openAiEdit = useCallback(
    (range: { start: number; end: number }) => {
      const textarea = textareaRef.current
      if (!textarea) return
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
          onChange(next)
          requestAnimationFrame(() => {
            const node = textareaRef.current
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
    [content, inlineEdit, onChange],
  )

  const handlePaste = useCallback(
    (_event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      onPasteOrigin()
      setSelectionToolbar(null)
      setSlashMenu(null)
    },
    [onPasteOrigin],
  )

  const closeMenus = useCallback(() => {
    setSelectionToolbar(null)
    setSlashMenu(null)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return

      if (aiEditEnabled && isInlineAiEditShortcut(event.nativeEvent)) {
        const textarea = textareaRef.current
        if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
          event.preventDefault()
          openAiEdit({ start: textarea.selectionStart, end: textarea.selectionEnd })
        }
        return
      }

      if (slashMenu) {
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
        const before = content.slice(0, slashMenu.slashIndex)
        const after = content.slice(textareaRef.current?.selectionStart ?? slashMenu.slashIndex)
        onChange(`${before}${after}`)
      }
      closeMenus()
      onSlashCommand(command)
    },
    [closeMenus, content, onChange, onSlashCommand, slashMenu],
  )

  const hasContent = Boolean(content.trim())
  const showQuickAi =
    hasContent && !isFocused && !readOnly && !isGenerating && Boolean(onEditorAiTool)

  return (
    <div className="notion-editor">
      <textarea
        ref={(node) => {
          textareaRef.current = node
        }}
        className="notion-editor__textarea"
        value={content}
        onChange={(event) => {
          onChange(event.target.value)
          resizeTextarea(event.target)
          lastResizedRef.current = event.target.value
        }}
        onFocus={() => setIsFocused(true)}
        onSelect={handleSelection}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          setIsFocused(false)
          onBlur?.()
          window.setTimeout(() => {
            if (
              !document.activeElement?.closest(
                '.notion-selection-toolbar, .notion-slash-menu, .notion-editor__section-ai',
              )
            ) {
              closeMenus()
            }
          }, 120)
        }}
        placeholder={placeholder ?? t('notionEditorPlaceholder')}
        spellCheck
        readOnly={readOnly}
      />

      {showQuickAi ? (
        <NotionSectionAiLinks onAiTool={(tool) => onEditorAiTool?.(tool)} />
      ) : null}

      <WorkspaceEditorOverlay
        dictationPhase={dictationPhase}
        durationMs={dictationDurationMs}
        playbackMs={dictationPlaybackMs}
        isPlayingBack={isPlayingBack}
        isGenerating={isGenerating}
      />

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
              ? () => openAiEdit({ start: selectionToolbar.start, end: selectionToolbar.end })
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
