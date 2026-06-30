import { AlertCircle, Check, CloudOff, Loader2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'

type WorkspaceVaultState = ReturnType<typeof useWorkspaceVault>

interface WorkspaceSaveStatusBadgeProps {
  vault: Pick<WorkspaceVaultState, 'saveStatus' | 'error' | 'retrySave'>
}

/**
 * Persistent save-status badge for the case workspace.
 *
 * Renders nothing in the 'idle' state. In every other state it surfaces the
 * specific outcome of the most recent `useWorkspaceVault.persist()` call —
 * particularly the 'failed' branch, which MUST be visible until the user
 * retries (per RECOVERY_REPORT.md §1).
 */
export function WorkspaceSaveStatusBadge({ vault }: WorkspaceSaveStatusBadgeProps) {
  const { t } = useTranslation()
  const status = vault.saveStatus

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
        {t('workspaceSaveStatusSaved')}
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
  return (
    <div
      role="alert"
      className="workspace-save-status workspace-save-status--failed inline-flex flex-wrap items-center gap-2 rounded-sm border-2 border-recording bg-surface px-2 py-1 text-xs text-recording"
      data-testid="workspace-save-status-failed"
    >
      <span className="inline-flex items-center gap-1">
        <AlertCircle className="h-3 w-3" strokeWidth={2} aria-hidden />
        <span className="font-medium">{t('workspaceSaveStatusFailedBadge')}</span>
      </span>
      <span className="text-muted">{vault.error ?? t('workspaceSaveStatusFailedDetail')}</span>
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
