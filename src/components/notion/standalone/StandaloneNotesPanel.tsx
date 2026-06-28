import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { formatClinicalDate } from '../../../utils/clinicalDate'
import { copyTextToClipboard } from '../../../utils/notionDocumentActions'
import { DOKUMENTE_ARCHIVE_CHANGED_EVENT, type DokumentEntry } from '../../../utils/dokumenteArchive'
import {
  deleteStandaloneNote,
  listStandaloneNotes,
  updateStandaloneNote,
} from '../../../utils/standaloneNotes'
import '../../../styles/standalone-workspace.css'

interface StandaloneNotesPanelProps {
  /** Storage id of the standalone (default) case whose notes are listed. */
  caseId: string
}

function formatDate(iso: string): string {
  return formatClinicalDate(iso) || iso.slice(0, 10)
}

/**
 * Saved-notes side panel for the patient-less workspace. Lists the standalone
 * notes saved on the default case (via {@link listStandaloneNotes}) and offers
 * the usual document actions — copy, edit (rename + modify) and delete — reusing
 * the Dokumente archive persistence layer. Stays in sync with widget saves via
 * the archive's same-window change event.
 */
export function StandaloneNotesPanel({ caseId }: StandaloneNotesPanelProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState<DokumentEntry[]>(() => listStandaloneNotes(caseId))
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<DokumentEntry | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const refresh = useCallback(() => {
    setNotes(listStandaloneNotes(caseId))
  }, [caseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ caseId?: string }>).detail
      if (!detail || detail.caseId === caseId) refresh()
    }
    window.addEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
  }, [caseId, refresh])

  const handleCopy = useCallback(async (note: DokumentEntry) => {
    const ok = await copyTextToClipboard(note.content)
    if (!ok) return
    setCopiedId(note.id)
    window.setTimeout(() => setCopiedId((current) => (current === note.id ? null : current)), 1800)
  }, [])

  const openEditor = useCallback((note: DokumentEntry) => {
    setEditing(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setConfirmingId(null)
  }, [])

  const closeEditor = useCallback(() => {
    setEditing(null)
    setEditTitle('')
    setEditContent('')
  }, [])

  const saveEditor = useCallback(() => {
    if (!editing) return
    updateStandaloneNote(caseId, editing.id, {
      title: editTitle.trim() || editing.title,
      content: editContent,
    })
    refresh()
    closeEditor()
  }, [editing, caseId, editTitle, editContent, refresh, closeEditor])

  const handleDelete = useCallback(
    (note: DokumentEntry) => {
      deleteStandaloneNote(caseId, note.id)
      setConfirmingId(null)
      refresh()
    },
    [caseId, refresh],
  )

  if (notes.length === 0) return null

  return (
    <section className="swx-notes" aria-label={t('standaloneNotesHeading')}>
      <p className="swx-notes__heading">{t('standaloneNotesHeading')}</p>
      <ul className="swx-notes__list">
        {notes.map((note) => (
          <li key={note.id} className="swx-notes__row">
            <div className="swx-notes__main">
              <span className="swx-notes__title">{note.title}</span>
              <span className="swx-notes__date">{formatDate(note.date)}</span>
            </div>
            <div className="swx-notes__actions">
              <button
                type="button"
                className="swx-notes__icon-btn"
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
                className="swx-notes__icon-btn"
                onClick={() => openEditor(note)}
                title={t('standaloneNoteEdit')}
                aria-label={t('standaloneNoteEdit')}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
              {confirmingId === note.id ? (
                <button
                  type="button"
                  className="swx-notes__confirm-btn"
                  onClick={() => handleDelete(note)}
                  title={t('standaloneNoteDeleteConfirm')}
                >
                  {t('standaloneNoteDeleteConfirm')}
                </button>
              ) : (
                <button
                  type="button"
                  className="swx-notes__icon-btn swx-notes__icon-btn--danger"
                  onClick={() => setConfirmingId(note.id)}
                  title={t('standaloneNoteDelete')}
                  aria-label={t('standaloneNoteDelete')}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <div
          className="swx-edit-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('standaloneNoteEditTitle')}
          onClick={closeEditor}
        >
          <div className="swx-edit" onClick={(e) => e.stopPropagation()}>
            <header className="swx-edit__header">
              <h2 className="swx-edit__title">{t('standaloneNoteEditTitle')}</h2>
              <button
                type="button"
                className="swx-edit__close"
                onClick={closeEditor}
                aria-label={t('dokumenteClose')}
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            </header>
            <label className="swx-edit__label">
              {t('standaloneNoteTitleLabel')}
              <input
                type="text"
                className="swx-edit__input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </label>
            <textarea
              className="swx-edit__textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              aria-label={t('standaloneNoteEditTitle')}
              spellCheck
            />
            <div className="swx-edit__footer">
              <button type="button" className="swx-edit__btn swx-edit__btn--ghost" onClick={closeEditor}>
                {t('standaloneCancel')}
              </button>
              <button
                type="button"
                className="swx-edit__btn swx-edit__btn--primary"
                onClick={saveEditor}
                disabled={!editContent.trim()}
              >
                {t('workspaceAiSave')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
