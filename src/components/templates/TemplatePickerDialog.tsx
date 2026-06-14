import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useDocumentTemplates } from '../../hooks/useDocumentTemplates'
import type { DocumentTemplate, TemplateAvailability } from '../../types/documentTemplate'
import { categoryLabel, TEMPLATE_CATEGORIES } from '../../utils/documentTemplate/constants'
import { filterTemplatesByAvailability, searchTemplates } from '../../utils/documentTemplateStore'

interface TemplatePickerDialogProps {
  context: keyof TemplateAvailability
  onSelect: (template: DocumentTemplate) => void
  onClose: () => void
}

export function TemplatePickerDialog({ context, onSelect, onClose }: TemplatePickerDialogProps) {
  const { t, language } = useTranslation()
  const { templates } = useDocumentTemplates()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | DocumentTemplate['category']>('all')

  const filtered = useMemo(() => {
    const available = filterTemplatesByAvailability(templates, context)
    return searchTemplates(available, query, category)
  }, [templates, context, query, category])

  return (
    <div className="dt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dt-modal dt-modal--picker" onClick={(e) => e.stopPropagation()}>
        <header className="dt-modal__header">
          <h2 className="dt-modal__title">{t('templatePickerTitle')}</h2>
          <button type="button" className="dt-icon-btn" onClick={onClose} aria-label={t('dokumenteClose')}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="dt-picker-filters">
          <label className="dt-search">
            <Search className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('templateSearchPlaceholder')}
              aria-label={t('templateSearchPlaceholder')}
            />
          </label>
          <select
            className="dt-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            aria-label={t('templateCategoryFilter')}
          >
            <option value="all">{t('templateCategoryAll')}</option>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {language === 'de' ? cat.labelDe : cat.labelEn}
              </option>
            ))}
          </select>
        </div>

        <ul className="dt-picker-list">
          {filtered.length === 0 ? (
            <li className="dt-picker-empty">{t('templatePickerEmpty')}</li>
          ) : (
            filtered.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className="dt-picker-item"
                  onClick={() => onSelect(template)}
                >
                  <span className="dt-picker-item__title">{template.title}</span>
                  <span className="dt-picker-item__meta">
                    {categoryLabel(template.category, language === 'de' ? 'de' : 'en')}
                    {' · '}
                    v{template.version}
                  </span>
                  {template.description ? (
                    <span className="dt-picker-item__desc">{template.description}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
