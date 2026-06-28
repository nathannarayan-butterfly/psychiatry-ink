import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { TranslationProvider } from '../../../context/TranslationContext'
import { translateUi } from '../../../data/uiTranslations'
import type { IdentifierStorageMode } from '../../../utils/identifierStorage'
import type { PrivacyTier } from '../../../data/privacyRegions'

// Isolate the "Current tier" section: stub the side-effecting children/services
// so the test only exercises the region + storage-mode → copy resolution.
vi.mock('../WorkspaceVaultSection', () => ({
  WorkspaceVaultSection: () => null,
}))
vi.mock('../CountryCombobox', () => ({
  CountryCombobox: () => null,
}))
vi.mock('../../privacy/IdentifierStorageChoice', () => ({
  IdentifierStorageChoice: () => null,
}))
vi.mock('../../../hooks/useDashboardSettings', () => ({
  useDashboardSettings: () => ({
    openCaseDirectToWorkflow: false,
    setOpenCaseDirectToWorkflow: () => {},
  }),
}))
vi.mock('../../../services/accountBackupApi', () => ({
  deleteRegistryBackupFromServer: vi.fn(async () => {}),
}))
vi.mock('../../../utils/accountBackup', () => ({
  isAccountCloudSyncEnabled: () => false,
  scheduleAccountRegistryUpload: vi.fn(),
}))
vi.mock('../../../services/aiGeneration', () => ({
  isPseudonymizationEnabled: false,
  PSEUDONYMIZE_KEY: 'pseudonymize',
}))

import { PatientPrivacySection } from '../PatientPrivacySection'

function makePrivacy(overrides: {
  countryCode: string
  tier: PrivacyTier
  identifierStorage: IdentifierStorageMode
}) {
  return {
    countryCode: overrides.countryCode,
    tier: overrides.tier,
    identifierStorage: overrides.identifierStorage,
    setCountryCode: () => {},
    setIdentifierStorage: () => {},
  }
}

const vaultStub = { enabled: false } as never

function renderSection(privacy: ReturnType<typeof makePrivacy>): {
  container: HTMLDivElement
  root: Root
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      createElement(TranslationProvider, {
        language: 'en',
        englishVariant: 'uk',
        children: createElement(PatientPrivacySection, { privacy, workspaceVault: vaultStub }),
      }),
    )
  })
  return { container, root }
}

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

afterEach(() => {
  if (activeRoot) act(() => activeRoot!.unmount())
  activeContainer?.remove()
  activeRoot = null
  activeContainer = null
})

function render(privacy: ReturnType<typeof makePrivacy>): string {
  const { container, root } = renderSection(privacy)
  activeRoot = root
  activeContainer = container
  return container.textContent ?? ''
}

const fullLabel = translateUi('en', 'privacyTierFull')
const localOnlyLabel = translateUi('en', 'privacyTierLocalOnly')
const accountLine = translateUi('en', 'privacyTierIdentifierAccount')
const deviceLine = translateUi('en', 'privacyTierIdentifierDevice')
const noSnapshot = translateUi('en', 'privacyPublicKeyBlocked')
const snapshotAllowed = translateUi('en', 'privacyPublicKeyAllowed')

describe('PatientPrivacySection — Current tier', () => {
  it('India + account: full tier label, account identifier line, case-file snapshot allowed', () => {
    const text = render(
      makePrivacy({ countryCode: 'IN', tier: 'full', identifierStorage: 'account' }),
    )
    expect(text).toContain(fullLabel)
    expect(text).not.toContain(localOnlyLabel)
    expect(text).not.toContain('DE/AT/CH')
    expect(text).toContain(accountLine)
    expect(text).not.toContain(deviceLine)
    expect(text).toContain(snapshotAllowed)
    expect(text).not.toContain(noSnapshot)
  })

  it('India + device: shows the device identifier line with full tier snapshot copy', () => {
    const text = render(
      makePrivacy({ countryCode: 'IN', tier: 'full', identifierStorage: 'device' }),
    )
    expect(text).toContain(fullLabel)
    expect(text).toContain(deviceLine)
    expect(text).not.toContain(accountLine)
    expect(text).toContain(snapshotAllowed)
  })

  it('switching the storage mode changes the reflected identifier line', () => {
    const deviceText = render(
      makePrivacy({ countryCode: 'IN', tier: 'full', identifierStorage: 'device' }),
    )
    expect(deviceText).toContain(deviceLine)

    act(() => {
      activeRoot!.render(
        createElement(TranslationProvider, {
          language: 'en',
          englishVariant: 'uk',
          children: createElement(PatientPrivacySection, {
            privacy: makePrivacy({
              countryCode: 'IN',
              tier: 'full',
              identifierStorage: 'account',
            }),
            workspaceVault: vaultStub,
          }),
        }),
      )
    })
    const accountText = activeContainer!.textContent ?? ''
    expect(accountText).toContain(accountLine)
    expect(accountText).not.toContain(deviceLine)
  })

  it('DACH (DE) still resolves to the local_only tier label', () => {
    const text = render(
      makePrivacy({ countryCode: 'DE', tier: 'local_only', identifierStorage: 'device' }),
    )
    expect(text).toContain(localOnlyLabel)
    expect(text).toContain(noSnapshot)
  })

  it('full tier (US + account) allows an encrypted clinical case-file snapshot', () => {
    const text = render(
      makePrivacy({ countryCode: 'US', tier: 'full', identifierStorage: 'account' }),
    )
    expect(text).toContain(snapshotAllowed)
    expect(text).toContain(accountLine)
  })
})
