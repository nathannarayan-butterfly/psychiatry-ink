import { useCallback, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  allowsPatientMetadata,
  allowsPublicKeyRegistration,
  COUNTRY_TIER_OVERRIDES,
  type PrivacyTier,
} from '../../data/privacyRegions'
import { useDashboardSettings } from '../../hooks/useDashboardSettings'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import { deleteRegistryBackupFromServer } from '../../services/accountBackupApi'
import { isAccountCloudSyncEnabled, scheduleAccountRegistryUpload } from '../../utils/accountBackup'
import { isPseudonymizationEnabled, PSEUDONYMIZE_KEY } from '../../services/aiGeneration'
import type { IdentifierStorageMode } from '../../utils/identifierStorage'
import { markIdentifierStorageAcknowledged } from '../../utils/identifierStorage'
import { IdentifierStorageChoice } from '../privacy/IdentifierStorageChoice'
import { SettingsField } from './SettingsField'
import { WorkspaceVaultSection } from './WorkspaceVaultSection'

type PrivacySettingsState = ReturnType<typeof usePrivacySettings>

interface PatientPrivacySectionProps {
  privacy: PrivacySettingsState
  workspaceVault: ReturnType<typeof useWorkspaceVault>
}

const tierLabelKeys: Record<PrivacyTier, 'privacyTierFull' | 'privacyTierLocalOnly' | 'privacyTierDisabled'> = {
  full: 'privacyTierFull',
  local_only: 'privacyTierLocalOnly',
  disabled: 'privacyTierDisabled',
}

const tierDescriptionKeys: Record<
  PrivacyTier,
  'privacyTierFullDescription' | 'privacyTierLocalOnlyDescription' | 'privacyTierDisabledDescription'
> = {
  full: 'privacyTierFullDescription',
  local_only: 'privacyTierLocalOnlyDescription',
  disabled: 'privacyTierDisabledDescription',
}

export function PatientPrivacySection({ privacy, workspaceVault }: PatientPrivacySectionProps) {
  const { t } = useTranslation()
  const { countryCode, identifierStorage, tier, setCountryCode, setIdentifierStorage } = privacy
  const dashboardSettings = useDashboardSettings()
  const [pseudonymizationEnabled, setPseudonymizationEnabled] = useState(
    isPseudonymizationEnabled,
  )
  const [switchNote, setSwitchNote] = useState<string | null>(null)

  const handleIdentifierStorageChange = useCallback(
    (next: IdentifierStorageMode) => {
      if (next === identifierStorage) return

      setIdentifierStorage(next)
      markIdentifierStorageAcknowledged()

      if (next === 'device') {
        setSwitchNote(t('identifierStorageSwitchToDevice'))
        void deleteRegistryBackupFromServer().catch(() => {
          setSwitchNote(t('identifierStorageSwitchToDeviceDeleteFailed'))
        })
      } else if (isAccountCloudSyncEnabled()) {
        setSwitchNote(t('identifierStorageSwitchToAccountUploading'))
        scheduleAccountRegistryUpload()
      } else {
        setSwitchNote(t('identifierStorageSwitchToAccount'))
      }
    },
    [identifierStorage, setIdentifierStorage, t],
  )

  function handlePseudonymizationToggle(checked: boolean) {
    try {
      localStorage.setItem(PSEUDONYMIZE_KEY, String(checked))
    } catch {
      // ignore
    }
    setPseudonymizationEnabled(checked)
  }

  const knownCountries = Object.keys(COUNTRY_TIER_OVERRIDES).sort()

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('settingsPrivacy')}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">{t('privacySectionIntro')}</p>

      <SettingsField
        label={t('identifierStorageSettingsTitle')}
        description={t('identifierStorageSettingsDescription')}
      >
        <IdentifierStorageChoice
          value={identifierStorage}
          onChange={handleIdentifierStorageChange}
          variant="settings"
          switchNote={switchNote}
        />
      </SettingsField>

      <SettingsField label={t('privacyCountryLabel')} description={t('privacyCountryDescription')}>
        <input
          type="text"
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
          className="w-full max-w-[8rem] rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm uppercase text-ink"
          maxLength={2}
          aria-label={t('privacyCountryLabel')}
        />
        {knownCountries.length > 0 ? (
          <p className="mt-2 text-xs text-muted">
            {t('privacyConfiguredCountries')}: {knownCountries.join(', ')}
          </p>
        ) : null}
      </SettingsField>

      <SettingsField label={t('privacyTierLabel')} description={t('privacyTierDescription')}>
        <p className="rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm font-medium text-ink">
          {t(tierLabelKeys[tier])}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t(tierDescriptionKeys[tier])}</p>
      </SettingsField>

      <SettingsField label={t('privacyPatientFieldsLabel')}>
        <ul className="list-inside list-disc space-y-1 text-xs text-muted">
          <li>
            {allowsPatientMetadata(tier)
              ? t('privacyPatientFieldsEnabled')
              : t('privacyPatientFieldsDisabled')}
          </li>
          <li>
            {allowsPublicKeyRegistration(tier)
              ? t('privacyPublicKeyAllowed')
              : t('privacyPublicKeyBlocked')}
          </li>
          <li
            className={
              identifierStorage === 'device' ? 'identifier-storage-choice__warning' : undefined
            }
          >
            {identifierStorage === 'account'
              ? t('privacyIdentifiersAccountMode')
              : t('privacyIdentifiersDeviceMode')}
          </li>
        </ul>
      </SettingsField>

      <SettingsField label={t('privacyLocalStorageLabel')}>
        <p className="text-xs text-muted">{t('privacyLocalStorageDescription')}</p>
      </SettingsField>

      <SettingsField
        label={t('workflowDirectToDocLabel')}
        description={t('workflowDirectToDocDescription')}
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={dashboardSettings.openCaseDirectToWorkflow}
            onChange={(event) =>
              dashboardSettings.setOpenCaseDirectToWorkflow(event.target.checked)
            }
            className="h-4 w-4 rounded-sm border-2 border-border"
          />
          {t('workflowDirectToDocToggle')}
        </label>
      </SettingsField>

      <SettingsField
        label={t('pseudonymizationToggle')}
        description={t('pseudonymizationHint')}
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={pseudonymizationEnabled}
            onChange={(event) => handlePseudonymizationToggle(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border"
          />
          {pseudonymizationEnabled ? t('pseudonymizationToggle') : t('pseudonymizationDisabled')}
        </label>
      </SettingsField>

      <WorkspaceVaultSection
        vault={workspaceVault}
        countryCode={countryCode}
        identifierStorage={identifierStorage}
        onCloudSyncComplete={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}
