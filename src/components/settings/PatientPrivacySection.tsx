import { useCallback, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  allowsPatientMetadata,
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
import {
  caseFileStorageModeToSettings,
  resolveCaseFileStorageMode,
  type CaseFileStorageMode,
} from '../../utils/caseFileStorageMode'
import { CaseFileStorageCards } from '../privacy/CaseFileStorageCards'
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
  const {
    countryCode,
    identifierStorage,
    tier,
    caseFileCloudSync,
    setCountryCode,
    setIdentifierStorage,
    setCaseFileCloudSync,
  } = privacy
  const dashboardSettings = useDashboardSettings()
  const [pseudonymizationEnabled, setPseudonymizationEnabled] = useState(
    isPseudonymizationEnabled,
  )
  const [switchNote, setSwitchNote] = useState<string | null>(null)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  const applyIdentifierStorage = useCallback(
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

  const caseFileStorageMode = resolveCaseFileStorageMode(identifierStorage, caseFileCloudSync)

  const handleCaseFileStorageChange = useCallback(
    (next: CaseFileStorageMode) => {
      const { identifierStorage: nextIdentifierStorage, caseFileCloudSync: nextCaseFileCloudSync } =
        caseFileStorageModeToSettings(next)
      applyIdentifierStorage(nextIdentifierStorage)
      setCaseFileCloudSync(nextCaseFileCloudSync)
    },
    [applyIdentifierStorage, setCaseFileCloudSync],
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
  // privacy-tier override resolve to the default `full` tier via
  // `resolvePrivacyTier` (DACH stays `local_only`). The currently stored value
  // is always included so a detected/legacy code stays selectable.
  const currentIso = toIsoCountryCode(countryCode)
  const countryOptions = Array.from(
    new Set([...ISO_ALPHA2_CODES, ...(currentIso ? [currentIso] : [])]),
  )

  return (
    <div>
      <SettingsField label={t('caseFileStorageLabel')} stack>
        <CaseFileStorageCards
          mode={caseFileStorageMode}
          onChange={handleCaseFileStorageChange}
          showStatus
          allowAdvanced
          name="settings-case-file-storage-mode"
        />
        {switchNote ? <p className="mt-2 text-xs text-muted">{switchNote}</p> : null}
        <p className="case-file-storage-hard-refresh-note">{t('storageHardRefreshNote')}</p>
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
        <p className="mt-2 text-xs text-muted">{t('privacyTierDefaultOnlyNote')}</p>
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

      <div className="case-file-storage-technical">
        {!showTechnicalDetails ? (
          <button
            type="button"
            className="case-file-storage-technical__toggle"
            onClick={() => setShowTechnicalDetails(true)}
          >
            {t('storageTechnicalDetailsToggle')} ▾
          </button>
        ) : (
          <>
            <button
              type="button"
              className="case-file-storage-technical__toggle"
              onClick={() => setShowTechnicalDetails(false)}
            >
              {t('storageTechnicalDetailsToggle')} ▴
            </button>
            <dl className="case-file-storage-technical__body">
              <dt>{t('privacyTierLabel')}</dt>
              <dd>{t(tierLabelKeys[tier])}</dd>
              {!allowsPatientMetadata(tier) ? (
                <>
                  <dt>{t('privacyPatientFieldsLabel')}</dt>
                  <dd>{t('privacyPatientFieldsDisabled')}</dd>
                </>
              ) : null}
            </dl>
          </>
        )}
      </div>

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
