import { Check, Copy, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { formatClinicalDate } from '../../utils/clinicalDate'
import { copyTextToClipboard } from '../../utils/notionDocumentActions'
import { DOKUMENTE_ARCHIVE_CHANGED_EVENT, type DokumentEntry } from '../../utils/dokumenteArchive'
import { htmlToPlainLines, sanitizeRichHtml, stripHtml } from '../../utils/documentTemplate/htmlUtils'
import { looksLikeHtml } from '../../utils/documentTemplate/richText'
import {
  GLOBAL_NOTES_CASE_ID,
  deleteGlobalNote,
  listGlobalNotes,
  saveGlobalNote,
  updateGlobalNote,
} from '../../utils/standaloneNotes'
import { NotesRichEditor } from './NotesRichEditor'
import { useOptionalKbPharmaComments } from '../../contexts/KbPharmaCommentsContext'
import { KnowledgeBaseNotes } from '../dashboard/KnowledgeBaseNotes'

interface NotizenPanelProps {
  variant: 'floating' | 'docked'
  headerActions: ReactNode
  titleId?: string
}

function noteSnippet(content: string): string {
  const text = stripHtml(content) || content
  return text.length > 140 ? `${text.slice(0, 140)}…` : text
}

/** Copy a note: rich HTML + plain-text when the browser supports it, else plain. */
async function copyNote(content: string): Promise<boolean> {
  const plain = htmlToPlainLines(content) || stripHtml(content) || content
  if (
    looksLikeHtml(content) &&
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.write
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([sanitizeRichHtml(content)], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ])
      return true
    } catch {
      // fall through to plain-text copy
    }
  }
  return copyTextToClipboard(plain)
}

/**
 * Shared inner content for the floating + docked Notizen popup. Lists every
 * user-global note ({@link listGlobalNotes}) with copy / edit / delete and a
 * rich-text editor for creating or editing notes. Stays live across all surfaces
 * (popup, dashboard widget, tool saves) via the archive change event.
 */
