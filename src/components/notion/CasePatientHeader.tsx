import { useMemo } from 'react'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { isDemoCase } from '../../demo'
import { useTranslation } from '../../context/TranslationContext'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'

interface CasePatientHeaderProps {
  caseId: string
  /** Bump when local patient meta changes so the header re-reads registry data. */
  metaVersion?: number
}

/** Patient name and demographics at the top of each case tab content area. */
export function CasePatientHeader({ caseId, metaVersion = 0 }: CasePatientHeaderProps) {
  const { t, language } = useTranslation()

  const { name, metaParts } = useMemo(() => {
    void metaVersion
    const meta = getCaseMeta(caseId)
    const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
      .filter(Boolean)
      .join(' ')
    const displayName =
      structuredName ||
      meta?.localName?.trim() ||
      (isDemoCase(caseId) ? t('demoPatientDisplayName') : t('patientNavFallback'))

    const geburtsdatumRaw = meta?.localGeburtsdatum?.trim()
    const geburtsdatum = geburtsdatumRaw
      ? formatSiteLocaleDate(geburtsdatumRaw, language)
      : undefined
    const geschlecht = meta?.localGeschlecht

    const genderLabel =
      geschlecht === 'maennlich'
        ? t('patientGeschlechtMaennlich')
        : geschlecht === 'weiblich'
          ? t('patientGeschlechtWeiblich')
          : geschlecht === 'divers'
            ? t('patientGeschlechtDivers')
            : null

    const parts = [
      geburtsdatum ? `${t('patientFieldGeburtsdatum')}: ${geburtsdatum}` : null,
      genderLabel,
    ].filter(Boolean)

    return { name: displayName, metaParts: parts }
  }, [caseId, language, metaVersion, t])

  return (
    <header className="case-patient-header">
      <h1 className="case-patient-header__name">{name}</h1>
      {metaParts.length > 0 ? (
        <p className="case-patient-header__meta">{metaParts.join(' · ')}</p>
      ) : null}
    </header>
  )
}
