import { useCallback, useEffect, useState } from 'react'
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
import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import { formatIsoTimestampDate } from '../../utils/siteTimezone'
import type { UiLanguage } from '../../types/settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryFilter = 'all' | DokumentCategory

interface CategoryTabConfig {
  id: CategoryFilter
  labelKey:
    | 'dokumenteCategoryAll'
    | 'dokumenteCategoryAnamnese'
    | 'dokumenteCategoryArztbrief'
    | 'dokumenteCategoryLaborbefunde'
    | 'dokumenteCategoryUntersuchungsbefunde'
    | 'dokumenteCategoryExterneBefunde'
}

const CATEGORY_TABS: CategoryTabConfig[] = [
  { id: 'all', labelKey: 'dokumenteCategoryAll' },
  { id: 'anamnese', labelKey: 'dokumenteCategoryAnamnese' },
  { id: 'arztbrief', labelKey: 'dokumenteCategoryArztbrief' },
  { id: 'laborbefunde', labelKey: 'dokumenteCategoryLaborbefunde' },
  { id: 'untersuchungsbefunde', labelKey: 'dokumenteCategoryUntersuchungsbefunde' },
  { id: 'externe-befunde', labelKey: 'dokumenteCategoryExterneBefunde' },
]

/** Display order for grouped category sections in the "All" view. */
const CATEGORY_ORDER: DokumentCategory[] = [
  'anamnese',
  'arztbrief',
  'laborbefunde',
  'untersuchungsbefunde',
  'externe-befunde',
]

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

function getCategoryLabelKey(category: DokumentCategory): CategoryTabConfig['labelKey'] {
  switch (category) {
    case 'anamnese': return 'dokumenteCategoryAnamnese'
    case 'arztbrief': return 'dokumenteCategoryArztbrief'
    case 'laborbefunde': return 'dokumenteCategoryLaborbefunde'
    case 'untersuchungsbefunde': return 'dokumenteCategoryUntersuchungsbefunde'
    case 'externe-befunde': return 'dokumenteCategoryExterneBefunde'
  }
}

function getCategoryColor(category: DokumentCategory): string {
  switch (category) {
    case 'anamnese': return 'dokumente-badge--anamnese'
    case 'arztbrief': return 'dokumente-badge--arztbrief'
    case 'laborbefunde': return 'dokumente-badge--laborbefunde'
    case 'untersuchungsbefunde': return 'dokumente-badge--untersuchungsbefunde'
    case 'externe-befunde': return 'dokumente-badge--externe'
  }
}

// ---------------------------------------------------------------------------
// Document Detail Modal
// ---------------------------------------------------------------------------

interface DocumentModalProps {
  entry: DokumentEntry
  categoryLabel: string
  onClose: () => void
}

function DocumentModal({ entry, categoryLabel, onClose }: DocumentModalProps) {
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="dokumente-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={entry.title}
    >
      <div
        className="dokumente-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dokumente-modal__header">
          <div className="dokumente-modal__meta">
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
            <time className="dokumente-modal__date">{formatIsoTimestampDate(entry.date)}</time>
          </div>
          <h2 className="dokumente-modal__title">{entry.title}</h2>
        </header>

        <div className="dokumente-modal__content">
          {sectionEntries.length > 0 ? (
            <>
              <p className="dokumente-modal__hint">{t('dokumenteAutoCategorizedHint')}</p>
              <h3 className="dokumente-modal__sections-heading">{t('dokumenteSectionsHeading')}</h3>
              <div className="dokumente-modal__sections">
                {sectionEntries.map((section) => (
                  <section key={section.id} className="dokumente-modal__section">
                    <h4 className="dokumente-modal__section-title">{section.label}</h4>
                    <pre className="dokumente-modal__text">{section.content}</pre>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <pre className="dokumente-modal__text">{entry.content}</pre>
          )}
        </div>

        <footer className="dokumente-modal__footer">
          <button
            type="button"
            className="dokumente-modal__close"
            onClick={onClose}
          >
            {t('dokumenteClose')}
          </button>
        </footer>
      </div>
    </div>
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
              className="dokumente-card__delete"
              onClick={handleDeleteClick}
              title={t('dokumenteDelete')}
            >
              {t('dokumenteDelete')}
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
  const [entries, setEntries] = useState<DokumentEntry[]>(() => loadDokumente(caseId))
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [expandedEntry, setExpandedEntry] = useState<DokumentEntry | null>(null)

  // Backfill: mirror any lab befunde that predate the Dokumente wiring, then load.
  // Idempotent — re-running never creates duplicates.
  useEffect(() => {
    syncLaborDokumente(caseId, t('laborDocumentTitle'))
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

  const showExterneUpload = activeCategory === 'all' || activeCategory === 'externe-befunde'

  return (
    <div className="dokumente-page">
      {/* Sidebar */}
      <aside className="dokumente-sidebar">
        <h2 className="dokumente-sidebar__title">{t('dokumenteTitle')}</h2>
        <nav className="dokumente-sidebar__nav" aria-label="Dokumentkategorien">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'dokumente-sidebar__tab',
                activeCategory === tab.id ? 'dokumente-sidebar__tab--active' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => setActiveCategory(tab.id)}
              aria-pressed={activeCategory === tab.id}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>

        {showExterneUpload && (
          <div className="dokumente-sidebar__upload">
            <button
              type="button"
              className="dokumente-sidebar__upload-btn"
              disabled
              title={t('dokumenteUpload')}
            >
              {t('dokumenteUpload')}
            </button>
          </div>
        )}
      </aside>

      {/* Document list — grouped by category (entries are already newest-first) */}
      <main className="dokumente-main">
        {filtered.length === 0 ? (
          <p className="dokumente-empty">{t('dokumenteEmpty')}</p>
        ) : (
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
                      onExpand={() => setExpandedEntry(entry)}
                      onDelete={() => handleDelete(entry.id)}
                      onEdit={onEditDraft ? () => onEditDraft(entry) : undefined}
                    />
                  ))}
                </div>
              </section>
            ))
        )}
      </main>

      {/* Detail modal */}
      {expandedEntry && (
        <DocumentModal
          entry={expandedEntry}
          categoryLabel={t(getCategoryLabelKey(expandedEntry.category))}
          onClose={() => setExpandedEntry(null)}
        />
      )}
    </div>
  )
}