export function NotizenPanel({ variant, headerActions, titleId = 'notizen-title' }: NotizenPanelProps) {
  const { t, language } = useTranslation()
  // When a Knowledge-Base entry is open, the Notizen surface becomes
  // entry-scoped: it hosts that entry's notepad (same per-entry store as the
  // inline KB rail) instead of the global notes pile. Falls back to the global
  // list whenever no entry is active. The provider may be absent (e.g. focused
  // unit tests), hence the optional accessor.
  const kbComments = useOptionalKbPharmaComments()
  const registration = kbComments?.registration ?? null
  const activeEntry = registration
    ? {
        id: registration.medicationId,
        name: registration.medicationName,
        language: registration.language,
      }
    : null
  const [notes, setNotes] = useState<DokumentEntry[]>(() => listGlobalNotes())
  const [view, setView] = useState<'list' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftHtml, setDraftHtml] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const refresh = useCallback(() => setNotes(listGlobalNotes()), [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ caseId?: string }>).detail
      if (!detail || detail.caseId === GLOBAL_NOTES_CASE_ID) refresh()
    }
    window.addEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
  }, [refresh])

  const startCreate = useCallback(() => {
    setEditingId(null)
    setDraftTitle('')
    setDraftHtml('')
    setView('edit')
  }, [])

  const startEdit = useCallback((note: DokumentEntry) => {
    setEditingId(note.id)
    setDraftTitle(note.title)
    setDraftHtml(note.content)
    setConfirmingId(null)
    setView('edit')
  }, [])

  const cancelEdit = useCallback(() => {
    setView('list')
    setEditingId(null)
    setDraftTitle('')
    setDraftHtml('')
  }, [])

  const hasContent = stripHtml(draftHtml).trim().length > 0 || draftTitle.trim().length > 0

  const handleSave = useCallback(() => {
    if (!hasContent) return
    const title = draftTitle.trim() || t('notizenUntitled')
    if (editingId) {
      updateGlobalNote(editingId, { title, content: draftHtml })
    } else {
      saveGlobalNote({ kind: 'jot', title, content: draftHtml })
    }
    refresh()
    cancelEdit()
  }, [hasContent, draftTitle, draftHtml, editingId, refresh, cancelEdit, t])

  const handleCopy = useCallback(async (note: DokumentEntry) => {
    const ok = await copyNote(note.content)
    if (!ok) return
    setCopiedId(note.id)
    window.setTimeout(() => setCopiedId((cur) => (cur === note.id ? null : cur)), 1800)
  }, [])

  const handleDelete = useCallback(
    (note: DokumentEntry) => {
      deleteGlobalNote(note.id)
      setConfirmingId(null)
      refresh()
    },
    [refresh],
  )

  const rootClass =
    variant === 'docked' ? 'ask-butterfly-panel ask-butterfly-panel--docked' : 'ask-butterfly-panel ask-butterfly-panel--floating'

  return (
    <div className={rootClass}>
      <header className="ask-butterfly-dialog__header">
        <div className="ask-butterfly-dialog__title-wrap">
          <span className="ask-butterfly-dialog__mark notizen-dialog__mark">
            <NotebookPen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2 id={titleId} className="ask-butterfly-dialog__title">
              {t('notizenTitle')}
            </h2>
            <p className="ask-butterfly-dialog__subtitle">
              {activeEntry ? (
                <>
                  <span className="notizen-scope-chip">{t('notizenScopeEntry')}</span>
                  <span className="notizen-scope-name">{activeEntry.name}</span>
                </>
              ) : (
                t('notizenSubtitle')
              )}
            </p>
          </div>
        </div>
        <div className="ask-butterfly-dialog__header-actions">{headerActions}</div>
      </header>

      <div className="ask-butterfly-dialog__body notizen-body">
        {activeEntry ? (
          <div className="notizen-entry">
            <KnowledgeBaseNotes
              key={activeEntry.id}
              medicationId={activeEntry.id}
              language={activeEntry.language || language}
              embedded
            />
          </div>
        ) : view === 'list' ? (
          <>
            <div className="notizen-list__toolbar">
              <button type="button" className="notizen-new-btn" onClick={startCreate}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {t('notizenNewNote')}
              </button>
            </div>

            {notes.length === 0 ? (
              <p className="notizen-empty">{t('notizenEmpty')}</p>
            ) : (
              <ul className="notizen-list" aria-label={t('notizenTitle')}>
                {notes.map((note) => (
                  <li key={note.id} className="notizen-row">
                    <button
                      type="button"
                      className="notizen-row__main"
                      onClick={() => startEdit(note)}
                      title={t('notizenEdit')}
                    >
                      <span className="notizen-row__title">{note.title}</span>
                      <span className="notizen-row__snippet">{noteSnippet(note.content)}</span>
                      <span className="notizen-row__date">
                        {formatClinicalDate(note.date) || note.date.slice(0, 10)}
                      </span>
                    </button>
                    <div className="notizen-row__actions">
                      <button
                        type="button"
                        className="notizen-icon-btn"
                        onClick={() => void handleCopy(note)}
                        title={copiedId === note.id ? t('copyButtonCopied') : t('workspaceAiCopy')}
                        aria-label={copiedId === note.id ? t('copyButtonCopied') : t('workspaceAiCopy')}
                      >
                        {copiedId === note.id ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        ) : (
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        className="notizen-icon-btn"
                        onClick={() => startEdit(note)}
                        title={t('notizenEdit')}
                        aria-label={t('notizenEdit')}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      </button>
                      {confirmingId === note.id ? (
                        <button
                          type="button"
                          className="notizen-confirm-btn"
                          onClick={() => handleDelete(note)}
                          title={t('notizenDeleteConfirm')}
                        >
                          {t('notizenDeleteConfirm')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="notizen-icon-btn notizen-icon-btn--danger"
                          onClick={() => setConfirmingId(note.id)}
                          title={t('notizenDelete')}
                          aria-label={t('notizenDelete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="notizen-editor">
            <input
              type="text"
              className="notizen-editor__title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={t('notizenTitlePlaceholder')}
              aria-label={t('notizenTitlePlaceholder')}
            />
            <NotesRichEditor
              value={draftHtml}
              onChange={setDraftHtml}
              placeholder={t('notizenBodyPlaceholder')}
              ariaLabel={t('notizenBodyPlaceholder')}
              minHeight={variant === 'docked' ? '10rem' : '8rem'}
            />
            <div className="notizen-editor__actions">
              <button type="button" className="notizen-btn notizen-btn--ghost" onClick={cancelEdit}>
                {t('standaloneCancel')}
              </button>
              <button
                type="button"
                className="notizen-btn notizen-btn--primary"
                onClick={handleSave}
                disabled={!hasContent}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {t('workspaceAiSave')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
