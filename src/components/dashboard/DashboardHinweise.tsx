import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { PrivacyTier } from '../../data/privacyRegions'
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
    const stored = localStorage.getItem(panelCollapsedKey(id))
    // Default to collapsed when no explicit preference has been stored yet.
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

function persistPanelCollapsed(id: HinweisPanelId, collapsed: boolean): void {
  try {
    localStorage.setItem(panelCollapsedKey(id), collapsed ? 'true' : 'false')
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
    persistPanelCollapsed(id, true)
    setExpanded(false)
  }, [id])

  const expand = useCallback(() => {
    persistPanelCollapsed(id, false)
    setExpanded(true)
  }, [id])

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
  tier: PrivacyTier
}

export function DashboardHinweise({ identifierStorage, tier }: DashboardHinweiseProps) {
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

  // Region-set ceiling for the clinical case-file snapshot (separate from the
  // identifier storage-mode choice above). `full` allows an encrypted server
  // snapshot; `local_only`/`disabled` keep the case file local-first by default.
  const tierKey = useMemo(
    (): UiTranslationKey =>
      tier === 'full' ? 'dashboardHintTierFull' : 'dashboardHintTierLocalFirst',
    [tier],
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
        <p className="dashboard-hinweis-panel__text">{t(tierKey)}</p>
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
