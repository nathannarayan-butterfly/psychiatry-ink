import { useMemo } from 'react'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { isDemoCase } from '../../demo'
import { useTranslation } from '../../context/TranslationContext'
import { ClinicalHeroStrip } from '../clinical/ClinicalHeroStrip'
import { buildClinicalThesis } from '../../utils/overview/clinicalThesis'
import { loadNotionPageDate } from '../../utils/notionPageDate'
import { formatDateDe } from '../../utils/overview/dateLabels'

interface CasePatientHeaderProps {
  caseId: string
  /** Bump when local patient meta changes so the header re-reads registry data. */
  metaVersion?: number
  /** When true, show a one-line clinical thesis below demographics (Übersicht hero). */
  showThesis?: boolean
  /** Minimal layout — typographic strip without boxed chrome. */
  variant?: 'default' | 'minimal'
}

/** Patient name and demographics at the top of each case tab content area. */
export function CasePatientHeader({
  caseId,
  metaVersion = 0,
  showThesis = false,
  variant = 'minimal',
}: CasePatientHeaderProps) {
  const { t, language } = useTranslation()

  const { name, metaLine, thesis } = useMemo(() => {
    void metaVersion
    const meta = getCaseMeta(caseId)
    const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
      .filter(Boolean)
      .join(' ')
    const displayName =
      structuredName ||
      meta?.localName?.trim() ||
      (isDemoCase(caseId) ? t('demoPatientDisplayName') : t('patientNavFallback'))

    const geschlecht = meta?.localGeschlecht

    const genderLabel =
      geschlecht === 'maennlich'
        ? t('patientGeschlechtMaennlich')
        : geschlecht === 'weiblich'
          ? t('patientGeschlechtWeiblich')
          : geschlecht === 'divers'
            ? t('patientGeschlechtDivers')
            : null

    const ageLabel = meta?.localAge?.trim() ? `${meta.localAge} J` : null
    const admissionIso = loadNotionPageDate('aufnahme', caseId)
    const admissionLabel = admissionIso ? formatDateDe(admissionIso) : null

    const metaParts = [
      ageLabel,
      genderLabel,
      admissionLabel ? `Aufnahme ${admissionLabel}` : null,
    ].filter(Boolean)

    return {
      name: displayName,
      metaLine: metaParts.length > 0 ? metaParts.join(' · ') : null,
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
        metaLine={metaLine}
        caseId={caseId}
        thesis={thesis}
      />
    </div>
  )
}
