import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  deleteDokument,
  loadDokumente,
  type DokumentCategory,
  type DokumentEntry,
} from '../../utils/dokumenteArchive'

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

import { formatIsoTimestampDate } from '../../utils/siteTimezone'

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
  const { t } = useTranslation()

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
            {entry.source === 'ai-accepted' && (
              <span className="dokumente-source-badge dokumente-source-badge--ai">
                {t('dokumenteSourceAi')}
              </span>
            )}
            <time className="dokumente-modal__date">{formatIsoTimestampDate(entry.date)}</time>
          </div>
          <h2 className="dokumente-modal__title">{entry.title}</h2>
        </header>

        <div className="dokumente-modal__content">
          <pre className="dokumente-modal__text">{entry.content}</pre>
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
}

function DocumentCard({ entry, categoryLabel, onExpand, onDelete }: DocumentCardProps) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

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
          {entry.source === 'ai-accepted' && (
            <span
              className="dokumente-source-badge dokumente-source-badge--ai"
              title={t('dokumenteSourceAi')}
            >
              {t('dokumenteSourceAi')}
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
          <button
            type="button"
            className="dokumente-card__delete"
            onClick={handleDeleteClick}
            title={t('dokumenteDelete')}
          >
            {t('dokumenteDelete')}
          </button>
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
}

export function DokumentePage({ caseId }: DokumentePageProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<DokumentEntry[]>(() => loadDokumente(caseId))
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [expandedEntry, setExpandedEntry] = useState<DokumentEntry | null>(null)

  useEffect(() => {
    setEntries(loadDokumente(caseId))
  }, [caseId])

  const filtered =
    activeCategory === 'all'
      ? entries
      : entries.filter((e) => e.category === activeCategory)

  const handleDelete = useCallback(
    (id: string) => {
      deleteDokument(caseId, id)
      setEntries(loadDokumente(caseId))
      if (expandedEntry?.id === id) setExpandedEntry(null)
    },
    [caseId, expandedEntry],
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

      {/* Document list */}
      <main className="dokumente-main">
        {filtered.length === 0 ? (
          <p className="dokumente-empty">{t('dokumenteEmpty')}</p>
        ) : (
          <div className="dokumente-list">
            {filtered.map((entry) => {
              const catKey = getCategoryLabelKey(entry.category)
              return (
                <DocumentCard
                  key={entry.id}
                  entry={entry}
                  categoryLabel={t(catKey)}
                  onExpand={() => setExpandedEntry(entry)}
                  onDelete={() => handleDelete(entry.id)}
                />
              )
            })}
          </div>
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
