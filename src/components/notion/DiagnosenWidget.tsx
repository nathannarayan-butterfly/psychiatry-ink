import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { ClinicalEyebrow } from '../clinical/ClinicalEyebrow'
import { useTranslation } from '../../context/TranslationContext'
import { useDiagnosenCodingSystem } from '../../hooks/useDiagnosenCodingSystem'
import { useDiagnosisDisplayTitles } from '../../hooks/useDiagnosisDisplayTitles'
import {
  searchDiagnosisCodes,
  type DiagnosisSearchHit,
} from '../../services/diagnosisReferenceApi'
import {
  buildDiagnosisTitleRequest,
  buildDiagnosisTitleRequestFromEntry,
  codingSystemToTitleVersion,
  resolveDiagnosisLabelSync,
} from '../../utils/diagnosisDisplayRequests'
import {
  createDiagnoseFreeText,
  createDiagnoseFromHit,
  getActiveCoding,
  isIndependentCatalogueEntry,
  loadDiagnosenAsync,
  saveDiagnosen,
  syncDerivedCodingsAsync,
  codingHasContent,
  type CodingSystem,
  type DiagnoseEntry,
} from '../../utils/diagnosenArchive'
import {
  DIAGNOSIS_SEARCH_FILTERS,
  normalizeVisibleCodingSystem,
  type DiagnosisSearchFilter,
} from '../../utils/diagnosenCodingSystem'
import { catalogueSystemToClient } from '../../services/diagnosisReferenceApi'

const SEARCH_FILTERS = DIAGNOSIS_SEARCH_FILTERS

const SYSTEM_LABEL_KEYS: Record<DiagnosisSearchFilter, 'diagnosenSystemIcd10' | 'diagnosenSystemIcd11'> = {
  icd10: 'diagnosenSystemIcd10',
  icd11: 'diagnosenSystemIcd11',
}

const SYSTEM_HINT_KEYS: Record<DiagnosisSearchFilter, 'diagnosenSystemIcd10Hint' | 'diagnosenSystemIcd11Hint'> = {
  icd10: 'diagnosenSystemIcd10Hint',
  icd11: 'diagnosenSystemIcd11Hint',
}

interface DiagnoseRowProps {
  index: number
  entry: DiagnoseEntry
  system: CodingSystem
  displayLabel: string
  editing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (code: string, label: string) => void
  onDelete: () => void
}

