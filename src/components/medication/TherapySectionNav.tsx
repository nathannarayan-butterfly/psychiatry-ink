import { useTranslation } from '../../context/TranslationContext'
import { useTherapySectionNavOptional } from '../../contexts/TherapySectionNavContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { translateSozialtherapieUi as tsSozial } from '../../data/sozialtherapieUiTranslations'
import { THERAPY_PAGE_SECTIONS, type TherapyPageSectionKey } from '../../data/therapyPageSections'
import { translateWeitereTherapieUi as tsWeitere } from '../../data/weitereTherapieUiTranslations'

function pageSectionLabel(
  key: TherapyPageSectionKey,
  t: (key: UiTranslationKey) => string,
  language: ReturnType<typeof useTranslation>['language'],
): string {
  switch (key) {
    case 'weitere':
      return tsWeitere(language, 'wtSectionTitle')
    case 'psychotherapie':
      return t('therapieSectionPsychotherapie')
    case 'komplementaer':
      return t('complementaryTherapiesTitle')
    case 'sozial':
      return tsSozial(language, 'szSectionTitle')
    case 'notizen':
      return t('therapieSectionNotizen')
  }
}

/** Table-of-contents for the Therapien tab (non-medication therapy areas). */
export function TherapySectionNav() {
  const { t, language } = useTranslation()
  const nav = useTherapySectionNavOptional()
  if (!nav) return null

  const { activePageSection, jumpToPageSection } = nav

  return (
    <nav className="med-therapy-nav" aria-label={t('therapieNavJump')}>
      <label className="med-therapy-nav__dropdown">
        <span className="med-therapy-nav__dropdown-label">{t('therapieNavJump')}</span>
        <select
          className="med-therapy-nav__select"
          value={activePageSection ?? ''}
          onChange={(e) => jumpToPageSection(e.target.value as TherapyPageSectionKey)}
          aria-label={t('therapieNavJump')}
        >
          {THERAPY_PAGE_SECTIONS.map((section) => (
            <option key={section.key} value={section.key}>
              {pageSectionLabel(section.key, t, language)}
            </option>
          ))}
        </select>
      </label>

      <div className="med-therapy-nav__list">
        <div className="med-therapy-nav__group">
          <span className="med-therapy-nav__title">{t('therapieNavPageSections')}</span>
          <ul className="med-therapy-nav__items">
            {THERAPY_PAGE_SECTIONS.map((section) => (
              <li key={section.key}>
                <button
                  type="button"
                  className={`med-therapy-nav__link${
                    activePageSection === section.key ? ' med-therapy-nav__link--active' : ''
                  }`}
                  onClick={() => jumpToPageSection(section.key)}
                >
                  {pageSectionLabel(section.key, t, language)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
