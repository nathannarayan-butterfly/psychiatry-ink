import { LayoutGrid, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import { DEFAULT_CASE_ID } from '../../utils/caseContext'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { PatientCaseCard } from '../dashboard/PatientCaseCard'
import { NewPatientDialog } from '../dashboard/NewPatientDialog'
import type { NewPatientData } from '../dashboard/NewPatientDialog'

type ViewMode = 'cards' | 'list'

interface MeinePatientenViewProps {
  cases: DashboardCase[]
  loading?: boolean
  error?: string | null
  onOpenPatient: (caseId: string) => void
  onCreatePatient: (patient: NewPatientData) => void
}

function genderLabel(
  geschlecht: DashboardCase['localGeschlecht'],
  t: (key: 'patientGeschlechtMaennlich' | 'patientGeschlechtWeiblich' | 'patientGeschlechtDivers') => string,
): string | null {
  if (geschlecht === 'maennlich') return t('patientGeschlechtMaennlich')
  if (geschlecht === 'weiblich') return t('patientGeschlechtWeiblich')
  if (geschlecht === 'divers') return t('patientGeschlechtDivers')
  return null
}

export function MeinePatientenView({
  cases,
  loading = false,
  error = null,
  onOpenPatient,
  onCreatePatient,
}: MeinePatientenViewProps) {
  const { t, language } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)

  const patientCases = useMemo(
    () => cases.filter((item) => item.caseId !== DEFAULT_CASE_ID),
    [cases],
  )

  const handleCreated = (patient: NewPatientData) => {
    setShowNewPatientDialog(false)
    onCreatePatient(patient)
  }

  return (
    <div className="meine-patienten">
      <header className="meine-patienten__header">
        <h1 className="meine-patienten__title">{t('patientNavFallback')}</h1>
        <div className="meine-patienten__toolbar">
          <div className="meine-patienten__view-toggle" role="group" aria-label={t('patientRegistryViewToggle')}>
            <button
              type="button"
              className={[
                'meine-patienten__view-btn',
                viewMode === 'list' ? 'meine-patienten__view-btn--active' : '',
              ].join(' ').trim()}
              onClick={() => setViewMode('list')}
              title={t('patientRegistryViewList')}
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={[
                'meine-patienten__view-btn',
                viewMode === 'cards' ? 'meine-patienten__view-btn--active' : '',
              ].join(' ').trim()}
              onClick={() => setViewMode('cards')}
              title={t('patientRegistryViewCards')}
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className="meine-patienten__add-btn"
            onClick={() => setShowNewPatientDialog(true)}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            {t('dashboardNewPatient')}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="meine-patienten__status">{t('dashboardLoading')}</p>
      ) : patientCases.length === 0 ? (
        <div className="meine-patienten__empty">
          <p>{t('patientRegistryEmpty')}</p>
          <button
            type="button"
            className="meine-patienten__add-btn"
            onClick={() => setShowNewPatientDialog(true)}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            {t('dashboardNewPatient')}
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="meine-patienten__grid">
          {patientCases.map((caseItem) => (
            <PatientCaseCard
              key={caseItem.caseId}
              caseItem={caseItem}
              onOpen={onOpenPatient}
            />
          ))}
        </div>
      ) : (
        <ul className="meine-patienten__list">
          {patientCases.map((caseItem) => {
            const gender = genderLabel(caseItem.localGeschlecht, t)
            const details = [
              caseItem.localGeburtsdatum
                ? formatSiteLocaleDate(caseItem.localGeburtsdatum, language)
                : null,
              gender,
            ].filter(Boolean)

            return (
              <li key={caseItem.caseId}>
                <button
                  type="button"
                  className="meine-patienten__list-row"
                  onClick={() => onOpenPatient(caseItem.caseId)}
                >
                  <span className="meine-patienten__list-name">{caseItem.displayTitle}</span>
                  {details.length > 0 ? (
                    <span className="meine-patienten__list-meta">{details.join(' · ')}</span>
                  ) : null}
                  <span className="meine-patienten__list-date">
                    {formatSiteLocaleDate(caseItem.lastEditedAt, language)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {error ? (
        <p className="meine-patienten__error" role="alert">
          {error}
        </p>
      ) : null}

      {showNewPatientDialog ? (
        <NewPatientDialog
          onCreated={handleCreated}
          onCancel={() => setShowNewPatientDialog(false)}
        />
      ) : null}
    </div>
  )
}
