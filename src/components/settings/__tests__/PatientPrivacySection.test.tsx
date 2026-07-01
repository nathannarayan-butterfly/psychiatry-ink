import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { TranslationProvider } from '../../../context/TranslationContext'
import { translateUi } from '../../../data/uiTranslations'
import type { IdentifierStorageMode } from '../../../utils/identifierStorage'
import type { PrivacyTier } from '../../../data/privacyRegions'

// Isolate the case-file storage choice: stub the side-effecting children/services
// so the test only exercises the region + storage-mode → copy resolution.
vi.mock('../WorkspaceVaultSection', () => ({
  WorkspaceVaultSection: () => null,
}))
vi.mock('../CountryCombobox', () => ({
  CountryCombobox: () => null,
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
  caseFileCloudSync: boolean
}) {
  return {
    countryCode: overrides.countryCode,
    tier: overrides.tier,
    identifierStorage: overrides.identifierStorage,
    caseFileCloudSync: overrides.caseFileCloudSync,
    hasExplicitCaseFileCloudSyncChoice: true,
    setCountryCode: () => {},
    setIdentifierStorage: () => {},
    setCaseFileCloudSync: () => {},
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

function render(privacy: ReturnType<typeof makePrivacy>): { text: string; container: HTMLDivElement } {
  const { container, root } = renderSection(privacy)
  activeRoot = root
  activeContainer = container
  return { text: container.textContent ?? '', container }
}

function checkedStorageOption(container: HTMLDivElement): string | null {
  const checked = container.querySelector<HTMLInputElement>(
    'input[name="settings-case-file-storage-mode"]:checked',
  )
  return checked?.closest('label')?.textContent ?? null
}

function expandTechnicalDetails(container: HTMLDivElement): void {
  const toggle = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(translateUi('en', 'storageTechnicalDetailsToggle')),
  )
  act(() => toggle?.click())
}

const fullTierLabel = translateUi('en', 'privacyTierFull')
const localOnlyTierLabel = translateUi('en', 'privacyTierLocalOnly')
const localTitle = translateUi('en', 'caseFileStorageLocalTitle')
const identifiersTitle = translateUi('en', 'caseFileStorageIdentifiersTitle')
const fullTitle = translateUi('en', 'caseFileStorageFullTitle')
const defaultOnlyNote = translateUi('en', 'privacyTierDefaultOnlyNote')
const statusFull = translateUi('en', 'storageStatusFull')
const statusLocal = translateUi('en', 'storageStatusLocal')
const statusIdentifiers = translateUi('en', 'storageStatusIdentifiers')

describe('PatientPrivacySection — case-file storage choice', () => {
  it('DE + explicit encrypted case-file backup: shows the "full" option selected, NOT the local-only copy as if blocking sync', () => {
    // This is the reported bug: selecting country DE must not silently force
    // (or visually contradict) an explicit "encrypted case-file backup" choice.
    const { text, container } = render(
      makePrivacy({
        countryCode: 'DE',
        tier: 'local_only',
        identifierStorage: 'account',
        caseFileCloudSync: true,
      }),
    )
    expect(checkedStorageOption(container)).toContain(fullTitle)
    // The plain-language status line must reflect the explicit choice, not the region default.
    expect(text).toContain(statusFull)
    expect(text).not.toContain(statusLocal)
    expect(text).toContain(defaultOnlyNote)

    // The region-derived tier is still visible, but only behind "technical details" —
    // and even then it must never contradict the status line above.
    expandTechnicalDetails(container)
    expect(container.textContent).toContain(localOnlyTierLabel)
  })

  it('DE with no explicit choice defaults to "local only" (tier default), but this is just a default, not a lock', () => {
    const { text, container } = render(
      makePrivacy({
        countryCode: 'DE',
        tier: 'local_only',
        identifierStorage: 'device',
        caseFileCloudSync: false,
      }),
    )
    expect(checkedStorageOption(container)).toContain(localTitle)
    expect(text).toContain(statusLocal)
  })

  it('DE + identifiers-only explicit choice: patient list syncs, case file stays local', () => {
    const { text, container } = render(
      makePrivacy({
        countryCode: 'DE',
        tier: 'local_only',
        identifierStorage: 'account',
        caseFileCloudSync: false,
      }),
    )
    expect(checkedStorageOption(container)).toContain(identifiersTitle)
    expect(text).toContain(statusIdentifiers)
  })

  it('US (full tier) with encrypted case-file backup selected: shows the "full" option', () => {
    const { text, container } = render(
      makePrivacy({
        countryCode: 'US',
        tier: 'full',
        identifierStorage: 'account',
        caseFileCloudSync: true,
      }),
    )
    expect(checkedStorageOption(container)).toContain(fullTitle)
    expect(text).toContain(statusFull)
    expandTechnicalDetails(container)
    expect(container.textContent).toContain(fullTierLabel)
  })

  it('switching the storage mode changes the reflected selection', () => {
    const { container: deviceContainer } = render(
      makePrivacy({
        countryCode: 'US',
        tier: 'full',
        identifierStorage: 'device',
        caseFileCloudSync: false,
      }),
    )
    expect(checkedStorageOption(deviceContainer)).toContain(localTitle)

    act(() => {
      activeRoot!.render(
        createElement(TranslationProvider, {
          language: 'en',
          englishVariant: 'uk',
          children: createElement(PatientPrivacySection, {
            privacy: makePrivacy({
              countryCode: 'US',
              tier: 'full',
              identifierStorage: 'account',
              caseFileCloudSync: true,
            }),
            workspaceVault: vaultStub,
          }),
        }),
      )
    })
    expect(checkedStorageOption(activeContainer!)).toContain(fullTitle)
  })
})
