import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TranslationProvider } from '../../../context/TranslationContext'
import { OrganisationProvider } from '../../../contexts/PermissionContext'
import { WorkspaceSessionProvider } from '../../../context/WorkspaceSessionContext'
import { AuthProvider } from '../../../context/AuthContext'
import { languageOptions } from '../../../data/languages'
import { DashboardPage } from '../DashboardPage'

function mockPrivacy() {
  return {
    tier: 'local_only' as const,
    countryCode: 'DE',
    identifierStorage: 'device' as const,
    setCountryCode: () => {},
    setIdentifierStorage: () => {},
  }
}

function mockLanguageSettings() {
  return {
    language: 'de' as const,
    englishVariant: 'uk' as const,
    currentLabel: 'Deutsch',
    selectLanguage: () => {},
    selectEnglishVariant: () => {},
    languageOptions,
  }
}

describe('DashboardPage smoke', () => {
  it('renders without throwing', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const onOpenCase = () => {}

    await act(async () => {
      root.render(
        createElement(
          AuthProvider,
          null,
          createElement(
            OrganisationProvider,
            null,
            createElement(
              TranslationProvider,
              { language: 'de', englishVariant: 'uk', children: createElement(
                WorkspaceSessionProvider,
                null,
                createElement(DashboardPage, {
                  privacy: mockPrivacy(),
                  languageSettings: mockLanguageSettings(),
                  plan: 'free',
                  onOpenCase,
                }),
              ) },
            ),
          ),
        ),
      )
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(container.querySelector('.dashboard-page')).not.toBeNull()
    root.unmount()
    document.body.removeChild(container)
  })
})
