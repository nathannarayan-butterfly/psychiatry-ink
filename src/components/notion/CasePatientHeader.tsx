import { useMemo } from 'react'
import { ClinicalHeroStrip } from '../clinical/ClinicalHeroStrip'
import { buildClinicalThesis } from '../../utils/overview/clinicalThesis'
import { buildClinicalHeroMeta } from '../../utils/overview/clinicalHeroMeta'
import { DEFAULT_CASE_ID } from '../../utils/caseContext'
import { useTranslation } from '../../context/TranslationContext'

interface CasePatientHeaderProps {
  caseId: string
  /** Bump when local patient meta changes so the header re-reads registry data. */
  metaVersion?: number
  /** When true, show a one-line clinical thesis below demographics (Übersicht hero). */
  showThesis?: boolean
  /** Minimal layout — typographic strip without boxed chrome. */
  variant?: 'default' | 'minimal'
  onClinicalSubheadingChange?: () => void
}

/** Patient name and demographics at the top of each case tab content area. */
export function CasePatientHeader({
  caseId,
  metaVersion = 0,
  showThesis = false,
  variant = 'minimal',
  onClinicalSubheadingChange,
}: CasePatientHeaderProps) {
  const { t, language } = useTranslation()

  const { name, demographics, thesis, isAssigned } = useMemo(() => {
    void metaVersion
    void language
    const hero = buildClinicalHeroMeta(caseId, t)
    return {
      ...hero,
      thesis: showThesis ? buildClinicalThesis(caseId) : null,
    }
  }, [caseId, language, metaVersion, showThesis, t])

  const headerClass =
    variant === 'minimal'
      ? 'case-patient-header case-patient-header--minimal'
      : 'case-patient-header'

  return (
    <div className={headerClass}>
      <ClinicalHeroStrip
        name={name}
        demographics={demographics}
        caseId={isAssigned && caseId !== DEFAULT_CASE_ID ? caseId : undefined}
        thesis={thesis}
        thesisEditable={showThesis}
        onThesisChange={onClinicalSubheadingChange}
      />
    </div>
  )
}
