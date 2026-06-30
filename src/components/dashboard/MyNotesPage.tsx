import { ArrowLeft, Check, Copy, NotebookPen, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useNotizen } from '../../contexts/NotizenContext'
import { formatClinicalDate } from '../../utils/clinicalDate'
import { copyTextToClipboard } from '../../utils/notionDocumentActions'
import { DOKUMENTE_ARCHIVE_CHANGED_EVENT, type DokumentEntry } from '../../utils/dokumenteArchive'
import { htmlToPlainLines, sanitizeRichHtml, stripHtml } from '../../utils/documentTemplate/htmlUtils'
import { looksLikeHtml } from '../../utils/documentTemplate/richText'
import {
  GLOBAL_NOTES_CASE_ID,
  deleteGlobalNote,
  listGlobalNotes,
  updateGlobalNote,
} from '../../utils/standaloneNotes'
import { NotesRichEditor } from '../notes/NotesRichEditor'

interface MyNotesPageProps {
  onBack: () => void
}

function noteSnippet(content: string): string {
  const text = stripHtml(content) || content
  return text.length > 240 ? `${text.slice(0, 240)}…` : text
}

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
      // fall through
    }
  }
  return copyTextToClipboard(plain)
}

export function MyNotesPage({ onBack }: MyNotesPageProps) {
  const { t } = useTranslation()
  const notizen = useNotizen()
  const [notes, setNotes] = useState<DokumentEntry[]>(() => listGlobalNotes())
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editHtml, setEditHtml] = useState('')

  const refresh = useCallback(() => setNotes(listGlobalNotes()), [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ caseId?: string }>).detail
      if (!detail || detail.caseId === GLOBAL_NOTES_CASE_ID) refresh()
    }
    window.addEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((note) => {
      const haystack = `${note.title}\n${stripHtml(note.content) || note.content}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [notes, search])

  const startEdit = useCallback((note: DokumentEntry) => {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditHtml(note.content)
    setConfirmingId(null)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditTitle('')
    setEditHtml('')
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingId) return
    updateGlobalNote(editingId, {
      title: editTitle.trim() || t('notizenUntitled'),
      content: editHtml,
    })
    refresh()
    cancelEdit()
  }, [editingId, editTitle, editHtml, refresh, cancelEdit, t])

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

  return (
    <div className="my-notes-page cm-workspace text-ink">
      <div className="my-notes-page__inner">
        <header className="my-notes-page__header">
          <button type="button" className="clinical-back-link" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </button>
          <div className="cm-page-eyebrow my-notes-page__eyebrow">
            <span className="my-notes-page__title-icon" aria-hidden>
              <NotebookPen strokeWidth={1.75} />
            </span>
            <h1 className="cm-page-eyebrow__label">{t('myNotesPageTitle')}</h1>
            <hr className="cm-page-eyebrow__rule" />
          </div>
        </header>

        <div className="my-notes-page__toolbar">
          <label className="my-notes-page__search">
            <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('myNotesSearchPlaceholder')}
              aria-label={t('myNotesSearchPlaceholder')}
            />
          </label>
          <button type="button" className="dashboard-view-all" onClick={notizen.open}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('myNotesOpenInNotizen')}
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="my-notes__empty clinical-card">{t('myNotesEmpty')}</p>
        ) : (
          <ul className="my-notes__list my-notes-page__list">
            {filtered.map((note) => (
              <li key={note.id} className="my-notes__row clinical-card">
                {editingId === note.id ? (
                  <div className="my-notes__editor">
                    <input
                      type="text"
                      className="notizen-editor__title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={t('notizenTitlePlaceholder')}
                      aria-label={t('notizenTitlePlaceholder')}
                    />
                    <NotesRichEditor
                      value={editHtml}
                      onChange={setEditHtml}
                      placeholder={t('notizenBodyPlaceholder')}
                      ariaLabel={t('notizenBodyPlaceholder')}
                      minHeight="8rem"
                    />
                    <div className="notizen-editor__actions">
                      <button type="button" className="notizen-btn notizen-btn--ghost" onClick={cancelEdit}>
                        {t('standaloneCancel')}
                      </button>
                      <button type="button" className="notizen-btn notizen-btn--primary" onClick={saveEdit}>
                        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        {t('workspaceAiSave')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="my-notes__main">
                      <span className="my-notes__title">{note.title}</span>
                      <span className="my-notes__snippet">{noteSnippet(note.content)}</span>
                      <span className="my-notes__date">
                        {formatClinicalDate(note.date) || note.date.slice(0, 10)}
                      </span>
                    </div>
                    <div className="my-notes__actions">
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
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
