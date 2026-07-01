import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { TranslationProvider } from '../../../context/TranslationContext'
import { translateUi } from '../../../data/uiTranslations'
import { WorkspaceSaveStatusBadge } from '../WorkspaceSaveStatusBadge'

interface VaultStubOverrides {
  saveStatus: 'idle' | 'saving' | 'success' | 'cache-warning' | 'failed'
  dbSyncEnabled: boolean
  orgVaultEnabled?: boolean
  error?: string | null
}

function vaultStub(overrides: VaultStubOverrides) {
  return {
    saveStatus: overrides.saveStatus,
    error: overrides.error ?? null,
    retrySave: async () => {},
    dbSyncEnabled: overrides.dbSyncEnabled,
    orgVaultEnabled: overrides.orgVaultEnabled ?? false,
  }
}

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

afterEach(() => {
  if (activeRoot) act(() => activeRoot!.unmount())
  activeContainer?.remove()
  activeRoot = null
  activeContainer = null
})

function render(vault: ReturnType<typeof vaultStub>): { text: string; container: HTMLDivElement } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      createElement(TranslationProvider, {
        language: 'en',
        englishVariant: 'uk',
        children: createElement(WorkspaceSaveStatusBadge, { vault }),
      }),
    )
  })
  activeRoot = root
  activeContainer = container
  return { text: container.textContent ?? '', container }
}

describe('WorkspaceSaveStatusBadge — plain-language save states', () => {
  it('success + dbSyncEnabled=false shows "Saved locally"', () => {
    const { text } = render(vaultStub({ saveStatus: 'success', dbSyncEnabled: false }))
    expect(text).toContain(translateUi('en', 'workspaceSaveStatusSavedLocal'))
  })

  it('success + dbSyncEnabled=true shows the encrypted-sync wording', () => {
    const { text } = render(vaultStub({ saveStatus: 'success', dbSyncEnabled: true }))
    expect(text).toContain(translateUi('en', 'workspaceSaveStatusSavedSynced'))
  })

  it('failed + dbSyncEnabled=true shows the generic (recoverable) failure badge', () => {
    const { text, container } = render(vaultStub({ saveStatus: 'failed', dbSyncEnabled: true }))
    expect(text).toContain(translateUi('en', 'workspaceSaveStatusFailedBadge'))
    expect(container.querySelector('[data-testid="workspace-save-status-local-failed-critical"]')).toBeNull()
  })

  it('failed + dbSyncEnabled=false + orgVaultEnabled=false shows the critical local-failure warning', () => {
    // This is the "local-only save failed" case — nothing exists anywhere,
    // so it must be visually louder than an ordinary retryable failure.
    const { text, container } = render(vaultStub({ saveStatus: 'failed', dbSyncEnabled: false }))
    expect(text).toContain(translateUi('en', 'workspaceSaveStatusLocalFailedCritical'))
    expect(
      container.querySelector('[data-testid="workspace-save-status-local-failed-critical"]'),
    ).not.toBeNull()
  })
})
