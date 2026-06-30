import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import {
  evaluateWorkspaceHealth,
  hasIdWithoutContentDivergence,
  type WorkspaceHealthSnapshot,
} from '../../utils/workspaceHealthCheck'

interface WorkspaceHealthBannerProps {
  countryCode: string
  /** Increment to force a re-evaluation, e.g. after a successful save. */
  reloadSignal?: number
}

/**
 * Sign-in-time dashboard surface that flags the 2026-06-30 "ID-but-no-content"
 * divergence: the user owns case IDs the server has registered but no clinical
 * content has ever been uploaded for them. The most common explanation post-
 * hotfix is that the content was written on another device where the broken
 * cohort lost its server upload. See RECOVERY_REPORT.md §6 for the diagnostic.
 *
 * Read-only — never writes to IDB / localStorage / the network beyond the
 * single GET that powers `evaluateWorkspaceHealth`.
 */
export function WorkspaceHealthBanner({
  countryCode,
  reloadSignal = 0,
}: WorkspaceHealthBannerProps) {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const [snapshot, setSnapshot] = useState<WorkspaceHealthSnapshot | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    let active = true
    void evaluateWorkspaceHealth(countryCode).then((result) => {
      if (active) setSnapshot(result)
    })
    return () => {
      active = false
    }
  }, [authLoading, countryCode, reloadSignal, user?.id])

  if (!snapshot || !hasIdWithoutContentDivergence(snapshot)) return null

  const missingCount = snapshot.missingOnServer.length

  return (
    <section
      role="status"
      aria-live="polite"
      className="dashboard-health-banner mb-4 rounded-md border-2 border-warning bg-surface px-4 py-3 text-sm text-ink"
      data-testid="workspace-health-banner"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="h-5 w-5 shrink-0 text-warning"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="space-y-2">
          <p className="font-semibold leading-snug">
            {t('workspaceHealthMissingTitle')}
          </p>
          <p className="leading-relaxed text-muted">
            {t('workspaceHealthMissingBody').replace('{count}', String(missingCount))}
          </p>
          <p className="text-xs text-muted">
            <a
              href="/help/workspace-content-missing"
              className="inline-flex items-center gap-1 underline hover:text-ink"
              rel="help"
            >
              {t('workspaceHealthMissingLearnMore')}
              <ExternalLink className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
