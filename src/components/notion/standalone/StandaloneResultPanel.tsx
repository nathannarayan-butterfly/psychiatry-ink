import { useCallback, useState } from 'react'
import { Check, Copy, FileDown, Loader2, Printer, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useCopyWithFeedback } from '../../../hooks/useCopyWithFeedback'
import { saveStandaloneNote } from '../../../utils/standaloneNotes'
import type { DokumentCategory } from '../../../utils/dokumenteArchive'
import { showNotionToast } from '../NotionToast'
import '../../../styles/workspace-ai.css'

interface StandaloneResultPanelProps {
  /** Storage id of the (default) case the note is saved under. */
  caseId: string
  /** Localized panel title; also used as the saved note's title. */
  title: string
  /** Stable note kind, e.g. `'somatic-befund'`. */
  noteKind: string
  /** Archive category for the saved note. */
  noteCategory?: DokumentCategory
  text: string
  onTextChange: (text: string) => void
  /** Discard the result and close the surface. */
  onClose: () => void
  /** Optional re-run (e.g. AI rewrite). When omitted, no regenerate button. */
  onRegenerate?: () => void
  regenerating?: boolean
  /**
   * Optional extra footer action (e.g. the ECG "Mit Medikation korrelieren"
   * step). Rendered as a ghost button next to the icon actions.
   */
  secondaryAction?: { label: string; onClick: () => void }
}

/**
 * Shared editable result surface for standalone widgets. Mirrors the action row
 * of `WorkspaceAiFeaturePanel` (copy / export / print / regenerate / discard)
 * but the primary action saves the output as a standalone note
 * (`saveStandaloneNote`) instead of writing into a patient case.
 */
export function StandaloneResultPanel({
  caseId,
  title,
  noteKind,
  noteCategory,
  text,
  onTextChange,
  onClose,
  onRegenerate,
  regenerating = false,
  secondaryAction,
}: StandaloneResultPanelProps) {
  const { t } = useTranslation()
  const { copied, copy } = useCopyWithFeedback()
  const [saved, setSaved] = useState(false)

  const handleCopy = useCallback(() => {
    void copy(text)
  }, [copy, text])

  const handleExport = useCallback(() => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [text, title])

  const handlePrint = useCallback(() => {
    const win = window.open('', '_blank')
    if (!win) return
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
        '<style>body{font:13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#1f1f1f;max-width:48rem;margin:2rem auto;padding:0 1.5rem;white-space:pre-wrap;}h1{font-size:1.1rem;margin-bottom:1rem;}</style>' +
        `</head><body><h1>${title}</h1><div>${escaped}</div></body></html>`,
    )
    win.document.close()
    win.focus()
    win.print()
  }, [text, title])

  const handleSave = useCallback(() => {
    if (!text.trim()) return
    saveStandaloneNote(caseId, {
      kind: noteKind,
      title,
      content: text,
      category: noteCategory,
    })
    setSaved(true)
    showNotionToast(t('standaloneSavedToNotes'))
  }, [caseId, noteKind, title, text, noteCategory, t])

  return (
    <div className="wai-panel wai-panel--inline" aria-label={title}>
        <header className="wai-panel__header">
          <span className="wai-panel__eyebrow">{t('standaloneEyebrow')}</span>
          <h2 className="wai-panel__title">{title}</h2>
          <button
            type="button"
            className="wai-panel__close"
            onClick={onClose}
            aria-label={t('dokumenteClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="wai-panel__body">
          {regenerating ? (
            <div className="wai-panel__state">
              <Loader2 className="h-5 w-5 wai-spin" strokeWidth={2} aria-hidden />
              <p>{t('workspaceAiGenerating')}</p>
            </div>
          ) : (
            <textarea
              className="wai-panel__editor"
              value={text}
              onChange={(event) => {
                onTextChange(event.target.value)
                setSaved(false)
              }}
              aria-label={title}
              spellCheck
            />
          )}
        </div>

        <footer className="wai-panel__footer">
          <div className="wai-panel__actions">
            <button
              type="button"
              className="wai-icon-btn"
              onClick={handleCopy}
              title={copied ? t('copyButtonCopied') : t('workspaceAiCopy')}
              aria-label={copied ? t('copyButtonCopied') : t('workspaceAiCopy')}
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="wai-icon-btn"
              onClick={handleExport}
              title={t('workspaceAiExport')}
              aria-label={t('workspaceAiExport')}
            >
              <FileDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="wai-icon-btn"
              onClick={handlePrint}
              title={t('workspaceAiPrint')}
              aria-label={t('workspaceAiPrint')}
            >
              <Printer className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
            {onRegenerate ? (
              <button
                type="button"
                className="wai-icon-btn"
                onClick={onRegenerate}
                disabled={regenerating}
                title={t('workspaceAiRegenerate')}
                aria-label={t('workspaceAiRegenerate')}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className="wai-icon-btn wai-icon-btn--danger"
              onClick={onClose}
              title={t('workspaceAiDelete')}
              aria-label={t('workspaceAiDelete')}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          {secondaryAction ? (
            <button
              type="button"
              className="wai-btn wai-btn--ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          ) : null}
          <button
            type="button"
            className="wai-btn wai-btn--primary"
            onClick={handleSave}
            disabled={!text.trim() || saved}
          >
            {saved ? (
              <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            )}
            {saved ? t('standaloneSavedToNotes') : t('standaloneSaveToNotes')}
          </button>
        </footer>
    </div>
  )
}
