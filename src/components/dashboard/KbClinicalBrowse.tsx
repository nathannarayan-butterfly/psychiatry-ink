import { Plus, Search, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { KbCategory, KnowledgeEntry } from '../../data/knowledgeBaseSeedData'
import { kbBadgeClass, kbCategoryLabelEn, kbCategoryOrder } from '../../data/kbCategories'
import { pickKbLocalizedList, pickKbLocalizedText } from '../../types/knowledgeBase'
import { useTranslation } from '../../context/TranslationContext'

function matchesSearch(entry: KnowledgeEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    entry.title,
    entry.titleEn ?? '',
    entry.content,
    entry.contentEn ?? '',
    entry.category,
    entry.categoryEn ?? '',
    ...entry.tags,
    ...(entry.tagsEn ?? []),
    ...(entry.sections ?? []).flatMap((s) => [s.label, s.labelEn ?? '', s.content, s.contentEn ?? '']),
  ]
  return haystack.some((value) => value.toLowerCase().includes(q))
}

export interface KbClinicalBrowseProps {
  entries: KnowledgeEntry[]
  onSelect: (id: string) => void
  onAdd: () => void
  language: string
}

export function KbClinicalBrowse({ entries, onSelect, onAdd, language }: KbClinicalBrowseProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<KbCategory | 'all'>('all')

  const allCategories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category))
    return kbCategoryOrder(entries).filter((c) => cats.has(c))
  }, [entries])

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        const categoryMatch = activeCategory === 'all' || entry.category === activeCategory
        return categoryMatch && matchesSearch(entry, search)
      }),
    [entries, search, activeCategory],
  )

  const grouped = useMemo(() => {
    const byCategory = new Map<KbCategory, KnowledgeEntry[]>()
    for (const entry of filtered) {
      const list = byCategory.get(entry.category) ?? []
      list.push(entry)
      byCategory.set(entry.category, list)
    }
    return kbCategoryOrder(entries).flatMap((category) => {
      const list = byCategory.get(category)
      if (!list?.length) return []
      return [{
        category,
        title: pickKbLocalizedText(category, kbCategoryLabelEn(category), language),
        entries: list.sort((a, b) => a.title.localeCompare(b.title, language)),
      }]
    })
  }, [filtered, entries, language])

  return (
    <div className="kb-classified-browse">
      <div className="kbp-list-toolbar">
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
        </label>
        <div className="kbp-list-toolbar__right">
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('kbAddEntry')}
          </button>
        </div>
      </div>

      <div className="kb-category-chips kbp-list-toolbar__chips" role="group" aria-label={t('kbFilterCategory')}>
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
            onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
            aria-pressed={activeCategory === cat}
          >
            {pickKbLocalizedText(cat, kbCategoryLabelEn(cat), language)}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="kbp-empty">
          <p className="kbp-empty__text">{t('kbNoResults')}</p>
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('kbAddEntry')}
          </button>
        </div>
      ) : grouped.length === 0 ? (
        <p className="kbp-list-view__no-results">{t('kbNoResults')}</p>
      ) : (
        grouped.map((section) => (
          <section key={section.category} className="kb-classified-section" aria-labelledby={`kb-clinical-${section.category}`}>
            <header className="kb-classified-section__header">
              <h2 id={`kb-clinical-${section.category}`} className="kb-classified-section__title">
                {section.title}
              </h2>
            </header>
            <ul className="kb-classified-grid">
              {section.entries.map((entry) => {
                const title = pickKbLocalizedText(entry.title, entry.titleEn, language) || entry.title
                const categoryLabel =
                  pickKbLocalizedText(entry.category, entry.categoryEn, language) || entry.category
                const tags = pickKbLocalizedList(entry.tags, entry.tagsEn, language)
                const badgeClass = kbBadgeClass(entry.category)
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="kb-classified-drug kb-classified-drug--interactive kb-classified-drug--clinical"
                      onClick={() => onSelect(entry.id)}
                    >
                      <div className="kb-classified-drug__body">
                        <span className={`kb-badge ${badgeClass}`}>{categoryLabel}</span>
                        <h3 className="kb-classified-drug__name">{title}</h3>
                        {tags.length > 0 ? (
                          <p className="kb-classified-drug__brands">
                            <Tag className="h-3 w-3" aria-hidden />
                            {tags.slice(0, 4).join(' · ')}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
