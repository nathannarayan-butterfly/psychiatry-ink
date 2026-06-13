import { AlertTriangle, Archive, CheckCircle, Eye, FlaskConical, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PSYCHIATRIC_DRUG_CATEGORIES } from '../../data/kb/psychiatric-drug-seed-list'
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
import type { KbSubstance, KbSubstanceDetail } from '../../types/kbNormalized'

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

function substanceBadges(s: KbSubstance, detail?: KbSubstanceDetail | null) {
  const badges: Array<{ variant: BadgeVariant; label: string; title?: string }> = []
  if (s.status === 'ai_draft') {
    badges.push({ variant: 'draft', label: 'AI draft', title: 'Not clinically reviewed' })
  }
  if (s.reviewStatus === 'unreviewed') {
    badges.push({ variant: 'unreviewed', label: 'Unreviewed' })
  }
  if (s.needsClinicalReview) {
    badges.push({ variant: 'review', label: 'Needs clinical review' })
  }
  if (s.sourceQuality === 'ai_generated_unverified' || s.sourceQuality === 'ai_generated_partial') {
    badges.push({ variant: 'source', label: 'Missing official source', title: `source_quality: ${s.sourceQuality}` })
  }
  if (detail) {
    if (!detail.receptorAffinities.length) {
      badges.push({ variant: 'receptor', label: 'Missing receptor data' })
    }
    if (!detail.monitoring.length) {
      badges.push({ variant: 'monitoring', label: 'Missing monitoring data' })
    }
    if (detail.latestGeneration?.status === 'failed_validation') {
      badges.push({ variant: 'error', label: 'Validation errors' })
    }
  }
  return badges
}

