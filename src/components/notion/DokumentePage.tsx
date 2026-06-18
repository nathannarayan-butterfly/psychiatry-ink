import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { componentTranslations } from '../../data/componentTranslations'
import {
  deleteDokument,
  DOKUMENTE_ARCHIVE_CHANGED_EVENT,
  loadDokumente,
  type DokumentCategory,
  type DokumentEntry,
} from '../../utils/dokumenteArchive'
import { syncLaborDokumente } from '../../utils/laborDokumente'
import { syncAllBefundDokumente } from '../../utils/befundDokumente'
import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import { formatIsoTimestampDate } from '../../utils/siteTimezone'
import type { UiLanguage } from '../../types/settings'
import { TemplateWorkspaceHost } from '../templates/TemplateWorkspaceHost'
import { useDokumenteSectionNavOptional } from '../../contexts/DokumenteSectionNavContext'
import {
  CATEGORY_ORDER,
  getCategoryLabelKey,
  type CategoryFilter,
} from '../../data/dokumenteCategories'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

function getSourceLabelKey(
  source: DokumentEntry['source'],
): 'dokumenteSourceAi' | 'dokumenteSourceManual' | 'dokumenteSourceDraft' | null {
  switch (source) {
    case 'ai-accepted':
      return 'dokumenteSourceAi'
    case 'manual':
      return 'dokumenteSourceManual'
    case 'draft':
      return 'dokumenteSourceDraft'
    default:
      return null
  }
}

function resolveSectionLabel(sectionId: string, language: UiLanguage): string {
  const translated = componentTranslations.aufnahme?.sections?.[sectionId]?.label?.[language]
  if (translated?.trim()) return translated
  const fallback = defaultAufnahmeSections.find((section) => section.id === sectionId)
  return fallback?.label ?? sectionId
}

function getCategoryColor(category: DokumentCategory): string {
  switch (category) {
    case 'anamnese': return 'dokumente-badge--anamnese'
    case 'arztbrief': return 'dokumente-badge--arztbrief'
    case 'laborbefunde': return 'dokumente-badge--laborbefunde'
    case 'untersuchungsbefunde': return 'dokumente-badge--untersuchungsbefunde'
    case 'externe-befunde': return 'dokumente-badge--externe'
    case 'formulare': return 'dokumente-badge--formulare'
  }
}

// ---------------------------------------------------------------------------
// Document Detail (in-place view)
// ---------------------------------------------------------------------------

interface DocumentDetailProps {
  entry: DokumentEntry
  categoryLabel: string
  /** Whether a "back to list" button should be shown (there's a file list to return to). */
  showBack: boolean
  onBack: () => void
  /** Only provided for draft / template entries; opens the appropriate workspace for editing. */
  onEdit?: () => void
}

