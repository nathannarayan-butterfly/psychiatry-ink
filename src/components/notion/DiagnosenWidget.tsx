import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
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
  applyClinicianCategoryChange,
  applyClinicianConfirmationChange,
  inferDefaultCategoryForNewEntry,
  inferDefaultConfirmationForCategory,
  isMutedDiagnosisCategory,
  isProvisionalDiagnosisCategory,
  resolveClinicalCategory,
  sortDiagnosesForDisplay,
  syncLegacyClassificationFields,
} from '../../utils/diagnosisClassification'
import type { DiagnosisClinicalCategory, DiagnosisConfirmationStatus } from '../../types/diagnosisCatalogue'
import {
  DiagnosisClassificationChips,
  DiagnosisClassificationEditor,
  DiagnosisClassificationEditorFromEntry,
} from '../diagnosis/DiagnosisClassificationChips'
import {
  createDiagnoseFreeText,
  createDiagnoseFromHit,
  codingHasContent,
  getActiveCoding,
  isIndependentCatalogueEntry,
  catalogueSystemToCodingSlot,
  loadDiagnosenAsync,
  saveDiagnosen,
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
  entry: DiagnoseEntry
  system: CodingSystem
  displayLabel: string
  editing: boolean
  readOnly?: boolean
  onNavigate?: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (code: string, label: string) => void
  onDelete: () => void
  onCategoryChange: (category: DiagnosisClinicalCategory) => void
  onConfirmationChange: (status: DiagnosisConfirmationStatus) => void
}

function rowToneClass(entry: DiagnoseEntry): string {
  const category = resolveClinicalCategory(entry)
  if (category === 'primary') return 'diagnosen-table__row--primary'
  if (isMutedDiagnosisCategory(category)) return 'diagnosen-table__row--muted'
  if (isProvisionalDiagnosisCategory(category)) return 'diagnosen-table__row--provisional'
  return ''
}

