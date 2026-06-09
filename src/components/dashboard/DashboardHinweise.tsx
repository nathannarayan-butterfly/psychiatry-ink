import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { IdentifierStorageMode } from '../../utils/identifierStorage'
import { EncryptionDisclaimerBody } from '../EncryptionDisclaimerBody'

type HinweisPanelId = 'encryption' | 'pseudonym' | 'local'

const sharedHintKeys = [
  'dashboardHintLocalIdentifiers',
  'dashboardHintLocalCrypto',
  'dashboardHintLocalZeroKnowledge',
  'dashboardHintLocalNoRecovery',
] as const satisfies readonly UiTranslationKey[]

function panelCollapsedKey(id: HinweisPanelId): string {
  return `psychiatry-ink-dashboard-hinweis-${id}-collapsed`
}

function readPanelCollapsed(id: HinweisPanelId): boolean {
  try {
    return localStorage.getItem(panelCollapsedKey(id)) === 'true'
  } catch {
    return false
  }
}

function persistPanelCollapsed(id: HinweisPanelId): void {
  try {
    localStorage.setItem(panelCollapsedKey(id), 'true')
  } catch {
    // ignore storage errors
  }
}

interface DashboardHinweisPanelProps {
  id: HinweisPanelId
  titleKey: UiTranslationKey
  children: ReactNode
}

function DashboardHinweisPanel({ id, titleKey, children }: DashboardHinweisPanelProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(() => !readPanelCollapsed(id))

  const collapse = useCallback(() => {
    persistPanelCollapsed(id)
    setExpanded(false)
  }, [id])

  const expand = useCallback(() => {
    setExpanded(true)
  }, [])

  const title = t(titleKey)

  if (!expanded) {
    return (
      <div className="dashboard-hinweis-panel dashboard-hinweis-panel--collapsed">
        <button
          type="button"
          className="dashboard-hinweis-panel__expand"
          onClick={expand}
          aria-expanded={false}
        >
          {title} ▾
        </button>
      </div>
    )
  }

  return (
    <section className="dashboard-hinweis-panel" aria-labelledby={`dashboard-hinweis-${id}-title`}>
      <header className="dashboard-hinweis-panel__header">
        <h2 id={`dashboard-hinweis-${id}-title`} className="dashboard-hinweis-panel__title">
          <AlertTriangle className="dashboard-hinweis-panel__icon" strokeWidth={1.75} aria-hidden />
          {title}
        </h2>
        <button
          type="button"
          className="dashboard-hinweis-panel__close"
          onClick={collapse}
          aria-label={t('dashboardHinweiseClose')}
        >
          <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        </button>
      </header>
      <div className="dashboard-hinweis-panel__body">{children}</div>
    </section>
  )
}

interface DashboardHinweiseProps {
  identifierStorage: IdentifierStorageMode
}

export function DashboardHinweise({ identifierStorage }: DashboardHinweiseProps) {
  const { t } = useTranslation()

  const passphraseKey = useMemo(
    (): UiTranslationKey =>
      identifierStorage === 'account'
        ? 'dashboardHintPassphraseAccount'
        : 'dashboardHintPassphraseDevice',
    [identifierStorage],
  )

  const currentModeKey = useMemo(
    (): UiTranslationKey =>
      identifierStorage === 'account'
        ? 'dashboardCurrentModeAccount'
        : 'dashboardCurrentModeDevice',
    [identifierStorage],
  )

  return (
    <div className="dashboard-hinweise-stack">
      <DashboardHinweisPanel id="encryption" titleKey="dashboardHintEncryptionTitle">
        <EncryptionDisclaimerBody
          variant="list"
          className="dashboard-hinweis-panel__list"
          identifierStorage={identifierStorage}
        />
      </DashboardHinweisPanel>

      <DashboardHinweisPanel id="pseudonym" titleKey="dashboardHintPseudonymTitle">
        <p className="dashboard-hinweis-panel__text">{t('dashboardHintPseudonymBody')}</p>
        <p className="dashboard-hinweis-panel__text dashboard-hinweis-panel__text--emphasis">
          {t('dashboardHintPseudonymDictation')}
        </p>
      </DashboardHinweisPanel>

      <DashboardHinweisPanel id="local" titleKey="dashboardHintStorageTitle">
        <p
          className={
            identifierStorage === 'device'
              ? 'identifier-storage-choice__warning'
              : 'dashboard-hinweis-panel__text dashboard-hinweis-panel__text--emphasis'
          }
        >
          {t(currentModeKey)}
        </p>
        <ul className="dashboard-hinweis-panel__list">
          {sharedHintKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
          <li>{t(passphraseKey)}</li>
        </ul>
        <p className="dashboard-hinweis-panel__text text-xs text-muted">
          {t('dashboardHintChangeInSettings')}
        </p>
      </DashboardHinweisPanel>
    </div>
  )
}
