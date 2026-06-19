import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { translateSozialtherapieUi as tsSozial } from '../../data/sozialtherapieUiTranslations'
import {
  THERAPY_PLANNING_SECTIONS,
  type TherapyPlanningSectionKey,
} from '../../data/therapyPageSections'
import { translateWeitereTherapieUi as tsWeitere } from '../../data/weitereTherapieUiTranslations'
import { PsychotherapiePlanungPage } from '../psychotherapy/PsychotherapiePlanungPage'
import { ComplementaryTherapiesSection } from '../notion/ComplementaryTherapiesSection'
import { WeitereTherapieSection } from '../notion/WeitereTherapieSection'
import { SozialtherapieSection } from '../sozialtherapie/SozialtherapieSection'

interface TherapieplanungWorkspaceProps {
  caseId: string
  disabled?: boolean
  /** Pre-select a therapy type (e.g. from workspace context-menu subsection). */
  initialType?: TherapyPlanningSectionKey | null
  onInitialTypeConsumed?: () => void
}

function planningSectionLabel(
  key: TherapyPlanningSectionKey,
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
  }
}

/** Workspace panel: pick a therapy type, then open the matching planning flow. */
export function TherapieplanungWorkspace({
  caseId,
  disabled = false,
  initialType = null,
  onInitialTypeConsumed,
}: TherapieplanungWorkspaceProps) {
  const { t, language } = useTranslation()
  const [activeType, setActiveType] = useState<TherapyPlanningSectionKey | null>(initialType)

  useEffect(() => {
    if (!initialType) return
    setActiveType(initialType)
    onInitialTypeConsumed?.()
  }, [initialType, onInitialTypeConsumed])

  const handleTypeSelect = useCallback((key: TherapyPlanningSectionKey) => {
    if (disabled) return
    setActiveType(key)
  }, [disabled])

  const handlePlanningClose = useCallback(() => {
    setActiveType(null)
  }, [])

  if (activeType === 'psychotherapie') {
    return (
      <PsychotherapiePlanungPage
        caseId={caseId}
        onClose={handlePlanningClose}
      />
    )
  }

  if (activeType === 'weitere') {
    return (
      <WeitereTherapieSection
        caseId={caseId}
        workspacePlanning
        onWorkspacePlanningClose={handlePlanningClose}
      />
    )
  }

  if (activeType === 'komplementaer') {
    return (
      <ComplementaryTherapiesSection
        caseId={caseId}
        workspacePlanning
        onWorkspacePlanningClose={handlePlanningClose}
      />
    )
  }

  if (activeType === 'sozial') {
    return (
      <SozialtherapieSection
        caseId={caseId}
        workspacePlanning
        onWorkspacePlanningClose={handlePlanningClose}
      />
    )
  }

  return (
    <div className="therapieplanung-workspace">
      <header className="therapieplanung-workspace__header">
        <h2 className="therapieplanung-workspace__title">{t('therapieplanungWorkspaceTitle')}</h2>
        <p className="therapieplanung-workspace__hint">{t('therapieplanungWorkspaceHint')}</p>
      </header>
      <nav className="therapieplanung-workspace__nav" aria-label={t('therapieplanungWorkspaceNav')}>
        <ul className="therapieplanung-workspace__list">
          {THERAPY_PLANNING_SECTIONS.map((section) => (
            <li key={section.key}>
              <button
                type="button"
                className="therapieplanung-workspace__link"
                disabled={disabled}
                onClick={() => handleTypeSelect(section.key)}
              >
                {planningSectionLabel(section.key, t, language)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
