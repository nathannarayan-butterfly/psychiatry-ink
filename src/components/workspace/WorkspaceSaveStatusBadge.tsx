import { AlertCircle, Check, CloudOff, Loader2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'

type WorkspaceVaultState = ReturnType<typeof useWorkspaceVault>

interface WorkspaceSaveStatusBadgeProps {
  vault: Pick<WorkspaceVaultState, 'saveStatus' | 'error' | 'retrySave' | 'dbSyncEnabled' | 'orgVaultEnabled'>
}

/**
 * Persistent save-status badge for the case workspace.
 *
 * Renders nothing in the 'idle' state. In every other state it surfaces the
 * specific outcome of the most recent `useWorkspaceVault.persist()` call —
 * particularly the 'failed' branch, which MUST be visible until the user
 * retries (per RECOVERY_REPORT.md §1).
 *
 * Wording follows the plain-language save-status glossary from the
 * Datenschutz redesign: "Lokal gespeichert" / "Verschlüsselt mit Konto
 * synchronisiert" for success, and a distinct, louder warning for the one
 * case that can lose data silently — a local-only save (no server copy at
 * all) failing outright.
 */
export function WorkspaceSaveStatusBadge({ vault }: WorkspaceSaveStatusBadgeProps) {
  const { t } = useTranslation()
  const status = vault.saveStatus
  const hasServerDurability = vault.dbSyncEnabled || vault.orgVaultEnabled

  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span
        className="workspace-save-status workspace-save-status--saving inline-flex items-center gap-1 text-xs text-muted"
        data-testid="workspace-save-status-saving"
      >
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} aria-hidden />
        {t('workspaceSaveStatusSaving')}
      </span>
    )
  }

  if (status === 'success') {
    return (
      <span
        className="workspace-save-status workspace-save-status--success inline-flex items-center gap-1 text-xs text-muted"
        data-testid="workspace-save-status-success"
      >
        <Check className="h-3 w-3 text-success" strokeWidth={2} aria-hidden />
        {hasServerDurability ? t('workspaceSaveStatusSavedSynced') : t('workspaceSaveStatusSavedLocal')}
      </span>
    )
  }

  if (status === 'cache-warning') {
    return (
      <span
        className="workspace-save-status workspace-save-status--cache-warning inline-flex items-center gap-1 text-xs text-muted"
        data-testid="workspace-save-status-cache-warning"
        title={t('workspaceSaveStatusCacheWarning')}
      >
        <CloudOff className="h-3 w-3 text-warning" strokeWidth={2} aria-hidden />
        {t('workspaceSaveStatusCacheWarning')}
      </span>
    )
  }

  // 'failed' — must remain visible until the next successful save or retry.
  // A failure with NO server durability layer at all (local-only mode) can
  // mean the edit exists nowhere — that gets a distinct, louder warning.
  const isCriticalLocalFailure = !hasServerDurability

  return (
    <div
      role="alert"
      className={`workspace-save-status workspace-save-status--failed inline-flex flex-wrap items-center gap-2 rounded-sm border-2 border-recording bg-surface px-2 py-1 text-xs text-recording${isCriticalLocalFailure ? ' workspace-save-status--local-failed-critical' : ''}`}
      data-testid={
        isCriticalLocalFailure
          ? 'workspace-save-status-local-failed-critical'
          : 'workspace-save-status-failed'
      }
    >
      <span className="inline-flex items-center gap-1">
        <AlertCircle className="h-3 w-3" strokeWidth={2} aria-hidden />
        <span className="font-medium">
          {isCriticalLocalFailure
            ? t('workspaceSaveStatusLocalFailedCritical')
            : t('workspaceSaveStatusFailedBadge')}
        </span>
      </span>
      <span className="text-muted">
        {vault.error ??
          (isCriticalLocalFailure
            ? t('workspaceSaveStatusLocalFailedDetail')
            : t('workspaceSaveStatusFailedDetail'))}
      </span>
      <button
        type="button"
        onClick={() => {
          void vault.retrySave().catch(() => {
            // The badge stays — persist() already updated saveStatus + error.
          })
        }}
        className="rounded-sm border border-recording px-1.5 py-0.5 text-xs text-recording transition-colors hover:bg-surface-hover"
      >
        {t('workspaceSaveStatusRetry')}
      </button>
    </div>
  )
}
