import { useTranslation } from '../../context/TranslationContext'
import { useMedicationSectionNavOptional } from '../../contexts/MedicationSectionNavContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { translateSozialtherapieUi as tsSozial } from '../../data/sozialtherapieUiTranslations'
import { THERAPY_PAGE_SECTIONS, type TherapyPageSectionKey } from '../../data/therapyPageSections'
import { translateWeitereTherapieUi as tsWeitere } from '../../data/weitereTherapieUiTranslations'
import { MEDICATION_SECTIONS } from './MedicationLowerSections'

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

/**
 * Table-of-contents for the Therapie tab: medication sub-sections plus other therapy areas.
 * Rendered in the Therapie tab left sidebar (NotionApp).
 */
export function MedicationSectionNav() {
  const { t, language } = useTranslation()
  const nav = useMedicationSectionNavOptional()
  if (!nav) return null

  const { activeSection, activePageSection, jumpToSection, jumpToPageSection } = nav
  const medActive = activePageSection === null

  const dropdownValue = medActive
    ? `med:${activeSection}`
    : `page:${activePageSection}`

  const handleDropdownChange = (value: string) => {
    if (value.startsWith('med:')) {
      jumpToSection(value.slice(4) as typeof activeSection)
      return
    }
    if (value.startsWith('page:')) {
      jumpToPageSection(value.slice(5) as TherapyPageSectionKey)
    }
  }

  return (
    <nav className="med-therapy-nav" aria-label={t('therapieNavJump')}>
      <label className="med-therapy-nav__dropdown">
        <span className="med-therapy-nav__dropdown-label">{t('therapieNavJump')}</span>
        <select
          className="med-therapy-nav__select"
          value={dropdownValue}
          onChange={(e) => handleDropdownChange(e.target.value)}
          aria-label={t('therapieNavJump')}
        >
          <optgroup label={translateMedicationUi(language, 'medSectionsLabel')}>
            {MEDICATION_SECTIONS.map((section) => (
              <option key={section.key} value={`med:${section.key}`}>
                {translateMedicationUi(language, section.labelKey)}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('therapieNavPageSections')}>
            {THERAPY_PAGE_SECTIONS.map((section) => (
              <option key={section.key} value={`page:${section.key}`}>
                {pageSectionLabel(section.key, t, language)}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="med-therapy-nav__list">
        <div className="med-therapy-nav__group">
          <span className="med-therapy-nav__title">
            {translateMedicationUi(language, 'medSectionsLabel')}
          </span>
          <ul className="med-therapy-nav__items">
            {MEDICATION_SECTIONS.map((section) => (
              <li key={section.key}>
                <button
                  type="button"
                  className={`med-therapy-nav__link${
                    medActive && activeSection === section.key ? ' med-therapy-nav__link--active' : ''
                  }`}
                  onClick={() => jumpToSection(section.key)}
                >
                  {translateMedicationUi(language, section.labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </div>

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
