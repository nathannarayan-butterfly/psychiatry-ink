import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  archiveDemoPatient,
  DEMO_CASE_ID,
  ensureDemoPatientExists,
  exportDemoFixtureFromLocal,
  fetchAndApplyCanonicalDemoFixture,
  getEffectiveDemoSeedVersion,
  isDemoPublisherUserEmail,
  loadDemoFixture,
  loadDemoUserState,
  removeDemoPatient,
  resetDemoPatient,
  restoreDemoPatient,
  runDemoQaChecklist,
  seedDemoPatient,
  validateDemoFixture,
} from '../../demo'
import type { DemoQaModuleResult, DemoSeedCounts, DemoValidationResult } from '../../demo/types'
import {
  fetchCanonicalDemoPatient,
  publishCanonicalDemoPatient,
  type CanonicalDemoPatientResponse,
} from '../../services/demoPatientApi'
import { calendarStorageKey, type CalendarStorageScope } from '../../utils/calendarStore'
import '../../styles/demo-patient-dev.css'

interface DemoPatientDevPageProps {
  onBack?: () => void
}

export function DemoPatientDevPage({ onBack }: DemoPatientDevPageProps) {
  const { user } = useAuth()
  const userId = user?.id ?? 'anonymous'

  const [validation, setValidation] = useState<DemoValidationResult | null>(null)
  const [qaResults, setQaResults] = useState<DemoQaModuleResult[]>([])
  const [counts, setCounts] = useState<DemoSeedCounts | null>(null)
  const [userState, setUserState] = useState(() => loadDemoUserState(userId))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canonical, setCanonical] = useState<CanonicalDemoPatientResponse | null>(null)
  const [canonicalLoading, setCanonicalLoading] = useState(false)

  const isPublisher = isDemoPublisherUserEmail(user?.email)

  const calendarScope: CalendarStorageScope = useMemo(
    () => ({ userId, orgId: null }),
    [userId],
  )

  const refreshStatus = useCallback(() => {
    const fixture = loadDemoFixture()
    setValidation(validateDemoFixture(fixture, { expectedSeedVersion: getEffectiveDemoSeedVersion() }))
    setQaResults(runDemoQaChecklist(DEMO_CASE_ID, userId))
    setUserState(loadDemoUserState(userId))
  }, [userId])

  const refreshCanonical = useCallback(async () => {
    setCanonicalLoading(true)
    try {
      await fetchAndApplyCanonicalDemoFixture({ force: true })
      const record = await fetchCanonicalDemoPatient()
      setCanonical(record)
    } catch {
      setCanonical(null)
    } finally {
      setCanonicalLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    void refreshCanonical()
  }, [refreshStatus, refreshCanonical])

  const runAction = useCallback(
    async (action: () => Promise<void>, successMsg: string) => {
      setBusy(true)
      setError(null)
      setMessage(null)
      try {
        await action()
        setMessage(successMsg)
        refreshStatus()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      } finally {
        setBusy(false)
      }
    },
    [refreshStatus],
  )

  const handleInstall = () =>
    void runAction(async () => {
      const result = await seedDemoPatient({ userId, calendarScope, force: true })
      if (!result.ok) throw new Error(result.validationErrors?.join('; ') ?? 'Seed failed')
      setCounts(result.counts)
    }, 'Demo patient installed.')

  const handleEnsure = () =>
    void runAction(async () => {
      const result = await ensureDemoPatientExists({ userId, calendarScope })
      setMessage(result.seeded ? 'Demo patient ensured (seeded).' : `Skipped: ${result.skippedReason}`)
      refreshStatus()
    }, 'Ensure completed.')

  const handleReset = () =>
    void runAction(async () => {
      const result = await resetDemoPatient({ userId, calendarScope, force: true })
      if (!result.ok) throw new Error(result.validationErrors?.join('; ') ?? 'Reset failed')
      setCounts(result.counts)
    }, 'Demo patient reset.')

  const handleRemove = () =>
    void runAction(async () => {
      await removeDemoPatient(userId)
    }, 'Demo patient removed.')

  const handleArchive = () =>
    void runAction(async () => {
      archiveDemoPatient(userId)
    }, 'Demo patient archived for this user.')

  const handleRestore = () =>
    void runAction(async () => {
      restoreDemoPatient(userId)
    }, 'Demo patient restored (unarchived).')

  const handlePublish = () =>
    void runAction(async () => {
      if (!isPublisher) throw new Error('Only the demo publisher may publish')
      const fixture = await exportDemoFixtureFromLocal(DEMO_CASE_ID, calendarScope)
      const preview = validateDemoFixture(fixture, { expectedSeedVersion: fixture.demoSeedVersion })
      if (!preview.ok) {
        throw new Error(preview.errors.map((entry) => entry.message).join('; '))
      }
      const published = await publishCanonicalDemoPatient(fixture)
      setCanonical(published)
      await fetchAndApplyCanonicalDemoFixture({ force: true })
      await resetDemoPatient({ userId, calendarScope, force: true })
      void refreshCanonical()
    }, 'Published canonical demo to all users.')

  const fixtureCounts = useMemo(() => {
    const f = loadDemoFixture()
    return {
      documents: Object.keys(f.workspace.documents).length,
      verlauf: f.verlaufFeed.length,
      diagnoses: f.workspace.diagnoses.length,
      labs: f.workspace.labGraphs[0]?.entries.length ?? 0,
    }
  }, [])

  return (
    <div className="demo-dev-page">
      <header className="demo-dev-page__header">
        <div>
          <h1>Demo Patient — Pre-Butterfly QA</h1>
          <p className="demo-dev-page__subtitle">
            Synthetic case <code>{DEMO_CASE_ID}</code> · Max Demo · read-only in workspace
          </p>
        </div>
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        ) : null}
      </header>

      <section className="demo-dev-card">
        <h2>User state</h2>
        <dl className="demo-dev-dl">
          <dt>Status</dt>
          <dd>{userState.status}</dd>
          <dt>Seed version</dt>
          <dd>{userState.seedVersion || '—'}</dd>
          <dt>Calendar key</dt>
          <dd><code>{calendarStorageKey(calendarScope)}</code></dd>
        </dl>
      </section>

      <section className="demo-dev-card">
        <h2>Canonical demo (all users)</h2>
        {canonicalLoading ? <p className="demo-dev-meta">Loading canonical status…</p> : null}
        {canonical ? (
          <dl className="demo-dev-dl">
            <dt>Server version</dt>
            <dd>{canonical.seedVersion}</dd>
            <dt>Published by</dt>
            <dd>{canonical.publishedByEmail ?? canonical.publishedBy ?? '—'}</dd>
            <dt>Published at</dt>
            <dd>{new Date(canonical.publishedAt).toLocaleString()}</dd>
          </dl>
        ) : (
          <p className="demo-dev-meta">
            No canonical demo published yet — users receive bundled fixture ({getEffectiveDemoSeedVersion()}).
          </p>
        )}
        <p className="demo-dev-meta">
          Effective seed version for this client: <code>{getEffectiveDemoSeedVersion()}</code>
        </p>
        {isPublisher ? (
          <div className="demo-dev-actions">
            <button type="button" disabled={busy} onClick={handlePublish}>
              Publish to all users
            </button>
            <button type="button" disabled={busy} onClick={() => void refreshCanonical()}>
              Refresh canonical status
            </button>
          </div>
        ) : (
          <p className="demo-dev-meta">Publish requires demo publisher account ({user?.email ?? 'not signed in'}).</p>
        )}
      </section>

      <section className="demo-dev-card">
        <h2>Actions</h2>
        <div className="demo-dev-actions">
          <button type="button" disabled={busy} onClick={handleInstall}>Install / Reinstall</button>
          <button type="button" disabled={busy} onClick={handleEnsure}>Ensure exists</button>
          <button type="button" disabled={busy} onClick={handleReset}>Reset demo data</button>
          <button type="button" disabled={busy} onClick={handleArchive}>Archive (user)</button>
          <button type="button" disabled={busy} onClick={handleRestore}>Restore archived</button>
          <button type="button" className="demo-dev-actions__danger" disabled={busy} onClick={handleRemove}>Remove demo</button>
        </div>
        {message ? <p className="demo-dev-msg demo-dev-msg--ok">{message}</p> : null}
        {error ? <p className="demo-dev-msg demo-dev-msg--err">{error}</p> : null}
      </section>

      <section className="demo-dev-card">
        <h2>Fixture validation</h2>
        {validation ? (
          <>
            <p className={validation.ok ? 'demo-dev-badge demo-dev-badge--pass' : 'demo-dev-badge demo-dev-badge--fail'}>
              {validation.ok ? 'PASS' : 'FAIL'} — {validation.errors.length} errors, {validation.warnings.length} warnings
            </p>
            <ul className="demo-dev-list">
              {validation.errors.map((e: DemoValidationResult['errors'][number]) => (
                <li key={e.code} className="demo-dev-list__fail">[{e.code}] {e.message}</li>
              ))}
              {validation.warnings.map((w: DemoValidationResult['warnings'][number]) => (
                <li key={w.code} className="demo-dev-list__warn">[{w.code}] {w.message}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="demo-dev-meta">
          Fixture: {fixtureCounts.documents} docs · {fixtureCounts.verlauf} Verlauf · {fixtureCounts.diagnoses} Dx · {fixtureCounts.labs} labs
        </p>
        {counts ? (
          <p className="demo-dev-meta">Last seed: {counts.verlaufEntries} Verlauf · {counts.medications} meds · {counts.clinicalImprints} imprints</p>
        ) : null}
      </section>

      <section className="demo-dev-card">
        <h2>QA checklist (per module)</h2>
        <table className="demo-dev-qa">
          <thead>
            <tr>
              <th>Module</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {qaResults.map((row) => (
              <tr key={row.module}>
                <td>{row.module}</td>
                <td><span className={`demo-dev-qa__${row.status}`}>{row.status.toUpperCase()}</span></td>
                <td>{row.message}{row.count != null ? ` (${row.count})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="demo-dev-card demo-dev-card--notes">
        <h2>Manual verification notes</h2>
        <ul>
          <li>Open case <code>{DEMO_CASE_ID}</code> from dashboard — banner should show „Synthetic demo case".</li>
          <li>Workspace fields are read-only; vault autosave is suppressed.</li>
          <li>Archive hides demo from patient list until Restore or Reinstall.</li>
          <li>Konsil / DiscussCase: server modules — fixture placeholders only.</li>
          <li>Publisher edits demo in workspace, then uses <strong>Publish to all users</strong> on this page.</li>
          <li>All users re-seed automatically when canonical version is newer than their local copy.</li>
          <li>Regen bundled fixture: <code>npm run demo:fixture:write</code> or <code>npm run demo:fixture:regen -- --write</code></li>
        </ul>
      </section>
    </div>
  )
}
