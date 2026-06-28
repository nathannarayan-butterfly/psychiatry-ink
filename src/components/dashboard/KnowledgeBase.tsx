import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  FileText,
  FlaskConical,
  HeartPulse,
  Pencil,
  Pill,
  Plus,
  Search,
  Stethoscope,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { KNOWLEDGE_BASE_SEED } from '../../data/knowledgeBaseSeedData'
import type { KbCategory, KnowledgeEntry } from '../../data/knowledgeBaseSeedData'
import {
  DEFAULT_MEDICATIONS_COLLECTION_ID,
  DEFAULT_NOTES_COLLECTION_ID,
  pickKbLocalizedList,
  pickKbLocalizedText,
  type KnowledgeCollection,
  type KnowledgeCollectionType,
} from '../../types/knowledgeBase'
import { useKnowledgeCollections } from '../../hooks/useKnowledgeCollections'
import { KnowledgeBasePharma } from './KnowledgeBasePharma'
import { KnowledgeBaseClinical } from './KnowledgeBaseClinical'
import { countClinicalEntriesByCollection } from '../../hooks/useKnowledgeBaseClinical'
import { pickKbLocalizedCollectionName } from '../../types/knowledgeBase'
import { PatientEducationGenericWorkspace } from '../patientEducationGeneric/PatientEducationGenericWorkspace'
import { translateMedicationUi } from '../../data/medicationUiTranslations'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBase'
const DRUGS_STORAGE_KEY = 'psychiatry-ink:knowledgeBaseDrugs'

const PRESET_CATEGORIES: KbCategory[] = [
  'Pharmakologie',
  'Diagnostik',
  'Klinik',
  'Leitlinien',
  'Psychopathologie',
  'Sonstiges',
]

const CATEGORY_COLORS: Record<KbCategory, string> = {
  Pharmakologie: 'kb-badge--pharma',
  Diagnostik: 'kb-badge--diagnostik',
  Klinik: 'kb-badge--klinik',
  Leitlinien: 'kb-badge--leitlinien',
  Psychopathologie: 'kb-badge--psychopath',
  Sonstiges: 'kb-badge--sonstiges',
}

// ── Collection icon / color registry ─────────────────────────────────────────

const COLLECTION_ICONS: Record<string, typeof BookOpen> = {
  book: BookOpen,
  flask: FlaskConical,
  pill: Pill,
  brain: Brain,
  notes: FileText,
  stethoscope: Stethoscope,
  heart: HeartPulse,
  activity: Activity,
}

const COLLECTION_ICON_KEYS = Object.keys(COLLECTION_ICONS)

const COLLECTION_COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#dc2626', '#d97706', '#475569']

function CollectionIcon({ icon, className }: { icon?: string; className?: string }) {
  const Cmp = (icon && COLLECTION_ICONS[icon]) || BookOpen
  return <Cmp className={className} strokeWidth={1.75} aria-hidden />
}

// ── Notes storage (migration assigns default notes collection) ───────────────

function migrateNoteCollectionId(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  let changed = false
  const migrated = entries.map((entry) => {
    if (!entry.collectionId) {
      changed = true
      return { ...entry, collectionId: DEFAULT_NOTES_COLLECTION_ID }
    }
    return entry
  })
  return changed ? migrated : entries
}

function loadEntries(): KnowledgeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as KnowledgeEntry[]
      if (Array.isArray(parsed) && parsed.length > 0) return migrateNoteCollectionId(parsed)
    }
  } catch {
    // ignore
  }
  const seeded = migrateNoteCollectionId([...KNOWLEDGE_BASE_SEED])
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch {
    // ignore
  }
  return seeded
}

