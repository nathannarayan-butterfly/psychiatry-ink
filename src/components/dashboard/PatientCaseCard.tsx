import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { DashboardCase, LocalGeschlecht } from '../../hooks/useCaseRegistry'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'

interface PatientCaseCardProps {
  caseItem: DashboardCase
  onOpen: (caseId: string) => void
  onEdit?: (caseId: string) => void
  onArchive?: (caseId: string) => void
  onReactivate?: (caseId: string) => void
  onDelete?: (caseId: string) => void
  archived?: boolean
}

function genderSymbol(geschlecht: LocalGeschlecht | undefined): string | null {
  if (geschlecht === 'maennlich') return '♂'
  if (geschlecht === 'weiblich') return '♀'
  if (geschlecht === 'divers') return '⚧'
  return null
}

function genderAriaLabel(
  geschlecht: LocalGeschlecht | undefined,
  t: (key: 'patientGeschlechtMaennlich' | 'patientGeschlechtWeiblich' | 'patientGeschlechtDivers') => string,
): string | null {
  if (geschlecht === 'maennlich') return t('patientGeschlechtMaennlich')
  if (geschlecht === 'weiblich') return t('patientGeschlechtWeiblich')
  if (geschlecht === 'divers') return t('patientGeschlechtDivers')
  return null
}

export function PatientCaseCard({
  caseItem,
  onOpen,
  onEdit,
  onArchive,
  onReactivate,
  onDelete,
  archived = false,
}: PatientCaseCardProps) {
  const { t, language } = useTranslation()
  const symbol = genderSymbol(caseItem.localGeschlecht)
  const genderLabel = genderAriaLabel(caseItem.localGeschlecht, t)

  return (
    <article
      className={[
        'patient-case-card',
        archived ? 'patient-case-card--archived' : '',
      ].join(' ').trim()}
    >
      <button
        type="button"
        className="patient-case-card__main"
        onClick={() => onOpen(caseItem.caseId)}
        aria-label={t('dashboardOpenCase').replace('{title}', caseItem.displayTitle)}
      >
        <h3 className="patient-case-card__title">
          {caseItem.displayTitle}
        </h3>

        <div className="patient-case-card__facts">
          {caseItem.localGeburtsdatum ? (
            <span className="patient-case-card__fact">
              <span className="patient-case-card__fact-label">{t('patientFieldGeburtsdatum')}</span>
              <span className="patient-case-card__fact-value">
                {formatSiteLocaleDate(caseItem.localGeburtsdatum, language)}
              </span>
            </span>
          ) : null}
          {symbol ? (
            <span
              className="patient-case-card__gender"
              aria-label={genderLabel ?? undefined}
              title={genderLabel ?? undefined}
            >
              {symbol}
            </span>
          ) : null}
        </div>

        <p className="patient-case-card__meta">
          {t('dashboardLastOpened')}: {formatSiteLocaleDate(caseItem.lastEditedAt, language)}
        </p>
      </button>

      <div className="patient-case-card__actions">
        {!archived && onEdit ? (
          <button
            type="button"
            className="patient-case-card__action-btn"
            onClick={() => onEdit(caseItem.caseId)}
            aria-label={t('patientEditData')}
            title={t('patientEditData')}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            <span>{t('patientEditData')}</span>
          </button>
        ) : null}
        {!archived && onArchive ? (
          <button
            type="button"
            className="patient-case-card__action-btn patient-case-card__action-btn--muted"
            onClick={() => onArchive(caseItem.caseId)}
            aria-label={t('patientArchiveAction')}
            title={t('patientArchiveAction')}
          >
            <Archive className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            <span>{t('patientArchiveAction')}</span>
          </button>
        ) : null}
        {archived && onReactivate ? (
          <button
            type="button"
            className="patient-case-card__action-btn"
            onClick={() => onReactivate(caseItem.caseId)}
            aria-label={t('patientReactivateAction')}
            title={t('patientReactivateAction')}
          >
            <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            <span>{t('patientReactivateAction')}</span>
          </button>
        ) : null}
        {archived && onDelete ? (
          <button
            type="button"
            className="patient-case-card__action-btn patient-case-card__action-btn--danger"
            onClick={() => onDelete(caseItem.caseId)}
            aria-label={t('patientDeletePermanent')}
            title={t('patientDeletePermanent')}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            <span>{t('patientDeletePermanent')}</span>
          </button>
        ) : null}
      </div>
    </article>
  )
}
