import { useTranslation } from '../../context/TranslationContext'
import { useMedicationSectionNavOptional } from '../../contexts/MedicationSectionNavContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { MEDICATION_SECTIONS } from './MedicationLowerSections'

/**
 * Section router for the Medikation tab. Each link swaps the main content area
 * to that section's detailed view. Rendered in the dark case sidebar. Text-only.
 */
export function MedicationSectionNav() {
  const { t, language } = useTranslation()
  const nav = useMedicationSectionNavOptional()
  if (!nav) return null

  const { activeSection, jumpToSection } = nav

  return (
    <nav className="med-section-nav" aria-label={t('therapieNavJump')}>
      <span className="med-section-nav__title">
        {translateMedicationUi(language, 'medSectionsLabel')}
      </span>
      <ul className="med-section-nav__items">
        {MEDICATION_SECTIONS.map((section) => {
          const isActive = activeSection === section.key
          return (
            <li key={section.key}>
              <button
                type="button"
                className={`med-section-nav__link${isActive ? ' med-section-nav__link--active' : ''}`}
                onClick={() => jumpToSection(section.key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="med-section-nav__label">
                  {translateMedicationUi(language, section.labelKey)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
