import { Check, Copy, NotebookPen, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useNotizen } from '../../contexts/NotizenContext'
import { formatClinicalDate } from '../../utils/clinicalDate'
import { copyTextToClipboard } from '../../utils/notionDocumentActions'
import { DOKUMENTE_ARCHIVE_CHANGED_EVENT, type DokumentEntry } from '../../utils/dokumenteArchive'
import { htmlToPlainLines, sanitizeRichHtml, stripHtml } from '../../utils/documentTemplate/htmlUtils'
import { looksLikeHtml } from '../../utils/documentTemplate/richText'
import { GLOBAL_NOTES_CASE_ID, listGlobalNotes } from '../../utils/standaloneNotes'

function noteSnippet(content: string): string {
  const text = stripHtml(content) || content
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
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

/**
 * Dashboard widget previewing every user-global note ({@link listGlobalNotes})
 * read-only, with copy and an "open in Notizen" affordance. Editing and deleting
 * only happen inside the Notizen panel/page, not on the Dashboard. Shares the
 * exact same store as the floating Notizen popup and the standalone tools,
 * staying live via the archive change event.
 */
export function MyNotesWidget({ onOpenFullPage }: { onOpenFullPage?: () => void }) {
  const { t } = useTranslation()
  const notizen = useNotizen()
  const [notes, setNotes] = useState<DokumentEntry[]>(() => listGlobalNotes())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const refresh = useCallback(() => setNotes(listGlobalNotes()), [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ caseId?: string }>).detail
      if (!detail || detail.caseId === GLOBAL_NOTES_CASE_ID) refresh()
    }
    window.addEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handler)
  }, [refresh])

  const handleCopy = useCallback(async (note: DokumentEntry) => {
    const ok = await copyNote(note.content)
    if (!ok) return
    setCopiedId(note.id)
    window.setTimeout(() => setCopiedId((cur) => (cur === note.id ? null : cur)), 1800)
  }, [])

  return (
    <section className="dashboard-section my-notes" aria-labelledby="dashboard-section-notes">
      <div className="dashboard-section__header-row">
        <h2 id="dashboard-section-notes" className="dashboard-section__heading">
          <NotebookPen className="my-notes__heading-icon h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('myNotesTitle')}
          {notes.length > 0 ? <span className="dashboard-section__count"> ({notes.length})</span> : null}
        </h2>
        <div className="dashboard-section__header-actions">
          {notes.length > 0 && onOpenFullPage ? (
            <button type="button" className="dashboard-view-all" onClick={onOpenFullPage}>
              {t('myNotesViewAll')}
            </button>
          ) : null}
          <button type="button" className="dashboard-view-all" onClick={notizen.open}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('myNotesOpenInNotizen')}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="my-notes__empty clinical-card">{t('myNotesEmpty')}</p>
      ) : (
        <ul className="my-notes__list">
          {notes.map((note) => (
            <li key={note.id} className="my-notes__row clinical-card">
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