function DocumentDetail({ entry, categoryLabel, showBack, onBack, onEdit }: DocumentDetailProps) {
  const { t, language } = useTranslation()

  const sourceLabelKey = getSourceLabelKey(entry.source)

  const sectionEntries = entry.sectionContents
    ? defaultAufnahmeSections
        .map((section) => ({
          id: section.id,
          label: resolveSectionLabel(section.id, language),
          content: entry.sectionContents?.[section.id]?.trim() ?? '',
        }))
        .filter((section) => section.content)
    : []

  // Escape returns to the list, mirroring the previous modal behaviour.
  useEffect(() => {
    if (!showBack) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showBack, onBack])

  return (
    <article className="dokumente-detail" aria-label={entry.title}>
      {showBack && (
        <div className="dokumente-detail__toolbar">
          <button
            type="button"
            className="dokumente-detail__back"
            onClick={onBack}
          >
            <ChevronLeft className="dokumente-detail__back-icon" aria-hidden strokeWidth={2} />
            <span>{t('dokumenteBack')}</span>
          </button>
        </div>
      )}

      <header className="dokumente-detail__header">
        <div className="dokumente-detail__meta">
          <span className={`dokumente-badge ${getCategoryColor(entry.category)}`}>
            {categoryLabel}
          </span>
          {sourceLabelKey && (
            <span
              className={`dokumente-source-badge${
                entry.source === 'ai-accepted' ? ' dokumente-source-badge--ai' : ''
              }`}
            >
              {t(sourceLabelKey)}
            </span>
          )}
          <time className="dokumente-detail__date">{formatIsoTimestampDate(entry.date)}</time>
        </div>
        <h2 className="dokumente-detail__title">{entry.title}</h2>
      </header>

      <div className="dokumente-detail__content">
        {sectionEntries.length > 0 ? (
          <>
            <p className="dokumente-detail__hint">{t('dokumenteAutoCategorizedHint')}</p>
            <h3 className="dokumente-detail__sections-heading">{t('dokumenteSectionsHeading')}</h3>
            <div className="dokumente-detail__sections">
              {sectionEntries.map((section) => (
                <section key={section.id} className="dokumente-detail__section">
                  <h4 className="dokumente-detail__section-title">{section.label}</h4>
                  <pre className="dokumente-modal__text">{section.content}</pre>
                </section>
              ))}
            </div>
          </>
        ) : (
          <pre className="dokumente-modal__text">{entry.content}</pre>
        )}
      </div>

      {onEdit && (
        <footer className="dokumente-detail__footer">
          <button
            type="button"
            className="dokumente-detail__edit"
            onClick={onEdit}
          >
            {entry.source === 'draft' ? t('dokumenteEditDraft') : t('dokumenteOpenInWorkspace')}
          </button>
        </footer>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Document Card
// ---------------------------------------------------------------------------

interface DocumentCardProps {
  entry: DokumentEntry
  categoryLabel: string
  onExpand: () => void
  onDelete: () => void
  /** Only provided for draft entries; navigates to the appropriate workspace page for editing. */
  onEdit?: () => void
}

function DocumentCard({ entry, categoryLabel, onExpand, onDelete, onEdit }: DocumentCardProps) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const sourceLabelKey = getSourceLabelKey(entry.source)

  const preview = entry.content.slice(0, 100).replace(/\n+/g, ' ').trim()
  const hasMore = entry.content.length > 100

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelete(true)
  }

  function handleConfirmDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete()
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <article
      className="dokumente-card"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onExpand() }}
    >
      <header className="dokumente-card__header">
        <div className="dokumente-card__badges">
          <span className={`dokumente-badge ${getCategoryColor(entry.category)}`}>
            {categoryLabel}
          </span>
          {sourceLabelKey && (
            <span
              className={`dokumente-source-badge${
                entry.source === 'ai-accepted' ? ' dokumente-source-badge--ai' : ''
              }`}
              title={t(sourceLabelKey)}
            >
              {t(sourceLabelKey)}
            </span>
          )}
        </div>
        <time className="dokumente-card__date">{formatIsoTimestampDate(entry.date)}</time>
      </header>

      <h3 className="dokumente-card__title">{entry.title}</h3>

      {preview && (
        <p className="dokumente-card__preview">
          {preview}{hasMore ? '…' : ''}
        </p>
      )}

      <footer className="dokumente-card__footer" onClick={(e) => e.stopPropagation()}>
        {confirmDelete ? (
          <div className="dokumente-card__confirm">
            <span className="dokumente-card__confirm-text">{t('dokumenteDeleteConfirm')}</span>
            <button
              type="button"
              className="dokumente-card__confirm-yes"
              onClick={handleConfirmDelete}
            >
              {t('dokumenteDelete')}
            </button>
            <button
              type="button"
              className="dokumente-card__confirm-no"
              onClick={handleCancelDelete}
            >
              {t('generationIncompleteCancel')}
            </button>
          </div>
        ) : (
          <div className="dokumente-card__actions">
            {onEdit && (
              <button
                type="button"
                className="dokumente-card__edit"
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                title={entry.source === 'draft' ? t('dokumenteEditDraft') : t('dokumenteOpenInWorkspace')}
              >
                {entry.source === 'draft' ? t('dokumenteEditDraft') : t('dokumenteOpenInWorkspace')}
              </button>
            )}
            <button
              type="button"
              className="icon-action-btn icon-action-btn--danger"
              onClick={handleDeleteClick}
              title={t('dokumenteDelete')}
              aria-label={t('dokumenteDelete')}
            >
              <Trash2 strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        )}
      </footer>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface DokumentePageProps {
  caseId: string
  /** Called after a document is hard-deleted so callers can sync other stores (e.g. savedDocs). */
  onAfterDelete?: (pageType: string) => void
  /**
   * Called when the user clicks "Entwurf bearbeiten" on a draft card.
   * The parent should navigate to the appropriate workspace page and inject the draft content.
   */
  onEditDraft?: (entry: DokumentEntry) => void
}

export function DokumentePage({ caseId, onAfterDelete, onEditDraft }: DokumentePageProps) {
  const { t } = useTranslation()
  const nav = useDokumenteSectionNavOptional()
  const [entries, setEntries] = useState<DokumentEntry[]>(() => loadDokumente(caseId))
  const [localCategory] = useState<CategoryFilter>('all')
  const activeCategory = nav?.activeCategory ?? localCategory
  const [expandedEntry, setExpandedEntry] = useState<DokumentEntry | null>(null)
  const [templateHostOpen, setTemplateHostOpen] = useState(false)
  const [templateDocId, setTemplateDocId] = useState<string | undefined>()
  const mainRef = useRef<HTMLElement>(null)
  const savedScrollRef = useRef(0)

  // Expose the "new template document" action to the global sidebar nav.
  const handleNewTemplate = useCallback(() => {
    setTemplateDocId(undefined)
    setTemplateHostOpen(true)
  }, [])

  useEffect(() => {
    if (!nav) return
    nav.setNewTemplateHandler(handleNewTemplate)
    return () => nav.setNewTemplateHandler(null)
  }, [nav, handleNewTemplate])

  // Backfill: mirror any lab befunde that predate the Dokumente wiring, then load.
  // Idempotent — re-running never creates duplicates.
  useEffect(() => {
    syncLaborDokumente(caseId, t('laborDocumentTitle'))
    syncAllBefundDokumente(caseId)
    setEntries(loadDokumente(caseId))
  }, [caseId, t])

  // Refresh entries when the archive is updated in the same window (storage events
  // only fire for cross-window changes, so we use a custom event).
  useEffect(() => {
    function handleArchiveChanged(e: Event) {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === caseId) {
        setEntries(loadDokumente(caseId))
      }
    }
    window.addEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handleArchiveChanged)
    return () => {
      window.removeEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handleArchiveChanged)
    }
  }, [caseId])

  const filtered =
    activeCategory === 'all'
      ? entries
      : entries.filter((e) => e.category === activeCategory)

  // Open a file in place, remembering where the list was scrolled so we can
  // restore that position when the user navigates back.
  const handleExpand = useCallback((entry: DokumentEntry) => {
    savedScrollRef.current = mainRef.current?.scrollTop ?? 0
    setExpandedEntry(entry)
  }, [])

  const handleBack = useCallback(() => {
    setExpandedEntry(null)
  }, [])

  // Selecting another category in the sidebar nav returns to the list view.
  useEffect(() => {
    setExpandedEntry(null)
  }, [activeCategory])

  // Restore the list scroll position after returning from a detail view.
  useEffect(() => {
    if (!expandedEntry && mainRef.current) {
      mainRef.current.scrollTop = savedScrollRef.current
    }
  }, [expandedEntry])

  const handleDelete = useCallback(
    (id: string) => {
      const pageType = entries.find((e) => e.id === id)?.pageType
      deleteDokument(caseId, id)
      setEntries(loadDokumente(caseId))
      if (expandedEntry?.id === id) setExpandedEntry(null)
      if (pageType) onAfterDelete?.(pageType)
    },
    [caseId, entries, expandedEntry, onAfterDelete],
  )

  const handleEditEntry = useCallback(
    (entry: DokumentEntry) => {
      if (entry.pageType.startsWith('template-doc:') && entry.sourceRefId) {
        setTemplateDocId(entry.sourceRefId)
        setTemplateHostOpen(true)
        return
      }
      onEditDraft?.(entry)
    },
    [onEditDraft],
  )

  return (
    <div className="dokumente-page dokumente-page--single-column cm-workspace">
      <main className="dokumente-main" ref={mainRef}>
        {expandedEntry ? (
          /* In-place detail view — replaces the list, with a back button to return. */
          <DocumentDetail
            entry={expandedEntry}
            categoryLabel={t(getCategoryLabelKey(expandedEntry.category))}
            showBack={filtered.length > 0}
            onBack={handleBack}
            onEdit={
              onEditDraft || expandedEntry.pageType.startsWith('template-doc:')
                ? () => handleEditEntry(expandedEntry)
                : undefined
            }
          />
        ) : filtered.length === 0 ? (
          <p className="dokumente-empty">{t('dokumenteEmpty')}</p>
        ) : (
          /* Document list — grouped by category (entries are already newest-first) */
          (activeCategory === 'all'
            ? CATEGORY_ORDER
            : [activeCategory]
          )
            .map((category) => ({
              category,
              items: filtered.filter((e) => e.category === category),
            }))
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.category} className="dokumente-group">
                <h3 className="dokumente-group__heading">
                  {t(getCategoryLabelKey(group.category))}
                  <span className="dokumente-group__count">{group.items.length}</span>
                </h3>
                <div className="dokumente-list">
                  {group.items.map((entry) => (
                    <DocumentCard
                      key={entry.id}
                      entry={entry}
                      categoryLabel={t(getCategoryLabelKey(entry.category))}
                      onExpand={() => handleExpand(entry)}
                      onDelete={() => handleDelete(entry.id)}
                      onEdit={onEditDraft || entry.pageType.startsWith('template-doc:') ? () => handleEditEntry(entry) : undefined}
                    />
                  ))}
                </div>
              </section>
            ))
        )}
      </main>

      {templateHostOpen ? (
        <TemplateWorkspaceHost
          caseId={caseId}
          context="patientDocuments"
          saveToPatientDocuments
          autoOpen={!templateDocId}
          existingDocId={templateDocId}
          onClose={() => {
            setTemplateHostOpen(false)
            setTemplateDocId(undefined)
            setEntries(loadDokumente(caseId))
          }}
        />
      ) : null}
    </div>
  )
}
