import { ArrowLeft, Plus, Search, Users, Archive, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import type { NotionPageId } from '../notion/notionPages'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useLanguageSettings } from '../../hooks/useLanguageSettings'
import { usePatientCaseRegistry } from '../../hooks/usePatientCaseRegistry'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import {
  archivePatientCase,
  deletePatientCasePermanently,
  patientCaseMetaToEditData,
  reactivatePatientCase,
} from '../../utils/casePatientLifecycle'
import {
  matchesPatientSearch,
  partitionPatients,
  sortPatients,
  type PatientSort,
} from '../../utils/patientListView'
import { localeForUiLanguage } from '../../utils/calendarLabels'
import { PatientCaseCard } from './PatientCaseCard'
import { NewPatientDialog, type NewPatientData } from './NewPatientDialog'

type PrivacyState = ReturnType<typeof usePrivacySettings>
type LanguageState = ReturnType<typeof useLanguageSettings>

/** How many cards to reveal per page; "Mehr anzeigen" appends another batch. */
const PAGE_SIZE = 30

interface PatientListPageProps {
  mode: 'active' | 'archived'
  privacy: PrivacyState
  languageSettings: LanguageState
  onBack: () => void
  onOpenCase: (
    caseId: string,
    page?: NotionPageId,
    showPatientDashboard?: boolean,
    appointmentId?: string,
  ) => void
  /** Navigate to the sibling list (active ↔ archived). */
  onSwitchList: () => void
}

