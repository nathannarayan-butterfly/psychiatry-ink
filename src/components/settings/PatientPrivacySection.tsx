import { useCallback, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  allowsPatientMetadata,
  allowsPublicKeyRegistration,
  type PrivacyTier,
} from '../../data/privacyRegions'
import { toIsoCountryCode } from '../../data/countryNames'
import { ISO_ALPHA2_CODES } from '../../types/knowledgeBase'
import { CountryCombobox } from './CountryCombobox'
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

/** German-speaking + UK markets pinned to the top of the privacy country list. */
const PRIVACY_PRIORITY_CODES = ['DE', 'AT', 'CH', 'LI', 'GB'] as const

export function PatientPrivacySection({ privacy, workspaceVault }: PatientPrivacySectionProps) {
  const { t, language } = useTranslation()
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

  // Full ISO country set (same source as the prescription-country selector,
  // expressed in ISO codes — `UK` → `GB`). Countries without an explicit
  // privacy-tier override resolve to the safe default tier via
  // `resolvePrivacyTier`. The currently stored value is always included so a
  // detected/legacy code stays selectable.
  const currentIso = toIsoCountryCode(countryCode)
  const countryOptions = Array.from(
    new Set([...ISO_ALPHA2_CODES, ...(currentIso ? [currentIso] : [])]),
  )

  return (
    <div>
      <SettingsField label={t('identifierStorageSettingsTitle')}>
        <IdentifierStorageChoice
          value={identifierStorage}
          onChange={handleIdentifierStorageChange}
          variant="settings"
          switchNote={switchNote}
        />
      </SettingsField>

      <SettingsField label={t('privacyCountryLabel')}>
        <CountryCombobox
          value={currentIso}
          onChange={(code) => setCountryCode(code)}
          codes={countryOptions}
          language={language}
          ariaLabel={t('privacyCountryLabel')}
          placeholder={t('countrySearchPlaceholder')}
          noResultsLabel={t('countrySearchNoResults')}
          priorityCodes={PRIVACY_PRIORITY_CODES}
          id="settings-privacy-country"
        />
      </SettingsField>

      <SettingsField label={t('privacyTierLabel')}>
        <p className="text-sm font-medium text-ink">{t(tierLabelKeys[tier])}</p>
        <ul className="mt-2 space-y-1 text-xs text-muted">
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
        </ul>
      </SettingsField>

      <SettingsField label={t('workflowDirectToDocLabel')}>
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

      <SettingsField label={t('pseudonymizationToggle')}>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={pseudonymizationEnabled}
            onChange={(event) => handlePseudonymizationToggle(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border"
          />
          {pseudonymizationEnabled ? t('pseudonymizationActive') : t('pseudonymizationDisabled')}
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
