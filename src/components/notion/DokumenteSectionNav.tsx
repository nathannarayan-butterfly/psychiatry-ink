import { useTranslation } from '../../context/TranslationContext'
import { useDokumenteSectionNavOptional } from '../../contexts/DokumenteSectionNavContext'
import { CATEGORY_TABS, type CategoryFilter } from '../../data/dokumenteCategories'

/** Document category switcher + actions for the Dokumente tab, hosted in the global case sidebar. */
export function DokumenteSectionNav() {
  const { t } = useTranslation()
  const nav = useDokumenteSectionNavOptional()
  if (!nav) return null

  const { activeCategory, setActiveCategory, requestNewTemplate, requestImport } = nav

  const showExterneUpload = activeCategory === 'all' || activeCategory === 'externe-befunde'
  const showTemplateActions = activeCategory === 'all' || activeCategory === 'formulare'

  return (
    <nav className="med-therapy-nav dokumente-section-nav" aria-label={t('dokumenteTitle')}>
      <label className="med-therapy-nav__dropdown">
        <span className="med-therapy-nav__dropdown-label">{t('dokumenteTitle')}</span>
        <select
          className="med-therapy-nav__select"
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value as CategoryFilter)}
          aria-label={t('dokumenteTitle')}
        >
          {CATEGORY_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {t(tab.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div className="med-therapy-nav__list">
        <div className="med-therapy-nav__group">
          <span className="med-therapy-nav__title">{t('dokumenteTitle')}</span>
          <ul className="med-therapy-nav__items">
            {CATEGORY_TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  className={`med-therapy-nav__link${
                    activeCategory === tab.id ? ' med-therapy-nav__link--active' : ''
                  }`}
                  onClick={() => setActiveCategory(tab.id)}
                  aria-pressed={activeCategory === tab.id}
                >
                  {t(tab.labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(showExterneUpload || showTemplateActions) && (
        <div className="dokumente-section-nav__actions">
          {showExterneUpload && (
            <button
              type="button"
              className="dokumente-section-nav__action"
              onClick={requestImport}
              title={t('documentImportTitle')}
            >
              {t('documentImportTitle')}
            </button>
          )}
          {showTemplateActions && (
            <button
              type="button"
              className="dokumente-section-nav__action"
              onClick={requestNewTemplate}
            >
              {t('templateUseNew')}
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