function DiagnoseRow({
  index,
  entry,
  system,
  displayLabel,
  editing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: DiagnoseRowProps) {
  const { t } = useTranslation()
  const coding = getActiveCoding(entry, system)
  const [editCode, setEditCode] = useState(coding.code)
  const [editLabel, setEditLabel] = useState(coding.label)

  useEffect(() => {
    if (editing) {
      setEditCode(coding.code)
      setEditLabel(coding.label)
    }
  }, [editing, coding.code, coding.label])

  if (editing) {
    return (
      <li className="diagnosen-widget__row diagnosen-widget__row--editing">
        <span className="diagnosen-widget__index" aria-hidden>{index}.</span>
        <div className="diagnosen-widget__edit-fields">
          <input
            type="text"
            className="diagnosen-widget__icd-input"
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            placeholder={t('diagnosenCodePlaceholder')}
            spellCheck={false}
          />
          <input
            type="text"
            className="diagnosen-widget__desc-input"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder={t('diagnosenDescription')}
          />
          <div className="diagnosen-widget__edit-actions">
            <button
              type="button"
              className="diagnosen-widget__save-btn"
              onClick={() => onSaveEdit(editCode.trim(), editLabel.trim())}
            >
              {t('diagnosenSave')}
            </button>
            <button
              type="button"
              className="diagnosen-widget__cancel-btn"
              onClick={onCancelEdit}
            >
              {t('diagnosenCancel')}
            </button>
          </div>
        </div>
      </li>
    )
  }

  const displayCode = coding.code || '—'
  // `displayLabel` already comes from the shared resolver (override → bundled →
  // code); never reach back into the raw stored label here.
  const labelText = displayLabel || coding.code || t('diagnosenNoLabel')

  return (
    <li className="diagnosen-widget__row">
      <span className="diagnosen-widget__index" aria-hidden>{index}.</span>
      <div className="diagnosen-widget__display">
        <span className="diagnosen-widget__code">{displayCode}</span>
        <span className="diagnosen-widget__label">{labelText}</span>
        {coding.overridden ? (
          <span className="diagnosen-widget__override-badge" title={t('diagnosenOverriddenHint')}>
            ✎
          </span>
        ) : null}
        {entry.codingSystem === 'ICD11MMS' ? (
          <span className="diagnosen-widget__system-badge" title={t('diagnosenIcd11Selected')}>
            {t('diagnosenSystemIcd11')}
          </span>
        ) : entry.codingSystem === 'ICD10GM' || (codingHasContent(entry.icd10) && !codingHasContent(entry.icd11)) ? (
          <span className="diagnosen-widget__system-badge" title={t('diagnosenIcd10Selected')}>
            {t('diagnosenSystemIcd10')}
          </span>
        ) : null}
      </div>
      <div className="diagnosen-widget__row-actions">
        <button
          type="button"
          className="diagnosen-widget__edit-btn"
          onClick={onStartEdit}
          aria-label={t('diagnosenEditEntry')}
          title={t('diagnosenEditEntry')}
        >
          <Pencil className="h-3 w-3" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          className="diagnosen-widget__delete-btn"
          onClick={onDelete}
          aria-label={t('diagnosenDeleteEntry')}
          title={t('diagnosenDeleteEntry')}
        >
          <X className="h-3 w-3" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </li>
  )
}

interface DiagnosenWidgetProps {
  caseId: string
  /** Sidebar uses compact height; panel (dashboard) expands. */
  variant?: 'sidebar' | 'panel'
  /** Flat clinical-minimal layout (Diagnose page) — no collapse chrome. */
  flat?: boolean
  /** Persist diagnoses into encrypted clinical case file (workspace vault). */
  onDiagnosesChanged?: () => void
}

export function DiagnosenWidget({
  caseId,
  variant = 'sidebar',
  flat = false,
  onDiagnosesChanged,
}: DiagnosenWidgetProps) {
  const { t, language } = useTranslation()
  const { activeSystem, setActiveSystem } = useDiagnosenCodingSystem(caseId)
  const showSystemTabs = variant === 'panel'
  const [searchFilter, setSearchFilter] = useState<DiagnosisSearchFilter>(
    () => normalizeVisibleCodingSystem(activeSystem),
  )
  const [entries, setEntries] = useState<DiagnoseEntry[]>([])
  const [loadingDiagnoses, setLoadingDiagnoses] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DiagnosisSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    setLoadingDiagnoses(true)
    setHydrated(false)
    void loadDiagnosenAsync(caseId)
      .then((loaded) => {
        if (!active) return
        setEntries(loaded)
        setLoadingDiagnoses(false)
        setHydrated(true)
      })
      .catch(() => {
        // Keep `hydrated` false on failure so the save effect never persists an
        // empty list over existing stored diagnoses; just stop the spinner.
        if (!active) return
        setLoadingDiagnoses(false)
      })
    setEditingId(null)
    setAdding(false)
    setSearchQuery('')
    return () => {
      active = false
    }
  }, [caseId])

  useEffect(() => {
    setSearchFilter(normalizeVisibleCodingSystem(activeSystem))
  }, [activeSystem])

  useEffect(() => {
    if (!hydrated) return
    saveDiagnosen(caseId, entries)
    onDiagnosesChanged?.()
  }, [caseId, entries, hydrated, onDiagnosesChanged])

  useEffect(() => {
    if (adding) searchRef.current?.focus()
  }, [adding])

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setSearching(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchDiagnosisCodes(q, searchFilter)
        .then((results) => {
          if (!cancelled) setSearchResults(results)
        })
        .catch(() => {
          if (!cancelled) setSearchResults([])
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [searchQuery, searchFilter])

  const handleAddFromHit = useCallback((hit: DiagnosisSearchHit) => {
    const slot = catalogueSystemToClient(hit.system)
    setEntries((prev) => [...prev, createDiagnoseFromHit(hit, slot)])
    setAdding(false)
    setSearchQuery('')
    setCollapsed(false)
  }, [])

  const handleAddFreeText = useCallback(() => {
    const text = searchQuery.trim()
    if (!text) return
    void createDiagnoseFreeText(text, '', activeSystem).then((entry) => {
      setEntries((prev) => [...prev, entry])
      setAdding(false)
      setSearchQuery('')
      setCollapsed(false)
    })
  }, [searchQuery])

  const handleSaveEdit = useCallback(
    (id: string, system: CodingSystem, code: string, label: string) => {
      setEntries((prev) => {
        const target = prev.find((entry) => entry.id === id)
        if (!target) return prev

        const now = new Date().toISOString()
        const updated: DiagnoseEntry = {
          ...target,
          updatedAt: now,
          [system]: { code, label, overridden: true },
        }

        if (system === 'icd10' && !isIndependentCatalogueEntry(target)) {
          void syncDerivedCodingsAsync(updated).then((synced) => {
            setEntries((current) => current.map((entry) => (entry.id === id ? synced : entry)))
            setEditingId(null)
          })
        } else {
          setEditingId(null)
        }

        return prev.map((entry) => (entry.id === id ? updated : entry))
      })
    },
    [],
  )

  const handleDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setEditingId(null)
  }, [])

  const trimmedQuery = searchQuery.trim()
  const showFreeTextOption = trimmedQuery.length > 0

  const entryTitleRequests = useMemo(
    () => entries.map((entry) => buildDiagnosisTitleRequestFromEntry(entry, activeSystem)),
    [entries, activeSystem],
  )

  const { titlesByKey: entryDisplayTitles } = useDiagnosisDisplayTitles(
    entryTitleRequests,
    language,
    hydrated,
  )

  const searchTitleRequests = useMemo(
    () =>
      searchResults.map((result) => {
        const version = codingSystemToTitleVersion(catalogueSystemToClient(result.system))
        return buildDiagnosisTitleRequest({
          key: `${result.system}-${result.code}`,
          coding: { code: result.code, label: result.title, overridden: false },
          version,
          disorderCriteriaLabel: result.title,
        })
      }),
    [searchResults],
  )

  const { titlesByKey: searchDisplayTitles } = useDiagnosisDisplayTitles(
    searchTitleRequests,
    language,
    adding && searchTitleRequests.length > 0,
  )

  const showBody = flat || !collapsed

  return (
    <section
      className={[
        'diagnosen-widget',
        variant === 'panel' ? 'diagnosen-widget--panel' : '',
        flat ? 'diagnosen-widget--flat' : '',
      ].join(' ').trim()}
    >
      {flat ? (
        <header className="diagnosen-widget__header diagnosen-widget__header--flat">
          <ClinicalEyebrow inline>{t('diagnosenTitle')}</ClinicalEyebrow>
          <span className="cm-section__head-spacer" aria-hidden />
          <button
            type="button"
            className="diagnosen-widget__add-btn diagnosen-widget__add-btn--flat"
            onClick={() => {
              setAdding((a) => !a)
              setCollapsed(false)
            }}
            aria-label={t('diagnosenAddEntry')}
            title={t('diagnosenAddEntry')}
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            <span className="diagnosen-widget__add-label">{t('diagnosenAddEntry')}</span>
          </button>
        </header>
      ) : (
        <div className="diagnosen-widget__header">
          <button
            type="button"
            className="diagnosen-widget__title-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
          >
            <span className="diagnosen-widget__title">{t('diagnosenTitle')}</span>
            <span className="diagnosen-widget__collapse-icon" aria-hidden>
              {collapsed ? '›' : '‹'}
            </span>
          </button>
          <button
            type="button"
            className="diagnosen-widget__add-btn"
            onClick={() => {
              setAdding((a) => !a)
              setCollapsed(false)
            }}
            aria-label={t('diagnosenAddEntry')}
            title={t('diagnosenAddEntry')}
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      )}

      {showBody ? (
        <div className="diagnosen-widget__body">
          {showSystemTabs ? (
            <div
              className="diagnosen-widget__tabs"
              role="tablist"
              aria-label={t('diagnosenSystemToggle')}
            >
              {SEARCH_FILTERS.map((filter) => {
                const isActive = searchFilter === filter
                return (
                  <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`diagnosen-panel-${filter}`}
                    id={`diagnosen-tab-${filter}`}
                    className={[
                      'diagnosen-widget__tab',
                      isActive ? 'diagnosen-widget__tab--active' : '',
                    ].join(' ').trim()}
                    onClick={() => {
                      setSearchFilter(filter)
                      setActiveSystem(filter)
                      setEditingId(null)
                    }}
                    title={t(SYSTEM_HINT_KEYS[filter])}
                  >
                    {t(SYSTEM_LABEL_KEYS[filter])}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div
            className="diagnosen-widget__panel"
            role={showSystemTabs ? 'tabpanel' : undefined}
            id={`diagnosen-panel-${activeSystem}`}
            aria-labelledby={showSystemTabs ? `diagnosen-tab-${activeSystem}` : undefined}
          >
            {adding ? (
              <div className="diagnosen-widget__search">
                <input
                  ref={searchRef}
                  type="search"
                  className="diagnosen-widget__search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('diagnosenSearchPlaceholder')}
                  aria-label={t('diagnosenSearchPlaceholder')}
                />
                <ul className="diagnosen-widget__search-results" role="listbox">
                  {searchResults.map((result) => (
                    <li key={`${result.system}-${result.code}`}>
                      <button
                        type="button"
                        className="diagnosen-widget__search-item"
                        role="option"
                        onClick={() => handleAddFromHit(result)}
                      >
                        <span className="diagnosen-widget__search-code">{result.code}</span>
                        <span className="diagnosen-widget__search-label">
                          {searchDisplayTitles.get(`${result.system}-${result.code}`)
                            ?? resolveDiagnosisLabelSync(
                              { code: result.code, label: result.title, overridden: false },
                              codingSystemToTitleVersion(catalogueSystemToClient(result.system)),
                              result.title,
                            )}
                        </span>
                      </button>
                    </li>
                  ))}
                  {showFreeTextOption ? (
                    <li>
                      <button
                        type="button"
                        className="diagnosen-widget__search-item diagnosen-widget__search-item--free"
                        role="option"
                        onClick={handleAddFreeText}
                      >
                        {t('diagnosenAddFreeText').replace('{text}', trimmedQuery)}
                      </button>
                    </li>
                  ) : null}
                  {searching ? (
                    <li className="diagnosen-widget__search-hint">{t('dashboardLoading')}</li>
                  ) : null}
                  {!searching && trimmedQuery.length === 0 ? (
                    <li className="diagnosen-widget__search-hint">{t('diagnosenSearchHint')}</li>
                  ) : null}
                  {!searching && trimmedQuery.length > 0 && searchResults.length === 0 ? (
                    <li className="diagnosen-widget__search-hint">{t('diagnosenSearchNoResults')}</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {loadingDiagnoses ? (
              <p className="diagnosen-widget__empty">{t('dashboardLoading')}</p>
            ) : entries.length === 0 ? (
              <p className="diagnosen-widget__empty">{t('diagnosenEmpty')}</p>
            ) : (
              <ol className="diagnosen-widget__list" aria-label={t('diagnosenTitle')}>
                {entries.map((entry, index) => {
                  const coding = getActiveCoding(entry, activeSystem)
                  const displayLabel =
                    entryDisplayTitles.get(entry.id)
                    ?? resolveDiagnosisLabelSync(coding, codingSystemToTitleVersion(activeSystem))
                  return (
                    <DiagnoseRow
                      key={entry.id}
                      index={index + 1}
                      entry={entry}
                      system={activeSystem}
                      displayLabel={displayLabel}
                      editing={editingId === entry.id}
                      onStartEdit={() => setEditingId(entry.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={(code, label) => handleSaveEdit(entry.id, activeSystem, code, label)}
                      onDelete={() => handleDelete(entry.id)}
                    />
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