function DiagnoseRow({
  entry,
  system,
  displayLabel,
  editing,
  readOnly,
  onNavigate,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onCategoryChange,
  onConfirmationChange,
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

  if (editing && !readOnly) {
    return (
      <tr className={`diagnosen-table__row diagnosen-table__row--editing ${rowToneClass(entry)}`}>
        <td colSpan={4}>
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
            <DiagnosisClassificationEditorFromEntry
              entry={entry}
              onCategoryChange={onCategoryChange}
              onConfirmationChange={onConfirmationChange}
            />
            {resolveClinicalCategory(entry) !== 'differential' ? (
              <button
                type="button"
                className="diagnosen-widget__quick-dd-btn"
                onClick={() => onCategoryChange('differential')}
                title={t('diagnosisSetAsDifferential')}
                aria-label={t('diagnosisSetAsDifferential')}
              >
                {t('diagnosisQuickDdLabel')}
              </button>
            ) : null}
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
        </td>
      </tr>
    )
  }

  const handleRowNavigate = readOnly && onNavigate
    ? (event: MouseEvent | KeyboardEvent) => {
        if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return
        if ('key' in event) event.preventDefault()
        onNavigate()
      }
    : undefined

  const displayCode = coding.code || '—'
  const labelText = displayLabel || coding.code || t('diagnosenNoLabel')
  const entrySystem = entry.codingSystem ? catalogueSystemToCodingSlot(entry.codingSystem) : null
  const systemLabel =
    entrySystem && entrySystem !== system
      ? entry.codingSystem === 'ICD11MMS'
        ? t('diagnosenSystemIcd11')
        : entry.codingSystem === 'ICD10GM'
          ? t('diagnosenSystemIcd10')
          : entry.codingSystem === 'DSM5TR'
            ? t('diagnosenSystemDsm')
            : null
      : null

  return (
    <tr
      className={[
        'diagnosen-table__row',
        rowToneClass(entry),
        readOnly && onNavigate ? 'diagnosen-table__row--navigable' : '',
      ].join(' ').trim()}
      onClick={handleRowNavigate}
      onKeyDown={handleRowNavigate}
      role={readOnly && onNavigate ? 'button' : undefined}
      tabIndex={readOnly && onNavigate ? 0 : undefined}
    >
      <td className="diagnosen-table__cell diagnosen-table__cell--code">
        <span className="diagnosen-widget__code">{displayCode}</span>
        {systemLabel ? (
          <span className="diagnosen-widget__system-badge" title={systemLabel}>
            {systemLabel}
          </span>
        ) : null}
      </td>
      <td className="diagnosen-table__cell diagnosen-table__cell--label">
        <span className="diagnosen-widget__label">{labelText}</span>
        {coding.overridden ? (
          <span className="diagnosen-widget__override-badge" title={t('diagnosenOverriddenHint')}>
            ✎
          </span>
        ) : null}
      </td>
      <td className="diagnosen-table__cell diagnosen-table__cell--status">
        <div className="diagnosen-widget__status-cell">
          <DiagnosisClassificationChips entry={entry} compact />
        </div>
      </td>
      {readOnly ? null : (
        <td className="diagnosen-table__cell diagnosen-table__cell--actions">
          <div className="diagnosen-widget__row-actions">
            <button
              type="button"
              className="diagnosen-widget__edit-btn"
              onClick={onStartEdit}
              aria-label={t('diagnosenEditEntry')}
              title={t('diagnosenEditEntry')}
            >
              <Pencil className="diagnosen-widget__action-icon" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="diagnosen-widget__delete-btn"
              onClick={onDelete}
              aria-label={t('diagnosenDeleteEntry')}
              title={t('diagnosenDeleteEntry')}
            >
              <X className="diagnosen-widget__action-icon" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}

interface DiagnosenWidgetProps {
  caseId: string
  /** Sidebar uses compact height; panel (dashboard) expands. */
  variant?: 'sidebar' | 'panel'
  /** Flat clinical-minimal layout (Diagnose page) — no collapse chrome. */
  flat?: boolean
  /** Overview card: read-only compact table (no inline editing). */
  compact?: boolean
  /** Navigate to full Diagnose page when an overview row is activated. */
  onOpenDiagnose?: () => void
  /** Persist diagnoses into encrypted clinical case file (workspace vault). */
  onDiagnosesChanged?: () => void
}

export function DiagnosenWidget({
  caseId,
  variant = 'sidebar',
  flat = false,
  compact = false,
  onOpenDiagnose,
  onDiagnosesChanged,
}: DiagnosenWidgetProps) {
  const readOnly = compact
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
  const [newEntryCategory, setNewEntryCategory] = useState<DiagnosisClinicalCategory>('secondary')
  const [newEntryConfirmation, setNewEntryConfirmation] =
    useState<DiagnosisConfirmationStatus>('confirmed')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const category = inferDefaultCategoryForNewEntry(entries)
    setNewEntryCategory(category)
    setNewEntryConfirmation(inferDefaultConfirmationForCategory(category))
  }, [entries])

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
      void searchDiagnosisCodes(q, searchFilter, 12, language)
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
  }, [searchQuery, searchFilter, language])

  const applyNewEntryClassification = useCallback((entry: DiagnoseEntry): DiagnoseEntry => {
    const now = new Date().toISOString()
    return syncLegacyClassificationFields(
      {
        ...entry,
        updatedAt: now,
        statusClinicianSetAt: now,
      },
      newEntryCategory,
      newEntryConfirmation,
    )
  }, [newEntryCategory, newEntryConfirmation])

  const handleAddFromHit = useCallback((hit: DiagnosisSearchHit) => {
    const slot = catalogueSystemToClient(hit.system)
    setEntries((prev) => [...prev, applyNewEntryClassification(createDiagnoseFromHit(hit, slot, prev))])
    setAdding(false)
    setSearchQuery('')
    setCollapsed(false)
  }, [applyNewEntryClassification])

  const handleAddFreeText = useCallback(() => {
    const text = searchQuery.trim()
    if (!text) return
    void createDiagnoseFreeText(text, '', activeSystem, entries).then((entry) => {
      setEntries((prev) => [...prev, applyNewEntryClassification(entry)])
      setAdding(false)
      setSearchQuery('')
      setCollapsed(false)
    })
  }, [searchQuery, activeSystem, entries, applyNewEntryClassification])

  const handleNewCategoryChange = useCallback((category: DiagnosisClinicalCategory) => {
    setNewEntryCategory(category)
    setNewEntryConfirmation((current) => {
      if (category === 'differential' || category === 'suspected' || category === 'rule_out') {
        return 'under_review'
      }
      if (category === 'historical') return 'anamnesis_only'
      if (category === 'remitted') return 'active'
      if (current === 'anamnesis_only' || current === 'under_review') return 'confirmed'
      return current
    })
  }, [])

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
        setEditingId(null)
        return prev.map((entry) => (entry.id === id ? updated : entry))
      })
    },
    [],
  )

  const handleDelete = useCallback((id: string, system: CodingSystem) => {
    setEntries((prev) => {
      const target = prev.find((entry) => entry.id === id)
      if (!target) return prev

      const cleared: DiagnoseEntry = {
        ...target,
        updatedAt: new Date().toISOString(),
        [system]: { code: '', label: '', overridden: false },
      }
      const stillHasContent =
        codingHasContent(cleared.icd10) ||
        codingHasContent(cleared.icd11) ||
        codingHasContent(cleared.dsm)

      if (!stillHasContent) {
        return prev.filter((entry) => entry.id !== id)
      }
      return prev.map((entry) => (entry.id === id ? cleared : entry))
    })
    setEditingId(null)
  }, [])

  const handleCategoryChange = useCallback((id: string, category: DiagnosisClinicalCategory) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? applyClinicianCategoryChange(entry, category) : entry,
      ),
    )
  }, [])

  const handleConfirmationChange = useCallback(
    (id: string, status: DiagnosisConfirmationStatus) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id ? applyClinicianConfirmationChange(entry, status) : entry,
        ),
      )
    },
    [],
  )

  const sortedEntries = useMemo(
    () =>
      sortDiagnosesForDisplay(
        entries.filter((entry) => codingHasContent(getActiveCoding(entry, activeSystem))),
      ),
    [entries, activeSystem],
  )

  const trimmedQuery = searchQuery.trim()
  const showFreeTextOption = trimmedQuery.length > 0

  const entryTitleRequests = useMemo(
    () => entries.map((entry) => buildDiagnosisTitleRequestFromEntry(entry, activeSystem, undefined, language)),
    [entries, activeSystem, language],
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
          lang: language,
        })
      }),
    [searchResults, language],
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
          {!readOnly ? (
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
          ) : null}
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
          {!readOnly ? (
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
          ) : null}
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
            {adding && !readOnly ? (
              <div className="diagnosen-widget__search">
                <div className="diagnosen-widget__add-classification">
                  <p className="diagnosen-widget__add-hint">{t('diagnosisClassificationAddHint')}</p>
                  <DiagnosisClassificationEditor
                    category={newEntryCategory}
                    confirmation={newEntryConfirmation}
                    onCategoryChange={handleNewCategoryChange}
                    onConfirmationChange={setNewEntryConfirmation}
                  />
                </div>
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
                              language,
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
              <table
                className={[
                  'diagnosen-table',
                  compact ? 'diagnosen-table--compact' : '',
                  readOnly && onOpenDiagnose ? 'diagnosen-table--navigable' : '',
                ].join(' ').trim()}
              >
                <caption className="visually-hidden">{t('diagnosenTitle')}</caption>
                <thead className="diagnosen-table__head">
                  <tr>
                    <th scope="col">{t('diagnosisTableColCode')}</th>
                    <th scope="col">{t('diagnosisTableColName')}</th>
                    <th scope="col">{t('diagnosisTableColStatus')}</th>
                    {readOnly ? null : (
                      <th scope="col" className="diagnosen-table__head-actions">
                        <span className="visually-hidden">{t('diagnosenEditEntry')}</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => {
                    const coding = getActiveCoding(entry, activeSystem)
                    const displayLabel =
                      entryDisplayTitles.get(entry.id)
                      ?? resolveDiagnosisLabelSync(
                        coding,
                        codingSystemToTitleVersion(activeSystem),
                        undefined,
                        language,
                      )
                    return (
                      <DiagnoseRow
                        key={entry.id}
                        entry={entry}
                        system={activeSystem}
                        displayLabel={displayLabel}
                        editing={editingId === entry.id}
                        readOnly={readOnly}
                        onNavigate={onOpenDiagnose}
                        onStartEdit={() => setEditingId(entry.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={(code, label) => handleSaveEdit(entry.id, activeSystem, code, label)}
                        onDelete={() => handleDelete(entry.id, activeSystem)}
                        onCategoryChange={(category) => handleCategoryChange(entry.id, category)}
                        onConfirmationChange={(status) => handleConfirmationChange(entry.id, status)}
                      />
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
