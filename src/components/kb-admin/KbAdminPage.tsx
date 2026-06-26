import { AlertTriangle, Archive, Check, CheckCircle, Eye, FlaskConical, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCopyWithFeedback } from '../../hooks/useCopyWithFeedback'
import { PSYCHIATRIC_DRUG_CATEGORIES } from '../../data/kb/psychiatric-drug-seed-list'
import { useKnowledgeBaseUserProfile } from '../../hooks/useKnowledgeBaseUserId'
import {
  approveAllKbSubstances,
  approveKbSubstance,
  archiveKbSubstance,
  fetchKbAdminStatus,
  fetchKbAdminSubstance,
  fetchKbAdminSubstances,
  patchKbAdminSubstance,
  publishKbSubstance,
  type KbBulkPublishSummary,
} from '../../services/kbAdminApi'
import { fetchKbAdminContributions } from '../../services/kbContributionsApi'
import type { KbContribution } from '../../types/kbContributions'
import type { KbSubstance, KbSubstanceDetail } from '../../types/kbNormalized'
import { useTranslation } from '../../context/TranslationContext'
import { formatAdminUiTemplate, translateAdminUi } from '../../data/adminUiTranslations'
import type { UiLanguage } from '../../types/settings'
import { KbAdminDiscussionsPanel } from './KbAdminDiscussionsPanel'

interface KbAdminPageProps {
  onBack: () => void
}

type BadgeVariant = 'draft' | 'unreviewed' | 'review' | 'source' | 'receptor' | 'monitoring' | 'error'

function KbBadge({ variant, label, title }: { variant: BadgeVariant; label: string; title?: string }) {
  return (
    <span className={`kb-admin-badge kb-admin-badge--${variant}`} title={title ?? label}>
      {variant === 'draft' && <AlertTriangle size={12} aria-hidden />}
      {variant === 'unreviewed' && <Eye size={12} aria-hidden />}
      {variant === 'review' && <ShieldAlert size={12} aria-hidden />}
      {variant === 'source' && <ShieldAlert size={12} aria-hidden />}
      {variant === 'receptor' && <FlaskConical size={12} aria-hidden />}
      {variant === 'monitoring' && <FlaskConical size={12} aria-hidden />}
      {variant === 'error' && <AlertTriangle size={12} aria-hidden />}
      {label}
    </span>
  )
}

function substanceBadges(language: UiLanguage, s: KbSubstance, detail?: KbSubstanceDetail | null) {
  const badges: Array<{ variant: BadgeVariant; label: string; title?: string }> = []
  if (s.status === 'ai_draft') {
    badges.push({
      variant: 'draft',
      label: translateAdminUi(language, 'kbBadgeAiDraft'),
      title: translateAdminUi(language, 'kbBadgeNotReviewedTitle'),
    })
  }
  if (s.reviewStatus === 'unreviewed') {
    badges.push({ variant: 'unreviewed', label: translateAdminUi(language, 'kbBadgeUnreviewed') })
  }
  if (s.needsClinicalReview) {
    badges.push({ variant: 'review', label: translateAdminUi(language, 'kbBadgeNeedsReview') })
  }
  if (s.sourceQuality === 'ai_generated_unverified' || s.sourceQuality === 'ai_generated_partial') {
    badges.push({
      variant: 'source',
      label: translateAdminUi(language, 'kbBadgeMissingSource'),
      title: `source_quality: ${s.sourceQuality}`,
    })
  }
  if (detail) {
    if (!detail.receptorAffinities.length) {
      badges.push({ variant: 'receptor', label: translateAdminUi(language, 'kbBadgeMissingReceptor') })
    }
    if (!detail.monitoring.length) {
      badges.push({ variant: 'monitoring', label: translateAdminUi(language, 'kbBadgeMissingMonitoring') })
    }
    if (detail.latestGeneration?.status === 'failed_validation') {
      badges.push({ variant: 'error', label: translateAdminUi(language, 'kbValidationErrors') })
    }
  }
  return badges
}

