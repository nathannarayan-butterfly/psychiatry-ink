import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useKnowledgeBaseDrugs } from '../../hooks/useKnowledgeBaseDrugs'
import { showNotionToast } from '../notion/NotionToast'
import { generatePharmaDetails } from '../../services/pharmaAiApi'
import {
  createDefaultSections,
  DEFAULT_SECTION_TEMPLATES,
  DRUG_CATEGORIES,
  type DrugSection,
  type DrugSectionKey,
  type KnowledgeBaseDrug,
  type ReceptorProfileDetail,
} from '../../types/knowledgeBase'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { KnowledgeBaseReceptorEditor } from './KnowledgeBaseReceptorEditor'

interface KnowledgeBasePharmaProps {
  onClose: () => void
  onCloseAll?: () => void
  collectionId?: string
  collectionName?: string
}

type SortKey = 'name' | 'class' | 'updated'

const ALL_CATEGORIES = 'all'

// ── Add Drug Dialog ──────────────────────────────────────────────────────────

interface AddDrugDialogProps {
  onSubmit: (drug: Omit<KnowledgeBaseDrug, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

function AddDrugDialog({ onSubmit, onCancel }: AddDrugDialogProps) {
  const { t } = useTranslation()
  const [genericName, setGenericName] = useState('')
  const [brandNamesRaw, setBrandNamesRaw] = useState('')
  const [drugClass, setDrugClass] = useState('')
  const [category, setCategory] = useState<string>(DRUG_CATEGORIES[0])
  const [atcCode, setAtcCode] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [authorEditor, setAuthorEditor] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = genericName.trim()
    if (!trimmed) return
    onSubmit({
      genericName: trimmed,
      brandNames: brandNamesRaw.split(',').map((s) => s.trim()).filter(Boolean),
      drugClass: drugClass.trim(),
      category,
      atcCode: atcCode.trim() || undefined,
      tags: tagsRaw.split(',').map((s) => s.trim()).filter(Boolean) || undefined,
      authorEditor: authorEditor.trim() || undefined,
      status,
      sections: createDefaultSections(),
    })
  }

  return (
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog">
        <div className="kbp-dialog__header">
          <h2 className="kbp-dialog__title">{t('kbPharmaNewDrugTitle')}</h2>
          <button type="button" className="kbp-icon-btn" onClick={onCancel} aria-label={t('kbPharmaCancel')}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="kbp-dialog__form">
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-generic-name">
              {t('kbPharmaFieldGenericName')} *
            </label>
            <input
              id="kbp-generic-name"
              type="text"
              className="kbp-field__input"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-brand-names">
              {t('kbPharmaFieldBrandNames')}
            </label>
            <input
              id="kbp-brand-names"
              type="text"
              className="kbp-field__input"
              value={brandNamesRaw}
              onChange={(e) => setBrandNamesRaw(e.target.value)}
              placeholder="Haldol®, …"
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-drug-class">
              {t('kbPharmaFieldClass')}
            </label>
            <input
              id="kbp-drug-class"
              type="text"
              className="kbp-field__input"
              value={drugClass}
              onChange={(e) => setDrugClass(e.target.value)}
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-category">
              {t('kbPharmaFieldCategory')}
            </label>
            <select
              id="kbp-category"
              className="kbp-field__select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DRUG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-atc">
              {t('kbPharmaFieldAtcCode')}
            </label>
            <input
              id="kbp-atc"
              type="text"
              className="kbp-field__input"
              value={atcCode}
              onChange={(e) => setAtcCode(e.target.value)}
              placeholder="N05AD01"
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-tags">
              {t('kbPharmaFieldTags')}
            </label>
            <input
              id="kbp-tags"
              type="text"
              className="kbp-field__input"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-author">
              {t('kbPharmaFieldAuthor')}
            </label>
            <input
              id="kbp-author"
              type="text"
              className="kbp-field__input"
              value={authorEditor}
              onChange={(e) => setAuthorEditor(e.target.value)}
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label">{t('kbPharmaFieldStatus')}</label>
            <div className="kbp-field__radio-group">
              <label className="kbp-field__radio">
                <input type="radio" value="active" checked={status === 'active'} onChange={() => setStatus('active')} />
                {t('kbPharmaStatusActive')}
              </label>
              <label className="kbp-field__radio">
                <input type="radio" value="inactive" checked={status === 'inactive'} onChange={() => setStatus('inactive')} />
                {t('kbPharmaStatusInactive')}
              </label>
            </div>
          </div>
          <div className="kbp-dialog__actions">
            <button type="submit" className="kbp-btn kbp-btn--primary">{t('kbPharmaCreateBtn')}</button>
            <button type="button" className="kbp-btn" onClick={onCancel}>{t('kbPharmaCancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  drugName,
  onConfirm,
  onCancel,
}: {
  drugName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog kbp-dialog--sm">
        <p className="kbp-dialog__delete-text">
          {t('kbPharmaDeleteConfirm')}
          <br />
          <strong>{drugName}</strong>
        </p>
        <div className="kbp-dialog__actions">
          <button type="button" className="kbp-btn kbp-btn--danger" onClick={onConfirm}>
            {t('kbPharmaDelete')}
          </button>
          <button type="button" className="kbp-btn" onClick={onCancel}>
            {t('kbPharmaCancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Drug List View ───────────────────────────────────────────────────────────

interface DrugListViewProps {
  drugs: KnowledgeBaseDrug[]
  onSelect: (id: string) => void
  onAdd: () => void
  language: string
}

function DrugListView({ drugs, onSelect, onAdd, language }: DrugListViewProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  const [sortBy, setSortBy] = useState<SortKey>('name')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return drugs
      .filter((drug) => {
        if (categoryFilter !== ALL_CATEGORIES && drug.category !== categoryFilter) return false
        if (!q) return true
        return [
          drug.genericName,
          ...drug.brandNames,
          drug.drugClass,
          drug.category,
          ...(drug.tags ?? []),
          ...drug.sections.map((s) => s.content),
        ].join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        if (sortBy === 'class') return a.drugClass.localeCompare(b.drugClass)
        return a.genericName.localeCompare(b.genericName)
      })
  }, [drugs, search, categoryFilter, sortBy])

  const activeCategories = useMemo(
    () => [...new Set(drugs.map((d) => d.category))].sort(),
    [drugs],
  )

  return (
    <div className="kbp-list-view">
      <div className="kbp-list-toolbar">
        <label className="kb-search">
          <Search className="kb-search__icon h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          <input
            type="search"
            className="kb-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('kbPharmaSearch')}
            aria-label={t('kbPharmaSearch')}
          />
        </label>
        <div className="kbp-list-toolbar__right">
          <label className="kbp-sort-label">
            <span className="kbp-sort-label__text">{t('kbPharmaSortBy')}</span>
            <select
              className="kbp-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              <option value="name">{t('kbPharmaSortName')}</option>
              <option value="class">{t('kbPharmaSortClass')}</option>
              <option value="updated">{t('kbPharmaSortUpdated')}</option>
            </select>
          </label>
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('kbPharmaNewDrug')}
          </button>
        </div>
      </div>

      <div className="kb-category-chips" role="group" aria-label={t('kbPharmaFieldCategory')}>
        <button
          type="button"
          className={`kb-chip${categoryFilter === ALL_CATEGORIES ? ' kb-chip--active' : ''}`}
          onClick={() => setCategoryFilter(ALL_CATEGORIES)}
        >
          {t('kbPharmaAllCategories')}
        </button>
        {activeCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`kb-chip${categoryFilter === cat ? ' kb-chip--active' : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {drugs.length === 0 ? (
        <div className="kbp-empty">
          <p className="kbp-empty__text">{t('kbPharmaEmpty')}</p>
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('kbPharmaNewDrug')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="kbp-list-view__no-results">{t('kbPharmaNoResults')}</p>
      ) : (
        <ul className="kbp-drug-list">
          {filtered.map((drug) => (
            <li key={drug.id}>
              <button type="button" className="kbp-drug-row" onClick={() => onSelect(drug.id)}>
                <span className="kbp-drug-row__main">
                  <span className="kbp-drug-row__name">{drug.genericName}</span>
                  {drug.brandNames.length > 0 && (
                    <span className="kbp-drug-row__brands">{drug.brandNames.join(', ')}</span>
                  )}
                  {drug.drugClass && (
                    <span className="kbp-drug-row__class">{drug.drugClass}</span>
                  )}
                </span>
                <span className="kbp-drug-row__meta">
                  <span className={`kbp-status-badge${drug.status === 'inactive' ? ' kbp-status-badge--inactive' : ''}`}>
                    {drug.status === 'active' ? t('kbPharmaStatusActive') : t('kbPharmaStatusInactive')}
                  </span>
                  <span className="kbp-drug-row__date">
                    {formatSiteLocaleDate(drug.updatedAt, language as 'de' | 'en' | 'fr' | 'es')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Section Item ─────────────────────────────────────────────────────────────

interface SectionItemProps {
  section: DrugSection
  isFirst: boolean
  isLast: boolean
  isCollapsed: boolean
  editMode: boolean
  onToggleCollapse: () => void
  onContentChange: (content: string) => void
  onLabelChange: (label: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleHidden: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function SectionItem({
  section,
  isFirst,
  isLast,
  isCollapsed,
  editMode,
  onToggleCollapse,
  onContentChange,
  onLabelChange,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
  onDuplicate,
  onDelete,
}: SectionItemProps) {
  const { t } = useTranslation()
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(section.label)
  const labelInputRef = useRef<HTMLInputElement>(null)

  if (section.hidden && !editMode) return null

  const dimmed = section.hidden && editMode

  const commitLabel = () => {
    setEditingLabel(false)
    const trimmed = labelDraft.trim()
    if (trimmed && trimmed !== section.label) onLabelChange(trimmed)
    else setLabelDraft(section.label)
  }

  return (
    <div className={`kbp-section${dimmed ? ' kbp-section--hidden' : ''}`}>
      <div
        className="kbp-section__header"
        role={editMode ? undefined : 'button'}
        tabIndex={editMode ? undefined : 0}
        onClick={editMode ? undefined : onToggleCollapse}
        onKeyDown={editMode ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse() }
        }}
      >
        {editMode ? (
          <div className="kbp-section__header-edit">
            <div className="kbp-section__reorder-btns">
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onMoveUp}
                disabled={isFirst}
                aria-label="Nach oben"
              >
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onMoveDown}
                disabled={isLast}
                aria-label="Nach unten"
              >
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            {editingLabel ? (
              <input
                ref={labelInputRef}
                className="kbp-section__label-input"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitLabel()
                  if (e.key === 'Escape') { setEditingLabel(false); setLabelDraft(section.label) }
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="kbp-section__label-btn"
                onClick={() => { setLabelDraft(section.label); setEditingLabel(true) }}
                title="Label bearbeiten"
              >
                {section.label}
              </button>
            )}

            <div className="kbp-section__edit-actions">
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onToggleHidden}
                title={section.hidden ? t('kbPharmaSectionShow') : t('kbPharmaSectionHide')}
              >
                {section.hidden ? <Eye className="h-3.5 w-3.5" strokeWidth={1.75} /> : <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />}
              </button>
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onDuplicate}
                title={t('kbPharmaSectionDuplicate')}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              {!section.isDefault && (
                <button
                  type="button"
                  className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger"
                  onClick={onDelete}
                  title={t('kbPharmaSectionDelete')}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="kbp-section__header-view">
            <span className="kbp-section__label">{section.label}</span>
            <ChevronDown
              className={`kbp-section__chevron h-3.5 w-3.5${isCollapsed ? '' : ' kbp-section__chevron--open'}`}
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
        )}
      </div>

      {(!isCollapsed || editMode) && (
        <div className="kbp-section__body">
          {editMode ? (
            <textarea
              className="kbp-section__textarea"
              value={section.content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={t('kbPharmaContentPlaceholder')}
              rows={4}
            />
          ) : section.content ? (
            <p className="kbp-section__text">{section.content}</p>
          ) : (
            <p className="kbp-section__text kbp-section__text--empty">{t('kbPharmaSectionEmpty')}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Drug Detail View ─────────────────────────────────────────────────────────

interface DrugDetailViewProps {
  drug: KnowledgeBaseDrug
  onBack: () => void
  onUpdate: (drug: KnowledgeBaseDrug) => void
  onDuplicate: () => void
  onDelete: () => void
  language: string
}

function DrugDetailView({ drug, onBack, onUpdate, onDuplicate, onDelete, language }: DrugDetailViewProps) {
  const { t } = useTranslation()
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<KnowledgeBaseDrug>(drug)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const section of drug.sections) {
      if (section.isCollapsedByDefault) s.add(section.id)
    }
    return s
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiReferences, setAiReferences] = useState<string[]>([])
  const [aiNotice, setAiNotice] = useState(false)

  const enterEditMode = () => {
    setDraft({ ...drug, sections: drug.sections.map((s) => ({ ...s })) })
    setEditMode(true)
  }

  const cancelEdit = () => {
    setDraft(drug)
    setEditMode(false)
  }

  const saveEdit = () => {
    onUpdate(draft)
    setEditMode(false)
  }

  const activeDrug = editMode ? draft : drug
  const sortedSections = [...activeDrug.sections].sort((a, b) => a.order - b.order)

  const updateDraftSection = (sectionId: string, patch: Partial<DrugSection>) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }))
  }

  const updateDraftReceptor = (
    profile: Record<string, number>,
    details: Record<string, ReceptorProfileDetail>,
  ) => {
    setDraft((prev) => ({ ...prev, receptorProfile: profile, receptorProfileDetails: details }))
  }

  const handleAiFill = async () => {
    setAiError(null)
    setAiLoading(true)
    // Switch into edit mode so the clinician reviews the AI draft before saving.
    if (!editMode) {
      setDraft({ ...drug, sections: drug.sections.map((s) => ({ ...s })) })
      setEditMode(true)
    }
    try {
      const result = await generatePharmaDetails({
        genericName: drug.genericName,
        brandNames: drug.brandNames,
        drugClass: drug.drugClass,
        category: drug.category,
        language: language as 'de' | 'en' | 'fr' | 'es',
      })
      setDraft((prev) => {
        const sections = prev.sections.map((s) => {
          if (s.key === 'custom') return s
          const aiContent = result.sections[s.key as DrugSectionKey]
          return aiContent ? { ...s, content: aiContent } : s
        })
        // Merge AI receptor scores additively, never discarding existing entries.
        const receptorProfile = result.receptorProfile
          ? { ...(prev.receptorProfile ?? {}), ...result.receptorProfile }
          : prev.receptorProfile
        return { ...prev, sections, receptorProfile }
      })
      setAiReferences(result.references)
      setAiNotice(true)
      showNotionToast(t('kbPharmaAiSuccess'))
    } catch {
      setAiError(t('kbPharmaAiError'))
    } finally {
      setAiLoading(false)
    }
  }

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setDraft((prev) => {
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((s) => s.id === sectionId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return prev
      return {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id === sorted[idx].id) return { ...s, order: sorted[swapIdx].order }
          if (s.id === sorted[swapIdx].id) return { ...s, order: sorted[idx].order }
          return s
        }),
      }
    })
  }

  const duplicateSection = (sectionId: string) => {
    setDraft((prev) => {
      const source = prev.sections.find((s) => s.id === sectionId)
      if (!source) return prev
      const maxOrder = Math.max(...prev.sections.map((s) => s.order))
      return {
        ...prev,
        sections: [
          ...prev.sections,
          {
            ...source,
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            key: 'custom' as const,
            isDefault: false,
            order: maxOrder + 1,
          },
        ],
      }
    })
  }

  const addCustomSection = () => {
    setDraft((prev) => {
      const maxOrder = prev.sections.length > 0 ? Math.max(...prev.sections.map((s) => s.order)) : -1
      return {
        ...prev,
        sections: [
          ...prev.sections,
          {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            key: 'custom' as const,
            label: t('kbPharmaSectionLabelPlaceholder'),
            content: '',
            isDefault: false,
            isCollapsedByDefault: false,
            order: maxOrder + 1,
            hidden: false,
          },
        ],
      }
    })
  }

  const resetSectionOrder = () => {
    setDraft((prev) => {
      const templateOrder = new Map(DEFAULT_SECTION_TEMPLATES.map((tmpl) => [tmpl.key, tmpl.order]))
      return {
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          order: templateOrder.has(s.key) ? (templateOrder.get(s.key) ?? s.order) : prev.sections.length,
        })),
      }
    })
  }

  const kurzprofilContent = activeDrug.sections.find((s) => s.key === 'kurzprofil')?.content

  return (
    <div className="kbp-detail-view">
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          drugName={drug.genericName}
          onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="kbp-detail-topbar">
        <button type="button" className="kbp-back-btn" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('kbPharmaBackToList')}
        </button>
        <div className="kbp-detail-topbar__actions">
          <button
            type="button"
            className="kbp-btn kbp-btn--ai"
            onClick={handleAiFill}
            disabled={aiLoading}
            title={t('kbPharmaAiFill')}
          >
            <Sparkles className={`h-3.5 w-3.5${aiLoading ? ' kbp-spin' : ''}`} strokeWidth={1.75} aria-hidden />
            {aiLoading ? t('kbPharmaAiFilling') : t('kbPharmaAiFill')}
          </button>
          {editMode ? (
            <>
              <button type="button" className="kbp-btn kbp-btn--primary" onClick={saveEdit}>{t('kbPharmaSave')}</button>
              <button type="button" className="kbp-btn" onClick={cancelEdit}>{t('kbPharmaCancel')}</button>
            </>
          ) : (
            <>
              <button type="button" className="kbp-btn" onClick={enterEditMode}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {t('kbPharmaEdit')}
              </button>
              <button type="button" className="kbp-icon-btn" onClick={onDuplicate} title={t('kbPharmaDuplicate')}>
                <Copy className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button type="button" className="kbp-icon-btn kbp-icon-btn--danger" onClick={() => setShowDeleteConfirm(true)} title={t('kbPharmaDelete')}>
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="kbp-drug-header">
        <div className="kbp-drug-header__top">
          <h2 className="kbp-drug-header__name">{activeDrug.genericName}</h2>
          {activeDrug.brandNames.length > 0 && (
            <span className="kbp-drug-header__brands">{activeDrug.brandNames.join(', ')}</span>
          )}
        </div>
        <div className="kbp-drug-header__meta">
          {activeDrug.drugClass && <span className="kbp-drug-header__class">{activeDrug.drugClass}</span>}
          {activeDrug.atcCode && <span className="kbp-drug-header__atc">ATC: {activeDrug.atcCode}</span>}
          <span className={`kbp-status-badge${activeDrug.status === 'inactive' ? ' kbp-status-badge--inactive' : ''}`}>
            {activeDrug.status === 'active' ? t('kbPharmaStatusActive') : t('kbPharmaStatusInactive')}
          </span>
        </div>
        {kurzprofilContent && !editMode && (
          <p className="kbp-drug-header__summary">{kurzprofilContent}</p>
        )}
        <p className="kbp-drug-header__updated">
          {t('kbPharmaLastUpdated')}: {formatSiteLocaleDate(activeDrug.updatedAt, language as 'de' | 'en' | 'fr' | 'es')}
          {activeDrug.authorEditor ? ` · ${activeDrug.authorEditor}` : ''}
        </p>
      </div>

      {aiError && (
        <p className="kbp-ai-error" role="alert">{aiError}</p>
      )}

      {aiNotice && (
        <div className="kbp-ai-notice" role="note">
          <p className="kbp-ai-notice__disclaimer">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('kbPharmaAiDisclaimer')}
          </p>
          {aiReferences.length > 0 && (
            <div className="kbp-ai-notice__refs">
              <span className="kbp-ai-notice__refs-title">{t('kbPharmaAiReferences')}</span>
              <ul className="kbp-ai-notice__refs-list">
                {aiReferences.map((ref, i) => (
                  <li key={i}>{ref}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="kbp-receptor-section">
        <h3 className="kbp-receptor-section__title">{t('kbReceptorTitle')}</h3>
        <KnowledgeBaseReceptorEditor
          editMode={editMode}
          profile={activeDrug.receptorProfile}
          details={activeDrug.receptorProfileDetails}
          onChange={updateDraftReceptor}
        />
      </div>

      <div className="kbp-sections">
        {editMode && (
          <div className="kbp-edit-toolbar">
            <button type="button" className="kbp-btn kbp-btn--sm" onClick={resetSectionOrder}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('kbPharmaResetOrder')}
            </button>
          </div>
        )}

        {sortedSections.map((section, idx) => (
          <SectionItem
            key={section.id}
            section={section}
            isFirst={idx === 0}
            isLast={idx === sortedSections.length - 1}
            isCollapsed={collapsedSections.has(section.id)}
            editMode={editMode}
            onToggleCollapse={() =>
              setCollapsedSections((prev) => {
                const next = new Set(prev)
                if (next.has(section.id)) next.delete(section.id)
                else next.add(section.id)
                return next
              })
            }
            onContentChange={(content) => updateDraftSection(section.id, { content })}
            onLabelChange={(label) => updateDraftSection(section.id, { label })}
            onMoveUp={() => moveSection(section.id, 'up')}
            onMoveDown={() => moveSection(section.id, 'down')}
            onToggleHidden={() => updateDraftSection(section.id, { hidden: !section.hidden })}
            onDuplicate={() => duplicateSection(section.id)}
            onDelete={() => setDraft((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== section.id) }))}
          />
        ))}

        {editMode && (
          <button type="button" className="kbp-add-section-btn" onClick={addCustomSection}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('kbPharmaAddSection')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function KnowledgeBasePharma({ onClose, onCloseAll, collectionId, collectionName }: KnowledgeBasePharmaProps) {
  const { t, language } = useTranslation()
  const { drugs, addDrug, updateDrug, deleteDrug, duplicateDrug } = useKnowledgeBaseDrugs(collectionId)

  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const selectedDrug = selectedDrugId ? (drugs.find((d) => d.id === selectedDrugId) ?? null) : null

  const handleAddDrug = useCallback(
    (draft: Omit<KnowledgeBaseDrug, 'id' | 'createdAt' | 'updatedAt'>) => {
      const created = addDrug(draft)
      setShowAddDialog(false)
      setSelectedDrugId(created.id)
    },
    [addDrug],
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedDrugId) return
    const copy = duplicateDrug(selectedDrugId)
    if (copy) setSelectedDrugId(copy.id)
  }, [duplicateDrug, selectedDrugId])

  const handleDelete = useCallback(() => {
    if (!selectedDrugId) return
    deleteDrug(selectedDrugId)
    setSelectedDrugId(null)
  }, [deleteDrug, selectedDrugId])

  return (
    <div className="kbp-page text-ink">
      <div className="kbp-topbar">
        <button
          type="button"
          className="kbp-back-btn"
          onClick={onClose}
          aria-label={t('kbPharmaBackToKb')}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('kbPharmaBackToKb')}
        </button>
        <div className="kbp-topbar__left">
          <h1 className="kbp-topbar__title">{collectionName ?? t('kbPharmaTitle')}</h1>
          <span className="kbp-topbar__subtitle">{t('kbPharmaSubtitle')}</span>
        </div>
        <button
          type="button"
          className="kbp-icon-btn"
          onClick={onCloseAll ?? onClose}
          aria-label={t('kbPharmaClose')}
          title={t('kbPharmaClose')}
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="kbp-content">
        {selectedDrug ? (
          <DrugDetailView
            drug={selectedDrug}
            onBack={() => setSelectedDrugId(null)}
            onUpdate={updateDrug}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            language={language}
          />
        ) : (
          <DrugListView
            drugs={drugs}
            onSelect={setSelectedDrugId}
            onAdd={() => setShowAddDialog(true)}
            language={language}
          />
        )}
      </div>

      {showAddDialog && (
        <AddDrugDialog
          onSubmit={handleAddDrug}
          onCancel={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}