function saveEntries(entries: KnowledgeEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function matchesSearch(entry: KnowledgeEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack: string[] = [
    entry.title,
    entry.titleEn ?? '',
    entry.content,
    entry.contentEn ?? '',
    entry.category,
    entry.categoryEn ?? '',
    ...entry.tags,
    ...(entry.tagsEn ?? []),
  ]
  return haystack.some((value) => value.toLowerCase().includes(q))
}

/** Count notes / drugs per collection for the home tiles (read-only snapshot). */
function countEntriesByCollection(): Record<string, number> {
  const counts = countClinicalEntriesByCollection()
  try {
    const raw = localStorage.getItem(DRUGS_STORAGE_KEY)
    if (raw) {
      const drugs = JSON.parse(raw) as { collectionId?: string }[]
      if (Array.isArray(drugs)) {
        for (const drug of drugs) {
          const id = drug.collectionId ?? DEFAULT_MEDICATIONS_COLLECTION_ID
          counts[id] = (counts[id] ?? 0) + 1
        }
      }
    }
  } catch {
    // ignore
  }
  return counts
}

interface AddEntryDialogProps {
  onSave: (entry: KnowledgeEntry) => void
  onCancel: () => void
}

function AddEntryDialog({ onSave, onCancel }: AddEntryDialogProps) {
  const { t } = useTranslation()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<KbCategory>('Pharmakologie')
  const [customCategory, setCustomCategory] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [useCustomCategory, setUseCustomCategory] = useState(false)

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalCategory = useCustomCategory
      ? ((customCategory.trim() || 'Sonstiges') as KbCategory)
      : category
    const tags = tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    onSave({
      id: generateId(),
      title: title.trim(),
      category: finalCategory,
      content: content.trim(),
      tags,
      createdAt: new Date().toISOString(),
    })
  }

  const isValid = title.trim().length > 0 && content.trim().length > 0

  return (
    <div
      ref={overlayRef}
      className="kb-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('kbAddEntry')}
      onClick={handleOverlayClick}
    >
      <div className="kb-dialog">
        <div className="kb-dialog__header">
          <h2 className="kb-dialog__title">{t('kbAddEntry')}</h2>
          <button type="button" className="kb-dialog__close" onClick={onCancel} aria-label={t('newPatientAbbrechen')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="kb-dialog__form">
          <div className="kb-dialog__field">
            <label htmlFor="kb-title" className="kb-dialog__label">{t('kbFieldTitle')}</label>
            <input
              id="kb-title"
              type="text"
              className="kb-dialog__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('kbFieldTitlePlaceholder')}
              autoFocus
              required
            />
          </div>

          <div className="kb-dialog__field">
            <label htmlFor="kb-category" className="kb-dialog__label">{t('kbFieldCategory')}</label>
            <div className="kb-dialog__category-row">
              <select
                id="kb-category"
                className="kb-dialog__select"
                value={useCustomCategory ? '__custom__' : category}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setUseCustomCategory(true)
                  } else {
                    setUseCustomCategory(false)
                    setCategory(e.target.value as KbCategory)
                  }
                }}
              >
                {PRESET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">{t('kbCategoryCustom')}</option>
              </select>
              {useCustomCategory ? (
                <input
                  type="text"
                  className="kb-dialog__input"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={t('kbCategoryCustomPlaceholder')}
                  autoFocus
                />
              ) : null}
            </div>
          </div>

          <div className="kb-dialog__field kb-dialog__field--grow">
            <label htmlFor="kb-content" className="kb-dialog__label">{t('kbFieldContent')}</label>
            <textarea
              id="kb-content"
              className="kb-dialog__textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('kbFieldContentPlaceholder')}
              required
            />
          </div>

          <div className="kb-dialog__field">
            <label htmlFor="kb-tags" className="kb-dialog__label">{t('kbFieldTags')}</label>
            <input
              id="kb-tags"
              type="text"
              className="kb-dialog__input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t('kbFieldTagsPlaceholder')}
            />
          </div>

          <div className="kb-dialog__actions">
            <button
              type="button"
              className="new-patient-dialog__btn new-patient-dialog__btn--cancel"
              onClick={onCancel}
            >
              {t('newPatientAbbrechen')}
            </button>
            <button
              type="submit"
              className="new-patient-dialog__btn new-patient-dialog__btn--create"
              disabled={!isValid}
            >
              {t('kbSaveEntry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EntryCardProps {
  entry: KnowledgeEntry
  onDelete: (id: string) => void
}

function EntryCard({ entry, onDelete }: EntryCardProps) {
  const { t, language } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const PREVIEW_LENGTH = 200

  const localizedTitle = pickKbLocalizedText(entry.title, entry.titleEn, language) || entry.title
  const localizedContent = pickKbLocalizedText(entry.content, entry.contentEn, language) || entry.content
  const localizedCategory =
    pickKbLocalizedText(entry.category, entry.categoryEn, language) || entry.category
  const localizedTags = pickKbLocalizedList(entry.tags, entry.tagsEn, language)

  const previewContent = localizedContent.length > PREVIEW_LENGTH && !expanded
    ? localizedContent.slice(0, PREVIEW_LENGTH) + '…'
    : localizedContent

  const badgeClass = CATEGORY_COLORS[entry.category as KbCategory] ?? 'kb-badge--sonstiges'

  return (
    <article className={`kb-entry ${expanded ? 'kb-entry--expanded' : ''}`}>
      <div className="kb-entry__header">
        <div className="kb-entry__meta">
          <span className={`kb-badge ${badgeClass}`}>{localizedCategory}</span>
        </div>
        <h3 className="kb-entry__title">{localizedTitle}</h3>
        {localizedTags.length > 0 ? (
          <div className="kb-entry__tags">
            <Tag className="kb-entry__tags-icon h-3 w-3" aria-hidden />
            {localizedTags.map((tag) => (
              <span key={tag} className="kb-entry__tag">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="kb-entry__body">
        <p className="kb-entry__content">{previewContent}</p>
      </div>

      <div className="kb-entry__footer">
        <button
          type="button"
          className="kb-entry__expand-btn"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              {t('kbCollapse')}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              {t('kbExpand')}
            </>
          )}
        </button>
        <button
          type="button"
          className="kb-entry__delete-btn"
          onClick={() => onDelete(entry.id)}
          aria-label={t('kbDeleteEntry')}
          title={t('kbDeleteEntry')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

interface KnowledgeBaseProps {
  collectionId?: string
  collectionName?: string
}

export function KnowledgeBase({ collectionId, collectionName }: KnowledgeBaseProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<KnowledgeEntry[]>(loadEntries)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<KbCategory | 'all'>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)

  const scoped = useMemo(() => {
    if (!collectionId) return entries
    return entries.filter(
      (entry) => (entry.collectionId ?? DEFAULT_NOTES_COLLECTION_ID) === collectionId,
    )
  }, [entries, collectionId])

  const allCategories = useMemo(() => {
    const cats = new Set(scoped.map((e) => e.category))
    return [...cats].sort()
  }, [scoped])

  const filtered = useMemo(() => {
    return scoped.filter((entry) => {
      const categoryMatch = activeCategory === 'all' || entry.category === activeCategory
      const searchMatch = matchesSearch(entry, search)
      return categoryMatch && searchMatch
    })
  }, [scoped, search, activeCategory])

  const handleSave = useCallback((entry: KnowledgeEntry) => {
    setEntries((prev) => {
      const next = [{ ...entry, collectionId: collectionId ?? DEFAULT_NOTES_COLLECTION_ID }, ...prev]
      saveEntries(next)
      return next
    })
    setShowAddDialog(false)
  }, [collectionId])

  const handleDelete = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      saveEntries(next)
      return next
    })
  }, [])

  return (
    <section className="dashboard-section kb-section" aria-labelledby="kb-section-heading">
      <div className="dashboard-section__header-row">
        <h2 id="kb-section-heading" className="dashboard-section__heading">
          <BookOpen className="kb-section__heading-icon h-3.5 w-3.5" aria-hidden />
          {collectionName ?? t('kbTitle')}
        </h2>
        <button
          type="button"
          className="kb-add-btn"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('kbAddEntry')}
        </button>
      </div>

      <div className="kb-toolbar">
        <label className="kb-search">
          <Search className="kb-search__icon h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          <input
            type="search"
            className="kb-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('kbSearchPlaceholder')}
            aria-label={t('kbSearchPlaceholder')}
          />
          {search ? (
            <button
              type="button"
              className="kb-search__clear"
              onClick={() => setSearch('')}
              aria-label={t('kbClearSearch')}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </label>

        <div className="kb-category-chips" role="group" aria-label={t('kbFilterCategory')}>
          <button
            type="button"
            className={`kb-chip ${activeCategory === 'all' ? 'kb-chip--active' : ''}`}
            onClick={() => setActiveCategory('all')}
            aria-pressed={activeCategory === 'all'}
          >
            {t('kbAllCategories')}
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`kb-chip ${activeCategory === cat ? 'kb-chip--active' : ''}`}
              onClick={() => setActiveCategory(activeCategory === cat ? 'all' : (cat as KbCategory))}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="dashboard-page__status">{t('kbNoResults')}</p>
      ) : (
        <div className="kb-grid">
          {filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showAddDialog ? (
        <AddEntryDialog onSave={handleSave} onCancel={() => setShowAddDialog(false)} />
      ) : null}
    </section>
  )
}

// ── New / Edit Collection Dialog ─────────────────────────────────────────────

interface CollectionDialogProps {
  mode: 'create' | 'edit'
  initial?: KnowledgeCollection
  onSave: (data: { name: string; type: KnowledgeCollectionType; icon?: string; color?: string }) => void
  onCancel: () => void
  onDelete?: () => void
}

function CollectionDialog({ mode, initial, onSave, onCancel, onDelete }: CollectionDialogProps) {
  const { t } = useTranslation()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<KnowledgeCollectionType>(initial?.type ?? 'notes')
  const [icon, setIcon] = useState<string>(initial?.icon ?? 'book')
  const [color, setColor] = useState<string>(initial?.color ?? COLLECTION_COLORS[0])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), type, icon, color })
  }

  const canDelete = mode === 'edit' && onDelete && !initial?.isDefault
  const title = mode === 'create' ? t('kbCollectionNew') : t('kbCollectionEdit')

  return (
    <div
      ref={overlayRef}
      className="kb-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleOverlayClick}
    >
      <div className="kb-dialog">
        <div className="kb-dialog__header">
          <h2 className="kb-dialog__title">{title}</h2>
          <button type="button" className="kb-dialog__close" onClick={onCancel} aria-label={t('newPatientAbbrechen')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="kb-dialog__form">
          <div className="kb-dialog__field">
            <label htmlFor="kb-collection-name" className="kb-dialog__label">{t('kbCollectionName')}</label>
            <input
              id="kb-collection-name"
              type="text"
              className="kb-dialog__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('kbCollectionNamePlaceholder')}
              autoFocus
              required
            />
          </div>

          <div className="kb-dialog__field">
            <label className="kb-dialog__label">{t('kbCollectionType')}</label>
            {mode === 'create' ? (
              <div className="kb-type-picker" role="group" aria-label={t('kbCollectionType')}>
                <button
                  type="button"
                  className={`kb-type-option ${type === 'notes' ? 'kb-type-option--active' : ''}`}
                  onClick={() => { setType('notes'); if (icon === 'flask') setIcon('book') }}
                  aria-pressed={type === 'notes'}
                >
                  <FileText className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  <span>{t('kbCollectionTypeNotes')}</span>
                </button>
                <button
                  type="button"
                  className={`kb-type-option ${type === 'medications' ? 'kb-type-option--active' : ''}`}
                  onClick={() => { setType('medications'); if (icon === 'book') setIcon('flask') }}
                  aria-pressed={type === 'medications'}
                >
                  <FlaskConical className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  <span>{t('kbCollectionTypeMedications')}</span>
                </button>
              </div>
            ) : (
              <p className="kb-type-readonly">
                {type === 'notes' ? t('kbCollectionTypeNotes') : t('kbCollectionTypeMedications')}
              </p>
            )}
          </div>

          <div className="kb-dialog__field">
            <label className="kb-dialog__label">{t('kbCollectionIcon')}</label>
            <div className="kb-icon-picker" role="group" aria-label={t('kbCollectionIcon')}>
              {COLLECTION_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`kb-icon-option ${icon === key ? 'kb-icon-option--active' : ''}`}
                  onClick={() => setIcon(key)}
                  aria-pressed={icon === key}
                  aria-label={key}
                  style={icon === key ? { color, borderColor: color } : undefined}
                >
                  <CollectionIcon icon={key} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="kb-dialog__field">
            <label className="kb-dialog__label">{t('kbCollectionColor')}</label>
            <div className="kb-color-picker" role="group" aria-label={t('kbCollectionColor')}>
              {COLLECTION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`kb-color-option ${color === c ? 'kb-color-option--active' : ''}`}
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  aria-label={c}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="kb-dialog__actions">
            {canDelete ? (
              <button
                type="button"
                className="new-patient-dialog__btn new-patient-dialog__btn--cancel kb-collection-delete-btn"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t('kbCollectionDelete')}
              </button>
            ) : null}
            <button
              type="button"
              className="new-patient-dialog__btn new-patient-dialog__btn--cancel"
              onClick={onCancel}
            >
              {t('newPatientAbbrechen')}
            </button>
            <button
              type="submit"
              className="new-patient-dialog__btn new-patient-dialog__btn--create"
              disabled={!name.trim()}
            >
              {mode === 'create' ? t('kbCollectionCreate') : t('kbSaveEntry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Collections Home View ────────────────────────────────────────────────────

interface CollectionsHomeProps {
  collections: KnowledgeCollection[]
  /** Entry counts per collection id, computed by the parent so they refresh on navigation. */
  counts: Record<string, number>
  onOpen: (collection: KnowledgeCollection) => void
  onCreate: () => void
  onEdit: (collection: KnowledgeCollection) => void
  onOpenGenericEducation: () => void
}

function CollectionsHome({
  collections,
  counts,
  onOpen,
  onCreate,
  onEdit,
  onOpenGenericEducation,
}: CollectionsHomeProps) {
  const { t, language } = useTranslation()

  return (
    <div className="kb-collections">
      <div className="kb-collections__header">
        <span className="kb-collections__label">{t('kbCollectionsHomeLabel')}</span>
        <button type="button" className="kb-add-btn" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('kbCollectionNew')}
        </button>
      </div>

      <div className="kb-collections__grid">
        <div className="kb-collection-tile kb-collection-tile--feature">
          <button
            type="button"
            className="kb-collection-tile__main"
            onClick={onOpenGenericEducation}
          >
            <span className="kb-collection-tile__icon" style={{ color: '#0d9488' }} aria-hidden>
              <HeartPulse className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="kb-collection-tile__body">
              <span className="kb-collection-tile__title">
                {translateMedicationUi(language, 'pegenTileTitle')}
              </span>
            </span>
            <ArrowRight className="kb-collection-tile__arrow h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {collections.map((collection) => {
          const count = counts[collection.id] ?? 0
          const subtitle =
            collection.type === 'medications'
              ? `${count} ${t('kbCollectionTypeMedications')}`
              : `${count} ${t('kbEntriesCount')}`
          return (
            <div key={collection.id} className="kb-collection-tile">
              <button
                type="button"
                className="kb-collection-tile__main"
                onClick={() => onOpen(collection)}
              >
                <span
                  className="kb-collection-tile__icon"
                  style={collection.color ? { color: collection.color } : undefined}
                  aria-hidden
                >
                  <CollectionIcon icon={collection.icon} className="h-5 w-5" />
                </span>
                <span className="kb-collection-tile__body">
                  <span className="kb-collection-tile__title">
                    {pickKbLocalizedCollectionName(collection, language)}
                  </span>
                  <span className="kb-collection-tile__subtitle">{subtitle}</span>
                </span>
                <ArrowRight className="kb-collection-tile__arrow h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="kb-collection-tile__edit"
                onClick={() => onEdit(collection)}
                aria-label={t('kbCollectionEdit')}
                title={t('kbCollectionEdit')}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Knowledge Base Tile (entry point + navigation orchestrator) ───────────────

interface KnowledgeBaseTileProps {
  /** Open the overlay immediately (used when launched from the standalone workspace). */
  defaultOpen?: boolean
  /** Invoked when the overlay is fully closed — lets a host unmount the tile. */
  onRequestClose?: () => void
}

export function KnowledgeBaseTile({ defaultOpen = false, onRequestClose }: KnowledgeBaseTileProps = {}) {
  const { t, language } = useTranslation()
  const { collections, addCollection, updateCollection, deleteCollection } = useKnowledgeCollections()

  const [open, setOpen] = useState(defaultOpen)
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCollection, setEditingCollection] = useState<KnowledgeCollection | null>(null)
  const [genericEducationOpen, setGenericEducationOpen] = useState(false)

  const activeCollection = activeCollectionId
    ? collections.find((c) => c.id === activeCollectionId) ?? null
    : null

  const goHome = useCallback(() => setActiveCollectionId(null), [])
  const closeOverlay = useCallback(() => {
    setOpen(false)
    setActiveCollectionId(null)
    setGenericEducationOpen(false)
    onRequestClose?.()
  }, [onRequestClose])

  // Recompute tile counts whenever the overlay opens, the active collection
  // changes (i.e. the user navigates back to the home grid after add/delete),
  // or collections themselves change. Reading localStorage here is cheap.
  const collectionCounts = useMemo(
    () => (open ? countEntriesByCollection() : {}),
    [open, activeCollectionId, collections],
  )

  if (open) {
    // ── Generic patient education (standalone AI generator) ──
    if (genericEducationOpen) {
      return (
        <div
          className="kb-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={translateMedicationUi(language, 'pegenTitle')}
        >
          <PatientEducationGenericWorkspace onClose={() => setGenericEducationOpen(false)} />
        </div>
      )
    }

    // ── Drug (medications) collection inner view ──
    if (activeCollection && activeCollection.type === 'medications') {
      return (
        <div className="kb-overlay" role="dialog" aria-modal="true" aria-label={pickKbLocalizedCollectionName(activeCollection, language)}>
          <KnowledgeBasePharma
            collectionId={activeCollection.id}
            collectionName={pickKbLocalizedCollectionName(activeCollection, language)}
            onClose={goHome}
            onCloseAll={closeOverlay}
          />
        </div>
      )
    }

    // ── Clinical knowledge (notes) collection inner view ──
    if (activeCollection && activeCollection.type === 'notes') {
      return (
        <div className="kb-overlay" role="dialog" aria-modal="true" aria-label={pickKbLocalizedCollectionName(activeCollection, language)}>
          <KnowledgeBaseClinical
            collectionId={activeCollection.id}
            collectionName={pickKbLocalizedCollectionName(activeCollection, language)}
            onClose={goHome}
            onCloseAll={closeOverlay}
          />
        </div>
      )
    }

    // ── Collections home ──
    return (
      <div className="kb-overlay" role="dialog" aria-modal="true" aria-label={t('kbTitle')}>
        <div className="kb-overlay__topbar">
          <button
            type="button"
            className="kb-overlay__back-btn"
            onClick={closeOverlay}
            aria-label={t('kbCloseOverlay')}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t('kbCloseOverlay')}
          </button>
          <span className="kb-overlay__title">{t('kbTitle')}</span>
          <button
            type="button"
            className="kb-overlay__close-btn"
            onClick={closeOverlay}
            aria-label={t('kbCloseOverlay')}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="kb-overlay__body">
          <CollectionsHome
            collections={collections}
            counts={collectionCounts}
            onOpen={(collection) => setActiveCollectionId(collection.id)}
            onCreate={() => setShowCreateDialog(true)}
            onEdit={(collection) => setEditingCollection(collection)}
            onOpenGenericEducation={() => setGenericEducationOpen(true)}
          />
        </div>

        {showCreateDialog ? (
          <CollectionDialog
            mode="create"
            onSave={(data) => {
              const created = addCollection(data)
              setShowCreateDialog(false)
              setActiveCollectionId(created.id)
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        ) : null}

        {editingCollection ? (
          <CollectionDialog
            mode="edit"
            initial={editingCollection}
            onSave={(data) => {
              updateCollection(editingCollection.id, { name: data.name, icon: data.icon, color: data.color })
              setEditingCollection(null)
            }}
            onCancel={() => setEditingCollection(null)}
            onDelete={() => {
              deleteCollection(editingCollection.id)
              setEditingCollection(null)
            }}
          />
        ) : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="dashboard-nav-card dashboard-nav-card--kb clinical-card clinical-card--interactive"
      onClick={() => setOpen(true)}
      aria-label={t('kbTitle')}
    >
      <span className="dashboard-nav-card__icon-wrap" aria-hidden>
        <BookOpen className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="dashboard-nav-card__body">
        <span className="dashboard-nav-card__title">{t('kbTitle')}</span>
        <span className="dashboard-nav-card__subtitle">{t('kbTileSubtitle')}</span>
      </span>
      <ArrowRight className="dashboard-nav-card__arrow h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  )
}