export function PatientListPage({
  mode,
  privacy,
  languageSettings: _languageSettings,
  onBack,
  onOpenCase,
  onSwitchList,
}: PatientListPageProps) {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? 'anonymous'
  const archived = mode === 'archived'

  const { registry } = usePatientCaseRegistry({
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    caseFileCloudSync: privacy.caseFileCloudSync,
  })

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<PatientSort>('recent')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)

  const { active, archived: archivedPatients } = useMemo(
    () => partitionPatients(registry.cases, userId),
    [registry.cases, userId],
  )

  const sourceList = archived ? archivedPatients : active

  const filtered = useMemo(() => {
    const matched = sourceList.filter((caseItem) => matchesPatientSearch(caseItem, search))
    return sortPatients(matched, sort, localeForUiLanguage(language))
  }, [sourceList, search, sort, language])

  // Reset pagination whenever the effective result set could shrink/grow under us.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, sort, mode])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visible.length

  const handleArchive = useCallback(
    (caseId: string) => {
      archivePatientCase(caseId, userId)
      void registry.refresh()
    },
    [registry, userId],
  )

  const handleReactivate = useCallback(
    (caseId: string) => {
      reactivatePatientCase(caseId, userId)
      void registry.refresh()
    },
    [registry, userId],
  )

  const handleDelete = useCallback(
    async (caseId: string) => {
      await deletePatientCasePermanently(caseId, userId)
      await registry.refresh()
    },
    [registry, userId],
  )

  const handleEditSaved = useCallback(
    (patient: NewPatientData) => {
      if (!editingCaseId) return
      registry.upsertCaseMeta(editingCaseId, {
        localName: patient.name || undefined,
        localVorname: patient.vorname || undefined,
        localNachname: patient.nachname || undefined,
        localGeburtsdatum: patient.geburtsdatum || undefined,
        localGeschlecht: patient.geschlecht || undefined,
      })
      setEditingCaseId(null)
      void registry.refresh()
    },
    [editingCaseId, registry],
  )

  const editingPatientData = useMemo(() => {
    if (!editingCaseId) return undefined
    return patientCaseMetaToEditData(getCaseMeta(editingCaseId))
  }, [editingCaseId])

  const total = sourceList.length
  const activeTitle = t('dashboardRecentPatients')
  const archivedTitle = t('patientsArchivedPageTitle')
  const pageTitle = archived ? archivedTitle : activeTitle

  return (
    <div className="dashboard-page text-ink">
      <div className="dashboard-page__inner">
        <header className="patient-list-page__header">
          <button type="button" className="clinical-back-link" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('patientsBackToDashboard')}
          </button>
          <div className="cm-page-eyebrow patient-list-page__eyebrow">
            <span className="patient-list-page__title-icon" aria-hidden>
              {archived ? <Archive strokeWidth={1.75} /> : <Users strokeWidth={1.75} />}
            </span>
            <h1 className="cm-page-eyebrow__label">
              {pageTitle}
              <span className="patient-list-page__count"> ({total})</span>
            </h1>
            <hr className="cm-page-eyebrow__rule" />
            <button type="button" className="patient-list-page__switch" onClick={onSwitchList}>
              {archived ? activeTitle : archivedTitle}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </header>

        <div className="dashboard-patients-toolbar patient-list-page__toolbar">
          <label className="dashboard-patients-search patient-list-page__search">
            <Search className="dashboard-patients-search__icon h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            <input
              type="search"
              className="dashboard-patients-search__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('patientsSearchPlaceholder')}
              aria-label={t('patientsSearchPlaceholder')}
            />
          </label>
          <div
            className="dashboard-patients-view-toggle patient-list-page__sort"
            role="group"
            aria-label={t('patientsSortLabel')}
          >
            <button
              type="button"
              className={[
                'patient-list-page__sort-btn',
                sort === 'recent' ? 'patient-list-page__sort-btn--active' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => setSort('recent')}
              aria-pressed={sort === 'recent'}
            >
              {t('patientsSortRecent')}
            </button>
            <button
              type="button"
              className={[
                'patient-list-page__sort-btn',
                sort === 'alpha' ? 'patient-list-page__sort-btn--active' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => setSort('alpha')}
              aria-pressed={sort === 'alpha'}
            >
              {t('patientsSortAlpha')}
            </button>
          </div>
        </div>

        {registry.loading ? (
          <p className="dashboard-page__status">{t('dashboardLoading')}</p>
        ) : total === 0 ? (
          <div className="clinical-empty-state-card">
            <span className="clinical-empty-state-card__icon" aria-hidden>
              {archived ? <Archive className="h-5 w-5" strokeWidth={1.5} /> : <Users className="h-5 w-5" strokeWidth={1.5} />}
            </span>
            <p className="clinical-empty-state-card__text">
              {archived ? t('patientsArchivedEmpty') : t('patientsActiveEmpty')}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="dashboard-page__status">{t('dashboardSearchNoResults')}</p>
        ) : (
          <>
            <div className="dashboard-page__grid stagger-children">
              {visible.map((caseItem) =>
                archived ? (
                  <PatientCaseCard
                    key={caseItem.caseId}
                    caseItem={caseItem}
                    archived
                    onOpen={(caseId) => onOpenCase(caseId, undefined, true)}
                    onReactivate={handleReactivate}
                    onDelete={(caseId) => void handleDelete(caseId)}
                  />
                ) : (
                  <PatientCaseCard
                    key={caseItem.caseId}
                    caseItem={caseItem}
                    onOpen={(caseId) => onOpenCase(caseId, undefined, true)}
                    onEdit={(caseId) => setEditingCaseId(caseId)}
                    onArchive={handleArchive}
                  />
                ),
              )}
            </div>
            {hasMore ? (
              <div className="patient-list-page__load-more-row">
                <button
                  type="button"
                  className="dashboard-page__new-btn patient-list-page__load-more"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {t('patientsLoadMore')} ({filtered.length - visible.length})
                </button>
              </div>
            ) : null}
          </>
        )}

        {registry.error ? (
          <p className="dashboard-page__error" role="alert">
            {registry.error}
          </p>
        ) : null}
      </div>

      {editingCaseId && editingPatientData ? (
        <NewPatientDialog
          mode="edit"
          initialData={editingPatientData}
          onSubmit={handleEditSaved}
          onCancel={() => setEditingCaseId(null)}
        />
      ) : null}
    </div>
  )
}
