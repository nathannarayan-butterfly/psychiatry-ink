import { Download, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import {
  restoreAccountCloudBackupWithProgress,
  setupAccountCloudBackup,
} from '../../utils/accountBackup'
import { markAccountKeyLinked } from '../../utils/accountKeyLink'
import { PassphraseUnlockProgress } from '../auth/PassphraseUnlockProgress'
import type { IdentifierStorageMode } from '../../utils/identifierStorage'
import {
  MAX_PASSPHRASE_LENGTH,
  MIN_PASSPHRASE_LENGTH,
  isPassphraseBlank,
  isPassphraseTooShortForSetup,
} from '../../utils/passphrasePolicy'
import {
  downloadPassphraseBackupFile,
  getPassphraseBackup,
  parsePassphraseBackup,
  restorePrivateKeyFromPassphrase,
} from '../../utils/passphraseRecovery'
import { SettingsField } from './SettingsField'

type WorkspaceVaultState = ReturnType<typeof useWorkspaceVault>

interface WorkspaceVaultSectionProps {
  vault: WorkspaceVaultState
  countryCode: string
  identifierStorage: IdentifierStorageMode
  onCloudSyncComplete?: () => void
}

export function WorkspaceVaultSection({
  vault,
  countryCode,
  identifierStorage: _identifierStorage,
  onCloudSyncComplete,
}: WorkspaceVaultSectionProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recoveryFileRef = useRef<HTMLInputElement>(null)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('')
  const [passphraseStatus, setPassphraseStatus] = useState<string | null>(null)
  const [hasBackup, setHasBackup] = useState(false)

  useEffect(() => {
    let active = true
    void getPassphraseBackup()
      .then((backup) => {
        if (active) setHasBackup(Boolean(backup))
      })
      .catch(() => {
        if (active) setHasBackup(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      await vault.importVault(file)
    } catch {
      // errors surfaced via vault.error
    }
  }

  const handleCreatePassphraseBackup = async () => {
    if (isPassphraseBlank(passphrase)) return
    if (isPassphraseTooShortForSetup(passphrase)) {
      setPassphraseStatus(
        t('workspacePassphraseTooShort').replace('{min}', String(MIN_PASSPHRASE_LENGTH)),
      )
      return
    }
    if (passphrase !== confirmPassphrase) {
      setPassphraseStatus(t('workspacePassphraseMismatch'))
      return
    }
    try {
      const backup = await setupAccountCloudBackup(passphrase, userId)
      setHasBackup(true)
      setPassphrase('')
      setConfirmPassphrase('')
      setPassphraseStatus(t('accountBackupCloudSaved'))
      downloadPassphraseBackupFile(backup)
      onCloudSyncComplete?.()
    } catch {
      setPassphraseStatus(t('workspacePassphraseError'))
    }
  }

  const handleRestoreFromPassphrase = useCallback(async () => {
    if (!recoveryPassphrase.trim()) return
    try {
      const result = await restoreAccountCloudBackupWithProgress(
        recoveryPassphrase,
        countryCode,
        userId,
      )
      setRecoveryPassphrase('')
      const parts = [
        `${t('accountBackupCloudRestored')} (${result.workspaceCases} ${t('accountBackupWorkspaceLabel')})`,
      ]
      if (result.identifiersFromAccount) {
        parts.push(
          `${result.identifierCases} ${t('accountBackupIdentifiersLabel')}`,
        )
      } else {
        parts.push(t('identifierStorageRestoreDeviceHint'))
      }
      setPassphraseStatus(parts.join(' — '))
      onCloudSyncComplete?.()
    } catch {
      // The stepped progress UI already surfaces which step failed; this is
      // the fallback path that handles the "key-only restore" case for users
      // who don't have a server snapshot.
      try {
        await restorePrivateKeyFromPassphrase(recoveryPassphrase)
        markAccountKeyLinked(userId)
        setRecoveryPassphrase('')
        setPassphraseStatus(t('workspacePassphraseRestored'))
      } catch (fallbackError) {
        // Distinguish "nothing to test the passphrase against" (no backup
        // anywhere — the passphrase itself was never actually checked) from
        // "the passphrase/file was tested and rejected" (wrong passphrase, or
        // a corrupt/foreign backup file) — these have different remedies and
        // were previously collapsed into one unhelpful message.
        const message = fallbackError instanceof Error ? fallbackError.message : ''
        setPassphraseStatus(
          /no passphrase backup found/i.test(message)
            ? t('workspacePassphraseNoBackupFound')
            : t('workspacePassphraseRestoreFailed'),
        )
      }
    }
  }, [countryCode, onCloudSyncComplete, recoveryPassphrase, t, userId])

  const handleImportRecoveryFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !recoveryPassphrase.trim()) return
    try {
      const backup = parsePassphraseBackup(await file.text())
      await restorePrivateKeyFromPassphrase(recoveryPassphrase, backup)
      markAccountKeyLinked(userId)
      setRecoveryPassphrase('')
      setPassphraseStatus(t('workspacePassphraseRestored'))
    } catch {
      setPassphraseStatus(t('workspacePassphraseRestoreFailed'))
    }
  }

  if (!vault.enabled) return null

  return (
    <div className="settings-vault-section">
      <h3 className="settings-vault-section__title">{t('workspaceVaultTitle')}</h3>

      <SettingsField label={t('workspaceVaultExportLabel')}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void vault.exportVault()}
            className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-hover"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('workspaceVaultExport')}
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-hover"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('workspaceVaultImport')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void handleImportFile(event)}
          />
        </div>
        {vault.dbSyncEnabled ? (
          <p className="mt-2 text-xs text-muted">{t('workspaceVaultDbSync')}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">{t('workspaceVaultLocalOnly')}</p>
        )}
      </SettingsField>

      <SettingsField label={t('workspacePassphraseTitle')}>
        <div className="space-y-2">
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder={t('workspacePassphrasePlaceholder')}
            maxLength={MAX_PASSPHRASE_LENGTH}
            className="w-full max-w-sm rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPassphrase}
            onChange={(event) => setConfirmPassphrase(event.target.value)}
            placeholder={t('workspacePassphraseConfirmPlaceholder')}
            maxLength={MAX_PASSPHRASE_LENGTH}
            className="w-full max-w-sm rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink"
            autoComplete="new-password"
          />
          <p className="text-xs text-muted">
            {t('workspacePassphraseMinLengthHint').replace('{min}', String(MIN_PASSPHRASE_LENGTH))}
          </p>
          <button
            type="button"
            onClick={() => void handleCreatePassphraseBackup()}
            className="rounded-sm border-2 border-border px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-hover"
          >
            {hasBackup ? t('workspacePassphraseUpdate') : t('workspacePassphraseCreate')}
          </button>
        </div>
      </SettingsField>

      <SettingsField label={t('workspacePassphraseRestoreTitle')}>
        <input
          type="password"
          value={recoveryPassphrase}
          onChange={(event) => setRecoveryPassphrase(event.target.value)}
          placeholder={t('workspacePassphrasePlaceholder')}
          className="w-full max-w-sm rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink"
          autoComplete="current-password"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRestoreFromPassphrase()}
            className="rounded-sm border-2 border-border px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-hover"
          >
            {t('workspacePassphraseRestore')}
          </button>
          <button
            type="button"
            onClick={() => recoveryFileRef.current?.click()}
            className="rounded-sm border-2 border-border px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-hover"
          >
            {t('workspacePassphraseImportFile')}
          </button>
          <input
            ref={recoveryFileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void handleImportRecoveryFile(event)}
          />
        </div>
        {passphraseStatus ? <p className="mt-2 text-xs text-muted">{passphraseStatus}</p> : null}
        <PassphraseUnlockProgress
          onRetry={() => void handleRestoreFromPassphrase()}
          helpHref="/help/passphrase-unlock"
        />
      </SettingsField>

      {vault.error ? <p className="mt-2 text-xs text-recording">{vault.error}</p> : null}
    </div>
  )
}
