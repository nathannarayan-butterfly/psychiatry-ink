import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { useTranslation } from '../../context/TranslationContext'
import { DiagnosenWidget } from './DiagnosenWidget'
import type { TopNavTabId } from './CaseTopNav'
import type { UiTranslationKey } from '../../data/uiTranslations'

interface PatientDashboardViewProps {
  caseId: string
  onTabSelect: (tab: TopNavTabId) => void
}

const NAV_TABS: { id: TopNavTabId; labelKey: UiTranslationKey }[] = [
  { id: 'workspace', labelKey: 'topNavWorkspaceFall' },
  { id: 'verlauf', labelKey: 'topNavVerlauf' },
  { id: 'labor', labelKey: 'topNavLabor' },
  { id: 'therapie', labelKey: 'topNavTherapie' },
  { id: 'dokumente', labelKey: 'topNavDokumente' },
]

export function PatientDashboardView({ caseId, onTabSelect }: PatientDashboardViewProps) {
  const { t } = useTranslation()
  const meta = getCaseMeta(caseId)

  const name = meta?.localName?.trim() || t('patientNavFallback')
  const geburtsdatum = meta?.localGeburtsdatum?.trim()
  const geschlecht = meta?.localGeschlecht

  const genderLabel =
    geschlecht === 'maennlich'
      ? t('patientGeschlechtMaennlich')
      : geschlecht === 'weiblich'
        ? t('patientGeschlechtWeiblich')
        : geschlecht === 'divers'
          ? t('patientGeschlechtDivers')
          : null

  const metaParts = [
    geburtsdatum ? `${t('patientFieldGeburtsdatum')}: ${geburtsdatum}` : null,
    genderLabel,
  ].filter(Boolean)

  return (
    <div className="patient-dashboard">
      <header className="patient-dashboard__header">
        <h1 className="patient-dashboard__name">{name}</h1>
        {metaParts.length > 0 ? (
          <p className="patient-dashboard__meta">{metaParts.join(' · ')}</p>
        ) : null}
      </header>

      <div className="patient-dashboard__body">
        <main className="patient-dashboard__main">
          <DiagnosenWidget caseId={caseId} />
        </main>

        <aside className="patient-dashboard__sidebar">
          <nav className="patient-dashboard__nav" aria-label="Patient navigation">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="patient-dashboard__nav-link"
                onClick={() => onTabSelect(tab.id)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}