export function KbAdminPage({ onBack }: KbAdminPageProps) {
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [substances, setSubstances] = useState<KbSubstance[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
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

  const approvableSubstances = useMemo(() => {
    const unpublished = substances.filter((s) => s.status !== 'published' && s.status !== 'archived')
    if (!statusFilter) {
      return unpublished.filter((s) => s.status === 'ai_draft' && s.reviewStatus === 'unreviewed')
    }
    return unpublished
  }, [substances, statusFilter])

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchKbAdminSubstances({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      })
      setSubstances(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter])

  const loadDetail = useCallback(async (id: string) => {
    try {
      const d = await fetchKbAdminSubstance(id)
      setDetail(d)
      setEditMechanism(d.mechanismSummary ?? '')
      setEditPearls(d.clinicalPearls ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const handleApproveAll = useCallback(async () => {
    const count = approvableSubstances.length
    if (count === 0 || bulkRunning) return
    const confirmed = window.confirm(
      `Approve and publish ${count} profile${count === 1 ? '' : 's'} to Psychopharmacologie?`,
    )
    if (!confirmed) return

    setBulkRunning(true)
    setBulkSummary(null)
    setError(null)
    try {
      const summary = await approveAllKbSubstances({
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
  }, [approvableSubstances.length, bulkRunning, statusFilter, categoryFilter, loadList, loadDetail, selectedId])

  useEffect(() => {
    void fetchKbAdminStatus()
      .then((s) => setApiReady(s.enabled && s.supabaseConfigured))
      .catch(() => setApiReady(false))
  }, [])

  useEffect(() => {
    if (!apiReady) return
    void loadList()
  }, [apiReady, loadList])

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
      map.set(s.id, substanceBadges(s))
    }
    return map
  }, [substances])

  return (
    <div className="kb-admin-page">
      <header className="kb-admin-header">
        <button type="button" className="kb-admin-back" onClick={onBack}>← Dashboard</button>
        <div>
          <h1><FlaskConical size={22} aria-hidden /> Wissensdatenbank — Batch Review</h1>
          <p className="kb-admin-sub">
            Normalized KB (<code>kb_substances</code>) is the source of truth. Legacy JSONB tables are read-mostly projections.
            AI drafts require clinical review before publication.
          </p>
        </div>
      </header>

      {!apiReady && (
        <div className="kb-admin-alert">
          Server API nicht bereit. Starten Sie <code>npm run dev:server</code> und setzen Sie
          {' '}<code>SUPABASE_SERVICE_ROLE_KEY</code> in .env.local (server-only, never VITE_*).
        </div>
      )}

      {error && <div className="kb-admin-alert kb-admin-alert--error">{error}</div>}

      <div className="kb-admin-layout">
        <aside className="kb-admin-list">
          <div className="kb-admin-filters">
            <label>
              Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">alle (inkl. ai_draft)</option>
                <option value="ai_draft">ai_draft</option>
                <option value="reviewed">reviewed</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label>
              Kategorie
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">alle</option>
                {PSYCHIATRIC_DRUG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void loadList()} disabled={bulkRunning}>
              <RefreshCw size={14} /> Aktualisieren
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
                  ? 'Publishing…'
                  : `Approve all (${approvableSubstances.length})`}
              </button>
            )}
          </div>

          {bulkSummary && (
            <div className="kb-admin-bulk-summary">
              <strong>Bulk publish complete</strong>
              <ul>
                <li>{bulkSummary.succeeded.length} published</li>
                <li>{bulkSummary.skipped.length} skipped</li>
                <li>{bulkSummary.failed.length} failed</li>
              </ul>
              {bulkSummary.failed.length > 0 && (
                <details>
                  <summary>Failed profiles</summary>
                  <ul>
                    {bulkSummary.failed.map((f) => (
                      <li key={f.id}>{f.genericName}: {f.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {loading ? <p>Laden…</p> : (
            <ul className="kb-admin-list-items">
              {substances.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={selectedId === s.id ? 'is-active' : ''}
                    onClick={() => setSelectedId(s.id)}
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
              {substances.length === 0 && <li className="kb-admin-empty">Keine Einträge</li>}
            </ul>
          )}
        </aside>

        <main className="kb-admin-detail">
          {!detail ? (
            <p className="kb-admin-empty">Profil auswählen (AI draft öffnen)</p>
          ) : (
            <>
              <div className="kb-admin-detail-header">
                <h2>{detail.genericName}</h2>
                <div className="kb-admin-badge-row">
                  {substanceBadges(detail, detail).map((b) => (
                    <KbBadge key={b.label} variant={b.variant} label={b.label} title={b.title} />
                  ))}
                </div>
                <div className="kb-admin-actions">
                  <button type="button" onClick={() => void approveKbSubstance(detail.id).then(() => loadDetail(detail.id))}>
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void publishKbSubstance(detail.id)
                        .then((result) => {
                          setPublishNotice(
                            `Published → Psychopharmacologie (knowledge_base_drugs id: ${result.projectedDrugId})`,
                          )
                          return loadDetail(detail.id)
                        })
                        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
                    }
                  >
                    Publish
                  </button>
                  <button type="button" onClick={() => void archiveKbSubstance(detail.id).then(() => loadDetail(detail.id))}>
                    <Archive size={14} /> Archive
                  </button>
                  <button
                    type="button"
                    title="Rerun enrichment via CLI (server-side)"
                    onClick={() => {
                      void navigator.clipboard.writeText(rerunCli)
                      setError(null)
                    }}
                  >
                    <RotateCcw size={14} /> Rerun (copy CLI)
                  </button>
                </div>
              </div>

              <p className="kb-admin-cli-hint">
                Rerun enrichment: <code>{rerunCli}</code>
              </p>

              {publishNotice && (
                <div className="kb-admin-alert" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  {publishNotice}
                </div>
              )}

              {substanceBadges(detail, detail).some((b) => b.variant === 'receptor' || b.variant === 'monitoring' || b.variant === 'error') && (
                <div className="kb-admin-gaps">
                  <strong>Validation / data gaps:</strong>{' '}
                  {substanceBadges(detail, detail)
                    .filter((b) => ['receptor', 'monitoring', 'error', 'source'].includes(b.variant))
                    .map((b) => b.label)
                    .join(' · ')}
                </div>
              )}

              <section className="kb-admin-section">
                <h3>Normalized profile</h3>
                <dl className="kb-admin-dl">
                  <dt>Klasse</dt><dd>{detail.substanceClass ?? '—'}</dd>
                  <dt>Status</dt><dd>{detail.status} / {detail.reviewStatus}</dd>
                  <dt>Source quality</dt><dd>{detail.sourceQuality}</dd>
                  <dt>Uses</dt><dd>{detail.primaryPsychiatricUses.join(', ') || '—'}</dd>
                </dl>
              </section>

              {detail.tradeNames.length > 0 && (
                <section className="kb-admin-section">
                  <h3>Trade names ({detail.tradeNames.length})</h3>
                  <ul className="kb-admin-chip-list">
                    {detail.tradeNames.map((t) => (
                      <li key={t.id}>
                        {t.tradeName}
                        {t.countryCode ? ` (${t.countryCode})` : ''}
                        {t.isPrimary ? ' · primary' : ''}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail.receptorAffinities.length > 0 && (
                <section className="kb-admin-section">
                  <h3>Rezeptorprofil ({detail.receptorAffinities.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>Rezeptor</th>
                        <th>Affinität %</th>
                        <th>Effekt</th>
                        <th>Konfidenz</th>
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
                  <h3>Nebenwirkungen ({detail.sideEffects.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>Effekt</th>
                        <th>System</th>
                        <th>Häufigkeit</th>
                        <th>Schwere</th>
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
                  <h3>Dosierung ({detail.dosageGuidance.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>Population</th>
                        <th>Start</th>
                        <th>Ziel</th>
                        <th>Max</th>
                        <th>Notizen</th>
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
                  <h3>Monitoring ({detail.monitoring.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Intervall</th>
                        <th>Priorität</th>
                        <th>Rationale</th>
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
                  <h3>Interaktionen ({detail.interactions.length})</h3>
                  <table className="kb-admin-table">
                    <thead>
                      <tr>
                        <th>Mit</th>
                        <th>Schwere</th>
                        <th>Mechanismus</th>
                        <th>Management</th>
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
                <h3>Quellen / Evidenz ({detail.sources.length})</h3>
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
                  <p className="kb-admin-empty">Keine Quellen hinterlegt</p>
                )}
              </section>

              {(detail.contraindications.length > 0 || detail.severeRisks.length > 0) && (
                <section className="kb-admin-section">
                  <h3>Kontraindikationen &amp; Risiken</h3>
                  {detail.contraindications.length > 0 && (
                    <>
                      <h4 className="kb-admin-subheading">Kontraindikationen</h4>
                      <ul className="kb-admin-bullet-list">
                        {detail.contraindications.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                    </>
                  )}
                  {detail.severeRisks.length > 0 && (
                    <>
                      <h4 className="kb-admin-subheading">Schwere Risiken</h4>
                      <ul className="kb-admin-bullet-list">
                        {detail.severeRisks.map((r) => <li key={r}>{r}</li>)}
                      </ul>
                    </>
                  )}
                </section>
              )}

              {(detail.pregnancyLactationCaution || detail.geriatricCaution || detail.hepaticRenalCaution) && (
                <section className="kb-admin-section">
                  <h3>Vorsichten</h3>
                  <dl className="kb-admin-dl">
                    {detail.pregnancyLactationCaution && (
                      <><dt>Schwangerschaft/Stillzeit</dt><dd>{detail.pregnancyLactationCaution}</dd></>
                    )}
                    {detail.geriatricCaution && (
                      <><dt>Geriatrie</dt><dd>{detail.geriatricCaution}</dd></>
                    )}
                    {detail.hepaticRenalCaution && (
                      <><dt>Leber/Niere</dt><dd>{detail.hepaticRenalCaution}</dd></>
                    )}
                  </dl>
                </section>
              )}

              {(detail.mechanismSummary || detail.pharmacodynamicProfile) && (
                <section className="kb-admin-section">
                  <h3>Wirkmechanismus</h3>
                  {detail.mechanismSummary && <p className="kb-admin-prose">{detail.mechanismSummary}</p>}
                  {detail.pharmacodynamicProfile && (
                    <p className="kb-admin-prose kb-admin-prose--muted">{detail.pharmacodynamicProfile}</p>
                  )}
                </section>
              )}

              <section className="kb-admin-section">
                <h3>Bearbeiten (normalized fields)</h3>
                <label>
                  Wirkmechanismus
                  <textarea value={editMechanism} onChange={(e) => setEditMechanism(e.target.value)} rows={4} />
                </label>
                <label>
                  Clinical pearls
                  <textarea value={editPearls} onChange={(e) => setEditPearls(e.target.value)} rows={3} />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    void patchKbAdminSubstance(detail.id, {
                      mechanismSummary: editMechanism,
                      clinicalPearls: editPearls,
                    }).then(() => loadDetail(detail.id))
                  }
                >
                  Speichern
                </button>
              </section>

              <section className="kb-admin-section">
                <h3>
                  Raw AI vs normalized
                  <button type="button" className="kb-admin-toggle" onClick={() => setShowRawAi((v) => !v)}>
                    {showRawAi ? 'Hide' : 'Show'} raw DeepSeek output
                  </button>
                </h3>
                {detail.latestGeneration ? (
                  <dl className="kb-admin-dl">
                    <dt>Generation</dt>
                    <dd>{detail.latestGeneration.provider} / {detail.latestGeneration.model} — {detail.latestGeneration.status}</dd>
                    <dt>Created</dt>
                    <dd>{detail.latestGeneration.createdAt}</dd>
                  </dl>
                ) : (
                  <p className="kb-admin-empty">No AI generation record</p>
                )}
                {showRawAi && (
                  <div className="kb-admin-compare">
                    <div>
                      <h4>Raw AI response</h4>
                      <pre>{JSON.stringify(detail.latestGeneration?.rawResponse ?? null, null, 2)}</pre>
                    </div>
                    <div>
                      <h4>Validated payload</h4>
                      <pre>{JSON.stringify(detail.latestGeneration?.validatedPayload ?? detail, null, 2)}</pre>
                    </div>
                  </div>
                )}
                {detail.latestGeneration?.validationErrors != null ? (
                  <div className="kb-admin-alert kb-admin-alert--error">
                    <strong>Validation errors</strong>
                    <pre>{JSON.stringify(detail.latestGeneration.validationErrors, null, 2)}</pre>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
