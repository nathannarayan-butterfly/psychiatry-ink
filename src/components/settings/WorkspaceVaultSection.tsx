import { Download, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import {
  createPassphraseBackup,
  downloadPassphraseBackupFile,
  getPassphraseBackup,
  parsePassphraseBackup,
  restorePrivateKeyFromPassphrase,
} from '../../utils/passphraseRecovery'
import { EncryptionDisclaimer } from '../EncryptionDisclaimer'
import { SettingsField } from './SettingsField'

type WorkspaceVaultState = ReturnType<typeof useWorkspaceVault>

interface WorkspaceVaultSectionProps {
  vault: WorkspaceVaultState
}

export function WorkspaceVaultSection({ vault }: WorkspaceVaultSectionProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recoveryFileRef = useRef<HTMLInputElement>(null)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('')
  const [passphraseStatus, setPassphraseStatus] = useState<string | null>(null)
  const [hasBackup, setHasBackup] = useState(false)

  void getPassphraseBackup().then((backup) => setHasBackup(Boolean(backup)))

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
    if (!passphrase.trim() || passphrase !== confirmPassphrase) {
      setPassphraseStatus(t('workspacePassphraseMismatch'))
      return
    }
    try {
      const backup = await createPassphraseBackup(passphrase)
      setHasBackup(true)
      setPassphrase('')
      setConfirmPassphrase('')
      setPassphraseStatus(t('workspacePassphraseSaved'))
      downloadPassphraseBackupFile(backup)
    } catch {
      setPassphraseStatus(t('workspacePassphraseError'))
    }
  }

  const handleRestoreFromPassphrase = async () => {
    if (!recoveryPassphrase.trim()) return
    try {
      await restorePrivateKeyFromPassphrase(recoveryPassphrase)
      setRecoveryPassphrase('')
      setPassphraseStatus(t('workspacePassphraseRestored'))
    } catch {
      setPassphraseStatus(t('workspacePassphraseRestoreFailed'))
    }
  }

  const handleImportRecoveryFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !recoveryPassphrase.trim()) return
    try {
      const backup = parsePassphraseBackup(await file.text())
      await restorePrivateKeyFromPassphrase(recoveryPassphrase, backup)
      setRecoveryPassphrase('')
      setPassphraseStatus(t('workspacePassphraseRestored'))
    } catch {
      setPassphraseStatus(t('workspacePassphraseRestoreFailed'))
    }
  }

  if (!vault.enabled) return null

  return (
    <div className="mt-8 border-t-2 border-border pt-6">
      <h3 className="text-base font-semibold text-ink">{t('workspaceVaultTitle')}</h3>
      <p className="mt-1 mb-4 text-sm text-muted">{t('workspaceVaultIntro')}</p>

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
        <EncryptionDisclaimer section="settings" bodyVariant="list" />
        {vault.dbSyncEnabled ? (
          <p className="mt-1 text-xs text-muted">{t('workspaceVaultDbSync')}</p>
        ) : (
          <p className="mt-1 text-xs text-muted">{t('workspaceVaultLocalOnly')}</p>
        )}
      </SettingsField>

      <SettingsField label={t('workspacePassphraseTitle')} description={t('workspacePassphraseDescription')}>
        <div className="space-y-2">
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder={t('workspacePassphrasePlaceholder')}
            className="w-full max-w-sm rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPassphrase}
            onChange={(event) => setConfirmPassphrase(event.target.value)}
            placeholder={t('workspacePassphraseConfirmPlaceholder')}
            className="w-full max-w-sm rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => void handleCreatePassphraseBackup()}
            className="rounded-sm border-2 border-border px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-hover"
          >
            {hasBackup ? t('workspacePassphraseUpdate') : t('workspacePassphraseCreate')}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{t('workspacePassphraseLossWarning')}</p>
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
      </SettingsField>

      {vault.error ? <p className="mt-2 text-xs text-recording">{vault.error}</p> : null}
    </div>
  )
}
