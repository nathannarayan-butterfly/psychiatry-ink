import { ArrowLeft, Download, FileUp, Link2, Plug, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { hasIntegrationCapability } from '../../data/org/planCapabilities'
import { useCurrentOrganisation } from '../../hooks/permissions'
import { isListedPatientCase, useCaseRegistry } from '../../hooks/useCaseRegistry'
import {
  buildExportPreview,
  exportAsFHIR,
  exportAsJSON,
  formatExportPreviewSummary,
  formatImportPreviewSummary,
  importFromCSV,
  importFromJSON,
  previewImportFile,
  type ExportScopeFlags,
  type IntegrationMergeScope,
} from '../../services/integrationService'
import {
  fetchIntegrationBatches,
  fetchIntegrationConnections,
  saveIntegrationConnection,
} from '../../services/integrationApi'
import type { CanonicalSnapshotCounts } from '../../utils/integration/canonicalScope'
import {
  DEFAULT_EXPORT_SCOPE,
  LABS_ONLY_EXPORT_SCOPE,
} from '../../utils/integration/canonicalScope'
import { formatCaseRef } from '../../utils/caseSearch'
import type { IntegrationBatchHistoryItem, IntegrationConnection } from '../../types/integration/integrationHub'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { IntegrationCasePicker } from './IntegrationCasePicker'
import '../../styles/integrations.css'

interface IntegrationsPageProps {
  onBack: () => void
}

type PendingImport = {
  file: File
  kind: 'json' | 'csv'
  counts: CanonicalSnapshotCounts
  sourceCaseId?: string
  summary: string
}

const EXPORT_SCOPE_KEYS: Array<{ key: keyof ExportScopeFlags; labelKey: UiTranslationKey }> = [
  { key: 'patientProfile', labelKey: 'integrationsScopePatient' },
  { key: 'diagnoses', labelKey: 'integrationsScopeDiagnoses' },
  { key: 'medicationPlan', labelKey: 'integrationsScopeMedication' },
  { key: 'labResults', labelKey: 'integrationsScopeLabs' },
  { key: 'clinicalCourse', labelKey: 'integrationsScopeCourse' },
  { key: 'documents', labelKey: 'integrationsScopeDocuments' },
  { key: 'therapy', labelKey: 'integrationsScopeTherapy' },
  { key: 'consultations', labelKey: 'integrationsScopeConsultations' },
]

const IMPORT_SCOPES: Array<{ value: IntegrationMergeScope; labelKey: UiTranslationKey }> = [
  { value: 'full', labelKey: 'integrationsImportScopeFull' },
  { value: 'labs_only', labelKey: 'integrationsImportScopeLabs' },
  { value: 'diagnoses_only', labelKey: 'integrationsImportScopeDiagnoses' },
  { value: 'medications_only', labelKey: 'integrationsImportScopeMedications' },
]

function batchStatusLabelDe(status: string): string {
  if (status === 'completed') return 'Abgeschlossen'
  if (status === 'failed') return 'Fehlgeschlagen'
  if (status === 'processing') return 'In Bearbeitung'
  if (status === 'pending') return 'Ausstehend'
  return status
}

export function IntegrationsPage({ onBack }: IntegrationsPageProps) {
  const { t } = useTranslation()
  const { organisation } = useCurrentOrganisation()
  const registry = useCaseRegistry({
    tier: 'local_only',
    countryCode: 'DE',
    caseFileCloudSync: false,
    documentTypeLabel: () => '',
    fallbackTitle: (id) => id,
  })
  const cases = useMemo(
    () => registry.cases.filter(isListedPatientCase),
    [registry.cases],
  )

  const tier = organisation?.tier ?? 'single_use'
  const canUseIntegrations = tier !== 'enterprise' && hasIntegrationCapability(tier, 'fileImportExport')
  const canUseFhir = tier !== 'enterprise' && hasIntegrationCapability(tier, 'fhir')

  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.caseId ?? '')
  const [exportScope, setExportScope] = useState<ExportScopeFlags>({ ...DEFAULT_EXPORT_SCOPE })
  const [labsOnlyExport, setLabsOnlyExport] = useState(false)
  const [importTargetCaseId, setImportTargetCaseId] = useState(cases[0]?.caseId ?? '')
  const [importScope, setImportScope] = useState<IntegrationMergeScope>('full')
  const [exportPreviewSummary, setExportPreviewSummary] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [batches, setBatches] = useState<IntegrationBatchHistoryItem[]>([])
  const [connections, setConnections] = useState<IntegrationConnection[]>([])
  const [fhirEndpoint, setFhirEndpoint] = useState('')
  const [fhirConnectionName, setFhirConnectionName] = useState('FHIR Endpoint')

  const selectedCase = cases.find((item) => item.caseId === selectedCaseId)
  const importTargetCase = cases.find((item) => item.caseId === importTargetCaseId)

  const effectiveExportScope = useMemo(
    () => (labsOnlyExport ? { ...LABS_ONLY_EXPORT_SCOPE } : exportScope),
    [exportScope, labsOnlyExport],
  )

  const refreshHistory = useCallback(async () => {
    if (!canUseIntegrations) return
    try {
      const [history, conns] = await Promise.all([
        fetchIntegrationBatches(30),
        canUseFhir ? fetchIntegrationConnections() : Promise.resolve([]),
      ])
      setBatches(history)
      setConnections(conns)
      const fhirConn = conns.find((c) => c.adapterType === 'fhir')
      if (fhirConn?.config?.endpoint && typeof fhirConn.config.endpoint === 'string') {
        setFhirEndpoint(fhirConn.config.endpoint)
        setFhirConnectionName(fhirConn.name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verlauf konnte nicht geladen werden')
    }
  }, [canUseFhir, canUseIntegrations])

  useEffect(() => {
    void refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    if (!selectedCaseId && cases[0]?.caseId) setSelectedCaseId(cases[0].caseId)
    if (!importTargetCaseId && cases[0]?.caseId) setImportTargetCaseId(cases[0].caseId)
  }, [cases, importTargetCaseId, selectedCaseId])

  useEffect(() => {
    if (!selectedCaseId) {
      setExportPreviewSummary(null)
      return
    }
    let cancelled = false
    void buildExportPreview(selectedCaseId, {
      displayTitle: selectedCase?.displayTitle,
      includePatientIdentity: effectiveExportScope.patientProfile,
      exportScope: effectiveExportScope,
    })
      .then(({ counts }) => {
        if (!cancelled) {
          setExportPreviewSummary(formatExportPreviewSummary(counts, effectiveExportScope))
        }
      })
      .catch(() => {
        if (!cancelled) setExportPreviewSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveExportScope, selectedCase?.displayTitle, selectedCaseId])

  const toggleExportScope = useCallback((key: keyof ExportScopeFlags) => {
    setLabsOnlyExport(false)
    setExportScope((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleLabsOnlyExportToggle = useCallback((checked: boolean) => {
    setLabsOnlyExport(checked)
    if (checked) setExportScope({ ...LABS_ONLY_EXPORT_SCOPE })
  }, [])

  const runExport = useCallback(
    async (format: 'json' | 'fhir') => {
      if (!selectedCaseId) {
        setError(t('integrationsSelectCase'))
        return
      }
      setBusy(true)
      setError(null)
      setMessage(null)
      try {
        const options = {
          includePatientIdentity: effectiveExportScope.patientProfile,
          displayTitle: selectedCase?.displayTitle,
          exportScope: effectiveExportScope,
        }
        if (format === 'fhir') {
          await exportAsFHIR(selectedCaseId, options)
        } else {
          await exportAsJSON(selectedCaseId, options)
        }
        setMessage(format === 'fhir' ? t('integrationsExportFhirDone') : t('integrationsExportJsonDone'))
        await refreshHistory()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('integrationsExportFailed'))
      } finally {
        setBusy(false)
      }
    },
    [effectiveExportScope, refreshHistory, selectedCase?.displayTitle, selectedCaseId, t],
  )

  const handleFileSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>, kind: 'json' | 'csv') => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file || !importTargetCaseId) return

      setBusy(true)
      setError(null)
      setMessage(null)
      try {
        const preview = await previewImportFile(file, kind, importTargetCaseId)
        setPendingImport({
          file,
          kind,
          counts: preview.counts,
          sourceCaseId: preview.sourceCaseId,
          summary: formatImportPreviewSummary(preview.counts),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : t('integrationsImportPreviewFailed'))
      } finally {
        setBusy(false)
      }
    },
    [importTargetCaseId, t],
  )

  const confirmImport = useCallback(async () => {
    if (!pendingImport || !importTargetCaseId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result =
        pendingImport.kind === 'csv'
          ? await importFromCSV(pendingImport.file, importTargetCaseId, { scope: importScope })
          : await importFromJSON(pendingImport.file, importTargetCaseId, { scope: importScope })
      setPendingImport(null)
      setMessage(
        t('integrationsImportDone')
          .replace('{filename}', pendingImport.file.name)
          .replace('{fields}', result.mergedFields.join(', ') || 'Metadaten'),
      )
      await refreshHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('integrationsImportFailed'))
    } finally {
      setBusy(false)
    }
  }, [importScope, importTargetCaseId, pendingImport, refreshHistory, t])

  const saveFhirConnection = useCallback(async () => {
    if (!canUseFhir) return
    setBusy(true)
    setError(null)
    try {
      const existing = connections.find((c) => c.adapterType === 'fhir')
      await saveIntegrationConnection({
        adapterType: 'fhir',
        name: fhirConnectionName.trim() || 'FHIR Endpoint',
        enabled: false,
        connectionId: existing?.id ?? null,
        config: {
          endpoint: fhirEndpoint.trim(),
          liveSync: false,
          note: 'Platzhalter — keine Live-Synchronisation',
        },
      })
      setMessage(t('integrationsFhirSaved'))
      await refreshHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('integrationsSaveFailed'))
    } finally {
      setBusy(false)
    }
  }, [canUseFhir, connections, fhirConnectionName, fhirEndpoint, refreshHistory, t])

  if (!canUseIntegrations) {
    return (
      <div className="integrations-page">
        <div className="integrations-page__scroll">
          <div className="integrations-page__inner">
            <button type="button" className="integrations-page__back" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Dashboard
            </button>
            <p className="integrations-page__note">{t('integrationsUnavailable')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="integrations-page">
      <div className="integrations-page__scroll">
        <div className="integrations-page__inner">
          <header className="integrations-page__header">
            <button type="button" className="integrations-page__back" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Dashboard
            </button>
            <div>
              <h1 className="integrations-page__title">{t('integrationsTitle')}</h1>
              <p className="integrations-page__subtitle">{t('integrationsSubtitle')}</p>
            </div>
          </header>

          {busy ? <ClinicalLoading label={t('integrationsProcessing')} /> : null}
          {message ? (
            <p className="integrations-page__status integrations-page__status--ok" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="integrations-page__status integrations-page__status--error" role="alert">
              {error}
            </p>
          ) : null}

          <section className="integrations-card" aria-labelledby="integrations-export-heading">
            <h2 id="integrations-export-heading" className="integrations-card__title">
              <Download className="h-4 w-4" aria-hidden />
              {t('integrationsExportHeading')}
            </h2>
            <p className="integrations-card__hint">{t('integrationsExportHint')}</p>

            <IntegrationCasePicker
              id="integrations-export-case"
              cases={cases}
              value={selectedCaseId}
              onChange={setSelectedCaseId}
              label={t('integrationsCaseLabel')}
              searchPlaceholder={t('integrationsSearchCase')}
              noResultsLabel={t('integrationsSearchNoResults')}
            />

            {selectedCase ? (
              <p className="integrations-target-banner">
                {t('integrationsExportTarget').replace('{ref}', formatCaseRef(selectedCase))}
              </p>
            ) : null}

            <fieldset className="integrations-scope" disabled={labsOnlyExport}>
              <legend className="integrations-scope__legend">{t('integrationsExportScopeLegend')}</legend>
              <div className="integrations-scope__grid">
                {EXPORT_SCOPE_KEYS.map(({ key, labelKey }) => (
                  <label key={key} className="integrations-checkbox">
                    <input
                      type="checkbox"
                      checked={effectiveExportScope[key]}
                      onChange={() => toggleExportScope(key)}
                      disabled={labsOnlyExport && key !== 'labResults'}
                    />
                    <span>{t(labelKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="integrations-checkbox integrations-checkbox--emphasis">
              <input
                type="checkbox"
                checked={labsOnlyExport}
                onChange={(event) => handleLabsOnlyExportToggle(event.target.checked)}
              />
              <span>{t('integrationsExportLabsOnly')}</span>
            </label>

            {exportPreviewSummary ? (
              <p className="integrations-preview" role="status">
                {exportPreviewSummary}
              </p>
            ) : null}

            <div className="integrations-actions">
              <button type="button" className="integrations-button" disabled={busy} onClick={() => void runExport('json')}>
                {t('integrationsDownloadJson')}
              </button>
              {canUseFhir ? (
                <button
                  type="button"
                  className="integrations-button integrations-button--secondary"
                  disabled={busy}
                  onClick={() => void runExport('fhir')}
                >
                  {t('integrationsDownloadFhir')}
                </button>
              ) : null}
            </div>
          </section>

          <section className="integrations-card" aria-labelledby="integrations-import-heading">
            <h2 id="integrations-import-heading" className="integrations-card__title">
              <FileUp className="h-4 w-4" aria-hidden />
              {t('integrationsImportHeading')}
            </h2>

            <IntegrationCasePicker
              id="integrations-import-case"
              cases={cases}
              value={importTargetCaseId}
              onChange={(caseId) => {
                setImportTargetCaseId(caseId)
                setPendingImport(null)
              }}
              label={t('integrationsTargetCaseLabel')}
              searchPlaceholder={t('integrationsSearchPatient')}
              noResultsLabel={t('integrationsSearchNoResults')}
            />

            {importTargetCase ? (
              <p className="integrations-target-banner integrations-target-banner--import">
                {t('integrationsImportTarget').replace('{ref}', formatCaseRef(importTargetCase))}
              </p>
            ) : null}

            <fieldset className="integrations-scope">
              <legend className="integrations-scope__legend">{t('integrationsImportScopeLegend')}</legend>
              <div className="integrations-scope__radios">
                {IMPORT_SCOPES.map(({ value, labelKey }) => (
                  <label key={value} className="integrations-radio">
                    <input
                      type="radio"
                      name="import-scope"
                      value={value}
                      checked={importScope === value}
                      onChange={() => setImportScope(value)}
                    />
                    <span>{t(labelKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {pendingImport ? (
              <div className="integrations-import-preview" role="region" aria-label={t('integrationsImportPreviewLegend')}>
                <p className="integrations-import-preview__file">
                  <strong>{pendingImport.file.name}</strong>
                </p>
                <p className="integrations-preview">{pendingImport.summary}</p>
                {pendingImport.sourceCaseId ? (
                  <p className="integrations-import-preview__warn" role="alert">
                    {t('integrationsImportMismatch').replace('{sourceId}', pendingImport.sourceCaseId.slice(0, 8))}
                  </p>
                ) : null}
                <div className="integrations-actions">
                  <button type="button" className="integrations-button" disabled={busy} onClick={() => void confirmImport()}>
                    {t('integrationsConfirmImport')}
                  </button>
                  <button
                    type="button"
                    className="integrations-button integrations-button--ghost"
                    disabled={busy}
                    onClick={() => setPendingImport(null)}
                  >
                    {t('integrationsCancelImport')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="integrations-actions">
                <label className="integrations-button integrations-button--ghost">
                  {t('integrationsSelectJson')}
                  <input type="file" accept=".json,application/json" hidden onChange={(event) => void handleFileSelected(event, 'json')} />
                </label>
                <label className="integrations-button integrations-button--ghost">
                  {t('integrationsSelectCsv')}
                  <input type="file" accept=".csv,text/csv" hidden onChange={(event) => void handleFileSelected(event, 'csv')} />
                </label>
              </div>
            )}
          </section>

          {canUseFhir ? (
            <section className="integrations-card" aria-labelledby="integrations-fhir-heading">
              <h2 id="integrations-fhir-heading" className="integrations-card__title">
                <Plug className="h-4 w-4" aria-hidden />
                {t('integrationsFhirHeading')}
              </h2>
              <p className="integrations-card__hint">{t('integrationsFhirHint')}</p>
              <label className="integrations-field">
                <span className="integrations-field__label">{t('integrationsFhirName')}</span>
                <input
                  className="integrations-field__input"
                  value={fhirConnectionName}
                  onChange={(event) => setFhirConnectionName(event.target.value)}
                />
              </label>
              <label className="integrations-field">
                <span className="integrations-field__label">{t('integrationsFhirEndpoint')}</span>
                <input
                  className="integrations-field__input"
                  value={fhirEndpoint}
                  onChange={(event) => setFhirEndpoint(event.target.value)}
                  placeholder="https://example.org/fhir"
                />
              </label>
              <button type="button" className="integrations-button" disabled={busy} onClick={() => void saveFhirConnection()}>
                {t('integrationsFhirSave')}
              </button>
            </section>
          ) : null}

          <section className="integrations-card" aria-labelledby="integrations-mapping-heading">
            <h2 id="integrations-mapping-heading" className="integrations-card__title">
              <Link2 className="h-4 w-4" aria-hidden />
              {t('integrationsMappingHeading')}
            </h2>
            <p className="integrations-card__hint">{t('integrationsMappingHint')}</p>
          </section>

          <section className="integrations-card" aria-labelledby="integrations-history-heading">
            <div className="integrations-card__title-row">
              <h2 id="integrations-history-heading" className="integrations-card__title">
                {t('integrationsHistoryHeading')}
              </h2>
              <button type="button" className="integrations-icon-button" onClick={() => void refreshHistory()} aria-label={t('integrationsRefreshHistory')}>
                <RefreshCw className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {batches.length === 0 ? (
              <p className="integrations-card__hint">{t('integrationsHistoryEmpty')}</p>
            ) : (
              <ul className="integrations-history">
                {batches.map((item) => (
                  <li key={`${item.kind}-${item.batch.id}`} className="integrations-history__row">
                    <span className="integrations-history__kind">{item.kind === 'import' ? 'Import' : 'Export'}</span>
                    <span className="integrations-history__meta">
                      {item.batch.adapterType}
                      {'filename' in item.batch && item.batch.filename ? ` · ${item.batch.filename}` : ''}
                      {'caseId' in item.batch && item.batch.caseId ? ` · Fall ${item.batch.caseId.slice(0, 8)}…` : ''}
                    </span>
                    <span className="integrations-history__status">{batchStatusLabelDe(item.batch.status)}</span>
                    <span className="integrations-history__date">
                      {formatSiteLocaleDate(item.batch.createdAt, 'de')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