export function KbAdminPage({ onBack }: KbAdminPageProps) {
  const { language } = useTranslation()
  const { copied: rerunCopied, copy: copyRerunCli } = useCopyWithFeedback()
  const { userId, displayName } = useKnowledgeBaseUserProfile()
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [substances, setSubstances] = useState<KbSubstance[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedContributionId, setSelectedContributionId] = useState<string | null>(null)
  const [detail, setDetail] = useState<KbSubstanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const [editMechanism, setEditMechanism] = useState('')
  const [editPearls, setEditPearls] = useState('')
  const [showRawAi, setShowRawAi] = useState(true)
  const [publishNotice, setPublishNotice] = useState<string | null>(null)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkSummary, setBulkSummary] = useState<KbBulkPublishSummary | null>(null)
  const [adminTab, setAdminTab] = useState<'substances' | 'contributions'>('substances')
  const [contributions, setContributions] = useState<KbContribution[]>([])
  const [contributionsLoading, setContributionsLoading] = useState(false)

  const approvableSubstances = useMemo(() => {
    const unpublished = substances.filter((s) => s.status !== 'published' && s.status !== 'archived')
    if (!statusFilter) {
      return unpublished.filter((s) => s.status === 'ai_draft' && s.reviewStatus === 'unreviewed')
    }
    return unpublished
  }, [substances, statusFilter])

  const selectedContribution = useMemo(
    () => contributions.find((entry) => entry.id === selectedContributionId) ?? null,
    [contributions, selectedContributionId],
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchKbAdminSubstances(userId, {
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      })
      setSubstances(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, userId])

  const loadDetail = useCallback(async (id: string) => {
    try {
      const d = await fetchKbAdminSubstance(userId, id)
      setDetail(d)
      setEditMechanism(d.mechanismSummary ?? '')
      setEditPearls(d.clinicalPearls ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [userId])

  const handleApproveAll = useCallback(async () => {
    const count = approvableSubstances.length
    if (count === 0 || bulkRunning) return
    const confirmed = window.confirm(formatAdminUiTemplate(language, 'kbConfirmApproveAll', { count }))
    if (!confirmed) return

    setBulkRunning(true)
    setBulkSummary(null)
    setError(null)
    try {
      const summary = await approveAllKbSubstances(userId, {
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      })
      setBulkSummary(summary)
      await loadList()
      if (selectedId) await loadDetail(selectedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBulkRunning(false)
    }
  }, [approvableSubstances.length, bulkRunning, statusFilter, categoryFilter, loadList, loadDetail, selectedId, userId, language])

  const loadContributions = useCallback(async () => {
    setContributionsLoading(true)
    try {
      const list = await fetchKbAdminContributions(userId, 'pending')
      setContributions(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setContributionsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchKbAdminStatus()
      .then((s) => setApiReady(s.enabled && s.supabaseConfigured))
      .catch(() => setApiReady(false))
  }, [])

  useEffect(() => {
    if (!apiReady) return
    void loadList()
    void loadContributions()
  }, [apiReady, loadList, loadContributions])

  useEffect(() => {
    if (selectedId) {
      setPublishNotice(null)
      void loadDetail(selectedId)
    } else setDetail(null)
  }, [selectedId, loadDetail])

  const rerunCli = useMemo(() => {
    if (!detail) return ''
    return `npm run kb:seed:psychiatric-drugs -- --drug=${detail.genericName} --dry-run=false --rerun`
  }, [detail])

  const listBadgeCache = useMemo(() => {
    const map = new Map<string, ReturnType<typeof substanceBadges>>()
    for (const s of substances) {
      map.set(s.id, substanceBadges(language, s))
    }
    return map
  }, [substances, language])

  return (
    <div className="kb-admin-page">
      <header className="kb-admin-header">
        <button type="button" className="kb-admin-back" onClick={onBack}>← {translateAdminUi(language, 'adminBackDashboard')}</button>
        <div>
          <h1><FlaskConical size={22} aria-hidden /> {translateAdminUi(language, 'kbHeaderTitle')}</h1>
          <p className="kb-admin-sub">
            {translateAdminUi(language, 'kbHeaderIntroBeforeCode')}<code>kb_substances</code>{translateAdminUi(language, 'kbHeaderIntroAfterCode')}
          </p>
        </div>
      </header>

      {!apiReady && (
        <div className="kb-admin-alert">
          {translateAdminUi(language, 'kbApiNotReadyBeforeCode')} <code>npm run dev:server</code> {translateAdminUi(language, 'kbApiNotReadyBetweenCode')}
          {' '}<code>SUPABASE_SERVICE_ROLE_KEY</code> {translateAdminUi(language, 'kbApiNotReadyAfterCode')}
        </div>
      )}

      {error && <div className="kb-admin-alert kb-admin-alert--error">{error}</div>}

      <div className="kb-admin-body">
        <div className="kb-admin-tabs">
          <button
            type="button"
            className={adminTab === 'substances' ? 'kb-admin-tab kb-admin-tab--active' : 'kb-admin-tab'}
            onClick={() => {
              setAdminTab('substances')
              setSelectedContributionId(null)
            }}
          >
            {translateAdminUi(language, 'kbTabSubstances')}
          </button>
          <button
            type="button"
            className={adminTab === 'contributions' ? 'kb-admin-tab kb-admin-tab--active' : 'kb-admin-tab'}
            onClick={() => {
              setAdminTab('contributions')
              setSelectedId(null)
              setDetail(null)
            }}
          >
            {translateAdminUi(language, 'kbTabContributions')}
            {contributions.length > 0 && (
              <span className="kb-admin-tab__count">{contributions.length}</span>
            )}
          </button>
        </div>

        <div className="kb-admin-layout">
          <aside className="kb-admin-list">
            {adminTab === 'contributions' ? (
              <>
                <div className="kb-admin-filters">
                  <button type="button" onClick={() => void loadContributions()} disabled={contributionsLoading}>
                    <RefreshCw size={14} /> {translateAdminUi(language, 'adminRefresh')}
                  </button>
                </div>
                {contributionsLoading ? (
                  <p>{translateAdminUi(language, 'adminLoading')}</p>
                ) : contributions.length === 0 ? (
                  <p className="kb-admin-sub">{translateAdminUi(language, 'kbNoPendingContributions')}</p>
                ) : (
                  <ul className="kb-admin-list-items">
                    {contributions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={selectedContributionId === c.id ? 'is-active' : ''}
                          onClick={() => {
                            setSelectedContributionId(c.id)
                            if (c.substanceId) {
                              setSelectedId(c.substanceId)
                              void loadDetail(c.substanceId)
                            } else {
                              setSelectedId(null)
                              setDetail(null)
                            }
                          }}
                        >
                          <strong>{c.contributionType}</strong>
                          <span>{c.submitterDisplayName ?? translateAdminUi(language, 'kbAnonymous')}</span>
                          <div className="kb-admin-badge-row">
                            <span className="kb-admin-badge kb-admin-badge--unreviewed">{c.status}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <div className="kb-admin-filters">
            <label>
              {translateAdminUi(language, 'kbStatus')}
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{translateAdminUi(language, 'kbStatusAll')}</option>
                <option value="ai_draft">ai_draft</option>
                <option value="reviewed">reviewed</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label>
              {translateAdminUi(language, 'kbCategory')}
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">{translateAdminUi(language, 'kbCategoryAll')}</option>
                {PSYCHIATRIC_DRUG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void loadList()} disabled={bulkRunning}>
              <RefreshCw size={14} /> {translateAdminUi(language, 'adminRefresh')}
            </button>
            {approvableSubstances.length > 0 && (
              <button
                type="button"
                className="kb-admin-approve-all"
                disabled={bulkRunning || !apiReady}
                onClick={() => void handleApproveAll()}
              >
                <CheckCircle size={14} />
                {bulkRunning
                  ? translateAdminUi(language, 'kbPublishing')
                  : `${translateAdminUi(language, 'kbApproveAll')} (${approvableSubstances.length})`}
              </button>
            )}
          </div>

          {bulkSummary && (
            <div className="kb-admin-bulk-summary">
              <strong>{translateAdminUi(language, 'kbBulkComplete')}</strong>
              <ul>
                <li>{bulkSummary.succeeded.length} {translateAdminUi(language, 'kbBulkPublished')}</li>
                <li>{bulkSummary.skipped.length} {translateAdminUi(language, 'kbBulkSkipped')}</li>
                <li>{bulkSummary.failed.length} {translateAdminUi(language, 'kbBulkFailed')}</li>
              </ul>
              {bulkSummary.failed.length > 0 && (
                <details>
                  <summary>{translateAdminUi(language, 'kbFailedProfiles')}</summary>
                  <ul>
                    {bulkSummary.failed.map((f) => (
                      <li key={f.id}>{f.genericName}: {f.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {loading ? <p>{translateAdminUi(language, 'adminLoading')}</p> : (
            <ul className="kb-admin-list-items">
              {substances.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={selectedId === s.id ? 'is-active' : ''}
                    onClick={() => {
                      setSelectedId(s.id)
                      setSelectedContributionId(null)
                    }}
                  >
                    <strong>{s.genericName}</strong>
                    <span>{s.category}</span>
                    <div className="kb-admin-badge-row">
                      {listBadgeCache.get(s.id)?.map((b) => (
                        <KbBadge key={b.label} variant={b.variant} label={b.label} title={b.title} />
                      ))}
                    </div>
                  </button>
                </li>
              ))}
              {substances.length === 0 && <li className="kb-admin-empty">{translateAdminUi(language, 'kbNoEntries')}</li>}
            </ul>
          )}
              </>
            )}
        </aside>

        <main className="kb-admin-detail">
          {adminTab === 'contributions' && selectedContribution ? (
            <>
              <div className="kb-admin-detail-header">
                <h2>{selectedContribution.contributionType}</h2>
                <div className="kb-admin-badge-row">
                  <KbBadge variant="unreviewed" label={selectedContribution.status} />
                </div>
              </div>
              <section className="kb-admin-section">
                <h3>{translateAdminUi(language, 'kbSubmission')}</h3>
                <dl className="kb-admin-dl">
                  <dt>{translateAdminUi(language, 'kbSubmitter')}</dt>
                  <dd>{selectedContribution.submitterDisplayName ?? '—'}</dd>
                  <dt>{translateAdminUi(language, 'kbCreated')}</dt>
                  <dd>{selectedContribution.createdAt}</dd>
                  <dt>{translateAdminUi(language, 'kbSubstance')}</dt>
                  <dd>{selectedContribution.substanceId ?? '—'}</dd>
                </dl>
                <pre className="kb-admin-payload">{JSON.stringify(selectedContribution.payload, null, 2)}</pre>
              </section>
            </>
          ) : !detail ? (
            <p className="kb-admin-empty">{translateAdminUi(language, 'kbSelectProfile')}</p>
          ) : (
            <>
              <div className="kb-admin-detail-header">
                <h2>{detail.genericName}</h2>
                <div className="kb-admin-badge-row">
                  {substanceBadges(language, detail, detail).map((b) => (
                    <KbBadge key={b.label} variant={b.variant} label={b.label} title={b.title} />
                  ))}
                </div>
                <div className="kb-admin-actions">
                  <button type="button" onClick={() => void approveKbSubstance(userId, detail.id).then(() => loadDetail(detail.id))}>
                    <CheckCircle size={14} /> {translateAdminUi(language, 'kbApprove')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void publishKbSubstance(userId, detail.id)
                        .then((result) => {
                          setPublishNotice(
                            formatAdminUiTemplate(language, 'kbPublishedNotice', {
                              id: result.projectedDrugId,
                            }),
                          )
                          return loadDetail(detail.id)
                        })
                        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
                    }
                  >
                    {translateAdminUi(language, 'kbPublish')}
                  </button>
                  <button type="button" onClick={() => void archiveKbSubstance(userId, detail.id).then(() => loadDetail(detail.id))}>
                    <Archive size={14} /> {translateAdminUi(language, 'kbArchive')}
                  </button>
                  <button
                    type="button"
                    title={translateAdminUi(language, 'kbRerunTitle')}
                    onClick={() => {
                      void copyRerunCli(rerunCli)
                      setError(null)
                    }}
                  >
                    {rerunCopied ? <Check size={14} /> : <RotateCcw size={14} />}{' '}
                    {translateAdminUi(language, rerunCopied ? 'kbRerunCopied' : 'kbRerunButton')}
                  </button>
                </div>
              </div>

              <p className="kb-admin-cli-hint">
                {translateAdminUi(language, 'kbRerunHint')} <code>{rerunCli}</code>
              </p>

              {publishNotice && (
                <div className="kb-admin-alert" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  {publishNotice}
                </div>
              )}

              {substanceBadges(language, detail, detail).some((b) => b.variant === 'receptor' || b.variant === 'monitoring' || b.variant === 'error') && (
                <div className="kb-admin-gaps">
                  <strong>{translateAdminUi(language, 'kbDataGaps')}</strong>{' '}
                  {substanceBadges(language, detail, detail)
                    .filter((b) => ['receptor', 'monitoring', 'error', 'source'].includes(b.variant))
                    .map((b) => b.label)
                    .join(' · ')}
                </div>
              )}

              <section className="kb-admin-section">
                <h3>{translateAdminUi(language, 'kbNormalizedProfile')}</h3>
                <dl className="kb-admin-dl">
                  <dt>{translateAdminUi(language, 'kbClass')}</dt><dd>{detail.substanceClass ?? '—'}</dd>
                  <dt>{translateAdminUi(language, 'kbStatus')}</dt><dd>{detail.status} / {detail.reviewStatus}</dd>
                  <dt>{translateAdminUi(language, 'kbSourceQuality')}</dt><dd>{detail.sourceQuality}</dd>
                  <dt>{translateAdminUi(language, 'kbUses')}</dt><dd>{detail.primaryPsychiatricUses.join(', ') || '—'}</dd>
                </dl>
              </section>

              {detail.tradeNames.length > 0 && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbTradeNames')} ({detail.tradeNames.length})</h3>
                  <ul className="kb-admin-chip-list">
                    {detail.tradeNames.map((t) => (
                      <li key={t.id}>
                        {t.tradeName}
                        {t.countryCode ? ` (${t.countryCode})` : ''}
                        {t.isPrimary ? ` · ${translateAdminUi(language, 'kbPrimary')}` : ''}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail.receptorAffinities.length > 0 && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbReceptorProfile')} ({detail.receptorAffinities.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>{translateAdminUi(language, 'kbReceptor')}</th>
                        <th>{translateAdminUi(language, 'kbAffinityPercent')}</th>
                        <th>{translateAdminUi(language, 'kbEffect')}</th>
                        <th>{translateAdminUi(language, 'kbConfidence')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.receptorAffinities.map((r) => (
                        <tr key={r.id}>
                          <td>{r.receptor}</td>
                          <td>{r.affinityPercent ?? '—'}</td>
                          <td>{r.effectType}</td>
                          <td>{r.confidence}{r.isEstimated ? ' (est.)' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {detail.sideEffects.length > 0 && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbSideEffects')} ({detail.sideEffects.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>{translateAdminUi(language, 'kbEffect')}</th>
                        <th>{translateAdminUi(language, 'kbSystem')}</th>
                        <th>{translateAdminUi(language, 'kbFrequency')}</th>
                        <th>{translateAdminUi(language, 'kbSeverity')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.sideEffects.map((s) => (
                        <tr key={s.id} className={s.isSevereRisk ? 'kb-admin-row--severe' : undefined}>
                          <td>{s.effect}{s.isSevereRisk ? ' ⚠' : ''}</td>
                          <td>{s.system ?? '—'}</td>
                          <td>{s.frequency}</td>
                          <td>{s.severity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {detail.dosageGuidance.length > 0 && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbDosage')} ({detail.dosageGuidance.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>{translateAdminUi(language, 'kbPopulation')}</th>
                        <th>{translateAdminUi(language, 'kbStartDose')}</th>
                        <th>{translateAdminUi(language, 'kbTargetDose')}</th>
                        <th>Max</th>
                        <th>{translateAdminUi(language, 'kbNotes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.dosageGuidance.map((d) => (
                        <tr key={d.id}>
                          <td>{d.population}</td>
                          <td>{d.startDose ?? '—'}</td>
                          <td>{d.targetDose ?? '—'}</td>
                          <td>{d.maxDose ?? '—'}</td>
                          <td>{[d.titrationNotes, d.administrationNotes].filter(Boolean).join(' · ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {detail.monitoring.length > 0 && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbMonitoring')} ({detail.monitoring.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>{translateAdminUi(language, 'kbParameter')}</th>
                        <th>{translateAdminUi(language, 'kbInterval')}</th>
                        <th>{translateAdminUi(language, 'kbPriority')}</th>
                        <th>{translateAdminUi(language, 'kbRationale')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.monitoring.map((m) => (
                        <tr key={m.id}>
                          <td>{m.parameter}</td>
                          <td>{m.intervalText ?? '—'}</td>
                          <td>{m.priority}</td>
                          <td>{m.rationale ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {detail.interactions.length > 0 && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbInteractions')} ({detail.interactions.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>{translateAdminUi(language, 'kbInteractsWith')}</th>
                        <th>{translateAdminUi(language, 'kbSeverity')}</th>
                        <th>{translateAdminUi(language, 'kbMechanism')}</th>
                        <th>{translateAdminUi(language, 'kbManagement')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.interactions.map((ix) => (
                        <tr key={ix.id}>
                          <td>{ix.interactsWith}</td>
                          <td>{ix.severity}</td>
                          <td>{ix.mechanism ?? '—'}</td>
                          <td>{ix.clinicalManagement ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <section className="kb-admin-section">
                <h3>{translateAdminUi(language, 'kbSourcesEvidence')} ({detail.sources.length})</h3>
                {detail.sources.length > 0 ? (
                  <ul className="kb-admin-bullet-list">
                    {detail.sources.map((s) => (
                      <li key={s.id}>
                        {s.citation}
                        {s.url ? (
                          <>
                            {' '}
                            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="kb-admin-empty">{translateAdminUi(language, 'kbNoSources')}</p>
                )}
              </section>

              {(detail.contraindications.length > 0 || detail.severeRisks.length > 0) && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbContraAndRisks')}</h3>
                  {detail.contraindications.length > 0 && (
                    <>
                      <h4 className="kb-admin-subheading">{translateAdminUi(language, 'kbContraindications')}</h4>
                      <ul className="kb-admin-bullet-list">
                        {detail.contraindications.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                    </>
                  )}
                  {detail.severeRisks.length > 0 && (
                    <>
                      <h4 className="kb-admin-subheading">{translateAdminUi(language, 'kbSevereRisks')}</h4>
                      <ul className="kb-admin-bullet-list">
                        {detail.severeRisks.map((r) => <li key={r}>{r}</li>)}
                      </ul>
                    </>
                  )}
                </section>
              )}

              {(detail.pregnancyLactationCaution || detail.geriatricCaution || detail.hepaticRenalCaution) && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbCautions')}</h3>
                  <dl className="kb-admin-dl">
                    {detail.pregnancyLactationCaution && (
                      <><dt>{translateAdminUi(language, 'kbPregnancyLactation')}</dt><dd>{detail.pregnancyLactationCaution}</dd></>
                    )}
                    {detail.geriatricCaution && (
                      <><dt>{translateAdminUi(language, 'kbGeriatric')}</dt><dd>{detail.geriatricCaution}</dd></>
                    )}
                    {detail.hepaticRenalCaution && (
                      <><dt>{translateAdminUi(language, 'kbHepaticRenal')}</dt><dd>{detail.hepaticRenalCaution}</dd></>
                    )}
                  </dl>
                </section>
              )}

              {(detail.mechanismSummary || detail.pharmacodynamicProfile) && (
                <section className="kb-admin-section">
                  <h3>{translateAdminUi(language, 'kbMechanismOfAction')}</h3>
                  {detail.mechanismSummary && <p className="kb-admin-prose">{detail.mechanismSummary}</p>}
                  {detail.pharmacodynamicProfile && (
                    <p className="kb-admin-prose kb-admin-prose--muted">{detail.pharmacodynamicProfile}</p>
                  )}
                </section>
              )}

              <section className="kb-admin-section">
                <h3>{translateAdminUi(language, 'kbEditFields')}</h3>
                <label>
                  {translateAdminUi(language, 'kbMechanismOfAction')}
                  <textarea value={editMechanism} onChange={(e) => setEditMechanism(e.target.value)} rows={4} />
                </label>
                <label>
                  {translateAdminUi(language, 'kbClinicalPearls')}
                  <textarea value={editPearls} onChange={(e) => setEditPearls(e.target.value)} rows={3} />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    void patchKbAdminSubstance(userId, detail.id, {
                      mechanismSummary: editMechanism,
                      clinicalPearls: editPearls,
                    }).then(() => loadDetail(detail.id))
                  }
                >
                  {translateAdminUi(language, 'kbSave')}
                </button>
              </section>

              <section className="kb-admin-section">
                <h3>
                  {translateAdminUi(language, 'kbRawVsNormalized')}
                  <button type="button" className="kb-admin-toggle" onClick={() => setShowRawAi((v) => !v)}>
                    {showRawAi
                      ? translateAdminUi(language, 'kbHideRawOutput')
                      : translateAdminUi(language, 'kbShowRawOutput')}
                  </button>
                </h3>
                {detail.latestGeneration ? (
                  <dl className="kb-admin-dl">
                    <dt>{translateAdminUi(language, 'kbGeneration')}</dt>
                    <dd>{detail.latestGeneration.provider} / {detail.latestGeneration.model} — {detail.latestGeneration.status}</dd>
                    <dt>{translateAdminUi(language, 'kbCreated')}</dt>
                    <dd>{detail.latestGeneration.createdAt}</dd>
                  </dl>
                ) : (
                  <p className="kb-admin-empty">{translateAdminUi(language, 'kbNoGeneration')}</p>
                )}
                {showRawAi && (
                  <div className="kb-admin-compare">
                    <div>
                      <h4>{translateAdminUi(language, 'kbRawAiResponse')}</h4>
                      <pre>{JSON.stringify(detail.latestGeneration?.rawResponse ?? null, null, 2)}</pre>
                    </div>
                    <div>
                      <h4>{translateAdminUi(language, 'kbValidatedPayload')}</h4>
                      <pre>{JSON.stringify(detail.latestGeneration?.validatedPayload ?? detail, null, 2)}</pre>
                    </div>
                  </div>
                )}
                {detail.latestGeneration?.validationErrors != null ? (
                  <div className="kb-admin-alert kb-admin-alert--error">
                    <strong>{translateAdminUi(language, 'kbValidationErrors')}</strong>
                    <pre>{JSON.stringify(detail.latestGeneration.validationErrors, null, 2)}</pre>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </main>

        <KbAdminDiscussionsPanel
          userId={userId}
          displayName={displayName}
          contribution={adminTab === 'contributions' ? selectedContribution : null}
          substanceId={selectedId}
          onContributionUpdated={() => void loadContributions()}
        />
      </div>
      </div>
    </div>
  )
}
