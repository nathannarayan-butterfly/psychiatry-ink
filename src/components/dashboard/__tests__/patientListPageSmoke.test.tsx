import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TranslationProvider } from '../../../context/TranslationContext'
import { OrganisationProvider } from '../../../contexts/PermissionContext'
import { WorkspaceSessionProvider } from '../../../context/WorkspaceSessionContext'
import { AuthProvider } from '../../../context/AuthContext'
import { languageOptions } from '../../../data/languages'
import { PatientListPage } from '../PatientListPage'

function mockPrivacy() {
  return {
    tier: 'local_only' as const,
    countryCode: 'DE',
    identifierStorage: 'device' as const,
    caseFileCloudSync: false,
    hasExplicitCaseFileCloudSyncChoice: false,
    setCountryCode: () => {},
    setIdentifierStorage: () => {},
    setCaseFileCloudSync: () => {},
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

function renderPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  return { container, root }
}

describe('PatientListPage smoke', () => {
  for (const mode of ['active', 'archived'] as const) {
    it(`renders the ${mode} list without throwing`, async () => {
      const { container, root } = renderPage()

      await act(async () => {
        root.render(
          createElement(
            AuthProvider,
            null,
            createElement(
              OrganisationProvider,
              null,
              createElement(TranslationProvider, {
                language: 'de',
                englishVariant: 'uk',
                children: createElement(
                  WorkspaceSessionProvider,
                  null,
                  createElement(PatientListPage, {
                    mode,
                    privacy: mockPrivacy(),
                    languageSettings: mockLanguageSettings(),
                    onBack: () => {},
                    onOpenCase: () => {},
                    onSwitchList: () => {},
                  }),
                ),
              }),
            ),
          ),
        )
      })

      await act(async () => {
        await new Promise((r) => setTimeout(r, 100))
      })

      // Page shell + search box render regardless of how many patients exist.
      expect(container.querySelector('.patient-list-page__header')).not.toBeNull()
      expect(container.querySelector('.dashboard-patients-search__input')).not.toBeNull()

      root.unmount()
      document.body.removeChild(container)
    })
  }
})
